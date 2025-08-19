function doGet(e) {
  var actionMap = {
    // Existing endpoints (no parameters)
    'campWinStats': { baseKey: 'campWinStats', fn: getCampWinStatsRaw },
    'harvestStats': { baseKey: 'harvestStats', fn: getHarvestStatsRaw },
    'gameDurationAnalysis': { baseKey: 'gameDurationAnalysis', fn: getGameDurationAnalysisRaw },
    'playerStats': { baseKey: 'playerStats', fn: getPlayerStatsRaw },
    'playerPairingStats': { baseKey: 'playerPairingStats', fn: getPlayerPairingStatsRaw },
    'playerCampPerformance': { baseKey: 'playerCampPerformance', fn: getPlayerCampPerformanceRaw },
    // endpoint with parameters
    'playerGameHistory': { 
      baseKey: 'playerGameHistory', 
      fn: getPlayerGameHistoryRaw,
      paramKeys: ['playerName'] // List of parameters that affect caching
    },
    // Raw data endpoints for client-side processing
    'rawGameData': { baseKey: 'rawGameData', fn: getRawGameDataRaw },
    'rawRoleData': { baseKey: 'rawRoleData', fn: getRawRoleDataRaw },
    'rawPonceData': { baseKey: 'rawPonceData', fn: getRawPonceDataRaw }
  };
  
  var action = e.parameter.action;
  var actionData = actionMap[action];
  if (actionData) {
    var cacheKey = generateCacheKey(actionData.baseKey, actionData.paramKeys, e);
    return getCachedData(cacheKey, actionData.fn, 3600, e);
  } else {
    return ContentService.createTextOutput('Invalid action - not found')
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * Generate cache key based on base key and parameters
 * @param {string} baseKey - Base cache key
 * @param {Array} paramKeys - Array of parameter names to include in cache key
 * @param {Object} e - Request parameters
 * @return {string} Generated cache key
 */
function generateCacheKey(baseKey, paramKeys, e) {
  if (!paramKeys || paramKeys.length === 0) {
    return baseKey;
  }
  
  var paramParts = paramKeys.map(function(paramKey) {
    var value = e.parameter[paramKey] || 'undefined';
    // Sanitize parameter values for cache key
    var sanitizedValue = value.toString().replace(/[^a-zA-Z0-9]/g, '_');
    return paramKey + '_' + sanitizedValue;
  });
  
  return baseKey + '_' + paramParts.join('_');
}

function test_doGet() {
  var cache = CacheService.getScriptCache();
  
  // Clear the cache for this endpoint
  var cacheKey = generateCacheKey('playerCampPerformance', null, { parameter: {} });
  cache.remove(cacheKey);
  
  var e = { 
    parameter: { 
      action: 'playerCampPerformance'
    } 
  };
  
  var result = doGet(e);
  Logger.log("Test playerCampPerformance");
  Logger.log("Cache key used: " + cacheKey);
  Logger.log(result.getContent());
  return result;
}

// Updated test function
function test_getPlayerGameHistory() {
  var cache = CacheService.getScriptCache();
  var playerName = "Ponce";
  
  // Clear the specific cache for this player
  var cacheKey = generateCacheKey('playerGameHistory', ['playerName'], { 
    parameter: { playerName: playerName } 
  });
  cache.remove(cacheKey);
  
  var e = { 
    parameter: { 
      action: 'playerGameHistory',
      playerName: playerName
    } 
  };
  
  var result = doGet(e);
  Logger.log("Test playerGameHistory for player: " + playerName);
  Logger.log("Cache key used: " + cacheKey);
  Logger.log(result.getContent());
  return result;
}

/**
 * Test function for raw game data export
 */
function test_getRawGameData() {
  var cache = CacheService.getScriptCache();
  
  // Clear the cache for this endpoint
  var cacheKey = generateCacheKey('rawGameData', null, { parameter: {} });
  cache.remove(cacheKey);
  
  var e = { 
    parameter: { 
      action: 'rawGameData'
    } 
  };
  
  var result = doGet(e);
  Logger.log("Test rawGameData");
  Logger.log("Cache key used: " + cacheKey);
  
  // Parse the result to check record count
  try {
    var data = JSON.parse(result.getContent());
    Logger.log("Total records: " + (data.totalRecords || 'unknown'));
    Logger.log("Sample record: " + JSON.stringify(data.data ? data.data[0] : 'none'));
  } catch (e) {
    Logger.log("Raw result: " + result.getContent());
  }
  
  return result;
}

/**
 * Test function for raw role data export
 */
function test_getRawRoleData() {
  var cache = CacheService.getScriptCache();
  
  // Clear the cache for this endpoint
  var cacheKey = generateCacheKey('rawRoleData', null, { parameter: {} });
  cache.remove(cacheKey);
  
  var e = { 
    parameter: { 
      action: 'rawRoleData'
    } 
  };
  
  var result = doGet(e);
  Logger.log("Test rawRoleData");
  Logger.log("Cache key used: " + cacheKey);
  
  // Parse the result to check record count
  try {
    var data = JSON.parse(result.getContent());
    Logger.log("Total records: " + (data.totalRecords || 'unknown'));
    Logger.log("Sample record: " + JSON.stringify(data.data ? data.data[0] : 'none'));
  } catch (e) {
    Logger.log("Raw result: " + result.getContent());
  }
  
  return result;
}

/**
 * Test function for raw Ponce data export
 */
function test_getRawPonceData() {
  var cache = CacheService.getScriptCache();
  
  // Clear the cache for this endpoint
  var cacheKey = generateCacheKey('rawPonceData', null, { parameter: {} });
  cache.remove(cacheKey);
  
  var e = { 
    parameter: { 
      action: 'rawPonceData'
    } 
  };
  
  var result = doGet(e);
  Logger.log("Test rawPonceData");
  Logger.log("Cache key used: " + cacheKey);
  
  // Parse the result to check record count
  try {
    var data = JSON.parse(result.getContent());
    Logger.log("Total records: " + (data.totalRecords || 'unknown'));
    Logger.log("Sample record: " + JSON.stringify(data.data ? data.data[0] : 'none'));
  } catch (e) {
    Logger.log("Raw result: " + result.getContent());
  }
  
  return result;
}


/**
 * Determines which sheets are needed based on requested stats
 * @param {Array} statsToInclude - Array of stat types to include
 * @return {Array} Array of sheet names needed
 */
function getNeededSheets(statsToInclude) {
  var sheets = new Set();
  
  // All stats use the Games sheet
  sheets.add(LYCAN_SCHEMA.GAMES.SHEET);
  
  // Player stats, role survival stats, and pairing stats need role data
  if (statsToInclude.includes('playerStats') || 
      statsToInclude.includes('playerPairingStats') || 
      statsToInclude.includes('playerCampPerformance')) {
    sheets.add(LYCAN_SCHEMA.ROLES.SHEET);
  }
  
  // Ponce data: not used for now
  //if (statsToInclude.includes('')) {
  //  sheets.add(LYCAN_SCHEMA.PONCE.SHEET);
  //}
  
  return Array.from(sheets);
}

//Caching data
function getCachedData(cacheKey, generatorFn, cacheSeconds, e) {
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(cacheKey);
    
    if (cached) {
      return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
    }
    
    var result = generatorFn(e);
    cache.put(cacheKey, result, cacheSeconds);
    return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in getCachedData: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Internal: Calcule les stats de victoire par camp à partir des données fournies
 * @param {Object} gameData - Données de la feuille Game (values, backgrounds)
 * @return {string} JSON string avec les statistiques
 */
function _computeCampWinStats(gameData) {
  var values = gameData.values;
  var headers = values[0];

  // Get column indexes
  var winnerCampIdx = findColumnIndex(headers, LYCAN_SCHEMA.GAMES.COLS.WINNERCAMP);
  var soloRolesIdx = findColumnIndex(headers, LYCAN_SCHEMA.GAMES.COLS.SOLO);

  // Skip header row
  var dataRows = values.slice(1);

  // Count wins by camp
  var soloCamps = {};
  var campWins = {};
  var totalGames = 0;

  dataRows.forEach(function(row) {
    var soloRoles = row[soloRolesIdx];
    var winnerCamp = row[winnerCampIdx];

    // Process solo roles if they exist
    if (soloRoles && soloRoles.toString().trim() !== "") {
      // Split by comma and process each solo role
      var soloRolesList = splitAndTrim(soloRoles.toString());
      soloRolesList.forEach(function(soloRole) {
        var trimmedRole = soloRole.trim();
        if (trimmedRole !== "") {
          // Track solo camps
          if (!soloCamps[trimmedRole]) {
            soloCamps[trimmedRole] = 0;
          }
          soloCamps[trimmedRole]++;
        }
      });
    }

    // Process regular winner camp
    if (winnerCamp) {
      totalGames++;
      if (!campWins[winnerCamp]) {
        campWins[winnerCamp] = 0;
      }
      campWins[winnerCamp]++;
    }
  });

  // Calculate win percentages
  var campStats = [];
  Object.keys(campWins).forEach(function(camp) {
    campStats.push({
      camp: camp,
      wins: campWins[camp],
      winRate: (campWins[camp] / totalGames * 100).toFixed(2)
    });
  });

  // Sort by win count (descending)
  campStats.sort(function(a, b) {
    return b.wins - a.wins;
  });

  // Convert soloCamps to array for easier frontend processing
  var soloCampStats = [];
  Object.keys(soloCamps).forEach(function(soloRole) {
    soloCampStats.push({
      soloRole: soloRole,
      appearances: soloCamps[soloRole]
    });
  });

  // Sort solo camps by appearances (descending)
  soloCampStats.sort(function(a, b) {
    return b.appearances - a.appearances;
  });

  return JSON.stringify({
    totalGames: totalGames,
    campStats: campStats,
    soloCamps: soloCampStats
  });
}

/**
 * Returns statistics about win rates by camp (Villageois, Loups, etc.)
 * @return {string} JSON string with camp win statistics
 */
function getCampWinStatsRaw() {
  try {
    var gameData = getLycanSheetData(LYCAN_SCHEMA.GAMES.SHEET);
    return _computeCampWinStats(gameData);
  } catch (error) {
    Logger.log('Error in getCampWinStatsRaw: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}

/**
 * Returns statistics about win rates by camp using preloaded data
 * @param {Object} sheetData - Objet contenant les données préchargées (clé = nom de feuille)
 * @return {string} JSON string avec les statistiques
 */
function getCampWinStatsWithData(sheetData) {
  try {
    var gameData = sheetData[LYCAN_SCHEMA.GAMES.SHEET];
    return _computeCampWinStats(gameData);
  } catch (error) {
    Logger.log('Error in getCampWinStatsWithData: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}

/**
 * Internal: Calcule les stats de récolte à partir des données fournies
 * @param {Object} gameData - Données de la feuille Game (values, backgrounds)
 * @return {string} JSON string avec les statistiques de récolte
 */
function _computeHarvestStats(gameData) {
  var values = gameData.values;
  var headers = values[0];

  // Get column indexes
  var harvestIdx = findColumnIndex(headers, LYCAN_SCHEMA.GAMES.COLS.HARVEST);
  var maxHarvestIdx = findColumnIndex(headers, LYCAN_SCHEMA.GAMES.COLS.TOTALHARVEST);
  var harvestPercentIdx = findColumnIndex(headers, LYCAN_SCHEMA.GAMES.COLS.HARVESTPERCENT);
  var winnerCampIdx = findColumnIndex(headers, LYCAN_SCHEMA.GAMES.COLS.WINNERCAMP);

  // Skip header row
  var dataRows = values.slice(1);

  // Analyze harvest data
  var harvestStats = {
    averageHarvest: 0,
    averageHarvestPercent: 0,
    gamesWithHarvest: 0,
    harvestDistribution: {
      "0-25%": 0,
      "26-50%": 0,
      "51-75%": 0,
      "76-99%": 0,
      "100%": 0
    },
    harvestByWinner: {}
  };

  var totalHarvest = 0;
  var totalMaxHarvest = 0;

  dataRows.forEach(function(row) {
    var winnerCamp = row[winnerCampIdx];
    var harvest = row[harvestIdx];
    if (harvest !== "" && !isNaN(harvest)) {
      totalHarvest += parseFloat(harvest);
    }

    var maxHarvest = row[maxHarvestIdx];
    if (maxHarvest !== "" && !isNaN(maxHarvest)) {
      totalMaxHarvest += parseFloat(maxHarvest);
    }

    var harvestPercent = row[harvestPercentIdx];
    if (harvestPercent !== "" && !isNaN(harvestPercent)) {
      harvestStats.gamesWithHarvest++;

      // Categorize by percentage
      if (harvestPercent <= 0.25) {
        harvestStats.harvestDistribution["0-25%"]++;
      } else if (harvestPercent <= 0.50) {
        harvestStats.harvestDistribution["26-50%"]++;
      } else if (harvestPercent <= 0.75) {
        harvestStats.harvestDistribution["51-75%"]++;
      } else if (harvestPercent <= 0.99) {
        harvestStats.harvestDistribution["76-99%"]++;
      } else {
        harvestStats.harvestDistribution["100%"]++;
      }

      // Track by winner camp
      if (winnerCamp) {
        if (!harvestStats.harvestByWinner[winnerCamp]) {
          harvestStats.harvestByWinner[winnerCamp] = {
            totalPercent: 0,
            count: 0,
            average: 0
          };
        }

        harvestStats.harvestByWinner[winnerCamp].totalPercent += parseFloat(harvestPercent);
        harvestStats.harvestByWinner[winnerCamp].count++;
      }
    }
  });

  // Calculate averages
  if (harvestStats.gamesWithHarvest > 0) {
    harvestStats.averageHarvestPercent = (totalHarvest / totalMaxHarvest * 100).toFixed(2);
    harvestStats.averageHarvest = (totalHarvest / harvestStats.gamesWithHarvest).toFixed(2);
    // Calculate averages for each winner camp
    Object.keys(harvestStats.harvestByWinner).forEach(function(camp) {
      var campData = harvestStats.harvestByWinner[camp];
      if (campData.count > 0) {
        campData.average = (campData.totalPercent / campData.count * 100).toFixed(2);
      }
    });
  }

  return JSON.stringify(harvestStats);
}

/**
 * Returns statistics about harvest rates and outcomes
 * @return {string} JSON string with harvest statistics
 */
function getHarvestStatsRaw() {
  try {
    var gameData = getLycanSheetData(LYCAN_SCHEMA.GAMES.SHEET);
    return _computeHarvestStats(gameData);
  } catch (error) {
    Logger.log('Error in getHarvestStatsRaw: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}

/**
 * Returns statistics about harvest rates and outcomes using preloaded data
 * @param {Object} sheetData - Objet contenant les données préchargées (clé = nom de feuille)
 * @return {string} JSON string avec les statistiques de récolte
 */
function getHarvestStatsWithData(sheetData) {
  try {
    var gameData = sheetData[LYCAN_SCHEMA.GAMES.SHEET];
    return _computeHarvestStats(gameData);
  } catch (error) {
    Logger.log('Error in getHarvestStatsWithData: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}

/**
 * Internal: Calcule les statistiques détaillées pour chaque joueur à partir des données fournies
 * @param {Object} gameData - Données de la feuille Game (values, backgrounds)
 * @param {Object} roleData - Données de la feuille Roles (values, backgrounds)
 * @return {string} JSON string avec les statistiques des joueurs
 */
function _computePlayerStats(gameData, roleData) {
  var gameValues = gameData.values;
  var roleValues = roleData.values;

  var gameHeaders = gameValues[0];
  var roleHeaders = roleValues[0];

  // Cache all column indexes upfront to avoid repeated lookups
  var gameColumns = {
    gameId: findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.GAMEID),
    playerList: findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.PLAYERLIST),
    winnerList: findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.WINNERLIST)
  };

  var roleColumns = {
    gameId: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.GAMEID),
    wolfs: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.WOLFS),
    traitor: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.TRAITOR),
    idiot: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.IDIOT),
    cannibal: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.CANNIBAL),
    agents: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.AGENTS),
    spy: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.SPY),
    scientist: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.SCIENTIST),
    lovers: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.LOVERS),
    beast: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.THEBEAST),
    bountyHunter: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.BOUNTYHUNTER),
    voodoo: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.VOODOO)
  };

  // Skip header rows
  var gameRows = gameValues.slice(1);
  var roleRows = roleValues.slice(1);

  // Create map of game ID to player camps
  var gamePlayerCampMap = {};
  roleRows.forEach(function(row) {
    var gameId = row[roleColumns.gameId];
    if (!gameId) return;

    if (!gamePlayerCampMap[gameId]) {
      gamePlayerCampMap[gameId] = {};
    }

    // Add wolves
    var wolves = row[roleColumns.wolfs];
    if (wolves) {
      splitAndTrim(wolves).forEach(function(player) {
        gamePlayerCampMap[gameId][player] = "Loups";
      });
    }

    // Add all other roles using helper function to reduce code duplication
    function addRolePlayer(player, roleName) {
      if (player && player.trim()) {
        gamePlayerCampMap[gameId][player.trim()] = roleName;
      }
    }

    addRolePlayer(row[roleColumns.traitor], "Traître");
    addRolePlayer(row[roleColumns.idiot], "Idiot du Village");
    addRolePlayer(row[roleColumns.cannibal], "Cannibale");
    addRolePlayer(row[roleColumns.spy], "Espion");
    addRolePlayer(row[roleColumns.beast], "La Bête");
    addRolePlayer(row[roleColumns.bountyHunter], "Chasseur de primes");
    addRolePlayer(row[roleColumns.voodoo], "Vaudou");

    // Handle agents (could be multiple)
    var agents = row[roleColumns.agents];
    if (agents) {
      splitAndTrim(agents).forEach(function(player) {
        gamePlayerCampMap[gameId][player] = "Agent";
      });
    }

    // Handle scientist (could be multiple)
    var scientists = row[roleColumns.scientist];
    if (scientists) {
      splitAndTrim(scientists).forEach(function(player) {
        gamePlayerCampMap[gameId][player] = "Scientifique";
      });
    }

    // Handle lovers (could be multiple)
    var lovers = row[roleColumns.lovers];
    if (lovers) {
      splitAndTrim(lovers).forEach(function(player) {
        gamePlayerCampMap[gameId][player] = "Amoureux";
      });
    }
  });

  // Collect all players and initialize stats
  var allPlayers = {};
  var totalGames = 0;

  gameRows.forEach(function(row) {
    var gameId = row[gameColumns.gameId];
    var playerList = row[gameColumns.playerList];
    var winnerList = row[gameColumns.winnerList];

    if (gameId && playerList) {
      totalGames++;
      var players = splitAndTrim(playerList);

      players.forEach(function(playerName) {
        var player = playerName.trim();
        if (player) {
          if (!allPlayers[player]) {
            allPlayers[player] = {
              gamesPlayed: 0,
              gamesPlayedPercent: 0,
              wins: 0,
              winPercent: 0,
              camps: {
                "Villageois": 0,
                "Loups": 0,
                "Traître": 0,
                "Idiot du Village": 0,
                "Cannibale": 0,
                "Agent": 0,
                "Espion": 0,
                "Scientifique": 0,
                "Amoureux": 0,
                "La Bête": 0,
                "Chasseur de primes": 0,
                "Vaudou": 0
              }
            };
          }

          allPlayers[player].gamesPlayed++;

          // Determine player's camp in this game
          var playerCamp = getPlayerCamp(gamePlayerCampMap, gameId, player);

          // Increment camp count
          allPlayers[player].camps[playerCamp]++;

          // Check if player won
          var playerWon = didPlayerWin(player, winnerList);
          if (playerWon) {
            allPlayers[player].wins++;
          }
        }
      });
    }
  });

  // Calculate percentages
  Object.keys(allPlayers).forEach(function(player) {
    var stats = allPlayers[player];
    stats.gamesPlayedPercent = (stats.gamesPlayed / totalGames * 100).toFixed(2);
    stats.winPercent = (stats.wins / stats.gamesPlayed * 100).toFixed(2);
  });

  // Convert to array for easier frontend processing
  var playerStatsArray = Object.keys(allPlayers).map(function(player) {
    return {
      player: player,
      ...allPlayers[player]
    };
  });

  // Sort by games played (descending)
  playerStatsArray.sort(function(a, b) {
    return b.gamesPlayed - a.gamesPlayed;
  });

  return JSON.stringify({
    totalGames: totalGames,
    playerStats: playerStatsArray
  });
}

/**
 * Returns detailed statistics for each player
 * @return {string} JSON string with player statistics
 */
function getPlayerStatsRaw() {
  try {
    var gameData = getLycanSheetData(LYCAN_SCHEMA.GAMES.SHEET);
    var roleData = getLycanSheetData(LYCAN_SCHEMA.ROLES.SHEET);
    return _computePlayerStats(gameData, roleData);
  } catch (error) {
    Logger.log('Error in getPlayerStatsRaw: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}

/**
 * Returns detailed statistics for each player using preloaded data
 * @param {Object} sheetData - Objet contenant les données préchargées (clé = nom de feuille)
 * @return {string} JSON string with player statistics
 */
function getPlayerStatsWithData(sheetData) {
  try {
    var gameData = sheetData[LYCAN_SCHEMA.GAMES.SHEET];
    var roleData = sheetData[LYCAN_SCHEMA.ROLES.SHEET];
    return _computePlayerStats(gameData, roleData);
  } catch (error) {
    Logger.log('Error in getPlayerStatsWithData: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}


/**
 * Internal: Calcule les statistiques de pairings joueurs (loups et amoureux) à partir des données fournies
 * @param {Object} gameData - Données de la feuille Game (values, backgrounds)
 * @param {Object} roleData - Données de la feuille Roles (values, backgrounds)
 * @return {string} JSON string avec les statistiques de pairings
 */
function _computePlayerPairingStats(gameData, roleData) {
  var gameValues = gameData.values;
  var roleValues = roleData.values;

  var gameHeaders = gameValues[0];
  var roleHeaders = roleValues[0]; 

  // Get game column indexes
  var gameIdIdx = findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.GAMEID);
  var winnerCampIdx = findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.WINNERCAMP);

  // Get role column indexes
  var roleGameIdIdx = findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.GAMEID);
  var wolfsIdx = findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.WOLFS);
  var loversIdx = findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.LOVERS);

  // Skip header rows
  var gameRows = gameValues.slice(1);
  var roleRows = roleValues.slice(1);

  // Create map of game ID to winner camp
  var gameWinnerMap = {};
  gameRows.forEach(function(row) {
    var gameId = row[gameIdIdx];
    var winnerCamp = row[winnerCampIdx];
    if (gameId && winnerCamp) {
      gameWinnerMap[gameId] = winnerCamp;
    }
  });

  // Initialize statistics
  var wolfPairStats = {};
  var loverPairStats = {};
  var totalGamesWithMultipleWolves = 0;
  var totalGamesWithLovers = 0;

  // Process role data
  roleRows.forEach(function(row) {
    var gameId = row[roleGameIdIdx];
    if (!gameId) return;

    var wolves = row[wolfsIdx];
    var lovers = row[loversIdx];
    var winnerCamp = gameWinnerMap[gameId];

    // Process wolf pairs
    if (wolves) {
      var wolfArray = splitAndTrim(wolves);
      // Only process if there are multiple wolves
      if (wolfArray.length >= 2) {
        totalGamesWithMultipleWolves++;
        // Generate all possible wolf pairs
        for (var i = 0; i < wolfArray.length; i++) {
          for (var j = i + 1; j < wolfArray.length; j++) {
            var wolf1 = wolfArray[i];
            var wolf2 = wolfArray[j];
            // Create a consistent key for the pair (alphabetical order)
            var pairKey = [wolf1, wolf2].sort().join(" & ");
            if (!wolfPairStats[pairKey]) {
              wolfPairStats[pairKey] = {
                appearances: 0,
                wins: 0,
                winRate: 0,
                players: [wolf1, wolf2]
              };
            }
            wolfPairStats[pairKey].appearances++;
            if (winnerCamp === "Loups") {
              wolfPairStats[pairKey].wins++;
            }
          }
        }
      }
    }

    // Process lover pairs
    if (lovers) {
      var loverArray = splitAndTrim(lovers);

      // Only process if there are lovers (should be pairs)
      if (loverArray.length >= 2) {
        totalGamesWithLovers++;

        // Generate lover pairs (should usually be just one pair per game)
        for (var i = 0; i < loverArray.length; i += 2) {
          // Make sure we have both lovers of the pair
          if (i + 1 < loverArray.length) {
            var lover1 = loverArray[i];
            var lover2 = loverArray[i + 1];

            // Create a consistent key for the pair (alphabetical order)
            var pairKey = [lover1, lover2].sort().join(" & ");

            if (!loverPairStats[pairKey]) {
              loverPairStats[pairKey] = {
                appearances: 0,
                wins: 0,
                winRate: 0,
                players: [lover1, lover2]
              };
            }

            loverPairStats[pairKey].appearances++;
            if (winnerCamp === "Amoureux") {
              loverPairStats[pairKey].wins++;
            }
          }
        }
      }
    }
  });

  // Calculate win rates and convert to arrays
  var wolfPairArray = Object.keys(wolfPairStats).map(function(key) {
    var stats = wolfPairStats[key];
    stats.winRate = stats.appearances > 0 ? (stats.wins / stats.appearances * 100).toFixed(2) : "0.00";
    return {
      pair: key,
      ...stats
    };
  });

  var loverPairArray = Object.keys(loverPairStats).map(function(key) {
    var stats = loverPairStats[key];
    stats.winRate = stats.appearances > 0 ? (stats.wins / stats.appearances * 100).toFixed(2) : "0.00";
    return {
      pair: key,
      ...stats
    };
  });

  // Sort by number of appearances (descending)
  wolfPairArray.sort(function(a, b) {
    return b.appearances - a.appearances;
  });

  loverPairArray.sort(function(a, b) {
    return b.appearances - a.appearances;
  });

  return JSON.stringify({
    wolfPairs: {
      totalGames: totalGamesWithMultipleWolves,
      pairs: wolfPairArray
    },
    loverPairs: {
      totalGames: totalGamesWithLovers,
      pairs: loverPairArray
    }
  });
}

/**
 * Returns statistics about player pairings (wolves and lovers)
 * @return {string} JSON string with player pairing statistics
 */
function getPlayerPairingStatsRaw() {
  try {
    var gameData = getLycanSheetData(LYCAN_SCHEMA.GAMES.SHEET);
    var roleData = getLycanSheetData(LYCAN_SCHEMA.ROLES.SHEET);
    return _computePlayerPairingStats(gameData, roleData);
  } catch (error) {
    Logger.log('Error in getPlayerPairingStatsRaw: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}

/**
 * Returns statistics about player pairings (wolves and lovers) using preloaded data
 * @param {Object} sheetData - Objet contenant les données préchargées (clé = nom de feuille)
 * @return {string} JSON string with player pairing statistics
 */
function getPlayerPairingStatsWithData(sheetData) {
  try {
    var gameData = sheetData[LYCAN_SCHEMA.GAMES.SHEET];
    var roleData = sheetData[LYCAN_SCHEMA.ROLES.SHEET];
    return _computePlayerPairingStats(gameData, roleData);
  } catch (error) {
    Logger.log('Error in getPlayerPairingStatsWithData: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}

/**
 * Returns detailed game history for a specific player
 * @param {Object} e - Request parameters containing playerName
 * @return {string} JSON string with player's game history
 */
function getPlayerGameHistoryRaw(e) {
  try {
    // Get player name from parameters
    var playerName = e.parameter.playerName;
    if (!playerName) {
      return JSON.stringify({ error: 'Player name is required' });
    }
    
    // Get game and role data
    var gameData = getLycanSheetData(LYCAN_SCHEMA.GAMES.SHEET);
    var roleData = getLycanSheetData(LYCAN_SCHEMA.ROLES.SHEET);
    
    var gameValues = gameData.values;
    var roleValues = roleData.values;
    
    var gameHeaders = gameValues[0];
    var roleHeaders = roleValues[0]; 
    
    // Get game column indexes
    var gameIdIdx = findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.GAMEID);
    var dateIdx = findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.DATE);
    var playerListIdx = findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.PLAYERLIST);
    var winnerCampIdx = findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.WINNERCAMP);
    var winnerListIdx = findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.WINNERLIST);
    
    // Get role column indexes
    var roleGameIdIdx = findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.GAMEID);
    var wolfsIdx = findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.WOLFS);
    var traitorIdx = findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.TRAITOR);
    var idiotIdx = findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.IDIOT);
    var cannibalIdx = findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.CANNIBAL);
    var agentsIdx = findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.AGENTS);
    var spyIdx = findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.SPY);
    var scientistIdx = findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.SCIENTIST);
    var loversIdx = findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.LOVERS);
    var beastIdx = findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.THEBEAST);
    var bountyHunterIdx = findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.BOUNTYHUNTER);
    var voodooIdx = findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.VOODOO);
    
    // Skip header rows
    var gameRows = gameValues.slice(1);
    var roleRows = roleValues.slice(1); 
    
    // Create map of game ID to player camps
    var gamePlayerCampMap = {};
    roleRows.forEach(function(row) {
      var gameId = row[roleGameIdIdx];
      if (!gameId) return;
      
      if (!gamePlayerCampMap[gameId]) {
        gamePlayerCampMap[gameId] = {};
      }
      
      // Helper function to add player to camp
      function addPlayerToCamp(playerStr, campName) {
        if (playerStr) {
          var players = splitAndTrim(playerStr);
          players.forEach(function(player) {
            var trimmedPlayer = player.trim();
            if (trimmedPlayer) {
              gamePlayerCampMap[gameId][trimmedPlayer] = campName;
            }
          });
        }
      }
      
      // Add players by camp
      addPlayerToCamp(row[wolfsIdx], "Loups");
      addPlayerToCamp(row[traitorIdx], "Traître");
      addPlayerToCamp(row[idiotIdx], "Idiot du Village");
      addPlayerToCamp(row[cannibalIdx], "Cannibale");
      addPlayerToCamp(row[agentsIdx], "Agent");
      addPlayerToCamp(row[spyIdx], "Espion");
      addPlayerToCamp(row[scientistIdx], "Scientifique");
      addPlayerToCamp(row[loversIdx], "Amoureux");
      addPlayerToCamp(row[beastIdx], "La Bête");
      addPlayerToCamp(row[bountyHunterIdx], "Chasseur de primes");
      addPlayerToCamp(row[voodooIdx], "Vaudou");
    });
    
    // Find games where the player participated
    var playerGames = [];
    
    gameRows.forEach(function(row) {
      var gameId = row[gameIdIdx];
      var date = row[dateIdx];
      var playerList = row[playerListIdx];
      var winnerCamp = row[winnerCampIdx];
      var winnerList = row[winnerListIdx];
      
      if (gameId && playerList && date && winnerList) {
        // Check if player is in the game
        var players = splitAndTrim(playerList);
        var playerInGame = players.some(function(p) { 
          return p.toLowerCase() === playerName.toLowerCase(); 
        });
        
        if (playerInGame) {
          // Determine player's camp 
          var playerCamp = getPlayerCamp(gamePlayerCampMap, gameId, playerName);
          
          // Determine win/loss status
          var playerWon = didPlayerWin(playerName, winnerList);
          
          // Format date consistently
          var formattedDate = formatLycanDate(date);
          
          playerGames.push({
            gameId: gameId,
            date: formattedDate,
            camp: playerCamp,
            won: playerWon,
            winnerCamp: winnerCamp,
            playersInGame: players.length
          });
        }
      }
    });
    
    // Sort games by date (most recent first)
    playerGames.sort(function(a, b) {
      // Convert DD/MM/YYYY to comparable format
      function parseDate(dateStr) {
        var parts = dateStr.split('/');
        if (parts.length === 3) {
          return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        return new Date(dateStr);
      }
      
      return parseDate(b.date) - parseDate(a.date);
    });
    
    // Calculate summary statistics
    var totalGames = playerGames.length;
    var totalWins = playerGames.filter(function(game) { return game.won; }).length;
    var winRate = totalGames > 0 ? (totalWins / totalGames * 100).toFixed(2) : "0.00";
    
    // Calculate camp distribution
    var campStats = {};
    playerGames.forEach(function(game) {
      if (!campStats[game.camp]) {
        campStats[game.camp] = {
          appearances: 0,
          wins: 0,
          winRate: 0
        };
      }
      campStats[game.camp].appearances++;
      if (game.won) {
        campStats[game.camp].wins++;
      }
    });
    
    // Calculate win rates for each camp
    Object.keys(campStats).forEach(function(camp) {
      var stats = campStats[camp];
      stats.winRate = stats.appearances > 0 ? (stats.wins / stats.appearances * 100).toFixed(2) : "0.00";
    });
    
    return JSON.stringify({
      playerName: playerName,
      totalGames: totalGames,
      totalWins: totalWins,
      winRate: winRate,
      games: playerGames,
      campStats: campStats
    });
    
  } catch (error) {
    Logger.log('Error in getPlayerGameHistoryRaw: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}

/**
 * Internal: Calcule les statistiques de durée de partie à partir des données fournies
 * @param {Object} gameData - Données de la feuille Game (values, backgrounds)
 * @return {string} JSON string avec les statistiques de durée de partie
 */
function _computeGameDurationAnalysis(gameData) {
  var values = gameData.values;
  var headers = values[0];

  // Get column indexes
  var nbDaysIdx = findColumnIndex(headers, LYCAN_SCHEMA.GAMES.COLS.NBDAYS);
  var winnerCampIdx = findColumnIndex(headers, LYCAN_SCHEMA.GAMES.COLS.WINNERCAMP);
  var nbPlayersIdx = findColumnIndex(headers, LYCAN_SCHEMA.GAMES.COLS.NBPLAYERS);
  var nbWolvesIdx = findColumnIndex(headers, LYCAN_SCHEMA.GAMES.COLS.NBWOLVES);

  // Skip header row
  var dataRows = values.slice(1);

  // Analyze duration data
  var durationStats = {
    averageDays: 0,
    maxDays: 0,
    minDays: 99,
    dayDistribution: {},
    daysByWinnerCamp: {},
    daysByPlayerCount: {},
    daysByWolfRatio: {}
  };

  var totalDays = 0;
  var gamesWithDays = 0;

  dataRows.forEach(function(row) {
    var nbDays = row[nbDaysIdx];
    var winnerCamp = row[winnerCampIdx];
    var nbPlayers = row[nbPlayersIdx];
    var nbWolves = row[nbWolvesIdx];

    if (nbDays && !isNaN(nbDays)) {
      nbDays = parseInt(nbDays);
      gamesWithDays++;
      totalDays += nbDays;

      // Update max/min
      if (nbDays > durationStats.maxDays) {
        durationStats.maxDays = nbDays;
      }
      if (nbDays < durationStats.minDays) {
        durationStats.minDays = nbDays;
      }

      // Update day distribution
      if (!durationStats.dayDistribution[nbDays]) {
        durationStats.dayDistribution[nbDays] = 0;
      }
      durationStats.dayDistribution[nbDays]++;

      // Update days by winner camp
      if (winnerCamp) {
        if (!durationStats.daysByWinnerCamp[winnerCamp]) {
          durationStats.daysByWinnerCamp[winnerCamp] = {
            totalDays: 0,
            count: 0,
            average: 0
          };
        }
        durationStats.daysByWinnerCamp[winnerCamp].totalDays += nbDays;
        durationStats.daysByWinnerCamp[winnerCamp].count++;
      }

      // Update days by player count
      if (nbPlayers && !isNaN(nbPlayers)) {
        if (!durationStats.daysByPlayerCount[nbPlayers]) {
          durationStats.daysByPlayerCount[nbPlayers] = {
            totalDays: 0,
            count: 0,
            average: 0
          };
        }
        durationStats.daysByPlayerCount[nbPlayers].totalDays += nbDays;
        durationStats.daysByPlayerCount[nbPlayers].count++;
      }

      if (nbPlayers && nbWolves && !isNaN(nbPlayers) && !isNaN(nbWolves)) {
        // Calculate ratio as a percentage
        var wolfRatioPercent = Math.round((parseInt(nbWolves) / parseInt(nbPlayers)) * 100);
        // Round to nearest 5%
        var roundedWolfRatio = Math.round(wolfRatioPercent / 1) * 1;
        var wolfRatioKey = roundedWolfRatio.toString(); // e.g., "35" for 35%

        if (!durationStats.daysByWolfRatio[wolfRatioKey]) {
          durationStats.daysByWolfRatio[wolfRatioKey] = {
            totalDays: 0,
            count: 0,
            average: 0
          };
        }
        durationStats.daysByWolfRatio[wolfRatioKey].totalDays += nbDays;
        durationStats.daysByWolfRatio[wolfRatioKey].count++;
      }
    }
  });

  // Calculate averages
  if (gamesWithDays > 0) {
    durationStats.averageDays = (totalDays / gamesWithDays).toFixed(1);

    // Calculate averages for each category
    Object.keys(durationStats.daysByWinnerCamp).forEach(function(camp) {
      var campData = durationStats.daysByWinnerCamp[camp];
      if (campData.count > 0) {
        campData.average = (campData.totalDays / campData.count).toFixed(1);
      }
    });

    Object.keys(durationStats.daysByPlayerCount).forEach(function(playerCount) {
      var playerData = durationStats.daysByPlayerCount[playerCount];
      if (playerData.count > 0) {
        playerData.average = (playerData.totalDays / playerData.count).toFixed(1);
      }
    });

    Object.keys(durationStats.daysByWolfRatio).forEach(function(ratio) {
      var ratioData = durationStats.daysByWolfRatio[ratio];
      if (ratioData.count > 0) {
        ratioData.average = (ratioData.totalDays / ratioData.count ).toFixed(1);
      }
    });
  }

  // Convert day distribution to array for easier frontend processing
  var dayDistributionArray = Object.keys(durationStats.dayDistribution).map(function(day) {
    return {
      days: parseInt(day),
      count: durationStats.dayDistribution[day]
    };
  });

  // Sort by day count
  dayDistributionArray.sort(function(a, b) {
    return a.days - b.days;
  });

  durationStats.dayDistribution = dayDistributionArray;

  return JSON.stringify(durationStats);
}

/**
 * Returns statistics about game duration by number of days
 * @return {string} JSON string with game duration statistics
 */
function getGameDurationAnalysisRaw() {
  try {
    var gameData = getLycanSheetData(LYCAN_SCHEMA.GAMES.SHEET);
    return _computeGameDurationAnalysis(gameData);
  } catch (error) {
    Logger.log('Error in getGameDurationAnalysisRaw: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}

/**
 * Returns statistics about game duration by number of days using preloaded data
 * @param {Object} sheetData - Objet contenant les données préchargées (clé = nom de feuille)
 * @return {string} JSON string with game duration statistics
 */
function getGameDurationAnalysisWithData(sheetData) {
  try {
    var gameData = sheetData[LYCAN_SCHEMA.GAMES.SHEET];
    return _computeGameDurationAnalysis(gameData);
  } catch (error) {
    Logger.log('Error in getGameDurationAnalysisWithData: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}

/**
 * Internal: Calcule les performances des joueurs par camp à partir des données fournies
 * @param {Object} gameData - Données de la feuille Game (values, backgrounds)
 * @param {Object} roleData - Données de la feuille Roles (values, backgrounds)
 * @return {string} JSON string avec les performances des joueurs par camp
 */
function _computePlayerCampPerformance(gameData, roleData) {
  var gameValues = gameData.values;
  var roleValues = roleData.values;

  var gameHeaders = gameValues[0];
  var roleHeaders = roleValues[0];

  // Cache all column indexes upfront to avoid repeated lookups
  var gameColumns = {
    gameId: findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.GAMEID),
    playerList: findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.PLAYERLIST),
    winnerCamp: findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.WINNERCAMP),
    winnerList: findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.WINNERLIST)
  };

  var roleColumns = {
    gameId: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.GAMEID),
    wolfs: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.WOLFS),
    traitor: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.TRAITOR),
    idiot: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.IDIOT),
    cannibal: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.CANNIBAL),
    agents: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.AGENTS),
    spy: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.SPY),
    scientist: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.SCIENTIST),
    lovers: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.LOVERS),
    beast: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.THEBEAST),
    bountyHunter: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.BOUNTYHUNTER),
    voodoo: findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.VOODOO)
  };

  // Skip header rows
  var gameRows = gameValues.slice(1);
  var roleRows = roleValues.slice(1);

  // Create map of game ID to player camps
  var gamePlayerCampMap = {};
  roleRows.forEach(function(row) {
    var gameId = row[roleColumns.gameId];
    if (!gameId) return;

    if (!gamePlayerCampMap[gameId]) {
      gamePlayerCampMap[gameId] = {};
    }

    // Add wolves
    var wolves = row[roleColumns.wolfs];
    if (wolves) {
      splitAndTrim(wolves).forEach(function(player) {
        gamePlayerCampMap[gameId][player] = "Loups";
      });
    }

    // Add all other roles using helper function to reduce code duplication
    function addRolePlayer(player, roleName) {
      if (player && player.trim()) {
        gamePlayerCampMap[gameId][player.trim()] = roleName;
      }
    }

    addRolePlayer(row[roleColumns.traitor], "Traître");
    addRolePlayer(row[roleColumns.idiot], "Idiot du Village");
    addRolePlayer(row[roleColumns.cannibal], "Cannibale");
    addRolePlayer(row[roleColumns.spy], "Espion");
    addRolePlayer(row[roleColumns.beast], "La Bête");
    addRolePlayer(row[roleColumns.bountyHunter], "Chasseur de primes");
    addRolePlayer(row[roleColumns.voodoo], "Vaudou");

    // Handle agents (could be multiple)
    var agents = row[roleColumns.agents];
    if (agents) {
      splitAndTrim(agents).forEach(function(player) {
        gamePlayerCampMap[gameId][player] = "Agent";
      });
    }

    // Handle scientist (could be multiple)
    var scientists = row[roleColumns.scientist];
    if (scientists) {
      splitAndTrim(scientists).forEach(function(player) {
        gamePlayerCampMap[gameId][player] = "Scientifique";
      });
    }

    // Handle lovers (could be multiple)
    var lovers = row[roleColumns.lovers];
    if (lovers) {
      splitAndTrim(lovers).forEach(function(player) {
        gamePlayerCampMap[gameId][player] = "Amoureux";
      });
    }
  });

  // Calculate overall camp statistics (both participations and wins)
  var campStats = {};
  var totalGames = 0;

  gameRows.forEach(function(row) {
    var gameId = row[gameColumns.gameId];
    var playerList = row[gameColumns.playerList];
    var winnerCamp = row[gameColumns.winnerCamp];

    if (gameId && playerList && winnerCamp) {
      totalGames++;
      var players = splitAndTrim(playerList);

      // Count participation for each camp in this game
      var campsInGame = new Set();
      players.forEach(function(playerName) {
        var player = playerName.trim();
        if (player) {
          var playerCamp = getPlayerCamp(gamePlayerCampMap, gameId, player);
          campsInGame.add(playerCamp);
        }
      });

      // Initialize and count participations
      campsInGame.forEach(function(camp) {
        if (!campStats[camp]) {
          campStats[camp] = {
            totalGames: 0,
            wins: 0,
            winRate: 0,
            players: {}
          };
        }
        campStats[camp].totalGames++;
      });

      // Count wins for all camps (including special cases)
      campsInGame.forEach(function(camp) {
        if (didCampWin(camp, winnerCamp)) {
          campStats[camp].wins++;
        }
      });
    }
  });

  // Analyze player performance by camp
  var playerCampPerformance = {};

  gameRows.forEach(function(row) {
    var gameId = row[gameColumns.gameId];
    var playerList = row[gameColumns.playerList];
    var winnerList = row[gameColumns.winnerList];

    if (gameId && playerList && winnerList) {
      var players = splitAndTrim(playerList);

      players.forEach(function(playerName) {
        var player = playerName.trim();
        if (player) {
          // Determine player's camp (default to Villageois if not found)
          var playerCamp = getPlayerCamp(gamePlayerCampMap, gameId, playerName);

          // Track player performance in this camp
          if (!campStats[playerCamp].players[player]) {
            campStats[playerCamp].players[player] = {
              games: 0,
              wins: 0,
              winRate: 0
            };
          }
          campStats[playerCamp].players[player].games++;

          // Check if player won
          var playerWon = didPlayerWin(player, winnerList);
          if (playerWon) {
            campStats[playerCamp].players[player].wins++;
          }
          // Initialize player statistics
          if (!playerCampPerformance[player]) {
            playerCampPerformance[player] = {
              totalGames: 0,
              camps: {}
            };
          }

          // Add camp data for this player
          if (!playerCampPerformance[player].camps[playerCamp]) {
            playerCampPerformance[player].camps[playerCamp] = {
              games: 0,
              wins: 0,
              winRate: 0,
              performance: 0
            };
          }

          playerCampPerformance[player].totalGames++;
          playerCampPerformance[player].camps[playerCamp].games++;

          if (didPlayerWin(player, winnerList)) {
            playerCampPerformance[player].camps[playerCamp].wins++;
          }
        }
      });
    }
  });

  // Calculate win rates for camps and players
  Object.keys(campStats).forEach(function(camp) {
    if (campStats[camp].totalGames > 0) {
      campStats[camp].winRate = (campStats[camp].wins / campStats[camp].totalGames * 100).toFixed(2);
    }

    // Calculate each player's win rate in this camp
    Object.keys(campStats[camp].players).forEach(function(player) {
      var playerStat = campStats[camp].players[player];
      if (playerStat.games > 0) {
        playerStat.winRate = (playerStat.wins / playerStat.games * 100).toFixed(2);
      }
    });
  });

  // Calculate performance differential (player win rate - camp average win rate)
  Object.keys(playerCampPerformance).forEach(function(player) {
    Object.keys(playerCampPerformance[player].camps).forEach(function(camp) {
      var playerCampStat = playerCampPerformance[player].camps[camp];

      if (playerCampStat.games > 0) {
        playerCampStat.winRate = (playerCampStat.wins / playerCampStat.games * 100).toFixed(2);

        // Calculate performance vs camp average
        if (campStats[camp] && campStats[camp].winRate) {
          playerCampStat.performance = (parseFloat(playerCampStat.winRate) - parseFloat(campStats[camp].winRate)).toFixed(2);
        }
      }
    });
  });

  // Convert player camp performance to array with minimum game threshold
  var minGamesToInclude = 3; // Minimum games required in a camp to be included
  var playerPerformanceArray = [];

  Object.keys(playerCampPerformance).forEach(function(player) {
    var playerData = playerCampPerformance[player];
    var campPerformanceArray = [];

    Object.keys(playerData.camps).forEach(function(camp) {
      var campData = playerData.camps[camp];

      // Only include if player has played this camp multiple times
      if (campData.games >= minGamesToInclude) {
        campPerformanceArray.push({
          camp: camp,
          games: campData.games,
          wins: campData.wins,
          winRate: campData.winRate,
          campAvgWinRate: campStats[camp].winRate,
          performance: campData.performance
        });
      }
    });

    // Sort by performance (higher first)
    campPerformanceArray.sort(function(a, b) {
      return parseFloat(b.performance) - parseFloat(a.performance);
    });

    // Only include player if they have qualifying camp data
    if (campPerformanceArray.length > 0) {
      playerPerformanceArray.push({
        player: player,
        totalGames: playerData.totalGames,
        campPerformance: campPerformanceArray
      });
    }
  });

  // Sort by total games played (descending)
  playerPerformanceArray.sort(function(a, b) {
    return b.totalGames - a.totalGames;
  });

  return JSON.stringify({
    campAverages: Object.keys(campStats).map(function(camp) {
      return {
        camp: camp,
        totalGames: campStats[camp].totalGames,
        winRate: campStats[camp].winRate
      };
    }),
    playerPerformance: playerPerformanceArray,
    minGamesRequired: minGamesToInclude
  });
}

/**
 * Returns statistics on player performance by camp compared to average camp win rates
 * @return {string} JSON string with player performance data
 */
function getPlayerCampPerformanceRaw() {
  try {
    var gameData = getLycanSheetData(LYCAN_SCHEMA.GAMES.SHEET);
    var roleData = getLycanSheetData(LYCAN_SCHEMA.ROLES.SHEET);
    return _computePlayerCampPerformance(gameData, roleData);
  } catch (error) {
    Logger.log('Error in getPlayerCampPerformanceRaw: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}

/**
 * Returns statistics on player performance by camp using preloaded data
 * @param {Object} sheetData - Objet contenant les données préchargées (clé = nom de feuille)
 * @return {string} JSON string with player performance data
 */
function getPlayerCampPerformanceWithData(sheetData) {
  try {
    var gameData = sheetData[LYCAN_SCHEMA.GAMES.SHEET];
    var roleData = sheetData[LYCAN_SCHEMA.ROLES.SHEET];
    return _computePlayerCampPerformance(gameData, roleData);
  } catch (error) {
    Logger.log('Error in getPlayerCampPerformanceWithData: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}

// ============================================================================
// RAW DATA EXPORT FUNCTIONS
// These functions export the complete sheet data as JSON for client-side processing
// ============================================================================

/**
 * Returns all raw data from the "Game v2" sheet as JSON
 * This enables client-side filtering and calculations
 * @return {string} JSON string with all game data
 */
function getRawGameDataRaw() {
  try {
    var gameData = getLycanSheetData(LYCAN_SCHEMA.GAMES.SHEET);
    var values = gameData.values;
    
    if (!values || values.length === 0) {
      return JSON.stringify({ error: 'No game data found' });
    }
    
    var headers = values[0];
    var dataRows = values.slice(1);
    
    // Convert rows to objects with column names
    var gameRecords = dataRows.map(function(row) {
      var record = {};
      headers.forEach(function(header, index) {
        var value = row[index];
        
        // Format dates consistently
        if (header === LYCAN_SCHEMA.GAMES.COLS.DATE && value) {
          record[header] = formatLycanDate(value);
        }
        // Convert boolean checkboxes to actual booleans
        else if (header === LYCAN_SCHEMA.GAMES.COLS.MODDED || 
                 header === LYCAN_SCHEMA.GAMES.COLS.TRAITOR || 
                 header === LYCAN_SCHEMA.GAMES.COLS.LOVERS) {
          record[header] = Boolean(value);
        }
        // Convert numeric fields to numbers
        else if (header === LYCAN_SCHEMA.GAMES.COLS.NBPLAYERS ||
                 header === LYCAN_SCHEMA.GAMES.COLS.NBWOLVES ||
                 header === LYCAN_SCHEMA.GAMES.COLS.NBDAYS ||
                 header === LYCAN_SCHEMA.GAMES.COLS.SURVIVINGVILLAGERS ||
                 header === LYCAN_SCHEMA.GAMES.COLS.SURVIVINGWOLVES ||
                 header === LYCAN_SCHEMA.GAMES.COLS.SURVIVINGLOVERS ||
                 header === LYCAN_SCHEMA.GAMES.COLS.SURVIVINGSOLO ||
                 header === LYCAN_SCHEMA.GAMES.COLS.HARVEST ||
                 header === LYCAN_SCHEMA.GAMES.COLS.TOTALHARVEST ||
                 header === LYCAN_SCHEMA.GAMES.COLS.HARVESTPERCENT) {
          record[header] = value !== '' && !isNaN(value) ? parseFloat(value) : null;
        }
        // Keep text fields as strings, but handle empty values
        else {
          record[header] = value !== '' ? value : null;
        }
      });
      return record;
    });
    
    return JSON.stringify({
      lastUpdated: new Date().toISOString(),
      totalRecords: gameRecords.length,
      data: gameRecords
    });
    
  } catch (error) {
    Logger.log('Error in getRawGameDataRaw: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}

/**
 * Returns all raw data from the "Loups et solo v2" sheet as JSON
 * This contains role assignments for each game
 * @return {string} JSON string with all role data
 */
function getRawRoleDataRaw() {
  try {
    var roleData = getLycanSheetData(LYCAN_SCHEMA.ROLES.SHEET);
    var values = roleData.values;
    
    if (!values || values.length === 0) {
      return JSON.stringify({ error: 'No role data found' });
    }
    
    var headers = values[0];
    var dataRows = values.slice(1);
    
    // Convert rows to objects with column names
    var roleRecords = dataRows.map(function(row) {
      var record = {};
      headers.forEach(function(header, index) {
        var value = row[index];
        
        // Convert boolean checkboxes to actual booleans
        if (header === LYCAN_SCHEMA.ROLES.COLS.MODDED) {
          record[header] = Boolean(value);
        }
        // Keep text fields as strings, but handle empty values
        else {
          record[header] = value !== '' ? value : null;
        }
      });
      return record;
    });
    
    return JSON.stringify({
      lastUpdated: new Date().toISOString(),
      totalRecords: roleRecords.length,
      data: roleRecords
    });
    
  } catch (error) {
    Logger.log('Error in getRawRoleDataRaw: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}

/**
 * Returns all raw data from the "Ponce v2" sheet as JSON
 * This contains detailed data specific to player Ponce
 * @return {string} JSON string with all Ponce data
 */
function getRawPonceDataRaw() {
  try {
    var ponceData = getLycanSheetData(LYCAN_SCHEMA.PONCE.SHEET);
    var values = ponceData.values;
    
    if (!values || values.length === 0) {
      return JSON.stringify({ error: 'No Ponce data found' });
    }
    
    var headers = values[0];
    var dataRows = values.slice(1);
    
    // Convert rows to objects with column names
    var ponceRecords = dataRows.map(function(row) {
      var record = {};
      headers.forEach(function(header, index) {
        var value = row[index];
        
        // Convert boolean checkboxes to actual booleans
        if (header === LYCAN_SCHEMA.PONCE.COLS.MODDED || 
            header === LYCAN_SCHEMA.PONCE.COLS.TRAITOR) {
          record[header] = Boolean(value);
        }
        // Convert numeric fields to numbers
        else if (header === LYCAN_SCHEMA.PONCE.COLS.DAYOFDEATH) {
          record[header] = value !== '' && !isNaN(value) ? parseFloat(value) : null;
        }
        // Keep text fields as strings, but handle empty values
        else {
          record[header] = value !== '' ? value : null;
        }
      });
      return record;
    });
    
    return JSON.stringify({
      lastUpdated: new Date().toISOString(),
      totalRecords: ponceRecords.length,
      data: ponceRecords
    });
    
  } catch (error) {
    Logger.log('Error in getRawPonceDataRaw: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}