function doGet(e) {
  var actionMap = {
    // New unified format endpoint
    'gameLog': { baseKey: 'gameLog', fn: getRawGameDataInNewFormat, noCache: true },
  // Raw data endpoints for client-side processing - do NOT cache these (too large)
  'rawBRData': { baseKey: 'rawBRData', fn: getRawBRDataRaw, noCache: true },
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
 * Debug function for specific game ID: Ponce-20250805000000-492
 */
function debug_getRawGameDataForSpecificGame() {
  var targetGameId = 492; // The gameId part from Ponce-20250805000000-492
  var targetDate = "20250805000000"; // The date part
  
  try {
    Logger.log("=== DEBUGGING GAME ID: Ponce-20250805000000-492 ===");
    
    // Get main game data
    var gameData = getLycanSheetData(LYCAN_SCHEMA.GAMES.SHEET);
    var gameValues = gameData.values;

    // Get secondary game data
    var gameData2 = getLycanSheetData(LYCAN_SCHEMA.GAMES2.SHEET);
    var gameValues2 = gameData2.values;
    
    // Get role data
    var roleData = getLycanSheetData(LYCAN_SCHEMA.ROLES.SHEET);
    var roleValues = roleData.values;
    
    // Get details data
    var detailsData = getLycanSheetData(LYCAN_SCHEMA.DETAILSV2.SHEET);
    var detailsValues = detailsData.values;
    
    if (!gameValues || gameValues.length === 0) {
      Logger.log("ERROR: No game data found");
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
    
    var roleHeaders = roleValues ? roleValues[0] : [];
    var roleDataRows = roleValues ? roleValues.slice(1) : [];
    
    var detailsHeaders = detailsValues ? detailsValues[0] : [];
    var detailsDataRows = detailsValues ? detailsValues.slice(1) : [];
    
    Logger.log("Game headers: " + JSON.stringify(gameHeaders));
    Logger.log("Game2 headers: " + JSON.stringify(gameHeaders2));
    Logger.log("Role headers: " + JSON.stringify(roleHeaders));
    Logger.log("Details headers: " + JSON.stringify(detailsHeaders));
    
    // Find the specific game row
    var targetGameRow = null;
    var targetGame2Row = null;
    
    gameDataRows.forEach(function(gameRow, index) {
      var gameId = gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.GAMEID)];
      var rawDateCell = gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.DATE)];
      var legacyDateFragment = formatDateForLegacyId(rawDateCell);
      var constructedId = "Ponce-" + legacyDateFragment + "-" + gameId;
      
      Logger.log("Row " + index + " - Game ID: " + gameId + ", Date Fragment: " + legacyDateFragment + ", Constructed ID: " + constructedId);
      
      if (gameId == targetGameId) {
        Logger.log("FOUND TARGET GAME! Row index: " + index + ", Game ID: " + gameId);
        targetGameRow = gameRow;
        targetGame2Row = game2DataMap[gameId];
        
        // Debug the raw date and formatting
        Logger.log("Raw date cell: " + rawDateCell + " (type: " + typeof rawDateCell + ")");
        Logger.log("ISO start: " + convertDateToISO(rawDateCell));
        Logger.log("Legacy date fragment: " + legacyDateFragment);
        Logger.log("Expected date fragment: " + targetDate);
        Logger.log("Date fragments match: " + (legacyDateFragment === targetDate));
        
        // Log all data for this game
        Logger.log("Game row data: " + JSON.stringify(gameRow));
        Logger.log("Game2 row data: " + JSON.stringify(targetGame2Row));
        
        // Get player list and role assignments
        var playerListStr = gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.PLAYERLIST)];
        var players = playerListStr ? playerListStr.split(',').map(function(p) { return p.trim(); }) : [];
        Logger.log("Players: " + JSON.stringify(players));
        
        var roleAssignments = getRoleAssignmentsForGame(gameId, roleHeaders, roleDataRows);
        Logger.log("Role assignments: " + JSON.stringify(roleAssignments));
        
        // Check details for each player
        players.forEach(function(playerName) {
          var playerDetails = getPlayerDetailsForGame(playerName, gameId, detailsHeaders, detailsDataRows);
          Logger.log("Player " + playerName + " details: " + JSON.stringify(playerDetails));
          
          var playerStats = buildPlayerStats(playerName, gameId, roleAssignments, gameRow, gameHeaders, detailsHeaders, detailsDataRows);
          Logger.log("Player " + playerName + " stats: " + JSON.stringify(playerStats));
        });
      }
    });
    
    if (!targetGameRow) {
      Logger.log("ERROR: Could not find game with ID " + targetGameId);
      return JSON.stringify({ error: 'Could not find target game' });
    }
    
    Logger.log("=== DEBUG COMPLETE ===");
    
    return JSON.stringify({ 
      success: true, 
      message: "Debug completed - check logs for details",
      targetGameFound: !!targetGameRow
    });
    
  } catch (error) {
    Logger.log('Error in debug function: ' + error.message);
    Logger.log('Stack trace: ' + error.stack);
    return JSON.stringify({ error: error.message, stack: error.stack });
  }
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
    
    // Get role data
    var roleData = getLycanSheetData(LYCAN_SCHEMA.ROLES.SHEET);
    var roleValues = roleData.values;
    
    // Get details data
    var detailsData = getLycanSheetData(LYCAN_SCHEMA.DETAILSV2.SHEET);
    var detailsValues = detailsData.values;
    
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
    
    var roleHeaders = roleValues ? roleValues[0] : [];
    var roleDataRows = roleValues ? roleValues.slice(1) : [];
    
    var detailsHeaders = detailsValues ? detailsValues[0] : [];
    var detailsDataRows = detailsValues ? detailsValues.slice(1) : [];
    
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
        EndTiming: "U" + gameRow[findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.NBDAYS)],
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
      
      var roleAssignments = getRoleAssignmentsForGame(gameId, roleHeaders, roleDataRows);
      
      gameRecord.PlayerStats = players.map(function(playerName) {
        return buildPlayerStats(playerName, gameId, roleAssignments, gameRow, gameHeaders, detailsHeaders, detailsDataRows);
      });
      
      // Check if death information is filled for all players
      var allPlayersHaveDeathInfo = gameRecord.PlayerStats.every(function(playerStat) {
        return playerStat.DeathType !== null && playerStat.DeathType !== '';
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
 * Helper function to build player stats from legacy data
 */
function buildPlayerStats(playerName, gameId, roleAssignments, gameRow, gameHeaders, detailsHeaders, detailsDataRows) {
  // Get player details from the Details sheet
  var playerDetails = getPlayerDetailsForGame(playerName, gameId, detailsHeaders, detailsDataRows);
  
  var playerStats = {
    Username: playerName,
    MainRoleInitial: determineMainRoleInitialWithDetails(playerName, roleAssignments, playerDetails),
    MainRoleFinal: null,
    Color: playerDetails && playerDetails.color ? playerDetails.color : null,
    Power: playerDetails && playerDetails.power && playerDetails.power !== 'N/A' && playerDetails.power !== 'Inconnu' ? playerDetails.power : null,
    SecondaryRole: playerDetails && playerDetails.secondaryRole && playerDetails.secondaryRole !== 'N/A' && playerDetails.secondaryRole !== 'Inconnu' ? playerDetails.secondaryRole : null,
    DeathDateIrl: null, // Not available in legacy data
    DeathTiming: determineDeathTiming(playerDetails),
    DeathPosition: null, // Not available in legacy data
    DeathType: playerDetails && playerDetails.typeOfDeath ? playerDetails.typeOfDeath : null,
    KillerName: determineKillerName(playerDetails),
    Victorious: isPlayerVictorious(playerName, gameRow, gameHeaders)
  };

  playerStats.MainRoleFinal = determineMainRoleFinalWithDetails(playerDetails, playerStats);
  
  return playerStats;
}

/**
 * Helper function to determine main role from role assignments
 */
function determineMainRole(playerName, roleAssignments) {

  // Check all special roles
  if (roleAssignments.wolves && roleAssignments.wolves.includes(playerName)) return "Loup";
  if (roleAssignments.traitor === playerName) return "Traître";
  if (roleAssignments.idiot === playerName) return "Idiot du Village";
  if (roleAssignments.cannibal === playerName) return "Cannibale";
  if (roleAssignments.agents && roleAssignments.agents.includes(playerName)) return "Agent";
  if (roleAssignments.spy === playerName) return "Espion";
  if (roleAssignments.scientist === playerName) return "Scientifique";
  if (roleAssignments.lovers && roleAssignments.lovers.includes(playerName)) return "Amoureux";
  if (roleAssignments.theBeast === playerName) return "La Bête";
  if (roleAssignments.bountyHunter === playerName) return "Chasseur de primes";
  if (roleAssignments.voodoo === playerName) return "Vaudou";
  
  // Default to villager
  return "Villageois";
}

/**
 * Helper function to get role assignments for a specific game
 */
function getRoleAssignmentsForGame(gameId, roleHeaders, roleDataRows) {
  var roleRow = roleDataRows.find(function(row) {
    return row[findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.GAMEID)] == gameId;
  });
  
  if (!roleRow) return {};
  
  return {
    wolves: parsePlayerList(roleRow[findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.WOLFS)]),
    traitor: roleRow[findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.TRAITOR)] || null,
    idiot: roleRow[findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.IDIOT)] || null,
    cannibal: roleRow[findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.CANNIBAL)] || null,
    agents: parsePlayerList(roleRow[findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.AGENTS)]),
    spy: roleRow[findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.SPY)] || null,
    scientist: roleRow[findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.SCIENTIST)] || null,
    lovers: parsePlayerList(roleRow[findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.LOVERS)]),
    theBeast: roleRow[findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.THEBEAST)] || null,
    bountyHunter: roleRow[findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.BOUNTYHUNTER)] || null,
    voodoo: roleRow[findColumnIndex(roleHeaders, LYCAN_SCHEMA.ROLES.COLS.VOODOO)] || null
  };
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
    
    finalCamp: detailsRow[findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.FINALCAMP)] || null,
    finalRole: detailsRow[findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.FINALROLE)] || null,
    finalPower: detailsRow[findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.FINALPOWER)] || null,
    
    dayOfDeath: detailsRow[findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.DAYOFDEATH)] || null,
    typeOfDeath: detailsRow[findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.TYPEOFDEATH)] || null,
    killerPlayers: detailsRow[findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.KILLERPLAYERS)] || null,
    killedPlayers: detailsRow[findColumnIndex(detailsHeaders, LYCAN_SCHEMA.DETAILSV2.COLS.KILLEDPLAYERS)] || null
  };
}

/**
 * Helper function to determine main role with details data priority
 */
function determineMainRoleInitialWithDetails(playerName, roleAssignments, playerDetails) {
  
  // Determine which camp to use based on type (initial)
  if (playerDetails.mainRole && playerDetails.mainRole !== 'Inconnu') {
      return playerDetails.mainRole;
  }
  else if (playerDetails.mainRole === 'Inconnu') {
    return playerDetails.camp;
  }
  else {
    // Otherwise, fall back to the original method
    return determineMainRole(playerName, roleAssignments);
  }
}

/**
 * Helper function to determine main role with details data priority
 */
function determineMainRoleFinalWithDetails(playerDetails, playerStats) {
  
  // Determine which camp to use based on type (final)
  if (playerDetails.finalRole) {
    return playerDetails.finalRole;
  }
  else { 
    // Otherwise, fall back to the main role initial
    return playerStats.MainRoleInitial;
  }
}

/**
 * Helper function to determine death timing
 */
function determineDeathTiming(playerDetails) {
  if (!playerDetails || !playerDetails.dayOfDeath) return null;
  
  if (playerDetails.dayOfDeath !== '' && playerDetails.dayOfDeath !== null) {
    var dayValue = playerDetails.dayOfDeath.toString();
    
    // If the value already starts with a letter, return it as is
    if (dayValue.length > 0 && /^[A-Za-z]/.test(dayValue)) {
      return dayValue;
    }
    
    // Otherwise, it's an integer, so add "U" prefix
    return "U" + dayValue;
  }
  
  return null;
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
