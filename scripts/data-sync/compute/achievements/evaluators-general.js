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
 * Count the number of distinct colors a player has won in.
 * Each gameId corresponds to the game where a new distinct color was first used in a win.
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
  return { value: wonColors.size, gameIds };
}

/**
 * Count calendar months where the player had a win rate strictly above 50%.
 * Groups the player's games by YYYY-MM from game.StartDate.
 * No minimum games threshold — any month with wins/total > 0.5 qualifies.
 * Returns a representative game ID per qualifying month (last game of that month).
 */
export function winningMonths(playerGames, allGames, playerId, params) {
  // Group player games by year-month key
  const monthMap = new Map(); // 'YYYY-MM' → { wins, total, lastGameId }

  for (const { game, playerStat } of playerGames) {
    if (!game.StartDate) continue;
    const d = new Date(game.StartDate);
    if (isNaN(d.getTime())) continue;

    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

    if (!monthMap.has(key)) {
      monthMap.set(key, { wins: 0, total: 0, lastGameId: null });
    }

    const m = monthMap.get(key);
    m.total++;
    if (playerStat.Victorious) m.wins++;
    m.lastGameId = game.Id; // games are iterated in order, so this ends up as the last game
  }

  // Sort months chronologically and collect qualifying ones
  const sortedMonths = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const gameIds = [];
  let value = 0;

  for (const [, { wins, total, lastGameId }] of sortedMonths) {
    if (total > 0 && wins / total > 0.5) {
      value++;
      gameIds.push(lastGameId);
    }
  }

  return { value, gameIds };
}

const ONUTREM_STEAM_ID = '76561198065697406';

/**
 * Count wins in games where Onutrem participated and lost.
 * Onutrem himself is excluded from earning this achievement.
 */
export function winsAgainstOnutrem(playerGames, allGames, playerId, params) {
  // Onutrem cannot earn this achievement
  if (playerId === ONUTREM_STEAM_ID) {
    return { value: 0, gameIds: [] };
  }

  const gameIds = [];
  let value = 0;

  for (const { game, playerStat } of playerGames) {
    // Player must have won
    if (!playerStat.Victorious) continue;

    // Onutrem must be in the game and must have lost
    const onutrem = game.PlayerStats.find(p => p.ID === ONUTREM_STEAM_ID);
    if (!onutrem || onutrem.Victorious) continue;

    value++;
    gameIds.push(game.Id);
  }

  return { value, gameIds };
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
