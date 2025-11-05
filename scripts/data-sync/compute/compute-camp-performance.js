/**
 * Camp performance statistics computation functions
 */

import { getPlayerId, getPlayerFinalRole, getPlayerCampFromRole } from '../../../src/utils/datasyncExport.js';

/**
 * Compute camp performance statistics from game log data
 * @param {Array} gameData - Array of game log entries
 * @returns {Array} - Array of player camp statistics
 */
export function computePlayerCampPerformance(gameData) {
  if (gameData.length === 0) return [];

  // Calculate overall camp statistics (both participations and wins)
  const campStats = {};
  const campStatsGrouped = {};  // For "Camp Villageois" and "Camp Loup"
  const playerCampPerformance = {};
  const playerCampPerformanceGrouped = {};

  // First pass: count games and wins by camp (both individual and grouped)
  gameData.forEach(game => {
    if (!game.PlayerStats) return;

    game.PlayerStats.forEach(player => {
      const roleName = getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []);
      const camp = getPlayerCampFromRole(roleName, { regroupVillagers: false, regroupWolfSubRoles: false });
      const campGrouped = getPlayerCampFromRole(roleName, { regroupVillagers: true, regroupWolfSubRoles: true });
      const playerId = getPlayerId(player);
      const playerName = player.Username;
      const won = player.Victorious;

      // Process individual camps
      if (!campStats[camp]) {
        campStats[camp] = { totalGames: 0, wins: 0, winRate: 0, players: {} };
      }
      if (!playerCampPerformance[playerId]) {
        playerCampPerformance[playerId] = { playerName: playerName, totalGames: 0, camps: {} };
      }
      if (!playerCampPerformance[playerId].camps[camp]) {
        playerCampPerformance[playerId].camps[camp] = { games: 0, wins: 0, winRate: 0, performance: 0 };
      }
      campStats[camp].totalGames++;
      if (won) campStats[camp].wins++;
      playerCampPerformance[playerId].totalGames++;
      playerCampPerformance[playerId].camps[camp].games++;
      if (won) playerCampPerformance[playerId].camps[camp].wins++;

      // Process grouped camps ("Camp Villageois", "Camp Loup")
      if (!campStatsGrouped[campGrouped]) {
        campStatsGrouped[campGrouped] = { totalGames: 0, wins: 0, winRate: 0, players: {} };
      }
      if (!playerCampPerformanceGrouped[playerId]) {
        playerCampPerformanceGrouped[playerId] = { playerName: playerName, totalGames: 0, camps: {} };
      }
      if (!playerCampPerformanceGrouped[playerId].camps[campGrouped]) {
        playerCampPerformanceGrouped[playerId].camps[campGrouped] = { games: 0, wins: 0, winRate: 0, performance: 0 };
      }
      campStatsGrouped[campGrouped].totalGames++;
      if (won) campStatsGrouped[campGrouped].wins++;
      playerCampPerformanceGrouped[playerId].totalGames++;
      playerCampPerformanceGrouped[playerId].camps[campGrouped].games++;
      if (won) playerCampPerformanceGrouped[playerId].camps[campGrouped].wins++;
    });
  });

  // Calculate camp win rates (both individual and grouped)
  Object.keys(campStats).forEach(camp => {
    if (campStats[camp].totalGames > 0) {
      campStats[camp].winRate = (campStats[camp].wins / campStats[camp].totalGames) * 100;
    }
  });
  Object.keys(campStatsGrouped).forEach(camp => {
    if (campStatsGrouped[camp].totalGames > 0) {
      campStatsGrouped[camp].winRate = (campStatsGrouped[camp].wins / campStatsGrouped[camp].totalGames) * 100;
    }
  });

  // Calculate player win rates and performance vs camp average (individual)
  Object.keys(playerCampPerformance).forEach(playerId => {
    Object.keys(playerCampPerformance[playerId].camps).forEach(camp => {
      const playerCampStat = playerCampPerformance[playerId].camps[camp];
      
      if (playerCampStat.games > 0) {
        playerCampStat.winRate = (playerCampStat.wins / playerCampStat.games) * 100;

        // Calculate performance vs camp average
        if (campStats[camp] && campStats[camp].winRate) {
          playerCampStat.performance = playerCampStat.winRate - campStats[camp].winRate;
        }
      }
    });
  });

  // Calculate player win rates and performance vs camp average (grouped)
  Object.keys(playerCampPerformanceGrouped).forEach(playerId => {
    Object.keys(playerCampPerformanceGrouped[playerId].camps).forEach(camp => {
      const playerCampStat = playerCampPerformanceGrouped[playerId].camps[camp];
      
      if (playerCampStat.games > 0) {
        playerCampStat.winRate = (playerCampStat.wins / playerCampStat.games) * 100;

        // Calculate performance vs camp average
        if (campStatsGrouped[camp] && campStatsGrouped[camp].winRate) {
          playerCampStat.performance = playerCampStat.winRate - campStatsGrouped[camp].winRate;
        }
      }
    });
  });

  // Convert to flat array format with minimum game threshold
  const allPlayerCampStats = [];
  const minGamesToInclude = 3;

  // Add individual camp stats
  Object.keys(playerCampPerformance).forEach(playerId => {
    const playerData = playerCampPerformance[playerId];
    
    Object.keys(playerData.camps).forEach(camp => {
      const campData = playerData.camps[camp];
      
      // Only include if player has played this camp multiple times
      if (campData.games >= minGamesToInclude) {
        allPlayerCampStats.push({
          player: playerId, // Use playerId as the main player identifier
          playerName: playerData.playerName,
          playerId: playerId,
          camp: camp,
          games: campData.games,
          wins: campData.wins,
          winRate: campData.winRate,
          performance: campData.performance,
          totalGames: playerData.totalGames
        });
      }
    });
  });

  // Add grouped camp stats ("Camp Villageois", "Camp Loup")
  Object.keys(playerCampPerformanceGrouped).forEach(playerId => {
    const playerData = playerCampPerformanceGrouped[playerId];
    
    Object.keys(playerData.camps).forEach(camp => {
      const campData = playerData.camps[camp];
      
      // Only add grouped camps (Villageois and Loup) with renamed labels
      if ((camp === 'Villageois' || camp === 'Loup') && campData.games >= minGamesToInclude) {
        const campLabel = camp === 'Villageois' ? 'Camp Villageois' : 'Camp Loup';
        allPlayerCampStats.push({
          player: playerId, // Use playerId as the main player identifier
          playerName: playerData.playerName,
          playerId: playerId,
          camp: campLabel,
          games: campData.games,
          wins: campData.wins,
          winRate: campData.winRate,
          performance: campData.performance,
          totalGames: playerData.totalGames
        });
      }
    });
  });

  return allPlayerCampStats;
}
