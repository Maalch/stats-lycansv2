/**
 * Map statistics computation functions
 */

import { getPlayerId } from '../../../src/utils/datasyncExport.js';
import { computePlayerGameHistory } from './compute-player-history.js';

/**
 * Compute map statistics for all players
 * @param {Array} gameData - Array of game entries
 * @returns {Array} - Array of player map statistics
 */
export function computeMapStats(gameData) {
  // Get all unique players by ID
  const allPlayersMap = new Map();
  gameData.forEach(game => {
    game.PlayerStats.forEach(playerStat => {
      const playerId = getPlayerId(playerStat);
      if (!allPlayersMap.has(playerId)) {
        allPlayersMap.set(playerId, playerStat.Username);
      }
    });
  });

  // Calculate stats for each player
  const playerMapStats = [];
  allPlayersMap.forEach((playerName, playerId) => {
    const playerHistory = computePlayerGameHistory(playerId, gameData);
    if (playerHistory && playerHistory.mapStats) {
      const villageStats = playerHistory.mapStats['Village'] || { appearances: 0, wins: 0, winRate: 0 };
      const chateauStats = playerHistory.mapStats['Château'] || { appearances: 0, wins: 0, winRate: 0 };
      
      playerMapStats.push({
        player: playerId, // Use playerId as the main player identifier
        playerName: playerName, // Keep playerName for reference
        playerId: playerId,
        villageWinRate: villageStats.winRate,
        villageGames: villageStats.appearances,
        chateauWinRate: chateauStats.winRate,
        chateauGames: chateauStats.appearances
      });
    }
  });

  return playerMapStats;
}
