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
 * This function exports exactly what getRawGameDataInNewFormat would export, but for a single game
 * Useful for testing minimal structure when GAMEMODID is filled
 * 
 * @param {number|string} testGameId - The game ID to test (e.g., 50, "50")
 * 
 * Usage: Run debug_getGameById(50) in the Script Editor
 */
function debug_getGameById() {
  try {
    var testGameId = 551; // Change this to test different games
    Logger.log("=== DEBUG: Exporting Game ID " + testGameId + " ===");
    
    // Get all required data (same as getRawGameDataInNewFormat)
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
    
    var playersData = getLycanSheetData(LYCAN_SCHEMA.PLAYERS.SHEET);
    var playersValues = playersData.values;
    
    var clipsData = getLycanSheetData(LYCAN_SCHEMA.CLIPS.SHEET);
    var clipsValues = clipsData.values;
    
    if (!gameValues || gameValues.length === 0) {
      Logger.log("ERROR: No game data found");
      return;
    }
    
    var gameHeaders = gameValues[0];
    var gameDataRows = gameValues.slice(1);
    
    var gameHeaders2 = gameValues2[0];
    var gameDataRows2 = gameValues2.slice(1);
    
    // Create game2 data map
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
    
    var clipsHeaders = clipsValues ? clipsValues[0] : [];
    var clipsDataRows = clipsValues ? clipsValues.slice(1) : [];
    
    // Create player ID map
    var playerIdMap = {};
    if (playersValues && playersValues.length > 0) {
      var playersHeaders = playersValues[0];
      var playersDataRows = playersValues.slice(1);
      
      playersDataRows.forEach(function(row) {
        var playerName = row[findColumnIndex(playersHeaders, LYCAN_SCHEMA.PLAYERS.COLS.PLAYER)];
        var steamId = row[findColumnIndex(playersHeaders, LYCAN_SCHEMA.PLAYERS.COLS.ID)];
        if (playerName && steamId) {
          playerIdMap[playerName] = steamId;
        }
      });
    }
    
    // Find the specific game
    var gameRow = gameDataRows.find(function(row) {
      return row[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.GAMEID)] == testGameId;
    });
    
    if (!gameRow) {
      Logger.log("ERROR: Game ID " + testGameId + " not found");
      return;
    }
    
    var game2Row = game2DataMap[testGameId];
    
    // Process the game exactly as getRawGameDataInNewFormat does
    var gameId = testGameId;
    var rawDateCell = gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.DATE)];
    var isoStart = convertDateToISO(rawDateCell);
    var legacyDateFragment = formatDateForLegacyId(rawDateCell);
    
    // Get duration from GAMES2 sheet if available
    var endDate = null;
    if (game2Row && isoStart) {
      var duration = game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.DURATION)];
      if (duration) {
        endDate = calculateEndDate(isoStart, duration);
      }
    }
    
    // Check if GAMEMODID is filled
    var gameModId = game2Row ? game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.GAMEMODID)] : null;
    var gsheetPriority = game2Row ? game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.GSHEETPRIORITY)] : false;
    var gameRecord;
    
    if (gameModId && gameModId.trim() !== '' && !gsheetPriority) {
      Logger.log("GAMEMODID is filled: " + gameModId);
      Logger.log("GSHEETPRIORITY is: " + gsheetPriority);
      Logger.log("Generating minimal structure with PlayerVODs...");
      
      // Minimal structure - same as in getRawGameDataInNewFormat
      var playerVODs = {};
      var playerListStr = gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.PLAYERLIST)];
      var players = playerListStr ? playerListStr.split(',').map(function(p) { return p.trim(); }) : [];
      
      players.forEach(function(playerName) {
        var playerDetails = getPlayerDetailsForGame(playerName, gameId, detailsHeaders, detailsDataRows);
        var playerId = playerIdMap && playerIdMap[playerName] ? playerIdMap[playerName] : null;
        
        if (playerId && playerDetails && playerDetails.vod && playerDetails.vod !== '') {
          playerVODs[playerId] = playerDetails.vod;
        }
      });
      
      gameRecord = {
        Id: gameModId,
        Modded: gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.MODDED)],
        Version: game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.VERSION)],
        Clips: getClipsForGame(gameId, clipsHeaders, clipsDataRows),
        LegacyData: {
          VictoryType: gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.VICTORYTYPE)],
          PlayerVODs: playerVODs,
          GameModId: gameModId.trim(),
          FullDataExported: false
        }
      };
    } else {
      var hasGameModIdWithPriority = gsheetPriority && gameModId && gameModId.trim() !== '';
      if (hasGameModIdWithPriority) {
        Logger.log("GAMEMODID is filled (" + gameModId + ") with GSHEETPRIORITY - generating full structure with GameModId...");
      } else {
        Logger.log("GAMEMODID is NOT filled or no GSHEETPRIORITY - generating full structure without GameModId...");
      }
      
      // Full structure - same as in getRawGameDataInNewFormat
      gameRecord = {
        Id: hasGameModIdWithPriority ? gameModId.trim() : ("Ponce-" + legacyDateFragment + "-" + gameId),
        StartDate: isoStart,
        EndDate: endDate,
        MapName: game2Row ? game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.MAP)] : null,
        HarvestGoal: gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.TOTALHARVEST)],
        HarvestDone: gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.HARVEST)],
        EndTiming: determinateTiming(gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.NBDAYS)]),
        Version: game2Row ? game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.VERSION)] : null,
        Modded: gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.MODDED)],
        LegacyData: {
          VictoryType: gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.VICTORYTYPE)],
          PlayerVODs: {}
        },
        PlayerStats: []
      };
      
      // Only add GameModId and FullDataExported when GAMEMODID is set with GSHEETPRIORITY
      if (hasGameModIdWithPriority) {
        gameRecord.LegacyData.GameModId = gameModId.trim();
        gameRecord.LegacyData.FullDataExported = true;
      }
      
      var playerListStr = gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.PLAYERLIST)];
      var players = playerListStr ? playerListStr.split(',').map(function(p) { return p.trim(); }) : [];
      
      var allPlayerDetails = [];
      
      gameRecord.PlayerStats = players.map(function(playerName) {
        var playerDetails = getPlayerDetailsForGame(playerName, gameId, detailsHeaders, detailsDataRows);
        allPlayerDetails.push(playerDetails);
        
        var playerId = playerIdMap && playerIdMap[playerName] ? playerIdMap[playerName] : null;
        
        if (playerId && playerDetails && playerDetails.vod && playerDetails.vod !== '') {
          gameRecord.LegacyData.PlayerVODs[playerId] = playerDetails.vod;
        }
        
        return buildPlayerStatsFromDetails(playerName, gameId, gameRow, gameHeaders, playerDetails, roleChangesHeaders, roleChangesDataRows, votesHeaders, votesDataRows, playerIdMap);
      });
      
      // Add clips for this game
      gameRecord.Clips = getClipsForGame(gameId, clipsHeaders, clipsDataRows);
      
      var allPlayersHaveDeathInfo = allPlayerDetails.every(function(playerDetails) {
        return playerDetails && playerDetails.typeOfDeath && 
               playerDetails.typeOfDeath !== '' && 
               playerDetails.typeOfDeath !== null;
      });
    }
    
    // Output the result in the same format as the API would return
    var result = {
      ModVersion: "Legacy",
      TotalRecords: 1,
      GameStats: [gameRecord]
    };
    
    var jsonOutput = JSON.stringify(result, null, 2);
    Logger.log("\n=== EXPORTED JSON ===");
    Logger.log(jsonOutput);
    Logger.log("\n=== Export size: " + jsonOutput.length + " characters ===");
    
    return result;
    
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
    
    // Get players data for Steam IDs
    var playersData = getLycanSheetData(LYCAN_SCHEMA.PLAYERS.SHEET);
    var playersValues = playersData.values;
    
    // Get clips data
    var clipsData = getLycanSheetData(LYCAN_SCHEMA.CLIPS.SHEET);
    var clipsValues = clipsData.values;
    
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
    
    var clipsHeaders = clipsValues ? clipsValues[0] : [];
    var clipsDataRows = clipsValues ? clipsValues.slice(1) : [];
    
    // Create a map of player names to Steam IDs for efficient lookup
    var playerIdMap = {};
    if (playersValues && playersValues.length > 0) {
      var playersHeaders = playersValues[0];
      var playersDataRows = playersValues.slice(1);
      
      playersDataRows.forEach(function(row) {
        var playerName = row[findColumnIndex(playersHeaders, LYCAN_SCHEMA.PLAYERS.COLS.PLAYER)];
        var steamId = row[findColumnIndex(playersHeaders, LYCAN_SCHEMA.PLAYERS.COLS.ID)];
        if (playerName && steamId) {
          playerIdMap[playerName] = steamId;
        }
      });
    }
    
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
      // UNLESS GSHEETPRIORITY is set to true, in which case we export full data
      var gameModId = game2Row ? game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.GAMEMODID)] : null;
      var gsheetPriority = game2Row ? game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.GSHEETPRIORITY)] : false;
      
      if (gameModId && gameModId.trim() !== '' && !gsheetPriority) {
        // Still collect PlayerVODs even for minimal structure
        var playerVODs = {};
        var playerListStr = gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.PLAYERLIST)];
        var players = playerListStr ? playerListStr.split(',').map(function(p) { return p.trim(); }) : [];
        
        players.forEach(function(playerName) {
          var playerDetails = getPlayerDetailsForGame(playerName, gameId, detailsHeaders, detailsDataRows);
          var playerId = playerIdMap && playerIdMap[playerName] ? playerIdMap[playerName] : null;
          
          if (playerId && playerDetails && playerDetails.vod && playerDetails.vod !== '') {
            playerVODs[playerId] = playerDetails.vod;
          }
        });
        
        return {
          Id: gameModId,
          Modded: gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.MODDED)],
          Version: game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.VERSION)],
          Clips: getClipsForGame(gameId, clipsHeaders, clipsDataRows),
          LegacyData: {
            VictoryType: gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.VICTORYTYPE)],
            PlayerVODs: playerVODs,
            GameModId: gameModId.trim(),
            FullDataExported: false
          }
        };
      }
      
      // Build base game record with new Id format "Ponce-YYYYMMDDHHmmSS"
      // When GAMEMODID is set with GSHEETPRIORITY, include GameModId and FullDataExported:true
      // so sync scripts know to skip the matching AWS game and use this GSheet data instead
      var hasGameModIdWithPriority = gsheetPriority && gameModId && gameModId.trim() !== '';
      var gameRecord = {
        Id: hasGameModIdWithPriority ? gameModId.trim() : ("Ponce-" + legacyDateFragment + "-" + gameId),
        StartDate: isoStart,
        EndDate: endDate,
        MapName: game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.MAP)],
        HarvestGoal: gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.TOTALHARVEST)],
        HarvestDone: gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.HARVEST)],
        EndTiming: determinateTiming(gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.NBDAYS)]),
        Version: game2Row[findColumnIndex(gameHeaders2, LYCAN_SCHEMA.GAMES2.COLS.VERSION)],
        Modded: gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.MODDED)],
        LegacyData: {
          VictoryType: gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.VICTORYTYPE)],
          PlayerVODs: {}
        },
        PlayerStats: []
      };
      
      // Only add GameModId and FullDataExported when GAMEMODID is set with GSHEETPRIORITY
      if (hasGameModIdWithPriority) {
        gameRecord.LegacyData.GameModId = gameModId.trim();
        gameRecord.LegacyData.FullDataExported = true;
      }
      
      var playerListStr = gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.PLAYERLIST)];
      var players = playerListStr ? playerListStr.split(',').map(function(p) { return p.trim(); }) : [];
      
      gameRecord.PlayerStats = players.map(function(playerName) {
        var playerDetails = getPlayerDetailsForGame(playerName, gameId, detailsHeaders, detailsDataRows);
        
        // Get player ID for VOD mapping
        var playerId = playerIdMap && playerIdMap[playerName] ? playerIdMap[playerName] : null;
        
        // Add player VOD to LegacyData.PlayerVODs if available
        if (playerId && playerDetails && playerDetails.vod && playerDetails.vod !== '') {
          gameRecord.LegacyData.PlayerVODs[playerId] = playerDetails.vod;
        }
        
        return buildPlayerStatsFromDetails(playerName, gameId, gameRow, gameHeaders, playerDetails, roleChangesHeaders, roleChangesDataRows, votesHeaders, votesDataRows, playerIdMap);
      });   
      
      // Add clips for this game
      gameRecord.Clips = getClipsForGame(gameId, clipsHeaders, clipsDataRows);
      
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
function buildPlayerStatsFromDetails(playerName, gameId, gameRow, gameHeaders, playerDetails, roleChangesHeaders, roleChangesDataRows, votesHeaders, votesDataRows, playerIdMap) {
  var playerStats = {
    ID: playerIdMap && playerIdMap[playerName] ? playerIdMap[playerName] : null,
    Username: playerName,
    Color: playerDetails && playerDetails.color ? playerDetails.color : null,
    MainRoleInitial: determineMainRoleInitialWithDetails(playerDetails),
    MainRoleChanges: getRoleChangesForPlayer(playerName, gameId, roleChangesHeaders, roleChangesDataRows),
    Power: playerDetails && playerDetails.power && playerDetails.power !== 'N/A' ? playerDetails.power : null,
    SecondaryRole: playerDetails && playerDetails.secondaryRole && playerDetails.secondaryRole !== 'N/A' ? playerDetails.secondaryRole : null,
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
    vod: detailsRow[findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.VOD)] || null,
    
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
          Day: meetingNr,
          Target: voteTarget.trim(),
          Date: null // Date is not available in legacy data
        });
      }
    }
  });
  
  return votes;
}

/**
 * Helper function to get clips for a specific game
 * Returns an array of clips with all CLIPS schema fields
 */
function getClipsForGame(gameId, clipsHeaders, clipsDataRows) {
  if (!clipsDataRows || clipsDataRows.length === 0) {
    return [];
  }
  
  var clips = [];
  
  // Find all clips matching this game
  clipsDataRows.forEach(function(row) {
    var rowGameId = row[findColumnIndex(clipsHeaders, LYCAN_SCHEMA.CLIPS.COLS.GAMEID)];
    
    if (rowGameId == gameId) {
      var clipId = row[findColumnIndex(clipsHeaders, LYCAN_SCHEMA.CLIPS.COLS.CLIPID)];
      var clipUrl = row[findColumnIndex(clipsHeaders, LYCAN_SCHEMA.CLIPS.COLS.CLIPURL)];
      var clipName = row[findColumnIndex(clipsHeaders, LYCAN_SCHEMA.CLIPS.COLS.CLIPNAME)];
      var povPlayer = row[findColumnIndex(clipsHeaders, LYCAN_SCHEMA.CLIPS.COLS.POVPLAYER)];
      var othersPlayers = row[findColumnIndex(clipsHeaders, LYCAN_SCHEMA.CLIPS.COLS.OTHERSPLAYERS)];
      var relatedClips = row[findColumnIndex(clipsHeaders, LYCAN_SCHEMA.CLIPS.COLS.RELATEDCLIPS)];
      var nextClip = row[findColumnIndex(clipsHeaders, LYCAN_SCHEMA.CLIPS.COLS.NEXTCLIP)];
      var newName = row[findColumnIndex(clipsHeaders, LYCAN_SCHEMA.CLIPS.COLS.NEWNAME)];
      var additionalInfo = row[findColumnIndex(clipsHeaders, LYCAN_SCHEMA.CLIPS.COLS.ADDITIONALINFO)];
      var tags = row[findColumnIndex(clipsHeaders, LYCAN_SCHEMA.CLIPS.COLS.TAGS)];
      
      // Parse tags as array - split by comma and trim each tag
      var tagsArray = [];
      if (tags && tags.toString().trim() !== '') {
        tagsArray = tags.toString().split(',').map(function(tag) {
          return tag.trim();
        }).filter(function(tag) {
          return tag !== '';
        });
      }
      
      // Only add clips that have at least a ClipId and POVPlayer
      if (clipId && clipId.toString().trim() !== '' && povPlayer && povPlayer.toString().trim() !== '') {
        clips.push({
          ClipId: clipId.toString().trim(),
          ClipUrl: clipUrl && clipUrl.toString().trim() !== '' ? clipUrl.toString().trim() : null,
          ClipName: clipName && clipName.toString().trim() !== '' ? clipName.toString().trim() : null,
          POVPlayer: povPlayer.toString().trim(),
          OthersPlayers: othersPlayers && othersPlayers.toString().trim() !== '' ? othersPlayers.toString().trim() : null,
          RelatedClips: relatedClips && relatedClips.toString().trim() !== '' ? relatedClips.toString().trim() : null,
          NextClip: nextClip && nextClip.toString().trim() !== '' ? nextClip.toString().trim() : null,
          NewName: newName && newName.toString().trim() !== '' ? newName.toString().trim() : null,
          AdditionalInfo: additionalInfo && additionalInfo.toString().trim() !== '' ? additionalInfo.toString().trim() : null,
          Tags: tagsArray
        });
      }
    }
  });
  
  return clips;
}

/**
 * Helper function to determine main role with details data priority
 */
function determineMainRoleInitialWithDetails(playerDetails) {
  // Handle null playerDetails
  if (!playerDetails) {
    return null;
  }
    
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
  
  // Special case: Survivaliste killed by wolf (power not saved)
  if (deathType === 'tué par loup' && 
      playerDetails.power && 
      playerDetails.power.toLowerCase().trim() === 'survivaliste') {
    return "SURVIVALIST_NOT_SAVED";
  }

  if (deathType === 'mort de faim')
    return "STARVATION";
  else if ((deathType === 'tué par loup') || (deathType === 'tué par loup ressuscité') || (deathType === 'tué par loup amoureux'))
    return "BY_WOLF";
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
  else if ((deathType === 'amoureux mort') || (deathType === 'a tué son amoureux' || deathType === 'tué par son amoureux'))
    return "LOVER_DEATH";
  else if (deathType === 'tué par chasseur')
    return "BULLET"; //LESS SPECIFIC THAN OFFICIAL LOG!
  else if ((deathType === 'tué par chasseur en humain') || (deathType === 'tué par chasseur de primes'))
    return "BULLET_HUMAN"; 
  else if (deathType === 'tué par chasseur en loup')
    return "BULLET_WOLF"; 
  else if (deathType === 'tué par shérif')
    return "SHERIF_SUCCESS"; //LESS SPECIFIC THAN OFFICIAL LOG!
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

/**
 * Diagnostic function to find rows with empty mainRole in DetailsV2 sheet
 * This helps identify data quality issues that cause "Cannot read properties of null (reading 'mainRole')" errors
 * 
 * Usage: Run checkEmptyMainRoles() in the Script Editor
 * 
 * @return {Array} Array of problematic rows with Game ID, Player, and missing field info
 */
function checkEmptyMainRoles() {
  try {
    Logger.log("=== Checking for empty mainRole values in DetailsV2 sheet ===");
    
    // Get DetailsV2 data
    var detailsData = getLycanSheetData(LYCAN_SCHEMA.DETAILSV2.SHEET);
    var detailsValues = detailsData.values;
    
    if (!detailsValues || detailsValues.length === 0) {
      Logger.log("ERROR: No data found in DetailsV2 sheet");
      return [];
    }
    
    var detailsHeaders = detailsValues[0];
    var detailsDataRows = detailsValues.slice(1);
    
    var gameIdIndex = findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.GAMEID);
    var playerIndex = findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.PLAYER);
    var mainRoleIndex = findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.MAINROLE);
    var campIndex = findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.CAMP);
    var colorIndex = findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.COLOR);
    
    var problematicRows = [];
    var emptyMainRoleCount = 0;
    var emptyCampCount = 0;
    var emptyColorCount = 0;
    
    // Check each row
    detailsDataRows.forEach(function(row, index) {
      var gameId = row[gameIdIndex];
      var player = row[playerIndex];
      var mainRole = row[mainRoleIndex];
      var camp = row[campIndex];
      var color = row[colorIndex];
      
      var issues = [];
      
      // Check for empty or null mainRole
      if (!mainRole || mainRole.toString().trim() === '') {
        issues.push('mainRole is empty');
        emptyMainRoleCount++;
      }
      
      // Also check camp and color for completeness
      if (!camp || camp.toString().trim() === '') {
        issues.push('camp is empty');
        emptyCampCount++;
      }
      
      if (!color || color.toString().trim() === '') {
        issues.push('color is empty');
        emptyColorCount++;
      }
      
      // If any issues found, log this row
      if (issues.length > 0) {
        var rowNumber = index + 2; // +2 because: +1 for 0-index, +1 for header row
        var problemRow = {
          rowNumber: rowNumber,
          gameId: gameId || 'MISSING',
          player: player || 'MISSING',
          issues: issues
        };
        
        problematicRows.push(problemRow);
        
        Logger.log("Row " + rowNumber + " - Game: " + problemRow.gameId + 
                   ", Player: " + problemRow.player + 
                   " | Issues: " + issues.join(', '));
      }
    });
    
    // Summary
    Logger.log("\n=== SUMMARY ===");
    Logger.log("Total rows checked: " + detailsDataRows.length);
    Logger.log("Rows with empty mainRole: " + emptyMainRoleCount);
    Logger.log("Rows with empty camp: " + emptyCampCount);
    Logger.log("Rows with empty color: " + emptyColorCount);
    Logger.log("Total problematic rows: " + problematicRows.length);
    
    if (problematicRows.length === 0) {
      Logger.log("\n✓ No issues found - all rows have mainRole values!");
    } else {
      Logger.log("\n⚠️  Found " + problematicRows.length + " problematic row(s) - see details above");
    }
    
    return problematicRows;
    
  } catch (error) {
    Logger.log("ERROR in checkEmptyMainRoles: " + error.message);
    Logger.log("Stack trace: " + error.stack);
    return [];
  }
}

/**
 * Diagnostic function to find players listed in Games sheet but missing from DetailsV2 sheet
 * This identifies the root cause of "Cannot read properties of null" errors
 * 
 * Usage: Run checkMissingPlayerDetails() in the Script Editor
 * 
 * @return {Array} Array of missing player/game combinations
 */
function checkMissingPlayerDetails() {
  try {
    Logger.log("=== Checking for missing player details ===");
    
    // Get Games data
    var gameData = getLycanSheetData(LYCAN_SCHEMA.GAMES.SHEET);
    var gameValues = gameData.values;
    
    // Get DetailsV2 data
    var detailsData = getLycanSheetData(LYCAN_SCHEMA.DETAILSV2.SHEET);
    var detailsValues = detailsData.values;
    
    if (!gameValues || gameValues.length === 0) {
      Logger.log("ERROR: No game data found");
      return [];
    }
    
    if (!detailsValues || detailsValues.length === 0) {
      Logger.log("ERROR: No details data found");
      return [];
    }
    
    var gameHeaders = gameValues[0];
    var gameDataRows = gameValues.slice(1);
    
    var detailsHeaders = detailsValues[0];
    var detailsDataRows = detailsValues.slice(1);
    
    var gameIdColIndex = findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.GAMEID);
    var playerListColIndex = findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.PLAYERLIST);
    
    var detailsGameIdIndex = findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.GAMEID);
    var detailsPlayerIndex = findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.PLAYER);
    
    // Create a Set of existing game-player combinations in DetailsV2
    var detailsSet = new Set();
    detailsDataRows.forEach(function(row) {
      var gameId = row[detailsGameIdIndex];
      var player = row[detailsPlayerIndex];
      if (gameId && player) {
        detailsSet.add(gameId + '|' + player.trim());
      }
    });
    
    var missingDetails = [];
    var totalPlayers = 0;
    
    // Check each game and its players
    gameDataRows.forEach(function(gameRow, gameIndex) {
      var gameId = gameRow[gameIdColIndex];
      var playerListStr = gameRow[playerListColIndex];
      
      if (!playerListStr) return;
      
      var players = playerListStr.split(',').map(function(p) { return p.trim(); });
      
      players.forEach(function(playerName) {
        totalPlayers++;
        var key = gameId + '|' + playerName;
        
        if (!detailsSet.has(key)) {
          missingDetails.push({
            gameId: gameId,
            playerName: playerName,
            gameRowNumber: gameIndex + 2 // +2 for header and 0-index
          });
          
          Logger.log("MISSING: Game " + gameId + ", Player: " + playerName + 
                     " (Games sheet row " + (gameIndex + 2) + ")");
        }
      });
    });
    
    // Summary
    Logger.log("\n=== SUMMARY ===");
    Logger.log("Total player entries in Games sheet: " + totalPlayers);
    Logger.log("Total player entries in DetailsV2 sheet: " + detailsDataRows.length);
    Logger.log("Missing player details: " + missingDetails.length);
    
    if (missingDetails.length === 0) {
      Logger.log("\n✓ All players have corresponding details!");
    } else {
      Logger.log("\n⚠️  Found " + missingDetails.length + " missing player detail(s)");
      Logger.log("These players are listed in the Games sheet but have no corresponding row in DetailsV2");
      Logger.log("This causes 'Cannot read properties of null' errors during export");
    }
    
    return missingDetails;
    
  } catch (error) {
    Logger.log("ERROR in checkMissingPlayerDetails: " + error.message);
    Logger.log("Stack trace: " + error.stack);
    return [];
  }
}


/**
 * Diagnostic function to test if CLIPS schema is accessible
 * Run this in Google Apps Script editor to verify the schema
 */
function test_ClipsSchemaAccess() {
  try {
    Logger.log("=== Testing CLIPS Schema Access ===");
    
    // Test if LYCAN_SCHEMA exists
    if (typeof LYCAN_SCHEMA === 'undefined') {
      Logger.log("❌ LYCAN_SCHEMA is undefined!");
      return;
    }
    Logger.log("✓ LYCAN_SCHEMA exists");
    
    // Test if CLIPS exists in schema
    if (typeof LYCAN_SCHEMA.CLIPS === 'undefined') {
      Logger.log("❌ LYCAN_SCHEMA.CLIPS is undefined!");
      Logger.log("Available keys in LYCAN_SCHEMA: " + Object.keys(LYCAN_SCHEMA).join(', '));
      return;
    }
    Logger.log("✓ LYCAN_SCHEMA.CLIPS exists");
    
    // Test if CLIPS.SHEET exists
    if (typeof LYCAN_SCHEMA.CLIPS.SHEET === 'undefined') {
      Logger.log("❌ LYCAN_SCHEMA.CLIPS.SHEET is undefined!");
      Logger.log("Available keys in LYCAN_SCHEMA.CLIPS: " + Object.keys(LYCAN_SCHEMA.CLIPS).join(', '));
      return;
    }
    Logger.log("✓ LYCAN_SCHEMA.CLIPS.SHEET = '" + LYCAN_SCHEMA.CLIPS.SHEET + "'");
    
    // Test if sheet exists in spreadsheet
    var lycanDoc = SpreadsheetApp.getActiveSpreadsheet();
    var clipsSheet = lycanDoc.getSheetByName(LYCAN_SCHEMA.CLIPS.SHEET);
    
    if (!clipsSheet) {
      Logger.log("⚠️  Sheet '" + LYCAN_SCHEMA.CLIPS.SHEET + "' does NOT exist in spreadsheet!");
      Logger.log("Available sheets: " + lycanDoc.getSheets().map(function(s) { return s.getName(); }).join(', '));
      return;
    }
    Logger.log("✓ Sheet '" + LYCAN_SCHEMA.CLIPS.SHEET + "' exists in spreadsheet");
    
    // Test reading data from sheet
    try {
      var clipsData = getLycanSheetData(LYCAN_SCHEMA.CLIPS.SHEET);
      Logger.log("✓ Successfully called getLycanSheetData() for CLIPS sheet");
      Logger.log("  Rows: " + (clipsData.values ? clipsData.values.length : 0));
    } catch (e) {
      Logger.log("❌ Error calling getLycanSheetData(): " + e.message);
    }
    
    // Test all CLIPS columns
    Logger.log("\n=== CLIPS Column Definitions ===");
    var cols = LYCAN_SCHEMA.CLIPS.COLS;
    Object.keys(cols).forEach(function(key) {
      Logger.log("  " + key + ": '" + cols[key] + "'");
    });
    
    Logger.log("\n✅ All CLIPS schema tests passed!");
    
  } catch (error) {
    Logger.log("❌ Unexpected error: " + error.message);
    Logger.log("Stack trace: " + error.stack);
  }
}


