const fs = require('fs');
const path = require('path');

// Read the game log data
const gameLogPath = path.resolve('data/gameLog.json');
const gameLogData = JSON.parse(fs.readFileSync(gameLogPath, 'utf8'));

// Helper function to get player's main camp from role name
function getPlayerMainCampFromRole(roleName) {
  if (!roleName) return 'Villageois';
  
  // Apply the same logic as getPlayerCampFromRole
  const loupRoles = ['Loup', 'Traître'];
  
  if (loupRoles.includes(roleName)) {
    return 'Loup';
  } else if (roleName === 'Villageois') {
    return 'Villageois';
  } else {
    return 'Autres';
  }
}

// Let's track a few players manually to see their camp sequences
const allGames = gameLogData.GameStats || [];
const sortedGames = [...allGames].sort((a, b) => parseInt(a.DisplayedId) - parseInt(b.DisplayedId));

console.log('debug-loup-series.cjs');
console.log('Total games:', sortedGames.length);

// Let's focus on the first few players and track their sequences
const playerSequences = {};
let loupRoleCount = 0;
let villageoisRoleCount = 0;

sortedGames.slice(0, 100).forEach((game, index) => {
  if (game.PlayerStats) {
    game.PlayerStats.forEach(player => {
      const playerName = player.Username;
      const mainCamp = getPlayerMainCampFromRole(player.MainRoleInitial);
      
      if (!playerSequences[playerName]) {
        playerSequences[playerName] = [];
      }
      
      playerSequences[playerName].push({
        game: game.DisplayedId,
        role: player.MainRoleInitial,
        camp: mainCamp
      });
      
      if (mainCamp === 'Loup') loupRoleCount++;
      if (mainCamp === 'Villageois') villageoisRoleCount++;
    });
  }
});

console.log('First 100 games:');
console.log('- Loup roles:', loupRoleCount);
console.log('- Villageois roles:', villageoisRoleCount);
console.log('- Ratio Loup/Villageois:', (loupRoleCount / villageoisRoleCount).toFixed(2));

// Now let's check for Loup series
console.log('\n=== LOUP SERIES ANALYSIS ===');
const playerLoupSeries = {};

Object.entries(playerSequences).forEach(([playerName, sequence]) => {
  let currentLoupSeries = 0;
  let longestLoupSeries = 0;
  let loupSeriesDetails = [];
  
  sequence.forEach((game, index) => {
    if (game.camp === 'Loup') {
      currentLoupSeries++;
    } else {
      if (currentLoupSeries > 0) {
        loupSeriesDetails.push({
          length: currentLoupSeries,
          startGame: sequence[index - currentLoupSeries].game,
          endGame: sequence[index - 1].game
        });
        longestLoupSeries = Math.max(longestLoupSeries, currentLoupSeries);
      }
      currentLoupSeries = 0;
    }
  });
  
  // Check if series continues to the end
  if (currentLoupSeries > 0) {
    loupSeriesDetails.push({
      length: currentLoupSeries,
      startGame: sequence[sequence.length - currentLoupSeries].game,
      endGame: sequence[sequence.length - 1].game
    });
    longestLoupSeries = Math.max(longestLoupSeries, currentLoupSeries);
  }
  
  if (longestLoupSeries >= 2) {
    playerLoupSeries[playerName] = {
      longestSeries: longestLoupSeries,
      allSeries: loupSeriesDetails,
      totalGames: sequence.length
    };
  }
});

console.log('Players with Loup series >= 2:');
Object.entries(playerLoupSeries).forEach(([playerName, data]) => {
  console.log(`- ${playerName}: longest ${data.longestSeries} games (${data.totalGames} total games)`);
  data.allSeries.forEach(series => {
    console.log(`  * ${series.length} games: ${series.startGame} to ${series.endGame}`);
  });
});

if (Object.keys(playerLoupSeries).length === 0) {
  console.log('NO PLAYERS found with Loup series >= 2 in first 100 games');
  console.log('\nLet\'s check some individual sequences:');
  
  // Show first few players' sequences
  Object.entries(playerSequences).slice(0, 3).forEach(([playerName, sequence]) => {
    console.log(`\n${playerName} (${sequence.length} games):`);
    sequence.forEach(game => {
      console.log(`  Game ${game.game}: ${game.role} (${game.camp})`);
    });
  });
}