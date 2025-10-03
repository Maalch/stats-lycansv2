const fs = require('fs');
const path = require('path');

// Read the game log data
const gameLogPath = path.resolve('data/gameLog.json');
const gameLogData = JSON.parse(fs.readFileSync(gameLogPath, 'utf8'));

// Copy the exact functions from generate-achievements.js
// (simplified version to test just the series computation)

function parseGameId(gameId) {
  const parts = gameId.split('-');
  
  if (parts.length === 3) {
    // Legacy format: "Ponce-20231013000000-1"
    return { 
      timestamp: parts[1], 
      trailingNumber: parseInt(parts[2]) || 0 
    };
  } else if (parts.length === 2) {
    // New format: "Nales-20250912210715"
    return { 
      timestamp: parts[1], 
      trailingNumber: 0 
    };
  }
  
  // Fallback
  return { timestamp: '0', trailingNumber: 0 };
}

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

function getPlayerMainCampFromRole(roleName) {
  if (!roleName) return 'Villageois';
  
  const loupRoles = ['Loup', 'Traître'];
  
  if (loupRoles.includes(roleName)) {
    return 'Loup';
  } else if (roleName === 'Villageois') {
    return 'Villageois';
  } else {
    return 'Autres';
  }
}

function getAllPlayersFromGames(gameData) {
  const allPlayers = new Set();
  
  gameData.forEach(game => {
    if (game.PlayerStats) {
      game.PlayerStats.forEach(playerStat => {
        allPlayers.add(playerStat.Username);
      });
    }
  });
  
  return allPlayers;
}

function initializePlayerSeriesState(allPlayers) {
  const playerSeriesState = {};
  
  allPlayers.forEach(player => {
    playerSeriesState[player] = {
      currentVillageoisSeries: 0,
      currentLoupsSeries: 0,
      longestVillageoisSeries: null,
      longestLoupsSeries: null,
      lastCamp: null,
      villageoisSeriesStart: null,
      loupsSeriesStart: null,
      currentVillageoisGameIds: [],
      currentLoupsGameIds: [],
    };
  });
  
  return playerSeriesState;
}

function computePlayerSeriesData(gameData) {
  if (gameData.length === 0) return null;

  // Generate DisplayedId mapping like the client-side does
  const displayedIdMap = generateDisplayedIds(gameData);

  // Sort games by DisplayedId to ensure chronological order (client-side compatible)
  const sortedGames = [...gameData].sort((a, b) => {
    const displayedIdA = parseInt(displayedIdMap.get(a.Id) || '0');
    const displayedIdB = parseInt(displayedIdMap.get(b.Id) || '0');
    return displayedIdA - displayedIdB;
  });
  
  const allPlayers = getAllPlayersFromGames(sortedGames);
  const playerSeriesState = initializePlayerSeriesState(allPlayers);

  sortedGames.forEach(game => {
    const gameDisplayedId = displayedIdMap.get(game.Id) || game.Id;
    const date = new Date(game.StartDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });

    if (game.PlayerStats) {
      game.PlayerStats.forEach(playerStat => {
        const player = playerStat.Username;
        const mainCamp = getPlayerMainCampFromRole(playerStat.MainRoleInitial);
        
        // Process camp series
        if (mainCamp === 'Villageois' || mainCamp === 'Loup') {
          // Check Villageois series
          if (mainCamp === 'Villageois') {
            playerSeriesState[player].currentVillageoisSeries++;
            if (!playerSeriesState[player].villageoisSeriesStart) {
              playerSeriesState[player].villageoisSeriesStart = { game: gameDisplayedId, date };
            }
            playerSeriesState[player].currentVillageoisGameIds.push(gameDisplayedId);
            
            if (!playerSeriesState[player].longestVillageoisSeries || 
                playerSeriesState[player].currentVillageoisSeries >= playerSeriesState[player].longestVillageoisSeries.seriesLength) {
              playerSeriesState[player].longestVillageoisSeries = {
                player,
                camp: 'Villageois',
                seriesLength: playerSeriesState[player].currentVillageoisSeries,
                startGame: playerSeriesState[player].villageoisSeriesStart?.game || gameDisplayedId,
                endGame: gameDisplayedId,
                startDate: playerSeriesState[player].villageoisSeriesStart?.date || date,
                endDate: date,
                isOngoing: false,
                gameIds: [...playerSeriesState[player].currentVillageoisGameIds]
              };
            }
            
            // Reset Loups series
            playerSeriesState[player].currentLoupsSeries = 0;
            playerSeriesState[player].loupsSeriesStart = null;
            playerSeriesState[player].currentLoupsGameIds = [];
          }
          
          // Check Loups series
          if (mainCamp === 'Loup') {
            playerSeriesState[player].currentLoupsSeries++;
            if (!playerSeriesState[player].loupsSeriesStart) {
              playerSeriesState[player].loupsSeriesStart = { game: gameDisplayedId, date };
            }
            playerSeriesState[player].currentLoupsGameIds.push(gameDisplayedId);
            
            if (!playerSeriesState[player].longestLoupsSeries || 
                playerSeriesState[player].currentLoupsSeries >= playerSeriesState[player].longestLoupsSeries.seriesLength) {
              playerSeriesState[player].longestLoupsSeries = {
                player,
                camp: 'Loups',
                seriesLength: playerSeriesState[player].currentLoupsSeries,
                startGame: playerSeriesState[player].loupsSeriesStart?.game || gameDisplayedId,
                endGame: gameDisplayedId,
                startDate: playerSeriesState[player].loupsSeriesStart?.date || date,
                endDate: date,
                isOngoing: false,
                gameIds: [...playerSeriesState[player].currentLoupsGameIds]
              };
            }
            
            // Reset Villageois series
            playerSeriesState[player].currentVillageoisSeries = 0;
            playerSeriesState[player].villageoisSeriesStart = null;
            playerSeriesState[player].currentVillageoisGameIds = [];
          }
          
          playerSeriesState[player].lastCamp = mainCamp;
        } else {
          // Playing as special role breaks both camp series
          playerSeriesState[player].currentVillageoisSeries = 0;
          playerSeriesState[player].currentLoupsSeries = 0;
          playerSeriesState[player].villageoisSeriesStart = null;
          playerSeriesState[player].loupsSeriesStart = null;
          playerSeriesState[player].currentVillageoisGameIds = [];
          playerSeriesState[player].currentLoupsGameIds = [];
          playerSeriesState[player].lastCamp = 'Autres';
        }
      });
    }
  });

  // Collect results
  const allLoupsSeries = [];
  Object.values(playerSeriesState).forEach(stats => {
    if (stats.longestLoupsSeries) {
      allLoupsSeries.push(stats.longestLoupsSeries);
    }
  });

  allLoupsSeries.sort((a, b) => b.seriesLength - a.seriesLength);

  return { allLoupsSeries };
}

// Test the function
console.log('=== TESTING ACTUAL ACHIEVEMENT GENERATION LOGIC ===');
const allGames = gameLogData.GameStats || [];
const allGamesSeriesData = computePlayerSeriesData(allGames);

console.log('All Loup series found:');
allGamesSeriesData.allLoupsSeries.forEach((series, index) => {
  console.log(`${index + 1}. ${series.player}: ${series.seriesLength} games (${series.startGame} to ${series.endGame})`);
});

console.log(`\nTotal Loup series found: ${allGamesSeriesData.allLoupsSeries.length}`);

// Check what's in the minimum threshold
function findTopSeriesPerformers(seriesData, minLength = 2) {
  return seriesData
    .filter(series => series.seriesLength >= minLength)
    .sort((a, b) => b.seriesLength - a.seriesLength);
}

const topLoupSeries = findTopSeriesPerformers(allGamesSeriesData.allLoupsSeries, 2);
console.log(`\nLoup series with >= 2 games: ${topLoupSeries.length}`);
topLoupSeries.forEach((series, index) => {
  console.log(`${index + 1}. ${series.player}: ${series.seriesLength} games`);
});

// Check if "Lutti" is in there (from your screenshot)
const luttiSeries = topLoupSeries.find(s => s.player === 'Lutti');
if (luttiSeries) {
  console.log(`\nLutti found: ${luttiSeries.seriesLength} games series!`);
} else {
  console.log('\nLutti NOT found in Loup series >= 2');
}