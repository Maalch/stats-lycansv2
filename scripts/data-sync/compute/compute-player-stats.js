/**
 * Player statistics computation functions
 */

import { getPlayerId, getPlayerMainCampFromRole } from '../../../src/utils/datasyncExport.js';

/**
 * Compute player statistics from game data
 * @param {Array} gameData - Array of game entries
 * @returns {Object} - Object with totalGames and playerStats array
 */
export function computePlayerStats(gameData) {
  const playerStatsMap = new Map();

  // Process each game
  gameData.forEach(game => {
    // Determine winning camp
    let winningCamp = null;
    const campCounts = {
      'Villageois': 0,
      'Loups': 0,
      'Solo': 0
    };

    // Count victories by camp
    game.PlayerStats.forEach(player => {
      if (player.Victorious) {
        const mainCamp = getPlayerMainCampFromRole(player.MainRoleInitial);
        if (mainCamp === 'Villageois') {
          campCounts.Villageois++;
        } else if (mainCamp === 'Loup') {
          campCounts.Loups++;
        } else {
          campCounts.Solo++;
        }
      }
    });

    // Determine winning camp
    if (campCounts.Solo > 0) {
      winningCamp = 'Solo';
    } else if (campCounts.Loups > 0) {
      winningCamp = 'Loups';
    } else if (campCounts.Villageois > 0) {
      winningCamp = 'Villageois';
    }

    // Process each player in the game
    game.PlayerStats.forEach(player => {
      const playerId = getPlayerId(player);
      const playerName = player.Username;
      
      if (!playerStatsMap.has(playerId)) {
        playerStatsMap.set(playerId, {
          playerName: playerName,
          playerId: playerId,
          gamesPlayed: 0,
          wins: 0,
          camps: {
            villageois: { played: 0, won: 0 },
            loups: { played: 0, won: 0 },
            solo: { played: 0, won: 0 }
          }
        });
      }

      const stats = playerStatsMap.get(playerId);
      stats.gamesPlayed++;

      if (player.Victorious) {
        stats.wins++;
      }

      // Categorize by camp using the centralized logic
      const mainCamp = getPlayerMainCampFromRole(player.MainRoleInitial);
      if (mainCamp === 'Villageois') {
        stats.camps.villageois.played++;
        if (player.Victorious) stats.camps.villageois.won++;
      } else if (mainCamp === 'Loup') {
        stats.camps.loups.played++;
        if (player.Victorious) stats.camps.loups.won++;
      } else {
        stats.camps.solo.played++;
        if (player.Victorious) stats.camps.solo.won++;
      }
    });
  });

  // Convert to array and calculate percentages
  const playerStats = Array.from(playerStatsMap.values()).map(stats => ({
    ...stats,
    player: stats.playerId, // Use playerId as the main player identifier
    playerName: stats.playerName, // Keep playerName for reference
    gamesPlayedPercent: ((stats.gamesPlayed / gameData.length) * 100).toFixed(1),
    winPercent: stats.gamesPlayed > 0 ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1) : '0.0'
  }));

  return {
    totalGames: gameData.length,
    playerStats
  };
}
