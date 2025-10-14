/**
 * Utility functions for processing voting behavior statistics
 */
import type { GameLogEntry, PlayerStat } from '../hooks/useCombinedRawData';
import { getPlayerCampFromRole, getPlayerFinalRole } from './datasyncExport';

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
  totalVotes: number;
  votesForEnemyCamp: number;     // Votes targeting opposite camp
  votesForOwnCamp: number;       // Votes targeting same camp (friendly fire)
  votesForSelf: number;          // Self votes (unusual but possible)
  accuracyRate: number;          // (votesForEnemyCamp / totalVotes) * 100
  friendlyFireRate: number;      // (votesForOwnCamp / totalVotes) * 100
}

export interface VotingTargetStats {
  playerName: string;
  totalTimesTargeted: number;
  timesTargetedByEnemyCamp: number;
  timesTargetedByOwnCamp: number;
  timesTargetedAsVillager: number;
  timesTargetedAsWolf: number;
  timesTargetedAsSpecial: number;
  eliminationsByVote: number;    // Times actually eliminated by vote
  survivalRate: number;          // Survived votes / total times targeted
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
  if (deathTiming.startsWith('M')) {
    const deathMeeting = parseInt(deathTiming.substring(1));
    return meetingNumber < deathMeeting;
  }
  
  // For night/day deaths, assume they died before the next meeting
  if (deathTiming.startsWith('N') || deathTiming.startsWith('J')) {
    const deathDay = parseInt(deathTiming.substring(1));
    // If they died on night/day X, they're not alive for meeting X+1
    return meetingNumber <= deathDay;
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
function wasVoteSuccessful(game: GameLogEntry, meetingNumber: number, targetPlayer: string): boolean {
  // Find the player who was targeted
  const target = game.PlayerStats.find(p => p.Username === targetPlayer);
  if (!target) return false;
  
  // Check if they died by vote at the corresponding timing
  if (target.DeathType === 'VOTED' && target.DeathTiming === `M${meetingNumber}`) {
    return true;
  }
  
  return false;
}

/**
 * Calculates voting behavior statistics for a single game
 * Internal function used by calculateAggregatedVotingStats
 */
function calculateGameVotingAnalysis(game: GameLogEntry): GameVotingAnalysis {
  const meetingAnalytics: MeetingAnalytics[] = [];
  const playerBehaviorMap = new Map<string, {
    totalMeetings: number;
    totalVotes: number;
    totalSkips: number;
    totalAbstentions: number;
  }>();
  
  const playerAccuracyMap = new Map<string, {
    totalVotes: number;
    votesForEnemyCamp: number;
    votesForOwnCamp: number;
    votesForSelf: number;
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

  // Initialize maps for all players
  game.PlayerStats.forEach(player => {
    playerBehaviorMap.set(player.Username, {
      totalMeetings: 0,
      totalVotes: 0,
      totalSkips: 0,
      totalAbstentions: 0
    });
    
    playerAccuracyMap.set(player.Username, {
      totalVotes: 0,
      votesForEnemyCamp: 0,
      votesForOwnCamp: 0,
      votesForSelf: 0
    });
    
    playerTargetMap.set(player.Username, {
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
      player.Votes.map(vote => vote.MeetingNr)
    ),
    0
  );

  // Process each meeting
  for (let meetingNum = 1; meetingNum <= maxMeetingNumber; meetingNum++) {
    const alivePlayersAtMeeting = getAlivePlayersAtMeeting(game, meetingNum);
    const votesInMeeting = game.PlayerStats.flatMap(player => 
      player.Votes
        .filter(vote => vote.MeetingNr === meetingNum)
        .map(vote => ({ voter: player.Username, vote, voterRole: player.MainRoleInitial }))
    );

    // Track meeting analytics
    const totalVotes = votesInMeeting.filter(v => v.vote.Target !== 'Passé').length;
    const totalSkips = votesInMeeting.filter(v => v.vote.Target === 'Passé').length;
    const totalAbstentions = alivePlayersAtMeeting.length - votesInMeeting.length;
    
    // Find most targeted player
    const targetCounts = new Map<string, number>();
    votesInMeeting
      .filter(v => v.vote.Target !== 'Passé')
      .forEach(v => {
        const current = targetCounts.get(v.vote.Target) || 0;
        targetCounts.set(v.vote.Target, current + 1);
      });
    
    let mostTargetedPlayer: string | null = null;
    let mostTargetedCount = 0;
    for (const [player, count] of targetCounts.entries()) {
      if (count > mostTargetedCount) {
        mostTargetedPlayer = player;
        mostTargetedCount = count;
      }
    }

    // Find eliminated player
    let eliminatedPlayer: string | null = null;
    if (mostTargetedPlayer && mostTargetedCount > 0) {
      if (wasVoteSuccessful(game, meetingNum, mostTargetedPlayer)) {
        eliminatedPlayer = mostTargetedPlayer;
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
      mostTargetedPlayer,
      mostTargetedCount,
      eliminatedPlayer
    });

    // Process each alive player for behavior stats
    alivePlayersAtMeeting.forEach(player => {
      const behavior = playerBehaviorMap.get(player.Username)!;
      behavior.totalMeetings++;
      
      // Check if this player voted in this meeting
      const playerVote = votesInMeeting.find(v => v.voter === player.Username);
      
      if (playerVote) {
        if (playerVote.vote.Target === 'Passé') {
          behavior.totalSkips++;
        } else {
          behavior.totalVotes++;
          
          // Process accuracy stats
          const accuracy = playerAccuracyMap.get(player.Username)!;
          accuracy.totalVotes++;
          
          const voterCamp = getPlayerCampFromRole(
            getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || [])
          );
          const targetPlayer = game.PlayerStats.find(p => p.Username === playerVote.vote.Target);
          
          if (targetPlayer) {
            const targetCamp = getPlayerCampFromRole(
              getPlayerFinalRole(targetPlayer.MainRoleInitial, targetPlayer.MainRoleChanges || [])
            );
            
            if (playerVote.vote.Target === player.Username) {
              accuracy.votesForSelf++;
            } else if (voterCamp === targetCamp) {
              accuracy.votesForOwnCamp++;
            } else {
              accuracy.votesForEnemyCamp++;
            }
            
            // Process target stats
            const targetStats = playerTargetMap.get(playerVote.vote.Target)!;
            targetStats.totalTimesTargeted++;
            
            if (voterCamp === targetCamp) {
              targetStats.timesTargetedByOwnCamp++;
            } else {
              targetStats.timesTargetedByEnemyCamp++;
            }
            
            // Track target role context
            const targetRole = getPlayerFinalRole(targetPlayer.MainRoleInitial, targetPlayer.MainRoleChanges || []);
            const targetRoleCamp = getPlayerCampFromRole(targetRole);
            
            if (targetRoleCamp === 'Villageois') {
              targetStats.timesTargetedAsVillager++;
            } else if (targetRoleCamp === 'Loup') {
              targetStats.timesTargetedAsWolf++;
            } else {
              targetStats.timesTargetedAsSpecial++;
            }
            
            // Check if this vote led to elimination
            if (wasVoteSuccessful(game, meetingNum, playerVote.vote.Target)) {
              targetStats.eliminationsByVote++;
            }
          }
        }
      } else {
        behavior.totalAbstentions++;
      }
    });
  }

  // Convert maps to final stats arrays
  const playerBehaviors: VotingBehaviorStats[] = [];
  const playerAccuracies: VotingAccuracyStats[] = [];
  const playerTargetStats: VotingTargetStats[] = [];

  game.PlayerStats.forEach(player => {
    const behavior = playerBehaviorMap.get(player.Username)!;
    const votingRate = behavior.totalMeetings > 0 ? (behavior.totalVotes / behavior.totalMeetings) * 100 : 0;
    const skippingRate = behavior.totalMeetings > 0 ? (behavior.totalSkips / behavior.totalMeetings) * 100 : 0;
    const abstentionRate = behavior.totalMeetings > 0 ? (behavior.totalAbstentions / behavior.totalMeetings) * 100 : 0;
    
    // Calculate aggressiveness score: high voting rate, low skipping, low abstention
    const aggressivenessScore = votingRate - (skippingRate * 0.5) - (abstentionRate * 0.7);
    
    playerBehaviors.push({
      playerName: player.Username,
      totalMeetings: behavior.totalMeetings,
      totalVotes: behavior.totalVotes,
      totalSkips: behavior.totalSkips,
      totalAbstentions: behavior.totalAbstentions,
      votingRate,
      skippingRate,
      abstentionRate,
      aggressivenessScore
    });

    const accuracy = playerAccuracyMap.get(player.Username)!;
    const accuracyRate = accuracy.totalVotes > 0 ? (accuracy.votesForEnemyCamp / accuracy.totalVotes) * 100 : 0;
    const friendlyFireRate = accuracy.totalVotes > 0 ? (accuracy.votesForOwnCamp / accuracy.totalVotes) * 100 : 0;
    
    playerAccuracies.push({
      playerName: player.Username,
      totalVotes: accuracy.totalVotes,
      votesForEnemyCamp: accuracy.votesForEnemyCamp,
      votesForOwnCamp: accuracy.votesForOwnCamp,
      votesForSelf: accuracy.votesForSelf,
      accuracyRate,
      friendlyFireRate
    });

    const targetStats = playerTargetMap.get(player.Username)!;
    const survivalRate = targetStats.totalTimesTargeted > 0 
      ? ((targetStats.totalTimesTargeted - targetStats.eliminationsByVote) / targetStats.totalTimesTargeted) * 100 
      : 100;
    
    playerTargetStats.push({
      playerName: player.Username,
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
    totalVotes: number;
    votesForEnemyCamp: number;
    votesForOwnCamp: number;
    votesForSelf: number;
  }>();
  
  const aggregatedTargets = new Map<string, {
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
        totalVotes: 0,
        votesForEnemyCamp: 0,
        votesForOwnCamp: 0,
        votesForSelf: 0
      };
      
      aggregatedAccuracy.set(accuracy.playerName, {
        totalVotes: existing.totalVotes + accuracy.totalVotes,
        votesForEnemyCamp: existing.votesForEnemyCamp + accuracy.votesForEnemyCamp,
        votesForOwnCamp: existing.votesForOwnCamp + accuracy.votesForOwnCamp,
        votesForSelf: existing.votesForSelf + accuracy.votesForSelf
      });
    });

    analysis.playerTargetStats.forEach(target => {
      const existing = aggregatedTargets.get(target.playerName) || {
        totalTimesTargeted: 0,
        timesTargetedByEnemyCamp: 0,
        timesTargetedByOwnCamp: 0,
        timesTargetedAsVillager: 0,
        timesTargetedAsWolf: 0,
        timesTargetedAsSpecial: 0,
        eliminationsByVote: 0
      };
      
      aggregatedTargets.set(target.playerName, {
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
      totalVotes: data.totalVotes,
      votesForEnemyCamp: data.votesForEnemyCamp,
      votesForOwnCamp: data.votesForOwnCamp,
      votesForSelf: data.votesForSelf,
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