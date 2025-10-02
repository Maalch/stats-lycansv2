const fs = require('fs');

// Test just the Loup series achievement processing
console.log('=== TESTING LOUP SERIES ACHIEVEMENT PROCESSING ===');

// Mock data based on what we know works
const mockSeriesData = {
  allLoupsSeries: [
    { player: 'Fukano', seriesLength: 31, startGame: '156', endGame: '310' },
    { player: 'Lutti', seriesLength: 23, startGame: '155', endGame: '272' },
    { player: 'Flonflon', seriesLength: 23, startGame: '151', endGame: '275' },
    { player: 'Arkantors', seriesLength: 20, startGame: '170', endGame: '294' },
    { player: 'Kao', seriesLength: 19, startGame: '176', endGame: '303' }
  ]
};

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

function createSeriesAchievement(id, title, description, type, rank, value, totalRanked, redirectTo) {
  return {
    id,
    title,
    description,
    type,
    category: 'series',
    rank,
    value,
    totalRanked,
    redirectTo: redirectTo || {
      tab: 'players',
      subTab: 'series'
    }
  };
}

function processSeriesAchievements(seriesData, playerName, suffix) {
  console.log('DEBUG: processSeriesAchievements called for player:', playerName);
  console.log('DEBUG: seriesData exists:', !!seriesData);
  
  if (!seriesData) {
    console.log('DEBUG: No seriesData, returning empty array');
    return [];
  }

  const achievements = [];

  // Test Loup series processing specifically
  console.log('DEBUG: allLoupsSeries length:', seriesData.allLoupsSeries?.length || 0);
  
  if (seriesData.allLoupsSeries && seriesData.allLoupsSeries.length > 0) {
    const topLoupSeries = findTopSeriesPerformers(seriesData.allLoupsSeries, 2);
    console.log('DEBUG: topLoupSeries length:', topLoupSeries.length);
    
    const loupRank = findPlayerSeriesRank(topLoupSeries, playerName);
    console.log('DEBUG: loupRank for', playerName + ':', loupRank);
    
    if (loupRank) {
      const achievement = createSeriesAchievement(
        `loup-series-${suffix ? 'modded' : 'all'}`,
        `🐺 Top ${loupRank.rank} Série Loup${suffix}`,
        `${loupRank.rank}${loupRank.rank === 1 ? 'ère' : 'ème'} plus longue série Loup: ${loupRank.value} parties consécutives (min. 2)`,
        'good',
        loupRank.rank,
        loupRank.value,
        topLoupSeries.length,
        {
          tab: 'players',
          subTab: 'series',
          chartSection: 'loup-series'
        }
      );
      
      console.log('DEBUG: Created Loup achievement:', achievement);
      achievements.push(achievement);
    } else {
      console.log('DEBUG: No loupRank found for', playerName);
    }
  } else {
    console.log('DEBUG: No allLoupsSeries data');
  }

  console.log('DEBUG: Final achievements for', playerName + ':', achievements.length);
  return achievements;
}

// Test for Lutti
console.log('\n=== TESTING LUTTI ===');
const luttiAchievements = processSeriesAchievements(mockSeriesData, 'Lutti', '');
console.log('Lutti achievements:', luttiAchievements);

// Test for player not in series
console.log('\n=== TESTING PLAYER NOT IN SERIES ===');
const nonPlayerAchievements = processSeriesAchievements(mockSeriesData, 'PlayerNotInSeries', '');
console.log('Non-player achievements:', nonPlayerAchievements);

// Test with no series data
console.log('\n=== TESTING NO SERIES DATA ===');
const noDataAchievements = processSeriesAchievements(null, 'Lutti', '');
console.log('No data achievements:', noDataAchievements);