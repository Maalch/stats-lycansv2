/**
 * Loot/Harvest Statistics Computation Module
 * 
 * Computes harvest/loot statistics per player, normalized per 60 minutes
 * of effective game time, with camp-specific breakdowns.
 */

import { getPlayerId, getCanonicalPlayerName, calculateGameDuration, getPlayerMainCampFromRole } from '../../../src/utils/datasyncExport.js';

/**
 * Check if a game has loot/harvest data
 * @param {Object} game - Game log entry
 * @returns {boolean} - True if game has loot data
 */
function gameHasLootData(game) {
  // Check if HarvestDone exists at game level
  if (game.HarvestDone !== undefined && game.HarvestDone !== null) {
    return true;
  }
  
  // Check if any player has loot data (future-proofing)
  return game.PlayerStats?.some(
    player => player.Loot !== undefined || player.Harvest !== undefined
  );
}

/**
 * Estimate player contribution to harvest based on game time
 * Since we don't have per-player loot tracking, we estimate based on survival time
 * Players who survive longer likely contributed more
 * @param {Object} player - Player stat object
 * @param {Object} game - Game object
 * @param {number} totalHarvest - Total harvest for the game
 * @param {Array} allPlayers - All players in the game
 * @returns {number} - Estimated player loot contribution
 */
function estimatePlayerLoot(player, game, totalHarvest, allPlayers) {
  // Calculate player's survival time
  const playerEndTime = player.DeathDateIrl || game.EndDate;
  const playerDuration = calculateGameDuration(game.StartDate, playerEndTime);
  
  // Calculate total survival time of all players
  let totalDuration = 0;
  allPlayers.forEach(p => {
    const pEndTime = p.DeathDateIrl || game.EndDate;
    const pDuration = calculateGameDuration(game.StartDate, pEndTime);
    if (pDuration > 0) {
      totalDuration += pDuration;
    }
  });
  
  if (totalDuration <= 0 || playerDuration <= 0) {
    // Fallback: equal distribution
    return totalHarvest / allPlayers.length;
  }
  
  // Proportional loot based on survival time
  return (playerDuration / totalDuration) * totalHarvest;
}

/**
 * Compute loot/harvest statistics from game data
 * @param {Array} gameData - Array of game log entries
 * @returns {Object|null} - Loot statistics object
 */
export function computeLootStatistics(gameData) {
  if (!gameData || gameData.length === 0) {
    return null;
  }

  // Filter games that have loot data
  const gamesWithData = gameData.filter(gameHasLootData);

  if (gamesWithData.length === 0) {
    return {
      playerStats: [],
      totalGames: gameData.length,
      gamesWithLootData: 0
    };
  }

  const playerMap = new Map();

  // Process each game with loot data
  gamesWithData.forEach(game => {
    const totalHarvest = game.HarvestDone || 0;
    const allPlayers = game.PlayerStats || [];
    
    if (allPlayers.length === 0) return;

    allPlayers.forEach(player => {
      const playerId = getPlayerId(player);
      const displayName = getCanonicalPlayerName(player);
      const camp = getPlayerMainCampFromRole(player.MainRoleInitial, player.Power);

      // Calculate player-specific game duration
      const endTime = player.DeathDateIrl || game.EndDate;
      const playerGameDuration = calculateGameDuration(game.StartDate, endTime);
      
      // Skip players with invalid duration
      if (!playerGameDuration || playerGameDuration <= 0) {
        return;
      }

      // Estimate player's loot contribution
      const playerLoot = estimatePlayerLoot(player, game, totalHarvest, allPlayers);

      if (!playerMap.has(playerId)) {
        playerMap.set(playerId, {
          playerId,
          displayName,
          gamesPlayed: 0,
          totalLoot: 0,
          totalGameDurationSeconds: 0,
          // Camp-specific stats
          villageoisGames: 0,
          villageoisLoot: 0,
          villageoisDuration: 0,
          loupGames: 0,
          loupLoot: 0,
          loupDuration: 0,
          soloGames: 0,
          soloLoot: 0,
          soloDuration: 0
        });
      }

      const stats = playerMap.get(playerId);
      stats.gamesPlayed++;
      stats.totalLoot += playerLoot;
      stats.totalGameDurationSeconds += playerGameDuration;

      // Update camp-specific stats
      if (camp === 'Villageois') {
        stats.villageoisGames++;
        stats.villageoisLoot += playerLoot;
        stats.villageoisDuration += playerGameDuration;
      } else if (camp === 'Loup') {
        stats.loupGames++;
        stats.loupLoot += playerLoot;
        stats.loupDuration += playerGameDuration;
      } else {
        stats.soloGames++;
        stats.soloLoot += playerLoot;
        stats.soloDuration += playerGameDuration;
      }
    });
  });

  // Convert to array and calculate normalized stats (per 60 minutes)
  const playerStats = Array.from(playerMap.values()).map(stats => {
    // Normalize per 60 minutes (3600 seconds)
    const normalizationFactor = stats.totalGameDurationSeconds > 0 
      ? 3600 / stats.totalGameDurationSeconds 
      : 0;

    const villageoisNormFactor = stats.villageoisDuration > 0
      ? 3600 / stats.villageoisDuration
      : 0;

    const loupNormFactor = stats.loupDuration > 0
      ? 3600 / stats.loupDuration
      : 0;

    const soloNormFactor = stats.soloDuration > 0
      ? 3600 / stats.soloDuration
      : 0;

    return {
      playerId: stats.playerId,
      player: stats.displayName,
      gamesPlayed: stats.gamesPlayed,
      totalLoot: stats.totalLoot,
      totalGameDurationSeconds: stats.totalGameDurationSeconds,
      lootPer60Min: stats.totalLoot * normalizationFactor,
      // Camp-specific normalized stats
      villageoisGames: stats.villageoisGames,
      villageoisLoot: stats.villageoisLoot,
      lootVillageoisPer60Min: stats.villageoisLoot * villageoisNormFactor,
      loupGames: stats.loupGames,
      loupLoot: stats.loupLoot,
      lootLoupPer60Min: stats.loupLoot * loupNormFactor,
      soloGames: stats.soloGames,
      soloLoot: stats.soloLoot,
      lootSoloPer60Min: stats.soloLoot * soloNormFactor
    };
  });

  return {
    playerStats,
    totalGames: gameData.length,
    gamesWithLootData: gamesWithData.length
  };
}

export default computeLootStatistics;
