function doGet(e) {
  var actionMap = {
  // Raw data endpoints for client-side processing - do NOT cache these (too large)
  'rawGameData': { baseKey: 'rawGameData', fn: getRawGameDataRaw, noCache: true },
  'rawRoleData': { baseKey: 'rawRoleData', fn: getRawRoleDataRaw, noCache: true },
  'rawPonceData': { baseKey: 'rawPonceData', fn: getRawPonceDataRaw, noCache: true }
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