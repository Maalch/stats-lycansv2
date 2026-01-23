/**
 * Utility functions for processing voting behavior statistics
 * Uses ID-based player identification to merge stats for players with username changes
 */
import type { GameLogEntry, PlayerStat } from '../useCombinedRawData';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../../utils/datasyncExport';
import { DEATH_TYPES } from '../../types/deathTypes';
import { getPlayerId } from '../../utils/playerIdentification';

export interface VotingBehaviorStats {
  playerName: string;
  totalMeetings: number;
  totalVotes: number;
  totalSkips: number;          // "Passé" votes
  totalAbstentions: number;    // No vote cast at all
  votingRate: number;          // (totalVotes / totalMeetings) * 100
  skippingRate: number;        // (totalSkips / totalMeetings) * 100
  abstentionRate: number;      // (totalAbstentions / totalMeetings) * 100
  aggressivenessScore: number; // Complex score based on voting patterns
}

export interface VotingAccuracyStats {
  playerName: string;
  totalMeetings: number;         // Total meetings attended
  totalVotes: number;
  votesForEnemyCamp: number;     // Votes targeting opposite camp
  votesForOwnCamp: number;       // Votes targeting same camp (friendly fire)
  accuracyRate: number;          // (votesForEnemyCamp / totalVotes) * 100
  friendlyFireRate: number;      // (votesForOwnCamp / totalVotes) * 100
}

export interface VotingTargetStats {
  playerName: string;
  totalMeetings: number;         // Total meetings attended (alive)
  totalTimesTargeted: number;
  timesTargetedByEnemyCamp: number;
  timesTargetedByOwnCamp: number;
  timesTargetedAsVillager: number;
  timesTargetedAsWolf: number;
  timesTargetedAsSpecial: number;
  eliminationsByVote: number;    // Times actually eliminated by vote
  survivalRate: number;          // Survived votes / total times targeted
}

export interface VotingTimingStats {
  playerName: string;
  totalActiveVotes: number;      // Total non-"Passé" votes cast
  totalTimedVotes: number;       // Votes with timestamp data (Version >= 0.201)
  averageVotePositionPercentile: number; // 0-100, where 0 = first voter, 100 = last voter
  timesFirstVoter: number;       // Times player voted first in a meeting
  timesLastVoter: number;        // Times player voted last in a meeting
  earlyVoterRate: number;        // % of votes in first 33% of voters
  lateVoterRate: number;         // % of votes in last 33% of voters
  averageVoteDelaySeconds: number; // Average seconds from meeting start to vote
}

/**
 * Internal interfaces used by calculateGameVotingAnalysis
 * Not exported as they're only used for intermediate calculations
 */
interface MeetingAnalytics {
  meetingNumber: number;
  totalParticipants: number;
  totalVotes: number;
  totalSkips: number;
  totalAbstentions: number;
  participationRate: number;     // (totalVotes + totalSkips) / totalParticipants * 100
  mostTargetedPlayer: string | null;
  mostTargetedCount: number;
  eliminatedPlayer: string | null;
}

interface GameVotingAnalysis {
  gameId: string;
  totalMeetings: number;
  meetingAnalytics: MeetingAnalytics[];
  playerBehaviors: VotingBehaviorStats[];
  playerAccuracies: VotingAccuracyStats[];
  playerTargetStats: VotingTargetStats[];
}

/**
 * Determines if a player was alive during a specific meeting
 */
function wasPlayerAliveAtMeeting(player: PlayerStat, meetingNumber: number): boolean {
  // If player never died, they were alive throughout
  if (!player.DeathTiming) return true;
  
  // Parse death timing to determine when they died
  const deathTiming = player.DeathTiming.toUpperCase();
  
  // Extract meeting number from death timing (e.g., "M3" = meeting 3, "N2" = night 2, "J2" = day 2)
  // Player death at meeting means they were alive during that meeting
  if (deathTiming.startsWith('M')) {
    const deathMeeting = parseInt(deathTiming.substring(1));
    return meetingNumber <= deathMeeting;
  }
  
  // For night/day deaths, they died before that meeting number
  // Sequence: J1 -> N1 -> M1 -> J2 -> N2 -> M2
  // So if player dies at J2 or N2, they are NOT alive for M2
  if (deathTiming.startsWith('N') || deathTiming.startsWith('J')) {
    const deathDay = parseInt(deathTiming.substring(1));
    // If they died on night/day X, they're not alive for meeting X
    return meetingNumber < deathDay;
  }
  
  // Default to alive if we can't parse
  return true;
}

/**
 * Gets all players who were alive during a specific meeting in a game
 */
function getAlivePlayersAtMeeting(game: GameLogEntry, meetingNumber: number): PlayerStat[] {
  return game.PlayerStats.filter(player => wasPlayerAliveAtMeeting(player, meetingNumber));
}

/**
 * Determines if a vote was successful (led to elimination)
 */
function wasVoteSuccessful(game: GameLogEntry, meetingNumber: number, targetPlayerId: string): boolean {
  // Find the player who was targeted by their ID
  const target = game.PlayerStats.find(p => getPlayerId(p) === targetPlayerId);
  if (!target) return false;
  
  // Check if they died by vote at the corresponding timing
  if (target.DeathType === DEATH_TYPES.VOTED && target.DeathTiming === `M${meetingNumber}`) {
    return true;
  }
  
  return false;
}

/**
 * Calculates voting behavior statistics for a single game
 * Internal function used by calculateAggregatedVotingStats
 * Uses ID-based player identification
 */
function calculateGameVotingAnalysis(game: GameLogEntry): GameVotingAnalysis {
  const meetingAnalytics: MeetingAnalytics[] = [];
  const playerBehaviorMap = new Map<string, {
    totalMeetings: number;
    totalVotes: number;
    totalSkips: number;
    totalAbstentions: number;
    displayName: string; // Track most recent username
  }>();
  
  const playerAccuracyMap = new Map<string, {
    totalVotes: number;
    votesForEnemyCamp: number;
    votesForOwnCamp: number;
  }>();
  
  const playerTargetMap = new Map<string, {
    totalTimesTargeted: number;
    timesTargetedByEnemyCamp: number;
    timesTargetedByOwnCamp: number;
    timesTargetedAsVillager: number;
    timesTargetedAsWolf: number;
    timesTargetedAsSpecial: number;
    eliminationsByVote: number;
  }>();

  // Initialize maps for all players using ID as key
  game.PlayerStats.forEach(player => {
    const playerId = getPlayerId(player);
    // Player names are already normalized during data loading
    const displayName = player.Username;
    
    playerBehaviorMap.set(playerId, {
      totalMeetings: 0,
      totalVotes: 0,
      totalSkips: 0,
      totalAbstentions: 0,
      displayName: displayName
    });
    
    playerAccuracyMap.set(playerId, {
      totalVotes: 0,
      votesForEnemyCamp: 0,
      votesForOwnCamp: 0
    });
    
    playerTargetMap.set(playerId, {
      totalTimesTargeted: 0,
      timesTargetedByEnemyCamp: 0,
      timesTargetedByOwnCamp: 0,
      timesTargetedAsVillager: 0,
      timesTargetedAsWolf: 0,
      timesTargetedAsSpecial: 0,
      eliminationsByVote: 0
    });
  });

  // Determine the maximum meeting number across all players
  const maxMeetingNumber = Math.max(
    ...game.PlayerStats.flatMap(player => 
      player.Votes.map(vote => vote.Day || 0)
    ),
    0
  );

  // Process each meeting
  for (let meetingNum = 1; meetingNum <= maxMeetingNumber; meetingNum++) {
    const alivePlayersAtMeeting = getAlivePlayersAtMeeting(game, meetingNum);
    const votesInMeeting = game.PlayerStats.flatMap(player => {
      const playerId = getPlayerId(player);
      return player.Votes
        .filter(vote => vote.Day === meetingNum)
        .map(vote => ({ 
          voterId: playerId,
          // Player names are already normalized during data loading
          voterName: player.Username,
          vote, 
          voterRole: player.MainRoleInitial 
        }));
    });

    // Skip meeting only if game ended at this specific meeting without any votes
    // (e.g., EndTiming = "M3" and meeting 3 has no votes = auto-end)
    // Meetings with no votes are otherwise valid (everyone abstained)
    if (votesInMeeting.length === 0 && game.EndTiming === `M${meetingNum}`) {
      continue;
    }

    // Track meeting analytics
    const totalVotes = votesInMeeting.filter(v => v.vote.Target !== 'Passé').length;
    const totalSkips = votesInMeeting.filter(v => v.vote.Target === 'Passé').length;
    const totalAbstentions = alivePlayersAtMeeting.length - votesInMeeting.length;
    
    // Find most targeted player (by username in vote data, convert to ID for tracking)
    const targetCounts = new Map<string, number>(); // Maps username to count for display
    votesInMeeting
      .filter(v => v.vote.Target !== 'Passé')
      .forEach(v => {
        const current = targetCounts.get(v.vote.Target) || 0;
        targetCounts.set(v.vote.Target, current + 1);
      });
    
    let mostTargetedPlayerName: string | null = null;
    let mostTargetedCount = 0;
    for (const [playerName, count] of targetCounts.entries()) {
      if (count > mostTargetedCount) {
        mostTargetedPlayerName = playerName;
        mostTargetedCount = count;
      }
    }

    // Find eliminated player and convert to ID for consistency
    let eliminatedPlayerName: string | null = null;
    if (mostTargetedPlayerName && mostTargetedCount > 0) {
      const targetPlayerStat = game.PlayerStats.find(p => p.Username === mostTargetedPlayerName);
      if (targetPlayerStat) {
        const targetPlayerId = getPlayerId(targetPlayerStat);
        if (wasVoteSuccessful(game, meetingNum, targetPlayerId)) {
          // Player names are already normalized during data loading
          eliminatedPlayerName = targetPlayerStat.Username;
        }
      }
    }

    meetingAnalytics.push({
      meetingNumber: meetingNum,
      totalParticipants: alivePlayersAtMeeting.length,
      totalVotes,
      totalSkips,
      totalAbstentions,
      participationRate: alivePlayersAtMeeting.length > 0 
        ? ((totalVotes + totalSkips) / alivePlayersAtMeeting.length) * 100 
        : 0,
      mostTargetedPlayer: mostTargetedPlayerName,
      mostTargetedCount,
      eliminatedPlayer: eliminatedPlayerName
    });

    // Process each alive player for behavior stats
    alivePlayersAtMeeting.forEach(player => {
      const playerId = getPlayerId(player);
      const behavior = playerBehaviorMap.get(playerId)!;
      behavior.totalMeetings++;
      // Player names are already normalized during data loading
      behavior.displayName = player.Username; // Update to most recent
      
      // Check if this player voted in this meeting
      const playerVote = votesInMeeting.find(v => v.voterId === playerId);
      
      if (playerVote) {
        if (playerVote.vote.Target === 'Passé') {
          behavior.totalSkips++;
        } else {
          behavior.totalVotes++;
          
          // Process accuracy stats
          const accuracy = playerAccuracyMap.get(playerId)!;
          accuracy.totalVotes++;
          
          const voterCamp = getPlayerCampFromRole(
            getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []),
            { regroupWolfSubRoles: true }
          );
          // Find target player by username (as stored in vote data)
          const targetPlayer = game.PlayerStats.find(p => p.Username === playerVote.vote.Target);
          
          if (targetPlayer) {
            const targetPlayerId = getPlayerId(targetPlayer);
            const targetCamp = getPlayerCampFromRole(
              getPlayerFinalRole(targetPlayer.MainRoleInitial, targetPlayer.MainRoleChanges || []),
              { regroupWolfSubRoles: true }
            );
            
            if (voterCamp === targetCamp) {
              accuracy.votesForOwnCamp++;
            } else {
              accuracy.votesForEnemyCamp++;
            }
            
            // Process target stats using target player ID
            const targetStats = playerTargetMap.get(targetPlayerId)!;
            targetStats.totalTimesTargeted++;
            
            if (voterCamp === targetCamp) {
              targetStats.timesTargetedByOwnCamp++;
            } else {
              targetStats.timesTargetedByEnemyCamp++;
            }
            
            // Track target role context
            const targetRole = getPlayerFinalRole(targetPlayer.MainRoleInitial, targetPlayer.MainRoleChanges || []);
            const targetRoleCamp = getPlayerCampFromRole(targetRole, { regroupWolfSubRoles: true });
            
            if (targetRoleCamp === 'Villageois') {
              targetStats.timesTargetedAsVillager++;
            } else if (targetRoleCamp === 'Loup') {
              targetStats.timesTargetedAsWolf++;
            } else {
              targetStats.timesTargetedAsSpecial++;
            }
            
            // Check if this vote led to elimination
            if (wasVoteSuccessful(game, meetingNum, targetPlayerId)) {
              targetStats.eliminationsByVote++;
            }
          }
        }
      } else {
        behavior.totalAbstentions++;
      }
    });
  }

  // Convert maps to final stats arrays using display names
  const playerBehaviors: VotingBehaviorStats[] = [];
  const playerAccuracies: VotingAccuracyStats[] = [];
  const playerTargetStats: VotingTargetStats[] = [];

  game.PlayerStats.forEach(player => {
    const playerId = getPlayerId(player);
    // Player names are already normalized during data loading
    const displayName = player.Username;
    
    const behavior = playerBehaviorMap.get(playerId)!;
    const votingRate = behavior.totalMeetings > 0 ? (behavior.totalVotes / behavior.totalMeetings) * 100 : 0;
    const skippingRate = behavior.totalMeetings > 0 ? (behavior.totalSkips / behavior.totalMeetings) * 100 : 0;
    const abstentionRate = behavior.totalMeetings > 0 ? (behavior.totalAbstentions / behavior.totalMeetings) * 100 : 0;
    
    // Calculate aggressiveness score: high voting rate, low skipping, low abstention
    const aggressivenessScore = votingRate - (skippingRate * 0.5) - (abstentionRate * 0.7);
    
    playerBehaviors.push({
      playerName: displayName, // Use display name for UI
      totalMeetings: behavior.totalMeetings,
      totalVotes: behavior.totalVotes,
      totalSkips: behavior.totalSkips,
      totalAbstentions: behavior.totalAbstentions,
      votingRate,
      skippingRate,
      abstentionRate,
      aggressivenessScore
    });

    const accuracy = playerAccuracyMap.get(playerId)!;
    const accuracyRate = accuracy.totalVotes > 0 ? (accuracy.votesForEnemyCamp / accuracy.totalVotes) * 100 : 0;
    const friendlyFireRate = accuracy.totalVotes > 0 ? (accuracy.votesForOwnCamp / accuracy.totalVotes) * 100 : 0;
    
    playerAccuracies.push({
      playerName: displayName, // Use display name for UI
      totalMeetings: behavior.totalMeetings,
      totalVotes: accuracy.totalVotes,
      votesForEnemyCamp: accuracy.votesForEnemyCamp,
      votesForOwnCamp: accuracy.votesForOwnCamp,
      accuracyRate,
      friendlyFireRate
    });

    const targetStats = playerTargetMap.get(playerId)!;
    const survivalRate = targetStats.totalTimesTargeted > 0 
      ? ((targetStats.totalTimesTargeted - targetStats.eliminationsByVote) / targetStats.totalTimesTargeted) * 100 
      : 100;
    
    playerTargetStats.push({
      playerName: displayName, // Use display name for UI
      totalMeetings: behavior.totalMeetings,
      totalTimesTargeted: targetStats.totalTimesTargeted,
      timesTargetedByEnemyCamp: targetStats.timesTargetedByEnemyCamp,
      timesTargetedByOwnCamp: targetStats.timesTargetedByOwnCamp,
      timesTargetedAsVillager: targetStats.timesTargetedAsVillager,
      timesTargetedAsWolf: targetStats.timesTargetedAsWolf,
      timesTargetedAsSpecial: targetStats.timesTargetedAsSpecial,
      eliminationsByVote: targetStats.eliminationsByVote,
      survivalRate
    });
  });

  return {
    gameId: game.Id,
    totalMeetings: maxMeetingNumber,
    meetingAnalytics,
    playerBehaviors,
    playerAccuracies,
    playerTargetStats
  };
}

/**
 * Calculates voting timing statistics for games with Version >= 0.201 and Modded: true
 * Analyzes when players vote relative to others in the same meeting
 */
export function calculateVotingTimingStats(games: GameLogEntry[]): VotingTimingStats[] {
  const playerTimingMap = new Map<string, {
    totalActiveVotes: number;
    totalTimedVotes: number;
    positionPercentileSum: number;
    timesFirstVoter: number;
    timesLastVoter: number;
    earlyVotes: number;  // First 33% of voters
    lateVotes: number;   // Last 33% of voters
    voteDelaySum: number; // Total seconds from meeting start
  }>();

  // Filter games that support timing data
  const timedGames = games.filter(game => {
    if (!game.Modded) return false;
    if (!game.Version) return false;
    
    // Parse version - must be >= 0.201
    const versionMatch = game.Version.match(/^(\d+)\.(\d+)/);
    if (!versionMatch) return false;
    
    const major = parseInt(versionMatch[1]);
    const minor = parseInt(versionMatch[2]);
    
    // Version 0.201+ or 1.0+
    return (major === 0 && minor >= 201) || major >= 1;
  });

  // Process each game
  timedGames.forEach(game => {
    // Group votes by meeting (Day)
    const votesByMeeting = new Map<number, Array<{
      playerName: string;
      date: Date;
      target: string;
    }>>();

    game.PlayerStats.forEach(player => {
      if (!player.Votes || player.Votes.length === 0) return;
      
      player.Votes.forEach(vote => {
        if (!vote.Date || vote.Target === 'Passé') return;
        
        const meetingVotes = votesByMeeting.get(vote.Day) || [];
        meetingVotes.push({
          playerName: player.Username,
          date: new Date(vote.Date),
          target: vote.Target
        });
        votesByMeeting.set(vote.Day, meetingVotes);
      });
    });

    // Analyze each meeting
    votesByMeeting.forEach((votes) => {
      if (votes.length === 0) return;
      
      // Sort votes by timestamp
      const sortedVotes = [...votes].sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Meeting start time = earliest vote timestamp
      const meetingStartTime = sortedVotes[0].date.getTime();
      
      sortedVotes.forEach((vote, index) => {
        const playerStats = playerTimingMap.get(vote.playerName) || {
          totalActiveVotes: 0,
          totalTimedVotes: 0,
          positionPercentileSum: 0,
          timesFirstVoter: 0,
          timesLastVoter: 0,
          earlyVotes: 0,
          lateVotes: 0,
          voteDelaySum: 0
        };
        
        playerStats.totalActiveVotes++;
        playerStats.totalTimedVotes++;
        
        // Calculate position percentile (0 = first, 100 = last)
        const percentile = sortedVotes.length > 1 
          ? (index / (sortedVotes.length - 1)) * 100 
          : 50; // Middle if only one voter
        playerStats.positionPercentileSum += percentile;
        
        // Track first/last voter
        if (index === 0) playerStats.timesFirstVoter++;
        if (index === sortedVotes.length - 1) playerStats.timesLastVoter++;
        
        // Track early (first 33%) vs late (last 33%)
        const earlyThreshold = Math.ceil(sortedVotes.length / 3);
        const lateThreshold = sortedVotes.length - Math.ceil(sortedVotes.length / 3);
        
        if (index < earlyThreshold) playerStats.earlyVotes++;
        if (index >= lateThreshold) playerStats.lateVotes++;
        
        // Calculate delay from meeting start
        const delaySeconds = (vote.date.getTime() - meetingStartTime) / 1000;
        playerStats.voteDelaySum += delaySeconds;
        
        playerTimingMap.set(vote.playerName, playerStats);
      });
    });
  });

  // Convert to final stats array
  return Array.from(playerTimingMap.entries()).map(([playerName, data]) => {
    const averageVotePositionPercentile = data.totalTimedVotes > 0 
      ? data.positionPercentileSum / data.totalTimedVotes 
      : 50;
    
    const earlyVoterRate = data.totalTimedVotes > 0 
      ? (data.earlyVotes / data.totalTimedVotes) * 100 
      : 0;
    
    const lateVoterRate = data.totalTimedVotes > 0 
      ? (data.lateVotes / data.totalTimedVotes) * 100 
      : 0;
    
    const averageVoteDelaySeconds = data.totalTimedVotes > 0 
      ? data.voteDelaySum / data.totalTimedVotes 
      : 0;
    
    return {
      playerName,
      totalActiveVotes: data.totalActiveVotes,
      totalTimedVotes: data.totalTimedVotes,
      averageVotePositionPercentile,
      timesFirstVoter: data.timesFirstVoter,
      timesLastVoter: data.timesLastVoter,
      earlyVoterRate,
      lateVoterRate,
      averageVoteDelaySeconds
    };
  });
}

/**
 * Statistics for a single meeting day across all games
 */
export interface MeetingDayStats {
  meetingDay: number;
  totalMeetings: number;         // How many games reached this meeting day
  averageVotingRate: number;     // Average % of players who voted (not skipped/abstained)
  averageSkipRate: number;       // Average % of players who skipped
  averageAbstentionRate: number; // Average % of players who didn't participate
}

/**
 * Camp-based voting accuracy statistics
 */
export interface CampVotingStats {
  campName: string;
  totalVotes: number;
  votesForOppositeCamp: number;
  votesForOwnCamp: number;
  accuracyRate: number;          // % of votes targeting opposite camp
  friendlyFireRate: number;      // % of votes targeting own camp
}

/**
 * Global voting statistics across all games
 */
export interface GlobalVotingStats {
  totalMeetings: number;
  totalVotes: number;
  totalSkips: number;
  totalAbstentions: number;
  averageVotingRate: number;
  averageSkipRate: number;
  averageAbstentionRate: number;
  meetingDayStats: MeetingDayStats[];
  campVotingStats: CampVotingStats[];
}

/**
 * Calculates global voting statistics including per-meeting-day analysis and camp accuracy
 */
export function calculateGlobalVotingStats(games: GameLogEntry[]): GlobalVotingStats {
  const meetingDayMap = new Map<number, {
    meetings: number;
    totalVotingRates: number;
    totalSkipRates: number;
    totalAbstentionRates: number;
  }>();

  const campVotingMap = new Map<string, {
    totalVotes: number;
    votesForOppositeCamp: number;
    votesForOwnCamp: number;
  }>();

  let totalMeetings = 0;
  let totalVotes = 0;
  let totalSkips = 0;
  let totalAbstentions = 0;
  let totalVotingRateSum = 0;
  let totalSkipRateSum = 0;
  let totalAbstentionRateSum = 0;
  let meetingCount = 0;

  games.forEach(game => {
    // Get max meeting number for this game
    const maxMeetingNumber = Math.max(
      ...game.PlayerStats.flatMap(player => 
        player.Votes.map(vote => vote.Day)
      ),
      0
    );

    if (maxMeetingNumber === 0) return; // No voting data for this game

    // Process each meeting in this game
    for (let meetingNum = 1; meetingNum <= maxMeetingNumber; meetingNum++) {
      const alivePlayersAtMeeting = getAlivePlayersAtMeeting(game, meetingNum);
      const votesInMeeting = game.PlayerStats.flatMap(player => 
        player.Votes
          .filter(vote => vote.Day === meetingNum)
          .map(vote => ({ voter: player.Username, vote, voterStats: player }))
      );

      // Skip meeting only if game ended at this specific meeting without any votes
      // (e.g., EndTiming = "M3" and meeting 3 has no votes = auto-end)
      // Meetings with no votes are otherwise valid (everyone abstained)
      if (votesInMeeting.length === 0 && game.EndTiming === `M${meetingNum}`) {
        continue;
      }

      const meetingVoteCount = votesInMeeting.filter(v => v.vote.Target !== 'Passé').length;
      const meetingSkipCount = votesInMeeting.filter(v => v.vote.Target === 'Passé').length;
      const meetingAbstentionCount = alivePlayersAtMeeting.length - votesInMeeting.length;

      totalMeetings++;
      totalVotes += meetingVoteCount;
      totalSkips += meetingSkipCount;
      totalAbstentions += meetingAbstentionCount;

      const meetingVotingRate = alivePlayersAtMeeting.length > 0 
        ? (meetingVoteCount / alivePlayersAtMeeting.length) * 100 
        : 0;
      const meetingSkipRate = alivePlayersAtMeeting.length > 0 
        ? (meetingSkipCount / alivePlayersAtMeeting.length) * 100 
        : 0;
      const meetingAbstentionRate = alivePlayersAtMeeting.length > 0 
        ? (meetingAbstentionCount / alivePlayersAtMeeting.length) * 100 
        : 0;

      totalVotingRateSum += meetingVotingRate;
      totalSkipRateSum += meetingSkipRate;
      totalAbstentionRateSum += meetingAbstentionRate;
      meetingCount++;

      // Aggregate by meeting day
      const dayStats = meetingDayMap.get(meetingNum) || {
        meetings: 0,
        totalVotingRates: 0,
        totalSkipRates: 0,
        totalAbstentionRates: 0
      };
      dayStats.meetings++;
      dayStats.totalVotingRates += meetingVotingRate;
      dayStats.totalSkipRates += meetingSkipRate;
      dayStats.totalAbstentionRates += meetingAbstentionRate;
      meetingDayMap.set(meetingNum, dayStats);

      // Process camp-based voting accuracy
      votesInMeeting
        .filter(v => v.vote.Target !== 'Passé')
        .forEach(({ voterStats, vote }) => {
          const voterRole = getPlayerFinalRole(voterStats.MainRoleInitial, voterStats.MainRoleChanges || []);
          const voterCamp = getPlayerCampFromRole(voterRole, { regroupWolfSubRoles: true });

          const targetPlayer = game.PlayerStats.find(p => p.Username === vote.Target);
          if (!targetPlayer) return;

          const targetRole = getPlayerFinalRole(targetPlayer.MainRoleInitial, targetPlayer.MainRoleChanges || []);
          const targetCamp = getPlayerCampFromRole(targetRole, { regroupWolfSubRoles: true });

          const campStats = campVotingMap.get(voterCamp) || {
            totalVotes: 0,
            votesForOppositeCamp: 0,
            votesForOwnCamp: 0
          };

          campStats.totalVotes++;
          if (voterCamp === targetCamp) {
            campStats.votesForOwnCamp++;
          } else {
            campStats.votesForOppositeCamp++;
          }

          campVotingMap.set(voterCamp, campStats);
        });
    }
  });

  // Convert meeting day map to sorted array
  const meetingDayStats: MeetingDayStats[] = Array.from(meetingDayMap.entries())
    .map(([day, stats]) => ({
      meetingDay: day,
      totalMeetings: stats.meetings,
      averageVotingRate: stats.meetings > 0 ? stats.totalVotingRates / stats.meetings : 0,
      averageSkipRate: stats.meetings > 0 ? stats.totalSkipRates / stats.meetings : 0,
      averageAbstentionRate: stats.meetings > 0 ? stats.totalAbstentionRates / stats.meetings : 0
    }))
    .sort((a, b) => a.meetingDay - b.meetingDay);

  // Convert camp voting map to array
  const campVotingStats: CampVotingStats[] = Array.from(campVotingMap.entries())
    .map(([campName, stats]) => ({
      campName,
      totalVotes: stats.totalVotes,
      votesForOppositeCamp: stats.votesForOppositeCamp,
      votesForOwnCamp: stats.votesForOwnCamp,
      accuracyRate: stats.totalVotes > 0 ? (stats.votesForOppositeCamp / stats.totalVotes) * 100 : 0,
      friendlyFireRate: stats.totalVotes > 0 ? (stats.votesForOwnCamp / stats.totalVotes) * 100 : 0
    }))
    .sort((a, b) => b.accuracyRate - a.accuracyRate);

  return {
    totalMeetings,
    totalVotes,
    totalSkips,
    totalAbstentions,
    averageVotingRate: meetingCount > 0 ? totalVotingRateSum / meetingCount : 0,
    averageSkipRate: meetingCount > 0 ? totalSkipRateSum / meetingCount : 0,
    averageAbstentionRate: meetingCount > 0 ? totalAbstentionRateSum / meetingCount : 0,
    meetingDayStats,
    campVotingStats
  };
}

/**
 * Aggregates voting statistics across multiple games for comprehensive analysis
 */
export function calculateAggregatedVotingStats(games: GameLogEntry[]): {
  playerBehaviorStats: VotingBehaviorStats[];
  playerAccuracyStats: VotingAccuracyStats[];
  playerTargetStats: VotingTargetStats[];
  overallMeetingStats: {
    totalMeetings: number;
    averageParticipationRate: number;
    totalVotes: number;
    totalSkips: number;
    totalAbstentions: number;
  };
} {
  const gameAnalyses = games.map(calculateGameVotingAnalysis);
  
  const aggregatedBehavior = new Map<string, {
    totalMeetings: number;
    totalVotes: number;
    totalSkips: number;
    totalAbstentions: number;
  }>();
  
  const aggregatedAccuracy = new Map<string, {
    totalMeetings: number;
    totalVotes: number;
    votesForEnemyCamp: number;
    votesForOwnCamp: number;
  }>();
  
  const aggregatedTargets = new Map<string, {
    totalMeetings: number;
    totalTimesTargeted: number;
    timesTargetedByEnemyCamp: number;
    timesTargetedByOwnCamp: number;
    timesTargetedAsVillager: number;
    timesTargetedAsWolf: number;
    timesTargetedAsSpecial: number;
    eliminationsByVote: number;
  }>();

  let totalMeetings = 0;
  let totalParticipationRateSum = 0;
  let meetingCount = 0;
  let totalVotes = 0;
  let totalSkips = 0;
  let totalAbstentions = 0;

  // Aggregate data from all games
  gameAnalyses.forEach(analysis => {
    totalMeetings += analysis.totalMeetings;
    
    analysis.meetingAnalytics.forEach(meeting => {
      totalParticipationRateSum += meeting.participationRate;
      meetingCount++;
      totalVotes += meeting.totalVotes;
      totalSkips += meeting.totalSkips;
      totalAbstentions += meeting.totalAbstentions;
    });

    analysis.playerBehaviors.forEach(behavior => {
      const existing = aggregatedBehavior.get(behavior.playerName) || {
        totalMeetings: 0,
        totalVotes: 0,
        totalSkips: 0,
        totalAbstentions: 0
      };
      
      aggregatedBehavior.set(behavior.playerName, {
        totalMeetings: existing.totalMeetings + behavior.totalMeetings,
        totalVotes: existing.totalVotes + behavior.totalVotes,
        totalSkips: existing.totalSkips + behavior.totalSkips,
        totalAbstentions: existing.totalAbstentions + behavior.totalAbstentions
      });
    });

    analysis.playerAccuracies.forEach(accuracy => {
      const existing = aggregatedAccuracy.get(accuracy.playerName) || {
        totalMeetings: 0,
        totalVotes: 0,
        votesForEnemyCamp: 0,
        votesForOwnCamp: 0,
      };
      
      aggregatedAccuracy.set(accuracy.playerName, {
        totalMeetings: existing.totalMeetings + accuracy.totalMeetings,
        totalVotes: existing.totalVotes + accuracy.totalVotes,
        votesForEnemyCamp: existing.votesForEnemyCamp + accuracy.votesForEnemyCamp,
        votesForOwnCamp: existing.votesForOwnCamp + accuracy.votesForOwnCamp
      });
    });

    analysis.playerTargetStats.forEach(target => {
      const existing = aggregatedTargets.get(target.playerName) || {
        totalMeetings: 0,
        totalTimesTargeted: 0,
        timesTargetedByEnemyCamp: 0,
        timesTargetedByOwnCamp: 0,
        timesTargetedAsVillager: 0,
        timesTargetedAsWolf: 0,
        timesTargetedAsSpecial: 0,
        eliminationsByVote: 0
      };
      
      aggregatedTargets.set(target.playerName, {
        totalMeetings: existing.totalMeetings + target.totalMeetings,
        totalTimesTargeted: existing.totalTimesTargeted + target.totalTimesTargeted,
        timesTargetedByEnemyCamp: existing.timesTargetedByEnemyCamp + target.timesTargetedByEnemyCamp,
        timesTargetedByOwnCamp: existing.timesTargetedByOwnCamp + target.timesTargetedByOwnCamp,
        timesTargetedAsVillager: existing.timesTargetedAsVillager + target.timesTargetedAsVillager,
        timesTargetedAsWolf: existing.timesTargetedAsWolf + target.timesTargetedAsWolf,
        timesTargetedAsSpecial: existing.timesTargetedAsSpecial + target.timesTargetedAsSpecial,
        eliminationsByVote: existing.eliminationsByVote + target.eliminationsByVote
      });
    });
  });

  // Convert aggregated data to final arrays
  const playerBehaviorStats: VotingBehaviorStats[] = Array.from(aggregatedBehavior.entries()).map(([playerName, data]) => {
    const votingRate = data.totalMeetings > 0 ? (data.totalVotes / data.totalMeetings) * 100 : 0;
    const skippingRate = data.totalMeetings > 0 ? (data.totalSkips / data.totalMeetings) * 100 : 0;
    const abstentionRate = data.totalMeetings > 0 ? (data.totalAbstentions / data.totalMeetings) * 100 : 0;
    const aggressivenessScore = votingRate - (skippingRate * 0.5) - (abstentionRate * 0.7);
    
    return {
      playerName,
      totalMeetings: data.totalMeetings,
      totalVotes: data.totalVotes,
      totalSkips: data.totalSkips,
      totalAbstentions: data.totalAbstentions,
      votingRate,
      skippingRate,
      abstentionRate,
      aggressivenessScore
    };
  });

    const playerAccuracyStats: VotingAccuracyStats[] = Array.from(aggregatedAccuracy.entries()).map(([playerName, data]) => {
    const accuracyRate = data.totalVotes > 0 ? (data.votesForEnemyCamp / data.totalVotes) * 100 : 0;
    const friendlyFireRate = data.totalVotes > 0 ? (data.votesForOwnCamp / data.totalVotes) * 100 : 0;
    
    return {
      playerName,
      totalMeetings: data.totalMeetings,
      totalVotes: data.totalVotes,
      votesForEnemyCamp: data.votesForEnemyCamp,
      votesForOwnCamp: data.votesForOwnCamp,
      accuracyRate,
      friendlyFireRate
    };
  });

  const playerTargetStats: VotingTargetStats[] = Array.from(aggregatedTargets.entries()).map(([playerName, data]) => {
    const survivalRate = data.totalTimesTargeted > 0 
      ? ((data.totalTimesTargeted - data.eliminationsByVote) / data.totalTimesTargeted) * 100 
      : 100;
    
    return {
      playerName,
      totalMeetings: data.totalMeetings,
      totalTimesTargeted: data.totalTimesTargeted,
      timesTargetedByEnemyCamp: data.timesTargetedByEnemyCamp,
      timesTargetedByOwnCamp: data.timesTargetedByOwnCamp,
      timesTargetedAsVillager: data.timesTargetedAsVillager,
      timesTargetedAsWolf: data.timesTargetedAsWolf,
      timesTargetedAsSpecial: data.timesTargetedAsSpecial,
      eliminationsByVote: data.eliminationsByVote,
      survivalRate
    };
  });

  return {
    playerBehaviorStats,
    playerAccuracyStats,
    playerTargetStats,
    overallMeetingStats: {
      totalMeetings,
      averageParticipationRate: meetingCount > 0 ? totalParticipationRateSum / meetingCount : 0,
      totalVotes,
      totalSkips,
      totalAbstentions
    }
  };
}