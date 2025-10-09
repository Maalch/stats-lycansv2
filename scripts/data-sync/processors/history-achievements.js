/**
 * History achievements processor - handles map-based performance rankings
 */

import { findPlayerMapRank, createAchievement } from '../helpers.js';

/**
 * Process history/map-based achievements for a player
 * @param {Array} mapStats - Array of player map statistics
 * @param {string} playerName - Name of the player
 * @param {string} suffix - Suffix for achievement titles (e.g., ' (Parties Moddées)')
 * @returns {Array} - Array of achievements
 */
export function processHistoryAchievements(mapStats, playerName, suffix) {
  const achievements = [];

  if (!mapStats || mapStats.length === 0) return achievements;

  // 1. Best win rate ranking (Village map)
  const eligibleForVillage = mapStats.filter(p => p.villageGames >= 10);
  if (eligibleForVillage.length > 0) {
    const byVillageWinRate = [...eligibleForVillage].sort((a, b) => b.villageWinRate - a.villageWinRate);
    const villageWinRateRank = findPlayerMapRank(byVillageWinRate, playerName, 'Village');
    if (villageWinRateRank) {
      achievements.push(createAchievement(
        `village-winrate-${suffix ? 'modded' : 'all'}`,
        `🏘️ Rang ${villageWinRateRank.rank} Village${suffix}`,
        `${villageWinRateRank.rank}${villageWinRateRank.rank === 1 ? 'er' : 'ème'} meilleur taux de victoire sur Village: ${villageWinRateRank.value.toFixed(1)}% (${villageWinRateRank.games} parties, min. 10)`,
        'good',
        villageWinRateRank.rank,
        villageWinRateRank.value,
        byVillageWinRate.length,
        {
          tab: 'players',
          subTab: 'playersGeneral',
          mapFilter: 'village'
        },
        'map'
      ));
    }
  }

  // 2. Best win rate ranking (Château map)
  const eligibleForChateau = mapStats.filter(p => p.chateauGames >= 10);
  if (eligibleForChateau.length > 0) {
    const byChateauWinRate = [...eligibleForChateau].sort((a, b) => b.chateauWinRate - a.chateauWinRate);
    const chateauWinRateRank = findPlayerMapRank(byChateauWinRate, playerName, 'Château');
    if (chateauWinRateRank) {
      achievements.push(createAchievement(
        `chateau-winrate-${suffix ? 'modded' : 'all'}`,
        `🏰 Rang ${chateauWinRateRank.rank} Château${suffix}`,
        `${chateauWinRateRank.rank}${chateauWinRateRank.rank === 1 ? 'er' : 'ème'} meilleur taux de victoire sur Château: ${chateauWinRateRank.value.toFixed(1)}% (${chateauWinRateRank.games} parties, min. 10)`,
        'good',
        chateauWinRateRank.rank,
        chateauWinRateRank.value,
        byChateauWinRate.length,
        {
          tab: 'players',
          subTab: 'playersGeneral',
          mapFilter: 'chateau'
        },
        'map'
      ));
    }
  }

  return achievements;
}
