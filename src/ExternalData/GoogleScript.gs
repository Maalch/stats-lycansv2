function doGet(e) {
  var actionMap = {
    // Add new statistics endpoints
    'campWinStats': { key: 'campWinStats', fn: getCampWinStatsRaw },
    'harvestStats': { key: 'harvestStats', fn: getHarvestStatsRaw },
    'roleSurvivalStats': { key: 'roleSurvivalStats', fn: getRoleSurvivalStatsRaw },
    'gameDurationAnalysis': { key: 'gameDurationAnalysis', fn: getGameDurationAnalysisRaw }
  };
  
  var action = e.parameter.action;
  var actionData = actionMap[action];
  if (actionData) {
    return getCachedData(actionData.key, actionData.fn, 300, e);
  } else {
    return ContentService.createTextOutput('Invalid action - not found')
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

// Fonction de test pour les statistiques par session
function test_doGet() {
  var cache = CacheService.getScriptCache();
  cache.remove('roleSurvivalStats');
  var e = { parameter: { action: 'roleSurvivalStats' } };
  var result = doGet(e);
  Logger.log(result.getContent());
  return result;
}

// Fonction de test pour les statistiques des joueurs par session
function test_doGet_WithParameters() {
  var cache = CacheService.getScriptCache();
  // Clear the cache for this endpoint
  cache.remove('playerStatsBySession');
  
  // You need to provide a valid date that exists in your data
  // Format should match your data (e.g., "DD/MM/YYYY")
  var sessionDate = "18/07/2025"; // Replace with a real session date from your data
  
  var e = { 
    parameter: { 
      action: 'playerStatsBySession',
      sessionDate: sessionDate
    } 
  };
  
  var result = doGet(e);
  Logger.log("Test playerStatsBySession for date: " + sessionDate);
  Logger.log(result.getContent());
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
    cache.put(cacheKey, result, cacheSeconds);
    return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in getCachedData: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Returns statistics about win rates by camp (Villageois, Loups, etc.)
 * @return {string} JSON string with camp win statistics
 */
function getCampWinStatsRaw() {
  try {
    // Get game data
    var gameData = getLycanSheetData(LYCAN_SCHEMA.GAMES.SHEET);
    var values = gameData.values;
    var headers = values[0];
    
    // Get column indexes
    var winnerCampIdx = findColumnIndex(headers, LYCAN_SCHEMA.GAMES.COLS.WINNERCAMP);
    
    // Skip header row
    var dataRows = values.slice(1);
    
    // Count wins by camp
    var campWins = {};
    var totalGames = 0;
    
    dataRows.forEach(function(row) {
      var winnerCamp = row[winnerCampIdx];
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
    
    return JSON.stringify({
      totalGames: totalGames,
      campStats: campStats
    });
  } catch (error) {
    Logger.log('Error in getCampWinStatsRaw: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}

/**
 * Returns statistics about harvest rates and outcomes
 * @return {string} JSON string with harvest statistics
 */
function getHarvestStatsRaw() {
  try {
    // Get game data
    var gameData = getLycanSheetData(LYCAN_SCHEMA.GAMES.SHEET);
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
        "76-100%": 0
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
        } else {
          harvestStats.harvestDistribution["76-100%"]++;
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
          campData.average = (campData.totalPercent / campData.count).toFixed(2);
        }
      });
    }
    
    return JSON.stringify(harvestStats);
  } catch (error) {
    Logger.log('Error in getHarvestStatsRaw: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}

/**
 * Returns statistics about role survival rates, by role, camp, secondary role, and third role
 * @return {string} JSON string with role, camp, secondaryRole, and thirdRole survival statistics
 */
function getRoleSurvivalStatsRaw() {
  try {
    // Get game and role data
    var gameData = getLycanSheetData(LYCAN_SCHEMA.GAMES.SHEET);
    var ponceData = getLycanSheetData(LYCAN_SCHEMA.PONCE.SHEET);

    var gameValues = gameData.values;
    var ponceValues = ponceData.values;

    var gameHeaders = gameValues[0];
    var ponceHeaders = ponceValues[0];

    // Get game column indexes
    var gameIdIdx = findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.GAMEID);
    var nbDaysIdx = findColumnIndex(gameHeaders, LYCAN_SCHEMA.GAMES.COLS.NBDAYS);

    // Get ponce column indexes
    var ponceGameIdIdx = findColumnIndex(ponceHeaders, LYCAN_SCHEMA.PONCE.COLS.GAMEID);
    var ponceCampIdIdx = findColumnIndex(ponceHeaders, LYCAN_SCHEMA.PONCE.COLS.CAMP);
    var ponceRoleIdx = findColumnIndex(ponceHeaders, LYCAN_SCHEMA.PONCE.COLS.ROLE);
    var ponceSecondaryRoleIdx = findColumnIndex(ponceHeaders, LYCAN_SCHEMA.PONCE.COLS.SECONDARYROLE);
    var ponceVillageRoleIdx = findColumnIndex(ponceHeaders, LYCAN_SCHEMA.PONCE.COLS.VILLAGEROLE);
    var ponceWolfRoleIdx = findColumnIndex(ponceHeaders, LYCAN_SCHEMA.PONCE.COLS.WOLFROLE);
    var ponceDayOfDeathIdx = findColumnIndex(ponceHeaders, LYCAN_SCHEMA.PONCE.COLS.DAYOFDEATH);

    // Skip header rows
    var gameRows = gameValues.slice(1);
    var ponceRows = ponceValues.slice(1);

    // Create map of game ID to total days
    var gameDaysMap = {};
    gameRows.forEach(function(row) {
      var gameId = row[gameIdIdx];
      var nbDays = row[nbDaysIdx];
      if (gameId && nbDays) {
        gameDaysMap[gameId] = parseInt(nbDays);
      }
    });

    // Analyze role survival data
    var campStats = {};
    var roleStats = {};
    var secondaryRoleStats = {};
    var thirdRoleStats = {};

    ponceRows.forEach(function(row) {
      var gameId = row[ponceGameIdIdx];
      var camp = row[ponceCampIdIdx];
      var role = row[ponceRoleIdx];
      var secondaryRole = row[ponceSecondaryRoleIdx];
      var thirdRole = row[ponceVillageRoleIdx];
      if (camp === 'Loups')
        thirdRole = row[ponceWolfRoleIdx];
      var dayOfDeath = row[ponceDayOfDeathIdx];

      var totalDays = gameDaysMap[gameId] || 0;

      if (gameId) {
        // Role stats
        if (role) {
          if (!roleStats[role]) {
            roleStats[role] = {
              appearances: 0,
              survived: 0,
              survivalRate: 0,
              avgLifespan: 0,
              totalLifespan: 0
            };
          }
          roleStats[role].appearances++;
          if (!dayOfDeath || dayOfDeath === "") {
            roleStats[role].survived++;
            roleStats[role].totalLifespan += totalDays;
          } else {
            var lifespan = parseInt(dayOfDeath);
            if (!isNaN(lifespan)) {
              roleStats[role].totalLifespan += lifespan;
            }
          }
        }

        // Camp stats
        if (camp) {
          if (!campStats[camp]) {
            campStats[camp] = {
              appearances: 0,
              survived: 0,
              survivalRate: 0,
              avgLifespan: 0,
              totalLifespan: 0
            };
          }
          campStats[camp].appearances++;
          if (!dayOfDeath || dayOfDeath === "") {
            campStats[camp].survived++;
            campStats[camp].totalLifespan += totalDays;
          } else {
            var lifespan = parseInt(dayOfDeath);
            if (!isNaN(lifespan)) {
              campStats[camp].totalLifespan += lifespan;
            }
          }
        }

        // Secondary role stats
        if (secondaryRole) {
          if (!secondaryRoleStats[secondaryRole]) {
            secondaryRoleStats[secondaryRole] = {
              appearances: 0,
              survived: 0,
              survivalRate: 0,
              avgLifespan: 0,
              totalLifespan: 0
            };
          }
          secondaryRoleStats[secondaryRole].appearances++;
          if (!dayOfDeath || dayOfDeath === "") {
            secondaryRoleStats[secondaryRole].survived++;
            secondaryRoleStats[secondaryRole].totalLifespan += totalDays;
          } else {
            var lifespan = parseInt(dayOfDeath);
            if (!isNaN(lifespan)) {
              secondaryRoleStats[secondaryRole].totalLifespan += lifespan;
            }
          }
        }

        // Third role stats
        if (thirdRole) {
          if (!thirdRoleStats[thirdRole]) {
            thirdRoleStats[thirdRole] = {
              appearances: 0,
              survived: 0,
              survivalRate: 0,
              avgLifespan: 0,
              totalLifespan: 0
            };
          }
          thirdRoleStats[thirdRole].appearances++;
          if (!dayOfDeath || dayOfDeath === "") {
            thirdRoleStats[thirdRole].survived++;
            thirdRoleStats[thirdRole].totalLifespan += totalDays;
          } else {
            var lifespan = parseInt(dayOfDeath);
            if (!isNaN(lifespan)) {
              thirdRoleStats[thirdRole].totalLifespan += lifespan;
            }
          }
        }
      }
    });

    // Calculate final statistics for each structure
    function finalizeStats(statsObj) {
      Object.keys(statsObj).forEach(function(key) {
        var stats = statsObj[key];
        if (stats.appearances > 0) {
          stats.survivalRate = (stats.survived / stats.appearances * 100).toFixed(2);
          stats.avgLifespan = (stats.totalLifespan / stats.appearances).toFixed(1);
        }
      });
      // Convert to array for easier frontend processing
      return Object.keys(statsObj).map(function(key) {
        return {
          key: key,
          ...statsObj[key]
        };
      }).sort(function(a, b) {
        return b.appearances - a.appearances;
      });
    }

    var roleStatsArray = finalizeStats(roleStats).map(obj => ({ role: obj.key, ...obj }));
    var campStatsArray = finalizeStats(campStats).map(obj => ({ camp: obj.key, ...obj }));
    var secondaryRoleStatsArray = finalizeStats(secondaryRoleStats).map(obj => ({ secondaryRole: obj.key, ...obj }));
    var thirdRoleStatsArray = finalizeStats(thirdRoleStats).map(obj => ({ thirdRole: obj.key, ...obj }));

    return JSON.stringify({
      roleStats: roleStatsArray,
      campStats: campStatsArray,
      secondaryRoleStats: secondaryRoleStatsArray,
      thirdRoleStats: thirdRoleStatsArray
    });
  } catch (error) {
    Logger.log('Error in getRoleSurvivalStatsRaw: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}

/**
 * Returns statistics about game duration by number of days
 * @return {string} JSON string with game duration statistics
 */
function getGameDurationAnalysisRaw() {
  try {
    // Get game data
    var gameData = getLycanSheetData(LYCAN_SCHEMA.GAMES.SHEET);
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
        
        // Calculate wolf ratio and update stats
        if (nbPlayers && nbWolves && !isNaN(nbPlayers) && !isNaN(nbWolves)) {
          var wolfRatio = Math.round((parseInt(nbWolves) / parseInt(nbPlayers)) * 10) / 10; // Round to nearest 0.1
          var wolfRatioKey = wolfRatio.toFixed(1);
          
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
          ratioData.average = (ratioData.totalDays / ratioData.count).toFixed(1);
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
  } catch (error) {
    Logger.log('Error in getGameDurationAnalysisRaw: ' + error.message);
    return JSON.stringify({ error: error.message });
  }
}