const fs = require('fs');
const path = require('path');

// Read the game log data
const gameLogPath = path.resolve('data/gameLog.json');
const gameLogData = JSON.parse(fs.readFileSync(gameLogPath, 'utf8'));

console.log('=== CHECKING GAME DATA FORMAT ===');
const firstGame = gameLogData.GameStats[0];
console.log('First game structure:');
console.log('DisplayedId:', firstGame.DisplayedId);
console.log('StartDate:', firstGame.StartDate);
console.log('StartDate type:', typeof firstGame.StartDate);

// Let's also check a few more games
console.log('\nFirst 5 games:');
gameLogData.GameStats.slice(0, 5).forEach(game => {
  console.log(`Game ${game.DisplayedId}: StartDate = "${game.StartDate}"`);
});

// Check if dates are actually dates or strings
const sampleDate = firstGame.StartDate;
console.log('\nDate parsing test:');
console.log('Original:', sampleDate);
console.log('new Date():', new Date(sampleDate));
console.log('toLocaleDateString:', new Date(sampleDate).toLocaleDateString('fr-FR', {
  day: '2-digit',
  month: '2-digit', 
  year: 'numeric'
}));