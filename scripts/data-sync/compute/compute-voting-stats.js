/**
 * Voting Statistics Computation Module
 * 
 * Computes comprehensive voting behavior, accuracy, and targeting statistics
 * including voting rates, accuracy rates, and elimination patterns.
 */

import { getPlayerId, getPlayerFinalRole, getPlayerCampFromRole } from '../../../src/utils/datasyncExport.js';

/**
 * Compute voting behavior statistics for all players
 * @param {Array} gameData - Array of game entries
 * @returns {Object} - Object with voting behavior, accuracy, and target statistics
 */
export function computeVotingStatistics(gameData) {
  const playerBehaviorMap = new Map();
  const playerAccuracyMap = new Map();
  const playerTargetMap = new Map();
  const playerFirstVoteMap = new Map(); // Track first/early voting behavior

  // Helper to determine if a player was alive at a meeting
  function wasPlayerAliveAtMeeting(player, meetingNumber) {
    if (!player.DeathTiming) return true;
    
    const deathTiming = player.DeathTiming.toUpperCase();
    
    if (deathTiming.startsWith('M')) {
      const deathMeeting = parseInt(deathTiming.substring(1));
      return meetingNumber < deathMeeting;
    }
    
    if (deathTiming.startsWith('N') || deathTiming.startsWith('J')) {
      const deathDay = parseInt(deathTiming.substring(1));
      // Sequence: J1 -> N1 -> M1 -> J2 -> N2 -> M2
      // If player dies at J2 or N2, they are NOT alive for M2
      return meetingNumber < deathDay;
    }
    
    return true;
  }

  // Helper to get alive players at a meeting
  function getAlivePlayersAtMeeting(game, meetingNumber) {
    return game.PlayerStats.filter(player => wasPlayerAliveAtMeeting(player, meetingNumber));
  }

  // Process each game
  gameData.forEach(game => {
    if (!game.PlayerStats) return;

    // Initialize maps for players in this game
    game.PlayerStats.forEach(player => {
      const playerId = getPlayerId(player);
      const playerName = player.Username;
      
      if (!playerBehaviorMap.has(playerId)) {
        playerBehaviorMap.set(playerId, {
          playerName: playerName,
          totalMeetings: 0,
          totalVotes: 0,
          totalSkips: 0,
          totalAbstentions: 0
        });
      }
      
      if (!playerAccuracyMap.has(playerId)) {
        playerAccuracyMap.set(playerId, {
          playerName: playerName,
          totalMeetings: 0,
          totalVotes: 0,
          votesForEnemyCamp: 0,
          votesForOwnCamp: 0
        });
      }
      
      if (!playerTargetMap.has(playerId)) {
        playerTargetMap.set(playerId, {
          playerName: playerName,
          totalTimesTargeted: 0,
          timesTargetedByEnemyCamp: 0,
          timesTargetedByOwnCamp: 0,
          timesTargetedAsVillager: 0,
          timesTargetedAsWolf: 0,
          timesTargetedAsSpecial: 0,
          eliminationsByVote: 0
        });
      }

      if (!playerFirstVoteMap.has(playerId)) {
        playerFirstVoteMap.set(playerId, {
          playerName: playerName,
          totalMeetingsWithVotes: 0,
          timesFirstToVote: 0,
          timesEarlyVote: 0 // Top 33% of voters
        });
      }
    });

    // Find max meeting number
    const maxMeetingNumber = Math.max(
      ...game.PlayerStats.flatMap(player => 
        (player.Votes || []).map(vote => vote.Day || 0)
      ),
      0
    );

    // Process each meeting
    for (let meetingNum = 1; meetingNum <= maxMeetingNumber; meetingNum++) {
      const alivePlayersAtMeeting = getAlivePlayersAtMeeting(game, meetingNum);
      const votesInMeeting = game.PlayerStats.flatMap(player => 
        (player.Votes || [])
          .filter(vote => vote.Day === meetingNum)
          .map(vote => ({ 
            voterId: getPlayerId(player),
            voter: player.Username, 
            vote, 
            voterRole: getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || [])
          }))
      );

      // Sort votes by date to determine first voters
      // Filter out "Passé" votes for first-vote analysis
      const realVotesInMeeting = votesInMeeting
        .filter(v => v.vote.Target !== 'Passé' && v.vote.Date)
        .sort((a, b) => new Date(a.vote.Date) - new Date(b.vote.Date));
      
      // Determine first voter and early voters (top 33%)
      if (realVotesInMeeting.length > 0) {
        const firstVoterId = realVotesInMeeting[0].voterId;
        const earlyVoteThreshold = Math.ceil(realVotesInMeeting.length * 0.33);
        
        realVotesInMeeting.forEach((voteData, index) => {
          const firstVoteStats = playerFirstVoteMap.get(voteData.voterId);
          if (firstVoteStats) {
            if (index === 0) {
              firstVoteStats.timesFirstToVote++;
            }
            if (index < earlyVoteThreshold) {
              firstVoteStats.timesEarlyVote++;
            }
          }
        });
        
        // Mark all players who voted (not skipped/abstained) in this meeting
        realVotesInMeeting.forEach(voteData => {
          const firstVoteStats = playerFirstVoteMap.get(voteData.voterId);
          if (firstVoteStats) {
            firstVoteStats.totalMeetingsWithVotes++;
          }
        });
      }

      // Process each alive player
      alivePlayersAtMeeting.forEach(player => {
        const playerId = getPlayerId(player);
        const behavior = playerBehaviorMap.get(playerId);
        const accuracy = playerAccuracyMap.get(playerId);
        behavior.totalMeetings++;
        accuracy.totalMeetings++;

        // Find player's vote in this meeting
        const playerVote = votesInMeeting.find(v => v.voterId === playerId);
        
        if (!playerVote) {
          // No vote = abstention
          behavior.totalAbstentions++;
        } else if (playerVote.vote.Target === 'Passé') {
          // Skip vote
          behavior.totalSkips++;
        } else {
          // Real vote
          behavior.totalVotes++;
          accuracy.totalVotes++;

          // Check accuracy (voting for enemy camp vs own camp)
          const voterCamp = getPlayerCampFromRole(playerVote.voterRole, { regroupWolfSubRoles: true });
          const targetPlayer = game.PlayerStats.find(p => p.Username === playerVote.vote.Target);
          
          if (targetPlayer) {
            const targetRole = getPlayerFinalRole(targetPlayer.MainRoleInitial, targetPlayer.MainRoleChanges || []);
            const targetCamp = getPlayerCampFromRole(targetRole, { regroupWolfSubRoles: true });
            
            if (voterCamp !== targetCamp) {
              accuracy.votesForEnemyCamp++;
            } else {
              accuracy.votesForOwnCamp++;
            }
          }
        }
      });

      // Process target statistics
      votesInMeeting
        .filter(v => v.vote.Target !== 'Passé')
        .forEach(v => {
          const targetPlayer = game.PlayerStats.find(p => p.Username === v.vote.Target);
          if (!targetPlayer) return;

          const targetPlayerId = getPlayerId(targetPlayer);
          const targetStats = playerTargetMap.get(targetPlayerId);
          targetStats.totalTimesTargeted++;

          // Determine voter and target camps
          const voterCamp = getPlayerCampFromRole(v.voterRole, { regroupWolfSubRoles: true });
          const targetRole = getPlayerFinalRole(targetPlayer.MainRoleInitial, targetPlayer.MainRoleChanges || []);
          const targetCamp = getPlayerCampFromRole(targetRole, { regroupWolfSubRoles: true });

          if (voterCamp !== targetCamp) {
            targetStats.timesTargetedByEnemyCamp++;
          } else {
            targetStats.timesTargetedByOwnCamp++;
          }

          // Track role-specific targeting
          if (targetCamp === 'Villageois') {
            targetStats.timesTargetedAsVillager++;
          } else if (targetCamp === 'Loup') {
            targetStats.timesTargetedAsWolf++;
          } else {
            targetStats.timesTargetedAsSpecial++;
          }

          // Check if this vote led to elimination
          if (targetPlayer.DeathType === 'VOTED' && targetPlayer.DeathTiming === `M${meetingNum}`) {
            targetStats.eliminationsByVote++;
          }
        });
    }
  });

  // Convert maps to final arrays with calculated rates
  const playerBehaviorStats = Array.from(playerBehaviorMap.entries()).map(([playerId, data]) => {
    const votingRate = data.totalMeetings > 0 ? (data.totalVotes / data.totalMeetings) * 100 : 0;
    const skippingRate = data.totalMeetings > 0 ? (data.totalSkips / data.totalMeetings) * 100 : 0;
    const abstentionRate = data.totalMeetings > 0 ? (data.totalAbstentions / data.totalMeetings) * 100 : 0;
    const aggressivenessScore = votingRate - (skippingRate * 0.5) - (abstentionRate * 0.7);

    return {
      player: playerId, // Use playerId as the main player identifier
      playerName: data.playerName,
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

  const playerAccuracyStats = Array.from(playerAccuracyMap.entries()).map(([playerId, data]) => {
    const accuracyRate = data.totalVotes > 0 ? (data.votesForEnemyCamp / data.totalVotes) * 100 : 0;
    const friendlyFireRate = data.totalVotes > 0 ? (data.votesForOwnCamp / data.totalVotes) * 100 : 0;

    return {
      player: playerId, // Use playerId as the main player identifier
      playerName: data.playerName,
      totalMeetings: data.totalMeetings,
      totalVotes: data.totalVotes,
      votesForEnemyCamp: data.votesForEnemyCamp,
      votesForOwnCamp: data.votesForOwnCamp,
      accuracyRate,
      friendlyFireRate
    };
  });

  const playerTargetStats = Array.from(playerTargetMap.entries()).map(([playerId, data]) => {
    const survivalRate = data.totalTimesTargeted > 0 
      ? ((data.totalTimesTargeted - data.eliminationsByVote) / data.totalTimesTargeted) * 100 
      : 100;

    return {
      player: playerId, // Use playerId as the main player identifier
      playerName: data.playerName,
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

  const playerFirstVoteStats = Array.from(playerFirstVoteMap.entries()).map(([playerId, data]) => {
    const firstVoteRate = data.totalMeetingsWithVotes > 0 
      ? (data.timesFirstToVote / data.totalMeetingsWithVotes) * 100 
      : 0;
    const earlyVoteRate = data.totalMeetingsWithVotes > 0 
      ? (data.timesEarlyVote / data.totalMeetingsWithVotes) * 100 
      : 0;

    return {
      player: playerId,
      playerName: data.playerName,
      totalMeetingsWithVotes: data.totalMeetingsWithVotes,
      timesFirstToVote: data.timesFirstToVote,
      timesEarlyVote: data.timesEarlyVote,
      firstVoteRate,
      earlyVoteRate
    };
  });

  return {
    playerBehaviorStats,
    playerAccuracyStats,
    playerTargetStats,
    playerFirstVoteStats
  };
}
