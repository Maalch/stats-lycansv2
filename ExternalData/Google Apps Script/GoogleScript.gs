function doGet(e) {
  var actionMap = {
    // New unified format endpoint
    'gameLog': { baseKey: 'gameLog', fn: getRawGameDataInNewFormat, noCache: true },
  // Raw data endpoints for client-side processing - do NOT cache these (too large)
  'rawBRData': { baseKey: 'rawBRData', fn: getRawBRDataRaw, noCache: true },
  'joueurs': { baseKey: 'joueurs', fn: getRawJoueursData, noCache: false },
  };
  
  var action = e.parameter.action;
  var actionData = actionMap[action];
  if (actionData) {
    // If endpoint is marked as noCache, call function directly and return result
    if (actionData.noCache) {
      try {
        var result = actionData.fn(e);
        return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        Logger.log('Error in noCache endpoint ' + actionData.baseKey + ': ' + err.message);
        return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

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


/**
 * Test function for raw game data export
 */
function test_getRawGameDataInNewFormat() {
  var cache = CacheService.getScriptCache();
  
  // Clear the cache for this endpoint
  var cacheKey = generateCacheKey('gameLog', null, { parameter: {} });
  cache.remove(cacheKey);
  
  var e = { 
    parameter: { 
      action: 'gameLog'
    } 
  };
  
  var result = doGet(e);
  Logger.log("Test gameLog");
  Logger.log("Cache key used: " + cacheKey);
  
  // Parse the result to check record count
  try {
    var data = JSON.parse(result.getContent());

    Logger.log("Total records: " + (data.TotalRecords || 'unknown'));
    Logger.log("Sample record: " + JSON.stringify(data.GameStats ? data.GameStats[0] : 'none'));
  } catch (e) {
    Logger.log("Raw result: " + result.getContent());
  }
  
  return result;
}

/**
 * Test function for raw BR data export
 */
function test_getRawBRData() {
  var cache = CacheService.getScriptCache();
  
  // Clear the cache for this endpoint
  var cacheKey = generateCacheKey('rawBRData', null, { parameter: {} });
  cache.remove(cacheKey);
  
  var e = { 
    parameter: { 
      action: 'rawBRData'
    } 
  };
  
  var result = doGet(e);
  Logger.log("Test rawBRData");
  Logger.log("Cache key used: " + cacheKey);
  
  // Parse the result to check record count
  try {
    var data = JSON.parse(result.getContent());
    
    if (data.error) {
      Logger.log("Error: " + data.error);
    } else {
      Logger.log("BRParties records: " + (data.BRParties ? data.BRParties.totalRecords : 'unknown'));
      Logger.log("BRRefParties records: " + (data.BRRefParties ? data.BRRefParties.totalRecords : 'unknown'));
      Logger.log("Sample BRParties record: " + JSON.stringify(data.BRParties && data.BRParties.data && data.BRParties.data[0] ? data.BRParties.data[0] : 'none'));
      Logger.log("Sample BRRefParties record: " + JSON.stringify(data.BRRefParties && data.BRRefParties.data && data.BRRefParties.data[0] ? data.BRRefParties.data[0] : 'none'));
    }
  } catch (e) {
    Logger.log("Raw result: " + result.getContent());
  }
  
  return result;
}

/**
 * Debug function to test a specific game ID
 * This function fetches and displays detailed information about a single game
 * including all player stats and role changes
 * 
 * @param {number|string} testGameId - The game ID to test (e.g., 50, "50")
 * 
 * Usage: Run debug_getGameById(50) in the Script Editor
 */
function debug_getGameById() {
  try {
    var testGameId = 538;
    Logger.log("=== DEBUG: Testing Game ID " + testGameId + " ===");
    
    // Get all required data
    var gameData = getLycanSheetData(LYCAN_SCHEMA.GAMES.SHEET);
    var gameValues = gameData.values;
    
    var gameData2 = getLycanSheetData(LYCAN_SCHEMA.GAMES2.SHEET);
    var gameValues2 = gameData2.values;
    
    var detailsData = getLycanSheetData(LYCAN_SCHEMA.DETAILSV2.SHEET);
    var detailsValues = detailsData.values;
    
    var roleChangesData = getLycanSheetData(LYCAN_SCHEMA.ROLECHANGES.SHEET);
    var roleChangesValues = roleChangesData.values;
    
    var votesData = getLycanSheetData(LYCAN_SCHEMA.VOTES.SHEET);
    var votesValues = votesData.values;
    
    if (!gameValues || gameValues.length === 0) {
      Logger.log("ERROR: No game data found");
      return;
    }
    
    var gameHeaders = gameValues[0];
    var gameDataRows = gameValues.slice(1);
    
    var gameHeaders2 = gameValues2[0];
    var gameDataRows2 = gameValues2.slice(1);
    
    var detailsHeaders = detailsValues ? detailsValues[0] : [];
    var detailsDataRows = detailsValues ? detailsValues.slice(1) : [];
    
    var roleChangesHeaders = roleChangesValues ? roleChangesValues[0] : [];
    var roleChangesDataRows = roleChangesValues ? roleChangesValues.slice(1) : [];
    
    var votesHeaders = votesValues ? votesValues[0] : [];
    var votesDataRows = votesValues ? votesValues.slice(1) : [];
    
    // Find the specific game
    var gameRow = gameDataRows.find(function(row) {
      return row[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.GAMEID)] == testGameId;
    });
    
    if (!gameRow) {
      Logger.log("ERROR: Game ID " + testGameId + " not found");
      return;
    }
    
    // Create a map of game2 data
    var game2DataMap = {};
    gameDataRows2.forEach(function(row) {
      var gameId = row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.GAMEID)];
      if (gameId) {
        game2DataMap[gameId] = row;
      }
    });
    
    var game2Row = game2DataMap[testGameId];
    
    // Log basic game info
    Logger.log("\n--- GAME INFORMATION ---");
    Logger.log("Game ID: " + testGameId);
    Logger.log("Date: " + gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.DATE)]);
    Logger.log("Map: " + (game2Row ? game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.MAP)] : 'N/A'));
    Logger.log("Modded: " + gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.MODDED)]);
    Logger.log("Winner Camp: " + gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.WINNERCAMP)]);
    
    // Get player list
    var playerListStr = gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.PLAYERLIST)];
    var players = playerListStr ? playerListStr.split(',').map(function(p) { return p.trim(); }) : [];
    
    Logger.log("Number of players: " + players.length);
    Logger.log("Players: " + players.join(', '));
    
    // Log role changes for this game
    Logger.log("\n--- ROLE CHANGES IN CHANGEMENTS SHEET ---");
    var gameRoleChanges = roleChangesDataRows.filter(function(row) {
      return row[findColumnIndex(roleChangesHeaders, LYCAN_SCHEMA.ROLECHANGES.COLS.GAMEID)] == testGameId;
    });
    
    if (gameRoleChanges.length === 0) {
      Logger.log("No role changes found for this game in Changements sheet");
    } else {
      Logger.log("Found " + gameRoleChanges.length + " role change entries:");
      gameRoleChanges.forEach(function(row, index) {
        var player = row[findColumnIndex(roleChangesHeaders, LYCAN_SCHEMA.ROLECHANGES.COLS.PLAYER)];
        var newCamp = row[findColumnIndex(roleChangesHeaders, LYCAN_SCHEMA.ROLECHANGES.COLS.NEWCAMP)];
        var newMainRole = row[findColumnIndex(roleChangesHeaders, LYCAN_SCHEMA.ROLECHANGES.COLS.NEWMAINROLE)];
        Logger.log("  [" + (index + 1) + "] Player: " + player + " | New Camp: " + newCamp + " | New Main Role: " + newMainRole);
      });
    }
    
    // Build and log player stats
    Logger.log("\n--- PLAYER STATS WITH ROLE CHANGES ---");
    players.forEach(function(playerName) {
      var playerDetails = getPlayerDetailsForGame(playerName, testGameId, detailsHeaders, detailsDataRows);
      var playerStats = buildPlayerStatsFromDetails(playerName, testGameId, gameRow, gameHeaders, playerDetails, roleChangesHeaders, roleChangesDataRows, votesHeaders, votesDataRows);
      
      Logger.log("\nPlayer: " + playerName);
      Logger.log("  MainRoleInitial: " + playerStats.MainRoleInitial);
      Logger.log("  MainRoleChanges: " + JSON.stringify(playerStats.MainRoleChanges));
      Logger.log("  Color: " + playerStats.Color);
      Logger.log("  Power: " + playerStats.Power);
      Logger.log("  SecondaryRole: " + playerStats.SecondaryRole);
      Logger.log("  DeathTiming: " + playerStats.DeathTiming);
      Logger.log("  DeathType: " + playerStats.DeathType);
      Logger.log("  KillerName: " + playerStats.KillerName);
      Logger.log("  Victorious: " + playerStats.Victorious);
      Logger.log("  Votes: " + JSON.stringify(playerStats.Votes));
    });
    
    Logger.log("\n=== DEBUG COMPLETE ===");
    
  } catch (error) {
    Logger.log("ERROR in debug_getGameById: " + error.message);
    Logger.log("Stack trace: " + error.stack);
  }
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
    // Try to cache the generated result, but don't fail the whole request if the
    // value is too large for CacheService. CacheService has a size limit for
    // stored values and will throw "Argument too large" for big payloads.
    try {
      cache.put(cacheKey, result, cacheSeconds);
    } catch (cacheError) {
      // Log and continue without caching. The endpoint will still return the data.
      Logger.log('Cache put failed for key ' + cacheKey + ': ' + cacheError.message);
    }

    return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in getCachedData: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Returns all raw data from the BR named ranges as JSON
 * This contains detailed data of all BR games from both BRParties and BRRefParties
 * @return {string} JSON string with all BR data
 */
function getRawBRDataRaw() {
  try {
    // Get data from both named ranges using schema constants
    var brPartiesData = getLycanTableData(LYCAN_SCHEMA.BR.PARTIES_RANGE);
    var brRefPartiesData = getLycanTableData(LYCAN_SCHEMA.BR.REF_PARTIES_RANGE);
    
    var partiesValues = brPartiesData.values;
    var refPartiesValues = brRefPartiesData.values;
    
    if ((!partiesValues || partiesValues.length === 0) && 
        (!refPartiesValues || refPartiesValues.length === 0)) {
      return JSON.stringify({ error: 'No BR data found' });
    }
    
    var brPartiesRecords = [];
    var brRefPartiesRecords = [];
    
    // Process BRParties data (Game, Participants, Score, Gagnant)
    if (partiesValues && partiesValues.length > 0) {
      var partiesHeaders = partiesValues[0];
      var partiesDataRows = partiesValues.slice(1);
      
      partiesDataRows.forEach(function(row) {
        var record = {};
        partiesHeaders.forEach(function(header, index) {
          // Skip empty / blank header cells
          if (!header || header.toString().trim() === '') {
            return;
          }
          
          var value = row[index];
          
          // Convert boolean checkboxes to actual booleans
          if (header === LYCAN_SCHEMA.BR.COLS.WINNER) {
            record[header] = Boolean(value);
          }
          // Convert numeric fields to numbers
          else if (header === LYCAN_SCHEMA.BR.COLS.SCORE) {
            record[header] = value !== '' && !isNaN(value) ? parseFloat(value) : null;
          }
          // Keep text fields as strings, but handle empty values
          else {
            record[header] = value !== '' ? value : null;
          }
        });
        
        // Only add records that have meaningful data
        if (Object.values(record).some(function(value) {
          return value !== null && value !== false;
        })) {
          brPartiesRecords.push(record);
        }
      });
    }
    
    // Process BRRefParties data (Game, Nombre de participants, Date, VOD)
    if (refPartiesValues && refPartiesValues.length > 0) {
      var refHeaders = refPartiesValues[0];
      var refDataRows = refPartiesValues.slice(1);
      
      refDataRows.forEach(function(row) {
        var refRecord = {};
        
        refHeaders.forEach(function(header, index) {
          if (!header || header.toString().trim() === '') {
            return;
          }
          
          var value = row[index];
          
          // Convert numeric fields to numbers
          if (header === LYCAN_SCHEMA.BR.COLS.NBOFPLAYERS) {
            refRecord[header] = value !== '' && !isNaN(value) ? parseFloat(value) : null;
          }
          // Format dates consistently
          else if (header === LYCAN_SCHEMA.BR.COLS.DATE && value) {
            refRecord[header] = formatLycanDate(value);
          }
          // Keep text fields as strings, but handle empty values
          else {
            refRecord[header] = value !== '' ? value : null;
          }
        });
        
        // Only add records that have meaningful data
        if (Object.values(refRecord).some(function(value) {
          return value !== null && value !== false;
        })) {
          brRefPartiesRecords.push(refRecord);
        }
      });
    }
    
    return JSON.stringify({
      BRParties: {
        totalRecords: brPartiesRecords.length,
        data: brPartiesRecords
      },
      BRRefParties: {
        totalRecords: brRefPartiesRecords.length,
        data: brRefPartiesRecords
      }
    });
    
  } catch (error) {
    Logger.log('Error in getRawBRDataRaw: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}




/**
 * Helper function to parse MM:SS duration format and add it to a date
 * @param {string|Date} startDate - Start date (ISO string or Date object)
 * @param {string} durationStr - Duration in MM:SS format (e.g., "45:30")
 * @return {string|null} End date in ISO format or null if invalid
 */
function calculateEndDate(startDate, durationStr) {
  if (!startDate || !durationStr) return null;
  
  // Parse the duration string (MM:SS format)
  var durationParts = durationStr.toString().split(':');
  if (durationParts.length !== 2) return null;
  
  var minutes = parseInt(durationParts[0], 10);
  var seconds = parseInt(durationParts[1], 10);
  
  if (isNaN(minutes) || isNaN(seconds)) return null;
  
  // Convert start date to Date object
  var startDateObj;
  if (typeof startDate === 'string') {
    startDateObj = new Date(startDate);
  } else if (Object.prototype.toString.call(startDate) === '[object Date]') {
    startDateObj = new Date(startDate.getTime());
  } else {
    return null;
  }
  
  if (isNaN(startDateObj.getTime())) return null;
  
  // Add the duration (minutes and seconds) to the start date
  var totalSecondsToAdd = (minutes * 60) + seconds;
  var endDateObj = new Date(startDateObj.getTime() + (totalSecondsToAdd * 1000));
  
  // Return in ISO format
  return endDateObj.toISOString();
}

/**
 * Returns game data in the new GameLog format compatible with the game-generated JSON
 */
function getRawGameDataInNewFormat() {
  try {
    // Get main game data
    var gameData = getLycanSheetData(LYCAN_SCHEMA.GAMES.SHEET);
    var gameValues = gameData.values;

    // Get secondary game data
    var gameData2 = getLycanSheetData(LYCAN_SCHEMA.GAMES2.SHEET);
    var gameValues2 = gameData2.values;
    
    // Get details data
    var detailsData = getLycanSheetData(LYCAN_SCHEMA.DETAILSV2.SHEET);
    var detailsValues = detailsData.values;
    
    // Get role changes data
    var roleChangesData = getLycanSheetData(LYCAN_SCHEMA.ROLECHANGES.SHEET);
    var roleChangesValues = roleChangesData.values;
    
    // Get votes data
    var votesData = getLycanSheetData(LYCAN_SCHEMA.VOTES.SHEET);
    var votesValues = votesData.values;
    
    if (!gameValues || gameValues.length === 0) {
      return JSON.stringify({ error: 'No game data found' });
    }
    
    var gameHeaders = gameValues[0];
    var gameDataRows = gameValues.slice(1);

    var gameHeaders2 = gameValues2[0];
    var gameDataRows2 = gameValues2.slice(1);
    
    // Create a map of game2 data by Game ID for efficient lookup
    var game2DataMap = {};
    if (gameDataRows2 && gameDataRows2.length > 0) {
      gameDataRows2.forEach(function(row) {
        var gameId = row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.GAMEID)];
        if (gameId) {
          game2DataMap[gameId] = row;
        }
      });
    }
    
    var detailsHeaders = detailsValues ? detailsValues[0] : [];
    var detailsDataRows = detailsValues ? detailsValues.slice(1) : [];
    
    var roleChangesHeaders = roleChangesValues ? roleChangesValues[0] : [];
    var roleChangesDataRows = roleChangesValues ? roleChangesValues.slice(1) : [];
    
    var votesHeaders = votesValues ? votesValues[0] : [];
    var votesDataRows = votesValues ? votesValues.slice(1) : [];
    
    // Create game stats array
    var gameStats = gameDataRows.map(function(gameRow) {
      var gameId = gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.GAMEID)];
      
      var rawDateCell = gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.DATE)];
      var isoStart = convertDateToISO(rawDateCell);
      var legacyDateFragment = formatDateForLegacyId(rawDateCell); // YYYYMMDDHHmmSS
      
      // Get duration from GAMES2 sheet if available
      var endDate = null;
      var game2Row = game2DataMap[gameId];
      if (game2Row && isoStart) {
        var duration = game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.DURATION)];
        if (duration) {
          endDate = calculateEndDate(isoStart, duration);
        }
      }
      
      // Check if GAMEMODID is filled - if so, return minimal structure only
      var gameModId = game2Row ? game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.GAMEMODID)] : null;
      if (gameModId && gameModId.trim() !== '') {
        return {
          Id: gameModId,
          Modded: gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.MODDED)],
          Version: game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.VERSION)],
          LegacyData: {
            VODLink: game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.VODSTART)],
            VODLinkEnd: game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.VODEND)],
            VictoryType: gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.VICTORYTYPE)]
          }
        };
      }
      
      // Build base game record with new Id format "Ponce-YYYYMMDDHHmmSS"
      var gameRecord = {
        Id: "Ponce-" + legacyDateFragment + "-" + gameId,
        StartDate: isoStart,
        EndDate: endDate,
        MapName: game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.MAP)],
        HarvestGoal: gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.TOTALHARVEST)],
        HarvestDone: gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.HARVEST)],
        EndTiming: determinateTiming(gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.NBDAYS)]),
        Version: game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.VERSION)],
        Modded: gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.MODDED)],
        LegacyData: {
          VODLink: game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.VODSTART)],
          VODLinkEnd: game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.VODEND)],
          VictoryType: gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.VICTORYTYPE)]
        },
        PlayerStats: []
      };
      
      var playerListStr = gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.PLAYERLIST)];
      var players = playerListStr ? playerListStr.split(',').map(function(p) { return p.trim(); }) : [];
      
      // Collect player details for reuse in deathInformationFilled check
      var allPlayerDetails = [];
      
      gameRecord.PlayerStats = players.map(function(playerName) {
        var playerDetails = getPlayerDetailsForGame(playerName, gameId, detailsHeaders, detailsDataRows);
        allPlayerDetails.push(playerDetails); // Store for later use
        return buildPlayerStatsFromDetails(playerName, gameId, gameRow, gameHeaders, playerDetails, roleChangesHeaders, roleChangesDataRows, votesHeaders, votesDataRows);
      });
      
      // Check if death information is filled for all players using collected playerDetails
      var allPlayersHaveDeathInfo = allPlayerDetails.every(function(playerDetails) {
        return playerDetails && playerDetails.typeOfDeath && 
               playerDetails.typeOfDeath !== '' && 
               playerDetails.typeOfDeath !== null;
      });
      
      // Add deathInformationFilled to LegacyData
      gameRecord.LegacyData.deathInformationFilled = allPlayersHaveDeathInfo;
      
      return gameRecord;
    });

    var totalRecords = gameStats.length;
    
    return JSON.stringify({
      ModVersion: "Legacy",
      TotalRecords: totalRecords,
      GameStats: gameStats
    });
    
  } catch (error) {
    Logger.log('Error in getRawGameDataInNewFormat: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}


/**
 * Helper function to build player stats from legacy data using pre-fetched player details
 * This version avoids duplicate calls to getPlayerDetailsForGame
 */
function buildPlayerStatsFromDetails(playerName, gameId, gameRow, gameHeaders, playerDetails, roleChangesHeaders, roleChangesDataRows, votesHeaders, votesDataRows) {
  var playerStats = {
    Username: playerName,
    Color: playerDetails && playerDetails.color ? playerDetails.color : null,
    MainRoleInitial: determineMainRoleInitialWithDetails(playerDetails),
    MainRoleChanges: getRoleChangesForPlayer(playerName, gameId, roleChangesHeaders, roleChangesDataRows),
    Power: playerDetails && playerDetails.power && playerDetails.power !== 'N/A' && playerDetails.power !== 'Inconnu' ? playerDetails.power : null,
    SecondaryRole: playerDetails && playerDetails.secondaryRole && playerDetails.secondaryRole !== 'N/A' && playerDetails.secondaryRole !== 'Inconnu' ? playerDetails.secondaryRole : null,
    DeathDateIrl: null, // Not available in legacy data
    DeathTiming: determineDeathTiming(playerDetails),
    DeathPosition: null, // Not available in legacy data
    DeathType: determineDeathType(playerDetails),
    KillerName: determineKillerName(playerDetails),
    Victorious: isPlayerVictorious(playerName, gameRow, gameHeaders),
    Votes: getVotesForPlayer(playerName, gameId, votesHeaders, votesDataRows)
  };
  
  return playerStats;
}

/**
 * Helper function to get player details for a specific game and player
 */
function getPlayerDetailsForGame(playerName, gameId, detailsHeaders, detailsDataRows) {
  var detailsRow = detailsDataRows.find(function(row) {
    return row[findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.GAMEID)] == gameId &&
           row[findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.PLAYER)] === playerName;
  });
  
  if (!detailsRow) return null;
  
  return {
    color: detailsRow[findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.COLOR)] || null,
    camp: detailsRow[findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.CAMP)] || null,
    mainRole: detailsRow[findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.MAINROLE)] || null,
    power: detailsRow[findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.POWER)] || null,
    secondaryRole: detailsRow[findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.SECONDARYROLE)] || null,
    
    dayOfDeath: detailsRow[findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.DAYOFDEATH)] || null,
    typeOfDeath: detailsRow[findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.TYPEOFDEATH)] || null,
    killerPlayers: detailsRow[findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.KILLERPLAYERS)] || null,
    killedPlayers: detailsRow[findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.KILLEDPLAYERS)] || null
  };
}

/**
 * Helper function to get role changes for a specific game and player
 * Returns an array of role changes in the order they appear in the sheet
 */
function getRoleChangesForPlayer(playerName, gameId, roleChangesHeaders, roleChangesDataRows) {
  if (!roleChangesDataRows || roleChangesDataRows.length === 0) {
    return [];
  }
  
  var changes = [];
  
  // Find all rows matching this player and game
  roleChangesDataRows.forEach(function(row) {
    var rowGameId = row[findColumnIndex(roleChangesHeaders, LYCAN_SCHEMA.ROLECHANGES.COLS.GAMEID)];
    var rowPlayer = row[findColumnIndex(roleChangesHeaders, LYCAN_SCHEMA.ROLECHANGES.COLS.PLAYER)];
    
    if (rowGameId == gameId && rowPlayer === playerName) {
      var newMainRole = row[findColumnIndex(roleChangesHeaders, LYCAN_SCHEMA.ROLECHANGES.COLS.NEWMAINROLE)];
      
      // Only add if the new main role is not empty
      if (newMainRole && newMainRole.trim() !== '') {

        changes.push({
          NewMainRole: newMainRole
        });
      }
    }
  });
  
  return changes;
}

/**
 * Helper function to get votes for a specific game and player
 * Returns an array of votes ordered by meeting number
 * Each vote includes the Target and Date (if available)
 */
function getVotesForPlayer(playerName, gameId, votesHeaders, votesDataRows) {
  if (!votesDataRows || votesDataRows.length === 0) {
    return [];
  }
  
  var votes = [];
  
  // Find all vote rows matching this game
  var gameVotes = votesDataRows.filter(function(row) {
    var rowGameId = row[findColumnIndex(votesHeaders, LYCAN_SCHEMA.VOTES.COLS.GAMEID)];
    return rowGameId == gameId;
  });
  
  // Sort by meeting number
  gameVotes.sort(function(a, b) {
    var meetingA = a[findColumnIndex(votesHeaders, LYCAN_SCHEMA.VOTES.COLS.MEETING)] || 0;
    var meetingB = b[findColumnIndex(votesHeaders, LYCAN_SCHEMA.VOTES.COLS.MEETING)] || 0;
    return meetingA - meetingB;
  });
  
  // Extract votes for this player
  gameVotes.forEach(function(row) {
    var playersStr = row[findColumnIndex(votesHeaders, LYCAN_SCHEMA.VOTES.COLS.PLAYERS)];
    var voteTarget = row[findColumnIndex(votesHeaders, LYCAN_SCHEMA.VOTES.COLS.VOTE)];
    var meetingNr = row[findColumnIndex(votesHeaders, LYCAN_SCHEMA.VOTES.COLS.MEETING)];
    var isSelected = row[findColumnIndex(votesHeaders, LYCAN_SCHEMA.VOTES.COLS.SELECTEDVOTE)];
    
    if (!playersStr) return;
    
    // Split the players list and check if this player is in it
    var players = playersStr.split(',').map(function(p) { return p.trim(); });
    
    if (players.indexOf(playerName) !== -1) {
      // Only add votes that have a target (not blank)
      if (voteTarget && voteTarget.trim() !== '') {
        votes.push({
          MeetingNr: meetingNr,
          Target: voteTarget.trim(),
          Date: null // Date is not available in legacy data
        });
      }
    }
  });
  
  return votes;
}

/**
 * Helper function to determine main role with details data priority
 */
function determineMainRoleInitialWithDetails(playerDetails) {
    
  // Determine which camp to use based on type (initial)
  if (playerDetails.mainRole && playerDetails.mainRole !== 'Inconnu') {
      return playerDetails.mainRole;
  }
  else if (playerDetails.mainRole && playerDetails.mainRole === 'Inconnu') {
    return playerDetails.camp || "Villageois";
  }
  else if (playerDetails.camp) {
    return playerDetails.camp;
  }
  else {
    return null;
  }
}

/**
 * Helper function to determine death timing
 */
function determineDeathTiming(playerDetails) {
  if (!playerDetails || !playerDetails.dayOfDeath) return null;
  
  if (playerDetails.dayOfDeath !== '' && playerDetails.dayOfDeath !== null) {
    var dayValue = playerDetails.dayOfDeath.toString();
    
    return determinateTiming(dayValue);
  }
  
  return null;
}

/**
 * Helper function to determine timing
 */
function determinateTiming(timing) {
  if (!timing) return null;

    // If the value already starts with a letter, return it as is
    if (timing.length > 0 && /^[A-Za-z]/.test(timing)) {
      return timing;
    }
    
    // Otherwise, it's an integer, so add "U" prefix
    return "U" + timing;  
}

/**
 * Helper function to determine killer name
 */
function determineKillerName(playerDetails) {
  if (!playerDetails || !playerDetails.killerPlayers || !playerDetails.typeOfDeath) return null;
  
  // Return killer name only if death type is not "Mort aux votes" or "Déco"
  if (playerDetails.typeOfDeath !== 'Mort aux votes' && 
      playerDetails.typeOfDeath !== 'Déco' && 
      playerDetails.typeOfDeath !== 'N/A' && 
      playerDetails.killerPlayers !== '' && 
      playerDetails.killerPlayers !== null) {
    return playerDetails.killerPlayers;
  }
  
  return null;
}


/**
 * Helper function to determine death type
 */
function determineDeathType(playerDetails) {
  if (!playerDetails || !playerDetails.typeOfDeath) return null;
  
  // Normalize the death type to lowercase for case-insensitive comparison
  var deathType = playerDetails.typeOfDeath.toLowerCase().trim();
  
  if (deathType === 'mort de faim')
    return "STARVATION";
  else if (deathType === 'tué par loup')
    return "BY_WOLF";
  else if (deathType === 'tué par loup ressuscité')
    return "BY_WOLF_REZ"; //SPECIFIC TO GDOC!
  else if (deathType === 'tué par loup amoureux')
    return "BY_WOLF_LOVER"; //SPECIFIC TO GDOC!
  else if (deathType === 'tué par zombie')
    return "BY_ZOMBIE";
  else if (deathType === 'tué par la bête')
    return "BY_BEAST";
  else if (deathType === 'a été écrasé')
    return "CRUSHED";
  else if (deathType === 'mort bestiale')
    return "STARVATION_AS_BEAST";
  else if (deathType === 'mort de chute')
    return "FALL";
  else if (deathType === 'mort liée à l\'avatar')
    return "BY_AVATAR_CHAIN";
  else if (deathType === 'amoureux mort') 
    return "LOVER_DEATH";
  else if (deathType === 'a tué son amoureux' || deathType === 'tué par son amoureux')
    return "LOVER_DEATH_OWN"; //SPECIFIC TO GDOC!
  else if (deathType === 'tué par chasseur')
    return "BULLET"; //LESS SPECIFIC THAN OFFICIAL LOG!
  else if (deathType === 'tué par chasseur en humain')
    return "BULLET_HUMAN"; 
  else if (deathType === 'tué par chasseur en loup')
    return "BULLET_WOLF"; 
  else if (deathType === 'tué par chasseur de primes')
    return "BULLET_BOUNTYHUNTER"; //SPECIFIC TO GDOC!
  else if (deathType === 'tué par shérif')
    return "SHERIF"; //LESS SPECIFIC THAN OFFICIAL LOG!
  else if (deathType === 'tué par l\'agent')
    return "OTHER_AGENT";
  else if (deathType === 'tué par vengeur')
    return "AVENGER";
  else if (deathType === 'rôle deviné par loup')
    return "SEER";
  else if (deathType === 'tué par potion assassin')
    return "ASSASSIN";
  else if (deathType === 'a explosé')
    return "BOMB";
  else if (deathType === 'mort aux votes')
    return "VOTED";
  else if (deathType === 'tué par potion hanté')
    return "HANTED"; //SPECIFIC TO GDOC!
  else if (deathType === 'inconnu')
    return "UNKNOWN";
  else if (deathType === 'n/a')
    return null
  // Return death type only if death type is not "Déco" 
  else if (deathType !== 'déco' && 
      deathType !== '' && 
      deathType !== null) {
    return playerDetails.typeOfDeath; // Return original case for unrecognized types
  }
  
  return null;
}

/**
 * Returns all raw data from the Joueurs sheet as JSON
 * This contains player information including names, image URLs, and social media links
 * @return {string} JSON string with all player data
 */
function getRawJoueursData() {
  try {
    // Get data from the Joueurs sheet using schema constants
    var joueursData = getLycanSheetData(LYCAN_SCHEMA.PLAYERS.SHEET);
    var joueursValues = joueursData.values;
    
    if (!joueursValues || joueursValues.length === 0) {
      return JSON.stringify({ error: 'No player data found' });
    }
    
    var joueursHeaders = joueursValues[0];
    var joueursDataRows = joueursValues.slice(1);
    
    var joueursRecords = [];
    
    // Process Joueurs data
    joueursDataRows.forEach(function(row) {
      var record = {};
      
      joueursHeaders.forEach(function(header, index) {
        var value = row[index];
        
        // Convert empty strings to null for consistency
        if (value === '' || value === undefined) {
          value = null;
        }
        
        record[header] = value;
      });
      
      // Only add records that have a player name (mandatory field)
      var playerName = record[LYCAN_SCHEMA.PLAYERS.COLS.PLAYER];
      if (playerName && playerName.trim() !== '') {
        joueursRecords.push(record);
      }
    });
    
    return JSON.stringify({
      TotalRecords: joueursRecords.length,
      Players: joueursRecords
    });
    
  } catch (error) {
    Logger.log('Error in getRawJoueursData: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}

/**
 * Test function for raw Joueurs data export
 */
function test_getRawJoueursData() {
  var cache = CacheService.getScriptCache();
  
  // Clear the cache for this endpoint
  var cacheKey = generateCacheKey('joueurs', null, { parameter: {} });
  cache.remove(cacheKey);
  
  var e = { 
    parameter: { 
      action: 'joueurs'
    } 
  };
  
  var result = doGet(e);
  Logger.log("Test joueurs");
  Logger.log("Cache key used: " + cacheKey);
  
  // Parse the result to check record count
  try {
    var data = JSON.parse(result.getContent());
    
    if (data.error) {
      Logger.log("Error: " + data.error);
    } else {
      Logger.log("Joueurs records: " + (data.TotalRecords || 'unknown'));
      Logger.log("Sample Joueurs record: " + JSON.stringify(data.Players && data.Players[0] ? data.Players[0] : 'none'));
    }
  } catch (e) {
    Logger.log("Raw result: " + result.getContent());
  }
  
  return result;
}


