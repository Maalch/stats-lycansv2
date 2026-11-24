/**
 * History Rankings processor - handles map-based performance rankings
 */

import { findPlayerMapRank, createRanking } from '../helpers.js';
import { getMinimumGamesThreshold } from '../shared/ranking-thresholds.js';

/**
 * Process history/map-based Rankings for a player
 * @param {Array} mapStats - Array of player map statistics
 * @param {string} playerId - Steam ID or unique identifier of the player
 * @param {string} suffix - Suffix for Ranking titles (e.g., ' (Parties Moddées)')
 * @param {number} totalGames - Total number of games in the dataset being ranked
 * @returns {Array} - Array of Rankings
 */
export function processHistoryRankings(mapStats, playerId, suffix, totalGames) {
  const Rankings = [];

  if (!mapStats || mapStats.length === 0) return Rankings;

  const minGames = getMinimumGamesThreshold(10, totalGames);

  // 1. Best win rate ranking (Village map)
  const eligibleForVillage = mapStats.filter(p => p.villageGames >= minGames);
  if (eligibleForVillage.length > 0) {
    const byVillageWinRate = [...eligibleForVillage].sort((a, b) => b.villageWinRate - a.villageWinRate);
    const villageWinRateRank = findPlayerMapRank(byVillageWinRate, playerId, 'village');
    if (villageWinRateRank) {
      Rankings.push(createRanking(
        `village-winrate-${suffix ? 'modded' : 'all'}`,
        `🏘️ Rang ${villageWinRateRank.rank} Village${suffix}`,
        `${villageWinRateRank.rank}${villageWinRateRank.rank === 1 ? 'er' : 'ème'} meilleur taux de victoire sur Village: ${villageWinRateRank.value.toFixed(1)}% (${villageWinRateRank.games} parties, min. ${minGames})`,
        'good',
        villageWinRateRank.rank,
        villageWinRateRank.value,
        byVillageWinRate.length,
        {
          tab: 'rankings',
          subTab: 'playersGeneral',
          mapFilter: 'village'
        },
        'map'
      ));
    }
  }

  // 2. Best win rate ranking (Château map)
  const eligibleForChateau = mapStats.filter(p => p.chateauGames >= minGames);
  if (eligibleForChateau.length > 0) {
    const byChateauWinRate = [...eligibleForChateau].sort((a, b) => b.chateauWinRate - a.chateauWinRate);
    const chateauWinRateRank = findPlayerMapRank(byChateauWinRate, playerId, 'chateau');
    if (chateauWinRateRank) {
      Rankings.push(createRanking(
        `chateau-winrate-${suffix ? 'modded' : 'all'}`,
        `🏰 Rang ${chateauWinRateRank.rank} Château${suffix}`,
        `${chateauWinRateRank.rank}${chateauWinRateRank.rank === 1 ? 'er' : 'ème'} meilleur taux de victoire sur Château: ${chateauWinRateRank.value.toFixed(1)}% (${chateauWinRateRank.games} parties, min. ${minGames})`,
        'good',
        chateauWinRateRank.rank,
        chateauWinRateRank.value,
        byChateauWinRate.length,
        {
          tab: 'rankings',
          subTab: 'playersGeneral',
          mapFilter: 'chateau'
        },
        'map'
      ));
    }
  }

  return Rankings;
}
