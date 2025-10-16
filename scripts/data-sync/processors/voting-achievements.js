/**
 * Voting achievements processor - handles voting behavior and aggressiveness rankings
 */

import { findPlayerRank, createAchievement } from '../helpers.js';

/**
 * Process voting statistics achievements for a player
 * @param {Object} votingStats - Aggregated voting statistics
 * @param {string} playerName - Name of the player
 * @param {string} suffix - Suffix for achievement titles (e.g., ' (Parties Moddées)')
 * @returns {Array} - Array of achievements
 */
export function processVotingAchievements(votingStats, playerName, suffix) {
  const achievements = [];

  if (!votingStats || !votingStats.playerBehaviorStats || votingStats.playerBehaviorStats.length === 0) {
    return achievements;
  }

  const { playerBehaviorStats, playerAccuracyStats, playerTargetStats } = votingStats;

  // 1. Aggressiveness Score ranking (min. 25 meetings)
  const eligibleForAggressiveness = playerBehaviorStats.filter(p => p.totalMeetings >= 25);
  if (eligibleForAggressiveness.length > 0) {
    const byAggressiveness = [...eligibleForAggressiveness].sort((a, b) => b.aggressivenessScore - a.aggressivenessScore);
    const aggressivenessRank = findPlayerRank(byAggressiveness, playerName, p => p.aggressivenessScore);
    
    if (aggressivenessRank) {
      const isTopRank = aggressivenessRank.rank <= 3;
      achievements.push(createAchievement(
        `aggressiveness-${suffix ? 'modded' : 'all'}`,
        `🚨 Rang ${aggressivenessRank.rank} Score d'Agressivité aux votes${suffix}`,
        `${aggressivenessRank.rank}${aggressivenessRank.rank === 1 ? 'er' : 'ème'} score d'agressivité: ${aggressivenessRank.value.toFixed(1)} (min. 25 meetings)`,
        isTopRank ? 'good' : 'neutral',
        aggressivenessRank.rank,
        aggressivenessRank.value,
        byAggressiveness.length,
        {
          tab: 'players',
          subTab: 'votingStats'
        },
        'voting'
      ));
    }
  }

  // 2. Voting Rate ranking (min. 25 meetings) - Most consistent voters
  const eligibleForVotingRate = playerBehaviorStats.filter(p => p.totalMeetings >= 25);
  if (eligibleForVotingRate.length > 0) {
    const byVotingRate = [...eligibleForVotingRate].sort((a, b) => b.votingRate - a.votingRate);
    const votingRateRank = findPlayerRank(byVotingRate, playerName, p => p.votingRate);
    
    if (votingRateRank) {
      const isTopRank = votingRateRank.rank <= 3;
      achievements.push(createAchievement(
        `voting-rate-${suffix ? 'modded' : 'all'}`,
        `🙋 Rang ${votingRateRank.rank} Taux de Vote${suffix}`,
        `${votingRateRank.rank}${votingRateRank.rank === 1 ? 'er' : 'ème'} taux de participation aux votes: ${votingRateRank.value.toFixed(1)}% (min. 25 meetings)`,
        isTopRank ? 'good' : 'neutral',
        votingRateRank.rank,
        votingRateRank.value,
        byVotingRate.length,
        {
          tab: 'players',
          subTab: 'votingStats'
        },
        'voting'
      ));
    }
  }

  // 3. Voting Accuracy ranking (min. 25 meetings) - Most strategic voters
  const eligibleForAccuracy = playerAccuracyStats.filter(p => p.totalMeetings >= 25);
  if (eligibleForAccuracy.length > 0) {
    const byAccuracy = [...eligibleForAccuracy].sort((a, b) => {
      // Primary sort: accuracy rate (descending)
      if (b.accuracyRate !== a.accuracyRate) {
        return b.accuracyRate - a.accuracyRate;
      }
      // Tiebreaker: total votes (descending - more votes = better)
      return b.totalVotes - a.totalVotes;
    });
    const accuracyRank = findPlayerRank(byAccuracy, playerName, p => p.accuracyRate);
    
    if (accuracyRank) {
      const isTopRank = accuracyRank.rank <= 3;
      achievements.push(createAchievement(
        `voting-accuracy-${suffix ? 'modded' : 'all'}`,
        `🎯 Rang ${accuracyRank.rank} Précision des Votes${suffix}`,
        `${accuracyRank.rank}${accuracyRank.rank === 1 ? 'er' : 'ème'} précision des votes contre le camp adverse: ${accuracyRank.value.toFixed(1)}% (min. 25 meetings)`,
        isTopRank ? 'good' : 'neutral',
        accuracyRank.rank,
        accuracyRank.value,
        byAccuracy.length,
        {
          tab: 'players',
          subTab: 'votingStats'
        },
        'voting'
      ));
    }
  }


  return achievements;
}
