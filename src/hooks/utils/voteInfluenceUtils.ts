/**
 * Utility functions for analyzing the influence of speaking time and vote timing
 * on vote outcomes. Only processes timed modded games (Version >= 0.201).
 */
import type { GameLogEntry, PlayerStat } from '../useCombinedRawData';
import { getPlayerId } from '../../utils/playerIdentification';
import { compareVersion } from './dataUtils';
import { wasPlayerAliveAtMeeting, getAlivePlayersAtMeeting } from './votingStatsUtils';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface FirstVoterEffect {
  firstVoterSuccessRate: number;      // % of meetings where first voter's target was eliminated
  averageVoterSuccessRate: number;    // Average success rate across all voters
  meetingsAnalyzed: number;
}

export interface TalkTimeBucket {
  range: string;                      // e.g. "0-25%" (bottom quartile of talkers)
  eliminationRate: number;            // % of players in this bucket who were eliminated
  totalPlayers: number;
}

export interface SpeakerEliminationCorrelation {
  eliminatedAvgTalkPercentile: number;   // Average talk-time percentile of eliminated players
  survivorAvgTalkPercentile: number;     // Average talk-time percentile of survivors
  talkTimeBuckets: TalkTimeBucket[];
  meetingsAnalyzed: number;
}

export interface TopSpeakerInfluence {
  topSpeakerSuccessRate: number;      // % of meetings where highest-talker's target was eliminated
  averagePlayerSuccessRate: number;   // Baseline: average voter's success rate
  topSpeakerFollowRate: number;       // % of voters who voted same as top speaker
  meetingsAnalyzed: number;
}

export interface TimingBucket {
  position: string;                   // e.g. "1er quart (rapide)"
  successRate: number;
  voteCount: number;
}

export interface VoteTimingSuccess {
  timingBuckets: TimingBucket[];
  meetingsAnalyzed: number;
}

export interface FollowLeaderBucket {
  talkTimeBucket: string;             // e.g. "Top 25%"
  followRate: number;                 // % of other voters who followed
  meetingCount: number;
}

export interface FollowTheLeader {
  overallBandwagonRate: number;       // % of voters who voted same as 1st voter
  bandwagonByFirstVoterTalkTime: FollowLeaderBucket[];
  meetingsAnalyzed: number;
}

export interface VoteInfluenceStats {
  firstVoterEffect: FirstVoterEffect;
  speakerElimination: SpeakerEliminationCorrelation;
  topSpeakerInfluence: TopSpeakerInfluence;
  voteTimingSuccess: VoteTimingSuccess;
  followTheLeader: FollowTheLeader;
  totalTimedGames: number;
  totalMeetingsAnalyzed: number;
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface MeetingVote {
  playerId: string;
  playerName: string;
  target: string;
  targetPlayerId: string | null;
  date: Date;
  normalizedTalkTime: number;        // SecondsTalkedDuringMeeting / meetingsAttended
}

// ─── Computation ──────────────────────────────────────────────────────────────

/**
 * Computes the number of meetings a player attended in a game
 */
function getPlayerMeetingsAttended(player: PlayerStat, maxMeetingNumber: number): number {
  let count = 0;
  for (let m = 1; m <= maxMeetingNumber; m++) {
    if (wasPlayerAliveAtMeeting(player, m)) {
      count++;
    }
  }
  return count;
}

/**
 * Gets the max meeting number in a game from vote data
 */
function getMaxMeetingNumber(game: GameLogEntry): number {
  return Math.max(
    ...game.PlayerStats.flatMap(player =>
      player.Votes.map(vote => vote.Day || 0)
    ),
    0
  );
}

/**
 * Calculates vote influence statistics across all eligible games.
 * Only games with Modded: true and Version >= 0.201 are processed (timed votes required).
 */
export function calculateVoteInfluenceStats(games: GameLogEntry[]): VoteInfluenceStats | null {
  // Filter to timed modded games
  const timedGames = games.filter(game => {
    if (!game.Modded) return false;
    if (!game.Version) return false;
    return compareVersion(game.Version, '0.201');
  });

  if (timedGames.length === 0) return null;

  // ─── Accumulators ─────────────────────────────────────────────────────────

  // A: First Voter Effect
  let firstVoterSuccessMeetings = 0;
  let firstVoterTotalMeetings = 0;

  // B: Speaker vs Eliminated
  const eliminatedTalkPercentiles: number[] = [];
  const survivorTalkPercentiles: number[] = [];
  // Buckets: 4 quartiles of talk time → track (eliminated count, total count)
  const talkBucketEliminated = [0, 0, 0, 0];
  const talkBucketTotal = [0, 0, 0, 0];

  // C: Top Speaker Influence
  let topSpeakerSuccessMeetings = 0;
  let topSpeakerTotalMeetings = 0;
  let topSpeakerFollowVotes = 0;
  let topSpeakerTotalOtherVotes = 0;
  let allVoterSuccessCount = 0;
  let allVoterTotalCount = 0;

  // D: Vote Timing vs Success
  // 4 quartile buckets: [0-25%, 25-50%, 50-75%, 75-100%]
  const timingBucketSuccess = [0, 0, 0, 0];
  const timingBucketTotal = [0, 0, 0, 0];

  // E: Follow the Leader
  let bandwagonFollowCount = 0;
  let bandwagonTotalOtherVoters = 0;
  // 4 buckets by first voter's talk time percentile
  const followBucketFollow = [0, 0, 0, 0];
  const followBucketTotal = [0, 0, 0, 0];

  let totalMeetingsAnalyzed = 0;

  // ─── Process each game ────────────────────────────────────────────────────

  timedGames.forEach(game => {
    const maxMeeting = getMaxMeetingNumber(game);
    if (maxMeeting === 0) return;

    // Pre-compute normalized talk time for each player in this game
    const playerTalkTimeMap = new Map<string, number>();
    game.PlayerStats.forEach(player => {
      const playerId = getPlayerId(player);
      const meetingsAttended = getPlayerMeetingsAttended(player, maxMeeting);
      const normalized = meetingsAttended > 0
        ? (player.SecondsTalkedDuringMeeting || 0) / meetingsAttended
        : 0;
      playerTalkTimeMap.set(playerId, normalized);
    });

    // Process each meeting
    for (let meetingNum = 1; meetingNum <= maxMeeting; meetingNum++) {
      const alivePlayers = getAlivePlayersAtMeeting(game, meetingNum);
      if (alivePlayers.length < 2) continue;

      // Skip auto-end meetings
      if (game.EndTiming === `M${meetingNum}`) {
        const hasVotes = game.PlayerStats.some(p =>
          p.Votes.some(v => v.Day === meetingNum)
        );
        if (!hasVotes) continue;
      }

      // Collect active timed votes for this meeting
      const meetingVotes: MeetingVote[] = [];
      game.PlayerStats.forEach(player => {
        player.Votes
          .filter(v => v.Day === meetingNum && v.Target !== 'Passé' && v.Date)
          .forEach(vote => {
            const playerId = getPlayerId(player);
            const targetPlayer = game.PlayerStats.find(p => p.Username === vote.Target);
            meetingVotes.push({
              playerId,
              playerName: player.Username,
              target: vote.Target,
              targetPlayerId: targetPlayer ? getPlayerId(targetPlayer) : null,
              date: new Date(vote.Date!),
              normalizedTalkTime: playerTalkTimeMap.get(playerId) || 0
            });
          });
      });

      // Need at least 2 active votes for meaningful timing analysis
      if (meetingVotes.length < 2) continue;

      // Sort by timestamp
      meetingVotes.sort((a, b) => a.date.getTime() - b.date.getTime());

      totalMeetingsAnalyzed++;
      const firstVoter = meetingVotes[0];

      // Compute alive players' talk time percentiles for this meeting
      const aliveTalkTimes = alivePlayers.map(p => ({
        playerId: getPlayerId(p),
        talkTime: playerTalkTimeMap.get(getPlayerId(p)) || 0
      })).sort((a, b) => a.talkTime - b.talkTime);

      const talkTimePercentileMap = new Map<string, number>();
      aliveTalkTimes.forEach((entry, idx) => {
        const percentile = aliveTalkTimes.length > 1
          ? (idx / (aliveTalkTimes.length - 1)) * 100
          : 50;
        talkTimePercentileMap.set(entry.playerId, percentile);
      });

      // Find eliminated player in this meeting
      const eliminatedPlayer = game.PlayerStats.find(p =>
        p.DeathType === 'VOTED' && p.DeathTiming === `M${meetingNum}`
      );
      const eliminatedPlayerId = eliminatedPlayer ? getPlayerId(eliminatedPlayer) : null;

      // ─── A: First Voter Effect ────────────────────────────────────────
      firstVoterTotalMeetings++;
      if (firstVoter.targetPlayerId && eliminatedPlayerId &&
          firstVoter.targetPlayerId === eliminatedPlayerId) {
        firstVoterSuccessMeetings++;
      }

      // ─── B: Speaker vs Eliminated ─────────────────────────────────────
      alivePlayers.forEach(player => {
        const pid = getPlayerId(player);
        const percentile = talkTimePercentileMap.get(pid) ?? 50;
        const bucketIdx = Math.min(Math.floor(percentile / 25), 3);

        talkBucketTotal[bucketIdx]++;
        if (pid === eliminatedPlayerId) {
          eliminatedTalkPercentiles.push(percentile);
          talkBucketEliminated[bucketIdx]++;
        } else {
          survivorTalkPercentiles.push(percentile);
        }
      });

      // ─── C: Top Speaker Influence ─────────────────────────────────────
      // Find the voter with highest normalized talk time
      const topSpeakerVote = [...meetingVotes].sort(
        (a, b) => b.normalizedTalkTime - a.normalizedTalkTime
      )[0];

      topSpeakerTotalMeetings++;
      if (topSpeakerVote.targetPlayerId && eliminatedPlayerId &&
          topSpeakerVote.targetPlayerId === eliminatedPlayerId) {
        topSpeakerSuccessMeetings++;
      }

      // Count how many other voters voted same target as top speaker
      meetingVotes.forEach(vote => {
        if (vote.playerId === topSpeakerVote.playerId) return;
        topSpeakerTotalOtherVotes++;
        if (vote.target === topSpeakerVote.target) {
          topSpeakerFollowVotes++;
        }
      });

      // Average voter success rate
      meetingVotes.forEach(vote => {
        allVoterTotalCount++;
        if (vote.targetPlayerId && eliminatedPlayerId &&
            vote.targetPlayerId === eliminatedPlayerId) {
          allVoterSuccessCount++;
        }
      });

      // ─── D: Vote Timing vs Success ────────────────────────────────────
      meetingVotes.forEach((vote, index) => {
        const percentile = meetingVotes.length > 1
          ? (index / (meetingVotes.length - 1)) * 100
          : 50;
        const bucketIdx = Math.min(Math.floor(percentile / 25), 3);

        timingBucketTotal[bucketIdx]++;
        if (vote.targetPlayerId && eliminatedPlayerId &&
            vote.targetPlayerId === eliminatedPlayerId) {
          timingBucketSuccess[bucketIdx]++;
        }
      });

      // ─── E: Follow the Leader ─────────────────────────────────────────
      const firstVoterTalkPercentile = talkTimePercentileMap.get(firstVoter.playerId) ?? 50;
      const firstVoterTalkBucket = Math.min(Math.floor(firstVoterTalkPercentile / 25), 3);

      meetingVotes.slice(1).forEach(vote => {
        bandwagonTotalOtherVoters++;
        followBucketTotal[firstVoterTalkBucket]++;
        if (vote.target === firstVoter.target) {
          bandwagonFollowCount++;
          followBucketFollow[firstVoterTalkBucket]++;
        }
      });
    }
  });

  if (totalMeetingsAnalyzed === 0) return null;

  // ─── Build results ──────────────────────────────────────────────────────

  const firstVoterEffect: FirstVoterEffect = {
    firstVoterSuccessRate: firstVoterTotalMeetings > 0
      ? (firstVoterSuccessMeetings / firstVoterTotalMeetings) * 100
      : 0,
    averageVoterSuccessRate: allVoterTotalCount > 0
      ? (allVoterSuccessCount / allVoterTotalCount) * 100
      : 0,
    meetingsAnalyzed: firstVoterTotalMeetings
  };

  const avgElimPercentile = eliminatedTalkPercentiles.length > 0
    ? eliminatedTalkPercentiles.reduce((a, b) => a + b, 0) / eliminatedTalkPercentiles.length
    : 50;
  const avgSurvivorPercentile = survivorTalkPercentiles.length > 0
    ? survivorTalkPercentiles.reduce((a, b) => a + b, 0) / survivorTalkPercentiles.length
    : 50;

  const bucketLabels = ['0-25%', '25-50%', '50-75%', '75-100%'];
  const talkTimeBuckets: TalkTimeBucket[] = bucketLabels.map((range, i) => ({
    range,
    eliminationRate: talkBucketTotal[i] > 0
      ? (talkBucketEliminated[i] / talkBucketTotal[i]) * 100
      : 0,
    totalPlayers: talkBucketTotal[i]
  }));

  const speakerElimination: SpeakerEliminationCorrelation = {
    eliminatedAvgTalkPercentile: avgElimPercentile,
    survivorAvgTalkPercentile: avgSurvivorPercentile,
    talkTimeBuckets,
    meetingsAnalyzed: totalMeetingsAnalyzed
  };

  const topSpeakerInfluence: TopSpeakerInfluence = {
    topSpeakerSuccessRate: topSpeakerTotalMeetings > 0
      ? (topSpeakerSuccessMeetings / topSpeakerTotalMeetings) * 100
      : 0,
    averagePlayerSuccessRate: allVoterTotalCount > 0
      ? (allVoterSuccessCount / allVoterTotalCount) * 100
      : 0,
    topSpeakerFollowRate: topSpeakerTotalOtherVotes > 0
      ? (topSpeakerFollowVotes / topSpeakerTotalOtherVotes) * 100
      : 0,
    meetingsAnalyzed: topSpeakerTotalMeetings
  };

  const timingLabels = ['1er quart (rapide)', '2e quart', '3e quart', '4e quart (lent)'];
  const timingBuckets: TimingBucket[] = timingLabels.map((position, i) => ({
    position,
    successRate: timingBucketTotal[i] > 0
      ? (timingBucketSuccess[i] / timingBucketTotal[i]) * 100
      : 0,
    voteCount: timingBucketTotal[i]
  }));

  const voteTimingSuccess: VoteTimingSuccess = {
    timingBuckets,
    meetingsAnalyzed: totalMeetingsAnalyzed
  };

  const followBucketLabels = ['Bottom 25%', '25-50%', '50-75%', 'Top 25%'];
  const bandwagonByFirstVoterTalkTime: FollowLeaderBucket[] = followBucketLabels.map((label, i) => ({
    talkTimeBucket: label,
    followRate: followBucketTotal[i] > 0
      ? (followBucketFollow[i] / followBucketTotal[i]) * 100
      : 0,
    meetingCount: followBucketTotal[i] > 0
      ? Math.round(followBucketTotal[i] / Math.max(1, meetingVotesAvg(followBucketTotal[i], totalMeetingsAnalyzed)))
      : 0
  }));

  const followTheLeader: FollowTheLeader = {
    overallBandwagonRate: bandwagonTotalOtherVoters > 0
      ? (bandwagonFollowCount / bandwagonTotalOtherVoters) * 100
      : 0,
    bandwagonByFirstVoterTalkTime,
    meetingsAnalyzed: totalMeetingsAnalyzed
  };

  return {
    firstVoterEffect,
    speakerElimination,
    topSpeakerInfluence,
    voteTimingSuccess,
    followTheLeader,
    totalTimedGames: timedGames.length,
    totalMeetingsAnalyzed
  };
}

/**
 * Helper: rough estimate of meetings per bucket for display
 */
function meetingVotesAvg(bucketTotal: number, totalMeetings: number): number {
  // Average number of other-voters per meeting is roughly bucketTotal / meetings contributing
  return totalMeetings > 0 ? bucketTotal / totalMeetings : 1;
}
