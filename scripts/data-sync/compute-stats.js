/**
 * Statistics computation functions for achievement generation
 */

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
      const playerName = player.Username;
      
      if (!playerStatsMap.has(playerName)) {
        playerStatsMap.set(playerName, {
          player: playerName,
          gamesPlayed: 0,
          wins: 0,
          camps: {
            villageois: { played: 0, won: 0 },
            loups: { played: 0, won: 0 },
            solo: { played: 0, won: 0 }
          }
        });
      }

      const stats = playerStatsMap.get(playerName);
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
 * @param {string} playerName - Name of the player
 * @param {Array} gameData - Array of game entries
 * @returns {Object|null} - Player history data or null
 */
export function computePlayerGameHistory(playerName, gameData) {
  if (!playerName || playerName.trim() === '' || gameData.length === 0) {
    return null;
  }

  const playerGames = [];

  gameData.forEach(game => {
    // Find the player in this game's PlayerStats
    const playerStat = game.PlayerStats.find(
      player => player.Username.toLowerCase() === playerName.toLowerCase()
    );

    if (playerStat) {
      // Get player's camp from their MainRoleFinal or MainRoleInitial
      const roleName = playerStat.MainRoleFinal || playerStat.MainRoleInitial;
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
  // Get all unique players
  const allPlayers = new Set();
  gameData.forEach(game => {
    game.PlayerStats.forEach(playerStat => {
      allPlayers.add(playerStat.Username);
    });
  });

  // Calculate stats for each player
  const playerMapStats = [];
  allPlayers.forEach(playerName => {
    const playerHistory = computePlayerGameHistory(playerName, gameData);
    if (playerHistory && playerHistory.mapStats) {
      const villageStats = playerHistory.mapStats['Village'] || { appearances: 0, wins: 0, winRate: 0 };
      const chateauStats = playerHistory.mapStats['Château'] || { appearances: 0, wins: 0, winRate: 0 };
      
      playerMapStats.push({
        player: playerName,
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
    
    // Count total games per player
    game.PlayerStats.forEach(player => {
      const playerName = player.Username;
      playerGameCounts[playerName] = (playerGameCounts[playerName] || 0) + 1;
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

  // Convert to array and calculate percentages and averages
  const killerStats = Object.entries(killerCounts).map(([killerName, data]) => ({
    killerName,
    kills: data.kills,
    victims: Array.from(data.victims),
    percentage: totalDeaths > 0 ? (data.kills / totalDeaths) * 100 : 0,
    gamesPlayed: playerGameCounts[killerName] || 0,
    averageKillsPerGame: (playerGameCounts[killerName] || 0) > 0 ? 
      data.kills / (playerGameCounts[killerName] || 1) : 0,
    killsByDeathType: data.killsByDeathType
  })).sort((a, b) => b.kills - a.kills);

  // Calculate player death statistics
  const playerDeathCounts = {};
  
  allDeaths.forEach(death => {
    if (!playerDeathCounts[death.playerName]) {
      playerDeathCounts[death.playerName] = {
        totalDeaths: 0,
        deathsByType: {},
        killedBy: {}
      };
    }
    
    playerDeathCounts[death.playerName].totalDeaths++;
    playerDeathCounts[death.playerName].deathsByType[death.deathType] = 
      (playerDeathCounts[death.playerName].deathsByType[death.deathType] || 0) + 1;
    
    if (death.killerName) {
      playerDeathCounts[death.playerName].killedBy[death.killerName] = 
        (playerDeathCounts[death.playerName].killedBy[death.killerName] || 0) + 1;
    }
  });

  const playerDeathStats = Object.entries(playerDeathCounts).map(([playerName, data]) => ({
    playerName,
    totalDeaths: data.totalDeaths,
    deathsByType: data.deathsByType,
    killedBy: data.killedBy,
    gamesPlayed: playerGameCounts[playerName] || 0,
    deathRate: (playerGameCounts[playerName] || 0) > 0 ? 
      data.totalDeaths / (playerGameCounts[playerName] || 1) : 0
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
  const playerCampPerformance = {};

  // First pass: count games and wins by camp
  gameData.forEach(game => {
    if (!game.PlayerStats) return;

    game.PlayerStats.forEach(player => {
      const roleName = player.MainRoleFinal || player.MainRoleInitial;
      const camp = getPlayerCampFromRole(roleName);
      const playerName = player.Username;
      const won = player.Victorious;

      // Initialize camp stats
      if (!campStats[camp]) {
        campStats[camp] = {
          totalGames: 0,
          wins: 0,
          winRate: 0,
          players: {}
        };
      }

      // Initialize player camp performance
      if (!playerCampPerformance[playerName]) {
        playerCampPerformance[playerName] = {
          totalGames: 0,
          camps: {}
        };
      }

      if (!playerCampPerformance[playerName].camps[camp]) {
        playerCampPerformance[playerName].camps[camp] = {
          games: 0,
          wins: 0,
          winRate: 0,
          performance: 0
        };
      }

      // Update counts
      campStats[camp].totalGames++;
      if (won) campStats[camp].wins++;

      playerCampPerformance[playerName].totalGames++;
      playerCampPerformance[playerName].camps[camp].games++;
      if (won) playerCampPerformance[playerName].camps[camp].wins++;
    });
  });

  // Calculate camp win rates
  Object.keys(campStats).forEach(camp => {
    if (campStats[camp].totalGames > 0) {
      campStats[camp].winRate = (campStats[camp].wins / campStats[camp].totalGames) * 100;
    }
  });

  // Calculate player win rates and performance vs camp average
  Object.keys(playerCampPerformance).forEach(playerName => {
    Object.keys(playerCampPerformance[playerName].camps).forEach(camp => {
      const playerCampStat = playerCampPerformance[playerName].camps[camp];
      
      if (playerCampStat.games > 0) {
        playerCampStat.winRate = (playerCampStat.wins / playerCampStat.games) * 100;

        // Calculate performance vs camp average
        if (campStats[camp] && campStats[camp].winRate) {
          playerCampStat.performance = playerCampStat.winRate - campStats[camp].winRate;
        }
      }
    });
  });

  // Convert to flat array format with minimum game threshold
  const allPlayerCampStats = [];
  const minGamesToInclude = 3;

  Object.keys(playerCampPerformance).forEach(playerName => {
    const playerData = playerCampPerformance[playerName];
    
    Object.keys(playerData.camps).forEach(camp => {
      const campData = playerData.camps[camp];
      
      // Only include if player has played this camp multiple times
      if (campData.games >= minGamesToInclude) {
        allPlayerCampStats.push({
          player: playerName,
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

  return allPlayerCampStats;
}

/**
 * Get all unique players from game data
 * @param {Array} gameData - Array of game log entries
 * @returns {Set} - Set of player names
 */
function getAllPlayersFromGames(gameData) {
  const allPlayers = new Set();
  
  gameData.forEach(game => {
    if (game.PlayerStats) {
      game.PlayerStats.forEach(playerStat => {
        allPlayers.add(playerStat.Username.trim());
      });
    }
  });
  
  return allPlayers;
}

/**
 * Initialize player series tracking state
 * @param {Set} allPlayers - Set of all player names
 * @returns {Object} - Player series state mapping
 */
function initializePlayerSeriesState(allPlayers) {
  const playerSeriesState = {};
  
  allPlayers.forEach(player => {
    playerSeriesState[player] = {
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
        const player = playerStat.Username.trim();
        const playerStats = playerSeriesState[player];
        
        if (playerStats) {
          const playerWon = playerStat.Victorious;
          const mainCamp = getPlayerMainCampFromRole(playerStat.MainRoleInitial);
          
          // Process camp series
          processCampSeries(playerStats, player, mainCamp, gameDisplayedId, date);
          
          // Process win series
          processWinSeries(playerStats, player, playerWon, mainCamp, gameDisplayedId, date);
          
          // Process loss series
          processLossSeries(playerStats, player, playerWon, mainCamp, gameDisplayedId, date);
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