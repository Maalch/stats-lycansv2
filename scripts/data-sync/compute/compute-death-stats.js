/**
 * Death statistics computation functions
 */

import { getPlayerId, DeathTypeCode } from '../../../src/utils/datasyncExport.js';

/**
 * Extract deaths from a single game
 * @param {Object} game - Game log entry
 * @returns {Array} - Array of death records
 */
function extractDeathsFromGame(game) {
  const deaths = [];
  
  game.PlayerStats.forEach(player => {
    // Only include players who actually died (not survivors or unknowns)
    if (
      player.DeathType &&
      player.DeathType !== 'N/A' &&
      player.DeathType !== DeathTypeCode.SURVIVOR &&
      player.DeathType !== '' &&
      (player.DeathTiming || player.DeathType)
    ) {
      const deathTypeCode = player.DeathType;
      
      deaths.push({
        playerId: getPlayerId(player),
        playerName: player.Username,
        deathType: deathTypeCode,
        killerName: player.KillerName || null,
        gameId: game.Id
      });
    }
  });
  
  return deaths;
}

/**
 * Extract kills from a single game using death information
 * @param {Object} game - Game log entry
 * @returns {Array} - Array of kill records
 */
function extractKillsFromGame(game) {
  const kills = [];
  
  // Derive kills from death information (DeathType + KillerName)
  game.PlayerStats.forEach(player => {
    if (player.DeathType && player.DeathType !== 'N/A' && player.KillerName) {
      const deathType = player.DeathType;
      
      // Only count direct kills (not votes, environmental deaths)
      if (
        deathType !== DeathTypeCode.VOTED &&
        deathType !== DeathTypeCode.SURVIVOR &&
        deathType !== '' &&
        deathType !== DeathTypeCode.UNKNOWN
      ) {
        kills.push({
          killerName: player.KillerName,
          victimId: getPlayerId(player),
          victimName: player.Username,
          deathType: deathType,
          gameId: game.Id
        });
      }
    }
  });
  
  return kills;
}

/**
 * Calculate comprehensive death statistics from game data
 * @param {Array} gameData - Array of game log entries
 * @returns {Object|null} - Death statistics object or null
 */
export function computeDeathStatistics(gameData) {
  if (gameData.length === 0) {
    return null;
  }

  // Filter games to only include those with complete death information
  const filteredGameData = gameData.filter(game => 
    !game.LegacyData || game.LegacyData.deathInformationFilled === true
  );

  if (filteredGameData.length === 0) {
    return null;
  }

  // Extract all deaths and track player game counts
  const allDeaths = [];
  const playerGameCounts = {};
  
  filteredGameData.forEach(game => {
    const deaths = extractDeathsFromGame(game);
    deaths.forEach(death => {
      allDeaths.push({
        ...death,
        gameId: game.Id
      });
    });
    
    // Count total games per player using their ID
    game.PlayerStats.forEach(player => {
      const playerId = getPlayerId(player);
      playerGameCounts[playerId] = (playerGameCounts[playerId] || 0) + 1;
    });
  });

  const totalDeaths = allDeaths.length;
  const totalGames = filteredGameData.length;

  // Calculate killer statistics using death information
  const killerCounts = {};
  
  filteredGameData.forEach(game => {
    const kills = extractKillsFromGame(game);
    kills.forEach(kill => {
      if (!killerCounts[kill.killerName]) {
        killerCounts[kill.killerName] = { 
          kills: 0, 
          victims: new Set(), 
          killsByDeathType: {} 
        };
      }
      killerCounts[kill.killerName].kills++;
      killerCounts[kill.killerName].victims.add(kill.victimName);
      
      // Track kills by death type
      const deathType = kill.deathType;
      killerCounts[kill.killerName].killsByDeathType[deathType] = 
        (killerCounts[kill.killerName].killsByDeathType[deathType] || 0) + 1;
    });
  });

  // Map killer names to player IDs for game count lookup
  const killerNameToId = new Map();
  filteredGameData.forEach(game => {
    game.PlayerStats.forEach(player => {
      killerNameToId.set(player.Username, getPlayerId(player));
    });
  });

  // Convert to array and calculate percentages and averages
  const killerStats = Object.entries(killerCounts).map(([killerName, data]) => {
    const killerId = killerNameToId.get(killerName) || killerName;
    return {
      killerId,  // Add Steam ID as primary identifier
      killerName,
      kills: data.kills,
      victims: Array.from(data.victims),
      percentage: totalDeaths > 0 ? (data.kills / totalDeaths) * 100 : 0,
      gamesPlayed: playerGameCounts[killerId] || 0,
      averageKillsPerGame: (playerGameCounts[killerId] || 0) > 0 ? 
        data.kills / (playerGameCounts[killerId] || 1) : 0,
      killsByDeathType: data.killsByDeathType
    };
  }).sort((a, b) => b.kills - a.kills);

  // Calculate player death statistics
  const playerDeathCounts = {};
  
  allDeaths.forEach(death => {
    const playerId = death.playerId;
    if (!playerDeathCounts[playerId]) {
      playerDeathCounts[playerId] = {
        playerName: death.playerName,
        totalDeaths: 0,
        deathsByType: {},
        killedBy: {}
      };
    }
    
    playerDeathCounts[playerId].totalDeaths++;
    playerDeathCounts[playerId].deathsByType[death.deathType] = 
      (playerDeathCounts[playerId].deathsByType[death.deathType] || 0) + 1;
    
    if (death.killerName) {
      playerDeathCounts[playerId].killedBy[death.killerName] = 
        (playerDeathCounts[playerId].killedBy[death.killerName] || 0) + 1;
    }
  });

  const playerDeathStats = Object.entries(playerDeathCounts).map(([playerId, data]) => ({
    player: playerId, // Use playerId as the main player identifier
    playerName: data.playerName,
    totalDeaths: data.totalDeaths,
    deathsByType: data.deathsByType,
    killedBy: data.killedBy,
    gamesPlayed: playerGameCounts[playerId] || 0,
    deathRate: (playerGameCounts[playerId] || 0) > 0 ? 
      data.totalDeaths / (playerGameCounts[playerId] || 1) : 0
  })).sort((a, b) => b.totalDeaths - a.totalDeaths);

  return {
    totalDeaths,
    totalGames,
    averageDeathsPerGame: totalGames > 0 ? totalDeaths / totalGames : 0,
    killerStats,
    playerDeathStats,
    mostDeadlyKiller: killerStats.length > 0 ? killerStats[0].killerName : null
  };
}
