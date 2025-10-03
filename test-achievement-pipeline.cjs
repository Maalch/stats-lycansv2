const fs = require('fs');
const path = require('path');

// Read the game log data
const gameLogPath = path.resolve('data/gameLog.json');
const gameLogData = JSON.parse(fs.readFileSync(gameLogPath, 'utf8'));

// Import the exact functions from generate-achievements.js
// (I need to copy more functions to test the full pipeline)

function parseGameId(gameId) {
  const parts = gameId.split('-');
  
  if (parts.length === 3) {
    return { timestamp: parts[1], trailingNumber: parseInt(parts[2]) || 0 };
  } else if (parts.length === 2) {
    return { timestamp: parts[1], trailingNumber: 0 };
  }
  return { timestamp: '0', trailingNumber: 0 };
}

function generateDisplayedIds(games) {
  const displayedIdMap = new Map();
  
  const sortedGames = [...games].sort((a, b) => {
    const parsedA = parseGameId(a.Id);
    const parsedB = parseGameId(b.Id);
    
    const timestampCompare = parsedA.timestamp.localeCompare(parsedB.timestamp);
    if (timestampCompare !== 0) return timestampCompare;
    
    return parsedA.trailingNumber - parsedB.trailingNumber;
  });
  
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

  const displayedIdMap = generateDisplayedIds(gameData);

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
        
        if (mainCamp === 'Villageois' || mainCamp === 'Loup') {
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
          }
          
          playerSeriesState[player].lastCamp = mainCamp;
        } else {
          playerSeriesState[player].currentLoupsSeries = 0;
          playerSeriesState[player].loupsSeriesStart = null;
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

function findTopSeriesPerformers(seriesData, minLength = 2) {
  return seriesData
    .filter(series => series.seriesLength >= minLength)
    .sort((a, b) => b.seriesLength - a.seriesLength);
}

function findPlayerSeriesRank(topSeries, playerName) {
  const playerIndex = topSeries.findIndex(series => series.player === playerName);
  if (playerIndex === -1) return null;

  return {
    rank: playerIndex + 1,
    value: topSeries[playerIndex].seriesLength
  };
}

// Test the achievement generation pipeline
console.log('=== TESTING FULL ACHIEVEMENT PIPELINE ===');
const allGames = gameLogData.GameStats || [];
const seriesData = computePlayerSeriesData(allGames);

console.log('Series data structure:');
console.log('- allLoupsSeries length:', seriesData.allLoupsSeries.length);

const topLoupSeries = findTopSeriesPerformers(seriesData.allLoupsSeries, 2);
console.log('- topLoupSeries (min 2) length:', topLoupSeries.length);

console.log('\nTop 10 Loup series:');
topLoupSeries.slice(0, 10).forEach((series, index) => {
  console.log(`${index + 1}. ${series.player}: ${series.seriesLength} games (${series.startGame} to ${series.endGame})`);
});

const luttiRank = findPlayerSeriesRank(topLoupSeries, 'Lutti');
console.log('\nLutti rank in Loup series:', luttiRank);

if (luttiRank) {
  console.log(`✅ Lutti should get achievement: 🐺 Top ${luttiRank.rank} Série Loup`);
} else {
  console.log('❌ Lutti would NOT get a Loup series achievement');
}