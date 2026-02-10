/**
 * Potion Usage Statistics Computation
 * 
 * Computes potion drinking habits for players.
 * Calculates the number of potions drunk per 60 minutes of gameplay.
 */

import { getPlayerId, getCanonicalPlayerName, calculateGameDuration } from '../../../src/utils/datasyncExport.js';

/**
 * Check if a game has action data (required for potion stats)
 * @param {Object} game - Game log entry
 * @returns {boolean} - True if game has action data
 */
function gameHasActionData(game) {
  return game.PlayerStats.some(player => player.Actions !== undefined);
}

/**
 * Compute potion usage statistics from game data
 * @param {Array} gameData - Array of game log entries
 * @returns {Object|null} - Potion usage statistics
 */
export function computePotionStatistics(gameData) {
  if (!gameData || gameData.length === 0) {
    return null;
  }

  // Filter games that have action data
  const gamesWithData = gameData.filter(gameHasActionData);

  if (gamesWithData.length === 0) {
    return {
      playerStats: [],
      totalGames: gameData.length,
      gamesWithActionData: 0
    };
  }

  const playerMap = new Map();

  // Process each game with action data
  gamesWithData.forEach(game => {
    game.PlayerStats.forEach(player => {
      // Skip if no Actions array (no action data for this player)
      if (player.Actions === undefined) return;

      const playerId = getPlayerId(player);
      const displayName = getCanonicalPlayerName(player);

      // Calculate player-specific game duration
      const endTime = player.DeathDateIrl || game.EndDate;
      const playerGameDuration = calculateGameDuration(game.StartDate, endTime);
      
      // Skip players with invalid duration
      if (!playerGameDuration || playerGameDuration <= 0) {
        return;
      }

      // Count DrinkPotion actions
      const potionCount = player.Actions.filter(a => a.ActionType === 'DrinkPotion').length;

      if (!playerMap.has(playerId)) {
        playerMap.set(playerId, {
          playerId,
          displayName,
          gamesPlayed: 0,
          gamesWithPotionData: 0,
          totalPotionsDrunk: 0,
          totalGameDurationSeconds: 0
        });
      }

      const stats = playerMap.get(playerId);
      stats.gamesPlayed++;
      stats.gamesWithPotionData++;
      stats.totalPotionsDrunk += potionCount;
      stats.totalGameDurationSeconds += playerGameDuration;
    });
  });

  // Convert to array and calculate normalized stats (per 60 minutes)
  const playerStats = Array.from(playerMap.values()).map(stats => {
    // Normalize per 60 minutes (3600 seconds)
    const normalizationFactor = stats.totalGameDurationSeconds > 0 
      ? 3600 / stats.totalGameDurationSeconds 
      : 0;

    return {
      playerId: stats.playerId,
      playerName: stats.displayName,
      gamesPlayed: stats.gamesPlayed,
      gamesWithPotionData: stats.gamesWithPotionData,
      totalPotionsDrunk: stats.totalPotionsDrunk,
      totalGameDurationSeconds: stats.totalGameDurationSeconds,
      potionsPer60Min: stats.totalPotionsDrunk * normalizationFactor
    };
  });

  return {
    playerStats,
    totalGames: gameData.length,
    gamesWithActionData: gamesWithData.length
  };
}
