/**
 * Voting achievements processor - handles voting behavior and aggressiveness rankings
 */

import { findPlayerRank, createAchievement } from '../helpers.js';

/**
 * Process voting statistics achievements for a player
 * @param {Object} votingStats - Aggregated voting statistics
 * @param {string} playerId - Player ID (Steam ID)
 * @param {string} suffix - Suffix for achievement titles (e.g., ' (Parties Moddées)')
 * @returns {Array} - Array of achievements
 */
export function processVotingAchievements(votingStats, playerId, suffix) {
  const achievements = [];

  if (!votingStats || !votingStats.playerBehaviorStats || votingStats.playerBehaviorStats.length === 0) {
    return achievements;
  }

  const { playerBehaviorStats, playerAccuracyStats } = votingStats;

  // 1. Aggressiveness Score ranking (min. 25 meetings)
  const eligibleForAggressiveness = playerBehaviorStats.filter(p => p.totalMeetings >= 25);
  if (eligibleForAggressiveness.length > 0) {
    const byAggressiveness = [...eligibleForAggressiveness].sort((a, b) => b.aggressivenessScore - a.aggressivenessScore);
    const aggressivenessRank = findPlayerRank(byAggressiveness, playerId, p => p.aggressivenessScore);
    
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

  // 2. Voting Accuracy ranking (min. 25 meetings) - Most strategic voters
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
    const accuracyRank = findPlayerRank(byAccuracy, playerId, p => p.accuracyRate);
    
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
