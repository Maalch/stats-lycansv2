/**
 * Player game history computation functions
 */

import { getPlayerFinalRole, getPlayerId, getPlayerCampFromRole } from '../../../src/utils/datasyncExport.js';

/**
 * Compute player game history from game data
 * @param {string} playerIdentifier - Player ID (Steam ID) or username
 * @param {Array} gameData - Array of game entries
 * @returns {Object|null} - Player history data or null
 */
export function computePlayerGameHistory(playerIdentifier, gameData) {
  if (!playerIdentifier || playerIdentifier.trim() === '' || gameData.length === 0) {
    return null;
  }

  const playerGames = [];
  let playerName = playerIdentifier; // Will be updated when we find the player

  gameData.forEach(game => {
    // Find the player in this game's PlayerStats by ID or username
    const playerStat = game.PlayerStats.find(
      player => getPlayerId(player) === playerIdentifier || 
                player.Username.toLowerCase() === playerIdentifier.toLowerCase()
    );

    if (playerStat) {
      // Update playerName to use the actual username from the first found game
      if (playerName === playerIdentifier) {
        playerName = playerStat.Username;
      }
      
      // Get player's camp from their final role in the game
      const roleName = getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []);
      const playerCamp = getPlayerCampFromRole(roleName);
      
      // Player won if they are marked as Victorious
      const playerWon = playerStat.Victorious;

      playerGames.push({
        gameId: game.Id,
        date: game.StartDate,
        camp: playerCamp,
        won: playerWon,
        playersInGame: game.PlayerStats.length,
        mapName: game.MapName
      });
    }
  });

  // Calculate map distribution
  const mapStats = {};
  playerGames.forEach(game => {
    if (!mapStats[game.mapName]) {
      mapStats[game.mapName] = {
        appearances: 0,
        wins: 0,
        winRate: 0
      };
    }
    mapStats[game.mapName].appearances++;
    if (game.won) {
      mapStats[game.mapName].wins++;
    }
  });

  // Calculate win rates for each map
  Object.keys(mapStats).forEach(mapName => {
    const stats = mapStats[mapName];
    stats.winRate = stats.appearances > 0 ? (stats.wins / stats.appearances * 100) : 0;
  });

  return {
    playerName: playerName,
    totalGames: playerGames.length,
    games: playerGames,
    mapStats: mapStats
  };
}
