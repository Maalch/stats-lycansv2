/**
 * Player series statistics computation functions
 */

import { getPlayerId, getPlayerMainCampFromRole } from '../../../src/utils/datasyncExport.js';

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
 * @param {string} playerId - Player ID (Steam ID)
 * @param {string} playerName - Player display name
 * @param {'Villageois'|'Loup'|'Autres'} mainCamp - Main camp category
 * @param {string} gameDisplayedId - Game displayed ID
 * @param {string} date - Game date
 */
function processCampSeries(playerStats, playerId, playerName, mainCamp, gameDisplayedId, date) {
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
          player: playerId,
          playerName: playerName,
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
          player: playerId,
          playerName: playerName,
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
 * @param {string} playerId - Player ID (Steam ID)
 * @param {string} playerName - Player display name
 * @param {boolean} playerWon - Whether player won
 * @param {string} actualCamp - Actual camp played
 * @param {string} gameDisplayedId - Game displayed ID
 * @param {string} date - Game date
 */
function processWinSeries(playerStats, playerId, playerName, playerWon, actualCamp, gameDisplayedId, date) {
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
        player: playerId,
        playerName: playerName,
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
 * @param {string} playerId - Player ID (Steam ID)
 * @param {string} playerName - Player display name
 * @param {boolean} playerWon - Whether player won
 * @param {string} actualCamp - Actual camp played
 * @param {string} gameDisplayedId - Game displayed ID
 * @param {string} date - Game date
 */
function processLossSeries(playerStats, playerId, playerName, playerWon, actualCamp, gameDisplayedId, date) {
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
        player: playerId,
        playerName: playerName,
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
          const mainCamp = getPlayerMainCampFromRole(playerStat.MainRoleInitial, playerStat.Power);
          
          // Process camp series
          processCampSeries(playerStats, playerId, playerName, mainCamp, gameDisplayedId, date);
          
          // Process win series
          processWinSeries(playerStats, playerId, playerName, playerWon, mainCamp, gameDisplayedId, date);
          
          // Process loss series
          processLossSeries(playerStats, playerId, playerName, playerWon, mainCamp, gameDisplayedId, date);
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
 * Update player series data incrementally with new games
 * @param {Object} cachedSeriesState - Existing series state { [playerId]: state }
 * @param {Array} newGames - Array of new game entries to process
 * @param {number} existingGameCount - Number of games already processed
 * @param {number} totalGameCount - Total number of games after adding new ones
 * @returns {Object|null} - Updated player series data or null
 */
export function updatePlayerSeriesDataIncremental(cachedSeriesState, newGames, existingGameCount, totalGameCount) {
  if (newGames.length === 0) {
    // No new games, return existing data converted to output format
    return convertSeriesStateToOutput(cachedSeriesState, totalGameCount);
  }

  // Create a working copy of the series state
  const playerSeriesState = {};
  for (const [playerId, state] of Object.entries(cachedSeriesState)) {
    playerSeriesState[playerId] = { ...state };
  }

  // Generate DisplayedId mapping for new games
  // DisplayedIds start from existingGameCount + 1
  const displayedIdMap = new Map();
  
  // Sort new games by timestamp to get chronological order
  const sortedNewGames = [...newGames].sort((a, b) => {
    const parsedA = parseGameId(a.Id);
    const parsedB = parseGameId(b.Id);
    
    const timestampCompare = parsedA.timestamp.localeCompare(parsedB.timestamp);
    if (timestampCompare !== 0) {
      return timestampCompare;
    }
    
    return parsedA.trailingNumber - parsedB.trailingNumber;
  });
  
  // Assign DisplayedIds starting from existingGameCount + 1
  sortedNewGames.forEach((game, index) => {
    const displayedId = (existingGameCount + index + 1).toString();
    displayedIdMap.set(game.Id, displayedId);
  });

  // Process each new game chronologically
  sortedNewGames.forEach(game => {
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
        
        // Initialize player if they're new
        if (!playerSeriesState[playerId]) {
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
        }
        
        const playerStats = playerSeriesState[playerId];
        
        // Update player name if it changed
        playerStats.playerName = playerName;
        
        const playerWon = playerStat.Victorious;
        const mainCamp = getPlayerMainCampFromRole(playerStat.MainRoleInitial, playerStat.Power);
        
        // Process camp series
        processCampSeries(playerStats, playerId, playerName, mainCamp, gameDisplayedId, date);
        
        // Process win series
        processWinSeries(playerStats, playerId, playerName, playerWon, mainCamp, gameDisplayedId, date);
        
        // Process loss series
        processLossSeries(playerStats, playerId, playerName, playerWon, mainCamp, gameDisplayedId, date);
      });
    }
  });

  return convertSeriesStateToOutput(playerSeriesState, totalGameCount);
}

/**
 * Convert series state to output format (used by both full and incremental)
 * @param {Object} playerSeriesState - Player series state mapping
 * @param {number} totalGames - Total number of games
 * @returns {Object} - Formatted series data
 */
function convertSeriesStateToOutput(playerSeriesState, totalGames) {
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
    totalGamesAnalyzed: totalGames,
    totalPlayersCount: Object.keys(playerSeriesState).length
  };
}
