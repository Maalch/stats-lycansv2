/**
 * General achievements processor - handles participation and win rate rankings
 */

import { findPlayerRank, createAchievement } from '../helpers.js';

/**
 * Process general statistics achievements for a player
 * @param {Array} playerStats - Array of player statistics
 * @param {string} playerId - Steam ID or unique identifier of the player
 * @param {string} suffix - Suffix for achievement titles (e.g., ' (Parties Moddées)')
 * @returns {Array} - Array of achievements
 */
export function processGeneralAchievements(playerStats, playerId, suffix) {
  const achievements = [];

  if (!playerStats || playerStats.length === 0) return achievements;

  // 1. Participations ranking
  const byParticipations = [...playerStats].sort((a, b) => b.gamesPlayed - a.gamesPlayed);
  const participationRank = findPlayerRank(byParticipations, playerId, p => p.gamesPlayed);
  if (participationRank) {
    achievements.push(createAchievement(
      `participation-${suffix ? 'modded' : 'all'}`,
      `📊 Rang ${participationRank.rank} Participations${suffix}`,
      `${participationRank.rank}${participationRank.rank === 1 ? 'er' : 'ème'} joueur le plus actif avec ${participationRank.value} parties`,
      'good',
      participationRank.rank,
      participationRank.value,
      byParticipations.length
    ));
  }

  // 2. Best win rate ranking (min. 10 games)
  const eligibleFor10Games = playerStats.filter(p => p.gamesPlayed >= 10);
  const byWinRate10 = [...eligibleFor10Games].sort((a, b) => parseFloat(b.winPercent) - parseFloat(a.winPercent));
  const winRate10Rank = findPlayerRank(byWinRate10, playerId, p => parseFloat(p.winPercent));
  if (winRate10Rank) {
    achievements.push(createAchievement(
      `winrate-10-${suffix ? 'modded' : 'all'}`,
      `🏆 Rang ${winRate10Rank.rank} Taux de Victoire${suffix}`,
      `${winRate10Rank.rank}${winRate10Rank.rank === 1 ? 'er' : 'ème'} meilleur taux de victoire: ${winRate10Rank.value}% (min. 10 parties)`,
      'good',
      winRate10Rank.rank,
      winRate10Rank.value,
      byWinRate10.length
    ));
  }

  // 3. Best win rate ranking (min. 50 games)
  const eligibleFor50Games = playerStats.filter(p => p.gamesPlayed >= 50);
  if (eligibleFor50Games.length > 0) {
    const byWinRate50 = [...eligibleFor50Games].sort((a, b) => parseFloat(b.winPercent) - parseFloat(a.winPercent));
    const winRate50Rank = findPlayerRank(byWinRate50, playerId, p => parseFloat(p.winPercent));
    if (winRate50Rank) {
      achievements.push(createAchievement(
        `winrate-50-${suffix ? 'modded' : 'all'}`,
        `🌟 Rang ${winRate50Rank.rank} Taux de Victoire Expert${suffix}`,
        `${winRate50Rank.rank}${winRate50Rank.rank === 1 ? 'er' : 'ème'} meilleur taux de victoire: ${winRate50Rank.value}% (min. 50 parties)`,
        'good',
        winRate50Rank.rank,
        winRate50Rank.value,
        byWinRate50.length
      ));
    }
  }

  return achievements;
}
