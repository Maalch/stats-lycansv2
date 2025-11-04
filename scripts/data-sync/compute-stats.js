/**
 * Statistics computation functions for achievement generation
 */

import { getPlayerFinalRole, getPlayerId } from '../../src/utils/datasyncExport.js';
import { DeathTypeCode, getPlayerCampFromRole, getPlayerMainCampFromRole } from '../../src/utils/datasyncExport.js';

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

/**
 * Get all unique players from game data
 * @param {Array} gameData - Array of game log entries
 * @returns {Map} - Map of player ID to player name
 */
function getAllPlayersFromGames(gameData) {
  const allPlayersMap = new Map();
  
  gameData.forEach(game => {
    if (game.PlayerStats) {
      game.PlayerStats.forEach(playerStat => {
        const playerId = getPlayerId(playerStat);
        if (!allPlayersMap.has(playerId)) {
          allPlayersMap.set(playerId, playerStat.Username.trim());
        }
      });
    }
  });
  
  return allPlayersMap;
}

/**
 * Initialize player series tracking state
 * @param {Map} allPlayersMap - Map of player ID to player name
 * @returns {Object} - Player series state mapping
 */
function initializePlayerSeriesState(allPlayersMap) {
  const playerSeriesState = {};
  
  allPlayersMap.forEach((playerName, playerId) => {
    playerSeriesState[playerId] = {
      playerName: playerName,
      currentVillageoisSeries: 0,
      currentLoupsSeries: 0,
      longestVillageoisSeries: null,
      longestLoupsSeries: null,
      currentWinSeries: 0,
      longestWinSeries: null,
      currentWinCamps: [],
      currentLossSeries: 0,
      longestLossSeries: null,
      currentLossCamps: [],
      lastCamp: null,
      lastWon: false,
      villageoisSeriesStart: null,
      loupsSeriesStart: null,
      winSeriesStart: null,
      lossSeriesStart: null,
      currentVillageoisGameIds: [],
      currentLoupsGameIds: [],
      currentWinGameIds: [],
      currentLossGameIds: []
    };
  });
  
  return playerSeriesState;
}

/**
 * Process camp series for a player
 * @param {Object} playerStats - Player series state
 * @param {string} player - Player name
 * @param {'Villageois'|'Loup'|'Autres'} mainCamp - Main camp category
 * @param {string} gameDisplayedId - Game displayed ID
 * @param {string} date - Game date
 */
function processCampSeries(playerStats, player, mainCamp, gameDisplayedId, date) {
  if (mainCamp === 'Villageois' || mainCamp === 'Loup') {
    // Check Villageois series
    if (mainCamp === 'Villageois') {
      if (playerStats.lastCamp === 'Villageois') {
        playerStats.currentVillageoisSeries++;
        playerStats.currentVillageoisGameIds.push(gameDisplayedId);
      } else {
        playerStats.currentVillageoisSeries = 1;
        playerStats.villageoisSeriesStart = { game: gameDisplayedId, date };
        playerStats.currentVillageoisGameIds = [gameDisplayedId];
      }
      
      // Update longest if current is longer or equal
      if (!playerStats.longestVillageoisSeries || 
          playerStats.currentVillageoisSeries >= playerStats.longestVillageoisSeries.seriesLength) {
        playerStats.longestVillageoisSeries = {
          player,
          camp: 'Villageois',
          seriesLength: playerStats.currentVillageoisSeries,
          startGame: playerStats.villageoisSeriesStart?.game || gameDisplayedId,
          endGame: gameDisplayedId,
          startDate: playerStats.villageoisSeriesStart?.date || date,
          endDate: date,
          isOngoing: false,
          gameIds: [...playerStats.currentVillageoisGameIds]
        };
      }
      
      // Reset Loups series
      playerStats.currentLoupsSeries = 0;
      playerStats.loupsSeriesStart = null;
      playerStats.currentLoupsGameIds = [];
    }
    
    // Check Loups series
    if (mainCamp === 'Loup') {
      if (playerStats.lastCamp === 'Loup') {
        playerStats.currentLoupsSeries++;
        playerStats.currentLoupsGameIds.push(gameDisplayedId);
      } else {
        playerStats.currentLoupsSeries = 1;
        playerStats.loupsSeriesStart = { game: gameDisplayedId, date };
        playerStats.currentLoupsGameIds = [gameDisplayedId];
      }
      
      // Update longest if current is longer or equal
      if (!playerStats.longestLoupsSeries || 
          playerStats.currentLoupsSeries >= playerStats.longestLoupsSeries.seriesLength) {
        playerStats.longestLoupsSeries = {
          player,
          camp: 'Loups',
          seriesLength: playerStats.currentLoupsSeries,
          startGame: playerStats.loupsSeriesStart?.game || gameDisplayedId,
          endGame: gameDisplayedId,
          startDate: playerStats.loupsSeriesStart?.date || date,
          endDate: date,
          isOngoing: false,
          gameIds: [...playerStats.currentLoupsGameIds]
        };
      }
      
      // Reset Villageois series
      playerStats.currentVillageoisSeries = 0;
      playerStats.villageoisSeriesStart = null;
      playerStats.currentVillageoisGameIds = [];
    }
    
    playerStats.lastCamp = mainCamp;
  } else {
    // Playing as special role breaks both camp series
    playerStats.currentVillageoisSeries = 0;
    playerStats.currentLoupsSeries = 0;
    playerStats.villageoisSeriesStart = null;
    playerStats.loupsSeriesStart = null;
    playerStats.currentVillageoisGameIds = [];
    playerStats.currentLoupsGameIds = [];
    playerStats.lastCamp = 'Autres';
  }
}

/**
 * Process win series for a player
 * @param {Object} playerStats - Player series state
 * @param {string} player - Player name
 * @param {boolean} playerWon - Whether player won
 * @param {string} actualCamp - Actual camp played
 * @param {string} gameDisplayedId - Game displayed ID
 * @param {string} date - Game date
 */
function processWinSeries(playerStats, player, playerWon, actualCamp, gameDisplayedId, date) {
  if (playerWon) {
    if (playerStats.lastWon) {
      playerStats.currentWinSeries++;
      playerStats.currentWinCamps.push(actualCamp);
      playerStats.currentWinGameIds.push(gameDisplayedId);
    } else {
      playerStats.currentWinSeries = 1;
      playerStats.currentWinCamps = [actualCamp];
      playerStats.winSeriesStart = { game: gameDisplayedId, date };
      playerStats.currentWinGameIds = [gameDisplayedId];
    }
    
    // Update longest win series if current is longer or equal
    if (!playerStats.longestWinSeries || 
        playerStats.currentWinSeries >= playerStats.longestWinSeries.seriesLength) {
      
      // Calculate camp counts
      const campCounts = {};
      playerStats.currentWinCamps.forEach(camp => {
        campCounts[camp] = (campCounts[camp] || 0) + 1;
      });
      
      playerStats.longestWinSeries = {
        player,
        seriesLength: playerStats.currentWinSeries,
        startGame: playerStats.winSeriesStart?.game || gameDisplayedId,
        endGame: gameDisplayedId,
        startDate: playerStats.winSeriesStart?.date || date,
        endDate: date,
        campCounts: campCounts,
        isOngoing: false,
        gameIds: [...playerStats.currentWinGameIds]
      };
    }
    
    playerStats.lastWon = true;
  } else {
    // Losing breaks the win series
    playerStats.currentWinSeries = 0;
    playerStats.currentWinCamps = [];
    playerStats.winSeriesStart = null;
    playerStats.currentWinGameIds = [];
    playerStats.lastWon = false;
  }
}

/**
 * Process loss series for a player
 * @param {Object} playerStats - Player series state
 * @param {string} player - Player name
 * @param {boolean} playerWon - Whether player won
 * @param {string} actualCamp - Actual camp played
 * @param {string} gameDisplayedId - Game displayed ID
 * @param {string} date - Game date
 */
function processLossSeries(playerStats, player, playerWon, actualCamp, gameDisplayedId, date) {
  if (!playerWon) {
    // Player lost this game
    if (playerStats.currentLossSeries > 0) {
      // Continue existing loss series
      playerStats.currentLossSeries++;
      playerStats.currentLossCamps.push(actualCamp);
      playerStats.currentLossGameIds.push(gameDisplayedId);
    } else {
      // Start new loss series
      playerStats.currentLossSeries = 1;
      playerStats.currentLossCamps = [actualCamp];
      playerStats.lossSeriesStart = { game: gameDisplayedId, date };
      playerStats.currentLossGameIds = [gameDisplayedId];
    }
    
    // Update longest loss series if current is longer or equal
    if (!playerStats.longestLossSeries || 
        playerStats.currentLossSeries >= playerStats.longestLossSeries.seriesLength) {
      
      // Calculate camp counts
      const campCounts = {};
      playerStats.currentLossCamps.forEach(camp => {
        campCounts[camp] = (campCounts[camp] || 0) + 1;
      });
      
      playerStats.longestLossSeries = {
        player,
        seriesLength: playerStats.currentLossSeries,
        startGame: playerStats.lossSeriesStart?.game || gameDisplayedId,
        endGame: gameDisplayedId,
        startDate: playerStats.lossSeriesStart?.date || date,
        endDate: date,
        campCounts: campCounts,
        isOngoing: false,
        gameIds: [...playerStats.currentLossGameIds]
      };
    }
  } else {
    // Winning breaks the loss series
    playerStats.currentLossSeries = 0;
    playerStats.currentLossCamps = [];
    playerStats.lossSeriesStart = null;
    playerStats.currentLossGameIds = [];
  }
}

/**
 * Collect and sort series results
 * @param {Object} playerSeriesState - Player series state mapping
 * @returns {Object} - Sorted series arrays
 */
function collectSeriesResults(playerSeriesState) {
  const allVillageoisSeries = [];
  const allLoupsSeries = [];
  const allWinSeries = [];
  const allLossSeries = [];

  Object.values(playerSeriesState).forEach(stats => {
    if (stats.longestVillageoisSeries) {
      allVillageoisSeries.push(stats.longestVillageoisSeries);
    }
    if (stats.longestLoupsSeries) {
      allLoupsSeries.push(stats.longestLoupsSeries);
    }
    if (stats.longestWinSeries) {
      allWinSeries.push(stats.longestWinSeries);
    }
    if (stats.longestLossSeries) {
      allLossSeries.push(stats.longestLossSeries);
    }
  });

  // Sort by series length (descending)
  allVillageoisSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  allLoupsSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  allWinSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  allLossSeries.sort((a, b) => b.seriesLength - a.seriesLength);

  return {
    allVillageoisSeries,
    allLoupsSeries,
    allWinSeries,
    allLossSeries
  };
}

/**
 * Parse game ID to extract timestamp and trailing number
 * @param {string} gameId - Game ID like "Ponce-20231013000000-1"
 * @returns {Object} - Parsed timestamp and trailing number
 */
function parseGameId(gameId) {
  const parts = gameId.split('-');
  
  if (parts.length === 3) {
    // Legacy format: "Ponce-20231013000000-1"
    return { 
      timestamp: parts[1], 
      trailingNumber: parseInt(parts[2]) || 0 
    };
  } else if (parts.length === 2) {
    // Newer format: "Ponce-20231013000000"
    return { 
      timestamp: parts[1], 
      trailingNumber: 0 
    };
  }
  
  // Fallback
  return { timestamp: '0', trailingNumber: 0 };
}

/**
 * Generate DisplayedId values for all games based on global chronological order
 * @param {Array} games - Array of game entries
 * @returns {Map} - Map from original ID to DisplayedId
 */
function generateDisplayedIds(games) {
  const displayedIdMap = new Map();
  
  // Sort all games globally by timestamp, then by trailing number
  const sortedGames = [...games].sort((a, b) => {
    const parsedA = parseGameId(a.Id);
    const parsedB = parseGameId(b.Id);
    
    // First compare by timestamp
    const timestampCompare = parsedA.timestamp.localeCompare(parsedB.timestamp);
    if (timestampCompare !== 0) {
      return timestampCompare;
    }
    
    // If timestamps are equal, compare by trailing number
    return parsedA.trailingNumber - parsedB.trailingNumber;
  });
  
  // Assign sequential global numbers
  sortedGames.forEach((game, index) => {
    const globalNumber = index + 1;
    displayedIdMap.set(game.Id, globalNumber.toString());
  });
  
  return displayedIdMap;
}

/**
 * Compute player series statistics from game data
 * @param {Array} gameData - Array of game log entries
 * @returns {Object|null} - Player series data or null
 */
export function computePlayerSeriesData(gameData) {
  if (gameData.length === 0) {
    return null;
  }

  // Generate DisplayedId mapping like the client-side does
  const displayedIdMap = generateDisplayedIds(gameData);

  // Sort games by DisplayedId to ensure chronological order (client-side compatible)
  const sortedGames = [...gameData].sort((a, b) => {
    const displayedIdA = parseInt(displayedIdMap.get(a.Id) || '0');
    const displayedIdB = parseInt(displayedIdMap.get(b.Id) || '0');
    return displayedIdA - displayedIdB;
  });

  // Get all unique players
  const allPlayers = getAllPlayersFromGames(sortedGames);

  // Initialize tracking for all players
  const playerSeriesState = initializePlayerSeriesState(allPlayers);

  // Process each game chronologically
  sortedGames.forEach(game => {
    const gameDisplayedId = displayedIdMap.get(game.Id) || game.Id;
    const date = new Date(game.StartDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });

    if (game.PlayerStats) {
      game.PlayerStats.forEach(playerStat => {
        const playerId = getPlayerId(playerStat);
        const playerName = playerStat.Username.trim();
        const playerStats = playerSeriesState[playerId];
        
        if (playerStats) {
          const playerWon = playerStat.Victorious;
          const mainCamp = getPlayerMainCampFromRole(playerStat.MainRoleInitial);
          
          // Process camp series
          processCampSeries(playerStats, playerName, mainCamp, gameDisplayedId, date);
          
          // Process win series
          processWinSeries(playerStats, playerName, playerWon, mainCamp, gameDisplayedId, date);
          
          // Process loss series
          processLossSeries(playerStats, playerName, playerWon, mainCamp, gameDisplayedId, date);
        }
      });
    }
  });

  // Collect and sort results
  const seriesResults = collectSeriesResults(playerSeriesState);

  // Mark ongoing series
  Object.values(playerSeriesState).forEach(stats => {
    // Check Villageois series
    if (stats.longestVillageoisSeries && 
        stats.currentVillageoisSeries === stats.longestVillageoisSeries.seriesLength &&
        stats.currentVillageoisSeries > 0) {
      stats.longestVillageoisSeries.isOngoing = true;
    }

    // Check Loups series
    if (stats.longestLoupsSeries && 
        stats.currentLoupsSeries === stats.longestLoupsSeries.seriesLength &&
        stats.currentLoupsSeries > 0) {
      stats.longestLoupsSeries.isOngoing = true;
    }

    // Check Win series
    if (stats.longestWinSeries && 
        stats.currentWinSeries === stats.longestWinSeries.seriesLength &&
        stats.currentWinSeries > 0) {
      stats.longestWinSeries.isOngoing = true;
    }

    // Check Loss series
    if (stats.longestLossSeries && 
        stats.currentLossSeries === stats.longestLossSeries.seriesLength &&
        stats.currentLossSeries > 0) {
      stats.longestLossSeries.isOngoing = true;
    }
  });

  return {
    ...seriesResults,
    totalGamesAnalyzed: sortedGames.length,
    totalPlayersCount: allPlayers.size
  };
}

/**
 * Compute voting behavior statistics for all players
 * @param {Array} gameData - Array of game entries
 * @returns {Object} - Object with voting behavior, accuracy, and target statistics
 */
export function computeVotingStatistics(gameData) {
  const playerBehaviorMap = new Map();
  const playerAccuracyMap = new Map();
  const playerTargetMap = new Map();

  // Helper to determine if a player was alive at a meeting
  function wasPlayerAliveAtMeeting(player, meetingNumber) {
    if (!player.DeathTiming) return true;
    
    const deathTiming = player.DeathTiming.toUpperCase();
    
    if (deathTiming.startsWith('M')) {
      const deathMeeting = parseInt(deathTiming.substring(1));
      return meetingNumber < deathMeeting;
    }
    
    if (deathTiming.startsWith('N') || deathTiming.startsWith('J')) {
      const deathDay = parseInt(deathTiming.substring(1));
      return meetingNumber <= deathDay;
    }
    
    return true;
  }

  // Helper to get alive players at a meeting
  function getAlivePlayersAtMeeting(game, meetingNumber) {
    return game.PlayerStats.filter(player => wasPlayerAliveAtMeeting(player, meetingNumber));
  }

  // Process each game
  gameData.forEach(game => {
    if (!game.PlayerStats) return;

    // Initialize maps for players in this game
    game.PlayerStats.forEach(player => {
      const playerId = getPlayerId(player);
      const playerName = player.Username;
      
      if (!playerBehaviorMap.has(playerId)) {
        playerBehaviorMap.set(playerId, {
          playerName: playerName,
          totalMeetings: 0,
          totalVotes: 0,
          totalSkips: 0,
          totalAbstentions: 0
        });
      }
      
      if (!playerAccuracyMap.has(playerId)) {
        playerAccuracyMap.set(playerId, {
          playerName: playerName,
          totalMeetings: 0,
          totalVotes: 0,
          votesForEnemyCamp: 0,
          votesForOwnCamp: 0
        });
      }
      
      if (!playerTargetMap.has(playerId)) {
        playerTargetMap.set(playerId, {
          playerName: playerName,
          totalTimesTargeted: 0,
          timesTargetedByEnemyCamp: 0,
          timesTargetedByOwnCamp: 0,
          timesTargetedAsVillager: 0,
          timesTargetedAsWolf: 0,
          timesTargetedAsSpecial: 0,
          eliminationsByVote: 0
        });
      }
    });

    // Find max meeting number
    const maxMeetingNumber = Math.max(
      ...game.PlayerStats.flatMap(player => 
        (player.Votes || []).map(vote => vote.Day || 0)
      ),
      0
    );

    // Process each meeting
    for (let meetingNum = 1; meetingNum <= maxMeetingNumber; meetingNum++) {
      const alivePlayersAtMeeting = getAlivePlayersAtMeeting(game, meetingNum);
      const votesInMeeting = game.PlayerStats.flatMap(player => 
        (player.Votes || [])
          .filter(vote => vote.Day === meetingNum)
          .map(vote => ({ 
            voterId: getPlayerId(player),
            voter: player.Username, 
            vote, 
            voterRole: getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || [])
          }))
      );

      // Process each alive player
      alivePlayersAtMeeting.forEach(player => {
        const playerId = getPlayerId(player);
        const behavior = playerBehaviorMap.get(playerId);
        const accuracy = playerAccuracyMap.get(playerId);
        behavior.totalMeetings++;
        accuracy.totalMeetings++;

        // Find player's vote in this meeting
        const playerVote = votesInMeeting.find(v => v.voterId === playerId);
        
        if (!playerVote) {
          // No vote = abstention
          behavior.totalAbstentions++;
        } else if (playerVote.vote.Target === 'Passé') {
          // Skip vote
          behavior.totalSkips++;
        } else {
          // Real vote
          behavior.totalVotes++;
          accuracy.totalVotes++;

          // Check accuracy (voting for enemy camp vs own camp)
          const voterCamp = getPlayerCampFromRole(playerVote.voterRole, { regroupWolfSubRoles: true });
          const targetPlayer = game.PlayerStats.find(p => p.Username === playerVote.vote.Target);
          
          if (targetPlayer) {
            const targetRole = getPlayerFinalRole(targetPlayer.MainRoleInitial, targetPlayer.MainRoleChanges || []);
            const targetCamp = getPlayerCampFromRole(targetRole, { regroupWolfSubRoles: true });
            
            if (voterCamp !== targetCamp) {
              accuracy.votesForEnemyCamp++;
            } else {
              accuracy.votesForOwnCamp++;
            }
          }
        }
      });

      // Process target statistics
      votesInMeeting
        .filter(v => v.vote.Target !== 'Passé')
        .forEach(v => {
          const targetPlayer = game.PlayerStats.find(p => p.Username === v.vote.Target);
          if (!targetPlayer) return;

          const targetPlayerId = getPlayerId(targetPlayer);
          const targetStats = playerTargetMap.get(targetPlayerId);
          targetStats.totalTimesTargeted++;

          // Determine voter and target camps
          const voterCamp = getPlayerCampFromRole(v.voterRole, { regroupWolfSubRoles: true });
          const targetRole = getPlayerFinalRole(targetPlayer.MainRoleInitial, targetPlayer.MainRoleChanges || []);
          const targetCamp = getPlayerCampFromRole(targetRole, { regroupWolfSubRoles: true });

          if (voterCamp !== targetCamp) {
            targetStats.timesTargetedByEnemyCamp++;
          } else {
            targetStats.timesTargetedByOwnCamp++;
          }

          // Track role-specific targeting
          if (targetCamp === 'Villageois') {
            targetStats.timesTargetedAsVillager++;
          } else if (targetCamp === 'Loup') {
            targetStats.timesTargetedAsWolf++;
          } else {
            targetStats.timesTargetedAsSpecial++;
          }

          // Check if this vote led to elimination
          if (targetPlayer.DeathType === 'VOTED' && targetPlayer.DeathTiming === `M${meetingNum}`) {
            targetStats.eliminationsByVote++;
          }
        });
    }
  });

  // Convert maps to final arrays with calculated rates
  const playerBehaviorStats = Array.from(playerBehaviorMap.entries()).map(([playerId, data]) => {
    const votingRate = data.totalMeetings > 0 ? (data.totalVotes / data.totalMeetings) * 100 : 0;
    const skippingRate = data.totalMeetings > 0 ? (data.totalSkips / data.totalMeetings) * 100 : 0;
    const abstentionRate = data.totalMeetings > 0 ? (data.totalAbstentions / data.totalMeetings) * 100 : 0;
    const aggressivenessScore = votingRate - (skippingRate * 0.5) - (abstentionRate * 0.7);

    return {
      player: playerId, // Use playerId as the main player identifier
      playerName: data.playerName,
      totalMeetings: data.totalMeetings,
      totalVotes: data.totalVotes,
      totalSkips: data.totalSkips,
      totalAbstentions: data.totalAbstentions,
      votingRate,
      skippingRate,
      abstentionRate,
      aggressivenessScore
    };
  });

  const playerAccuracyStats = Array.from(playerAccuracyMap.entries()).map(([playerId, data]) => {
    const accuracyRate = data.totalVotes > 0 ? (data.votesForEnemyCamp / data.totalVotes) * 100 : 0;
    const friendlyFireRate = data.totalVotes > 0 ? (data.votesForOwnCamp / data.totalVotes) * 100 : 0;

    return {
      player: playerId, // Use playerId as the main player identifier
      playerName: data.playerName,
      totalMeetings: data.totalMeetings,
      totalVotes: data.totalVotes,
      votesForEnemyCamp: data.votesForEnemyCamp,
      votesForOwnCamp: data.votesForOwnCamp,
      accuracyRate,
      friendlyFireRate
    };
  });

  const playerTargetStats = Array.from(playerTargetMap.entries()).map(([playerId, data]) => {
    const survivalRate = data.totalTimesTargeted > 0 
      ? ((data.totalTimesTargeted - data.eliminationsByVote) / data.totalTimesTargeted) * 100 
      : 100;

    return {
      player: playerId, // Use playerId as the main player identifier
      playerName: data.playerName,
      totalTimesTargeted: data.totalTimesTargeted,
      timesTargetedByEnemyCamp: data.timesTargetedByEnemyCamp,
      timesTargetedByOwnCamp: data.timesTargetedByOwnCamp,
      timesTargetedAsVillager: data.timesTargetedAsVillager,
      timesTargetedAsWolf: data.timesTargetedAsWolf,
      timesTargetedAsSpecial: data.timesTargetedAsSpecial,
      eliminationsByVote: data.eliminationsByVote,
      survivalRate
    };
  });

  return {
    playerBehaviorStats,
    playerAccuracyStats,
    playerTargetStats
  };
}