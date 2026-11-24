/**
 * General Rankings processor - handles participation and win rate rankings
 */

import { findPlayerRank, createRanking } from '../helpers.js';
import { getMinimumGamesThreshold } from '../shared/ranking-thresholds.js';

/**
 * Process general statistics Rankings for a player
 * @param {Array} playerStats - Array of player statistics
 * @param {string} playerId - Steam ID or unique identifier of the player
 * @param {string} suffix - Suffix for Ranking titles (e.g., ' (Parties Moddées)')
 * @param {number} totalGames - Total number of games in the dataset being ranked
 * @returns {Array} - Array of Rankings
 */
export function processGeneralRankings(playerStats, playerId, suffix, totalGames) {
  const Rankings = [];

  if (!playerStats || playerStats.length === 0) return Rankings;

  const minGames10 = getMinimumGamesThreshold(10, totalGames);
  const minGames50 = getMinimumGamesThreshold(50, totalGames);

  // 1. Best win rate ranking (min. 10 games)
  const eligibleFor10Games = playerStats.filter(p => p.gamesPlayed >= minGames10);
  const byWinRate10 = [...eligibleFor10Games].sort((a, b) => parseFloat(b.winPercent) - parseFloat(a.winPercent));
  const winRate10Rank = findPlayerRank(byWinRate10, playerId, p => parseFloat(p.winPercent));
  if (winRate10Rank) {
    Rankings.push(createRanking(
      `winrate-10-${suffix ? 'modded' : 'all'}`,
      `🏆 Rang ${winRate10Rank.rank} Taux de Victoire${suffix}`,
      `${winRate10Rank.rank}${winRate10Rank.rank === 1 ? 'er' : 'ème'} meilleur taux de victoire: ${winRate10Rank.value}% (min. ${minGames10} parties)`,
      'good',
      winRate10Rank.rank,
      winRate10Rank.value,
      byWinRate10.length
    ));
  }

  // 3. Best win rate ranking (min. 50 games)
  const eligibleFor50Games = playerStats.filter(p => p.gamesPlayed >= minGames50);
  if (eligibleFor50Games.length > 0) {
    const byWinRate50 = [...eligibleFor50Games].sort((a, b) => parseFloat(b.winPercent) - parseFloat(a.winPercent));
    const winRate50Rank = findPlayerRank(byWinRate50, playerId, p => parseFloat(p.winPercent));
    if (winRate50Rank) {
      Rankings.push(createRanking(
        `winrate-50-${suffix ? 'modded' : 'all'}`,
        `🌟 Rang ${winRate50Rank.rank} Taux de Victoire Expert${suffix}`,
        `${winRate50Rank.rank}${winRate50Rank.rank === 1 ? 'er' : 'ème'} meilleur taux de victoire: ${winRate50Rank.value}% (min. ${minGames50} parties)`,
        'good',
        winRate50Rank.rank,
        winRate50Rank.value,
        byWinRate50.length
      ));
    }
  }

  return Rankings;
}
