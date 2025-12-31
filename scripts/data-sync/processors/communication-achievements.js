/**
 * Communication Achievements Processor
 * Processes talking time statistics to generate communication-related achievements
 */

import { getPlayerId } from '../../../src/utils/datasyncExport.js';

/**
 * Process communication achievements for a specific player
 * @param {Object} talkingStats - Talking time statistics object
 * @param {string} playerId - Player ID to generate achievements for
 * @param {string} suffix - Suffix for achievement title (e.g., " (Parties Moddées)")
 * @returns {Array} - Array of achievement objects
 */
export function processCommunicationAchievements(talkingStats, playerId, suffix) {
  const achievements = [];

  if (!talkingStats || !talkingStats.playerStats || talkingStats.playerStats.length === 0) {
    return achievements;
  }

  // Minimum games threshold for talking time achievements
  // Note: Talking time data only available since version 0.215
  const MIN_GAMES_TALKING = 20;

  // Filter players with enough games with talking data
  const eligiblePlayers = talkingStats.playerStats.filter(p => p.gamesPlayed >= MIN_GAMES_TALKING);

  if (eligiblePlayers.length === 0) {
    return achievements;
  }

  // Sort by total talking time (normalized per 60 min)
  const sortedByTotalTalking = [...eligiblePlayers].sort((a, b) => b.secondsAllPer60Min - a.secondsAllPer60Min);

  // Find player's position in the ranking
  const playerIndex = sortedByTotalTalking.findIndex(p => p.playerId === playerId);

  if (playerIndex === -1) {
    return achievements; // Player not found or doesn't meet minimum games
  }

  const playerStats = sortedByTotalTalking[playerIndex];
  const rank = playerIndex + 1;
  const totalRanked = sortedByTotalTalking.length;

  // 🎤 Most Talkative - Top 3 only
  if (rank <= 3) {
    const minutes = Math.floor(playerStats.secondsAllPer60Min / 60);
    const seconds = Math.floor(playerStats.secondsAllPer60Min % 60);
    const timeFormatted = `${minutes}m ${seconds}s`;

    achievements.push({
      id: `communication-most-talkative${suffix.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '-')}`,
      title: `🎤 Bavard N°${rank}${suffix}`,
      description: `${rank === 1 ? 'Champion' : rank === 2 ? 'Vice-champion' : '3ème place'} du temps de parole total avec ${timeFormatted} par heure de jeu`,
      type: 'good',
      category: 'communication',
      rank: rank,
      value: playerStats.secondsAllPer60Min,
      totalRanked: totalRanked,
      redirectTo: {
        tab: 'playerStats',
        subTab: 'talkingTime',
        filters: {
          moddedGames: suffix.includes('Moddées') ? true : false,
          minGames: MIN_GAMES_TALKING
        }
      }
    });
  }

  return achievements;
}
