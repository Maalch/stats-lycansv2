/**
 * General Achievement Evaluators
 * 
 * Core evaluators for wins, losses, deaths, and map/color variety achievements.
 */

import { getPlayerCampForAchievement, isSoloCamp } from './helpers.js';
import { DeathTypeCode } from './helpers.js';

/**
 * Count wins in a specific camp (Villageois or Loup)
 */
export function campWins(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  for (const { game, playerStat } of playerGames) {
    if (!playerStat.Victorious) continue;
    const mainCamp = getPlayerCampForAchievement(playerStat);
    const campMatch = (params.camp === 'Villageois' && mainCamp === 'Villageois') ||
                      (params.camp === 'Loup' && mainCamp === 'Loup');
    if (campMatch) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count losses in a specific camp
 */
export function campLosses(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  for (const { game, playerStat } of playerGames) {
    if (playerStat.Victorious) continue;
    const mainCamp = getPlayerCampForAchievement(playerStat);
    const campMatch = (params.camp === 'Villageois' && mainCamp === 'Villageois') ||
                      (params.camp === 'Loup' && mainCamp === 'Loup');
    if (campMatch) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count solo camp wins (Amoureux, Agent, Idiot du Village, etc.)
 */
export function soloWins(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  for (const { game, playerStat } of playerGames) {
    if (!playerStat.Victorious) continue;
    if (isSoloCamp(playerStat.MainRoleInitial, playerStat.Power)) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count solo camp losses (Amoureux, Agent, Idiot du Village, etc.)
 */
export function soloLosses(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  for (const { game, playerStat } of playerGames) {
    if (playerStat.Victorious) continue;
    if (isSoloCamp(playerStat.MainRoleInitial, playerStat.Power)) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count deaths by a specific death type
 */
export function deathByType(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  for (const { game, playerStat } of playerGames) {
    if (playerStat.DeathType === params.deathType) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Count deaths on a specific timing (e.g., "N1" for first night)
 */
export function deathOnTiming(playerGames, allGames, playerId, params) {
  const gameIds = [];
  let value = 0;
  for (const { game, playerStat } of playerGames) {
    if (playerStat.DeathTiming === params.timing) {
      value++;
      gameIds.push(game.Id);
    }
  }
  return { value, gameIds };
}

/**
 * Win on all available maps (returns 1 if achieved, 0 otherwise)
 */
export function winOnAllMaps(playerGames, allGames, playerId, params) {
  // First, gather all unique maps from all games
  const allMaps = new Set();
  for (const game of allGames) {
    if (game.MapName) allMaps.add(game.MapName);
  }
  
  // Gather maps won by the player
  const wonMaps = new Set();
  const gameIds = [];
  for (const { game, playerStat } of playerGames) {
    if (playerStat.Victorious && game.MapName && !wonMaps.has(game.MapName)) {
      wonMaps.add(game.MapName);
      gameIds.push(game.Id);
    }
  }
  
  // Check if player won on all maps
  const allWon = allMaps.size > 0 && allMaps.size === wonMaps.size;
  return { value: allWon ? 1 : 0, gameIds: allWon ? gameIds : [] };
}

/**
 * Win in a minimum number of distinct colors
 */
export function winInColors(playerGames, allGames, playerId, params) {
  const wonColors = new Set();
  const gameIds = [];
  for (const { game, playerStat } of playerGames) {
    if (playerStat.Victorious && playerStat.Color && !wonColors.has(playerStat.Color)) {
      wonColors.add(playerStat.Color);
      gameIds.push(game.Id);
    }
  }
  const achieved = wonColors.size >= (params.minColors || 5);
  return { value: achieved ? 1 : 0, gameIds: achieved ? gameIds : [] };
}

/**
 * Return minimum wins per map (for "win X times on each map")
 */
export function winsOnAllMaps(playerGames, allGames, playerId, params) {
  // Gather all unique maps from all games
  const allMaps = new Set();
  for (const game of allGames) {
    if (game.MapName) allMaps.add(game.MapName);
  }
  
  // Count wins per map
  const winsPerMap = {};
  for (const mapName of allMaps) {
    winsPerMap[mapName] = { count: 0, gameIds: [] };
  }
  
  for (const { game, playerStat } of playerGames) {
    if (playerStat.Victorious && game.MapName && winsPerMap[game.MapName]) {
      winsPerMap[game.MapName].count++;
      winsPerMap[game.MapName].gameIds.push(game.Id);
    }
  }
  
  // Return minimum wins across all maps
  const mapCounts = Object.values(winsPerMap).map(m => m.count);
  const minWins = mapCounts.length > 0 ? Math.min(...mapCounts) : 0;
  
  // Build gameIds list: collect game IDs up to minWins from each map
  const gameIds = [];
  const gameIdSet = new Set();
  
  for (const mapName of allMaps) {
    const mapGameIds = winsPerMap[mapName].gameIds.slice(0, minWins);
    for (const gid of mapGameIds) {
      if (!gameIdSet.has(gid)) {
        gameIds.push(gid);
        gameIdSet.add(gid);
      }
    }
  }
  
  return { value: minWins, gameIds };
}
