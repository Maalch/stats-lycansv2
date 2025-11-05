/**
 * Simple script to verify color statistics calculations
 * Run with: node verify-color-stats.cjs
 */

const fs = require('fs');
const path = require('path');

// Read the game log data
const gameLogPath = path.join(__dirname, 'data', 'gameLog.json');
const gameLog = JSON.parse(fs.readFileSync(gameLogPath, 'utf8'));

console.log('🎨 Analyzing Color Statistics...\n');

// Map to track color stats
const colorMap = new Map();

// Process each game
gameLog.GameStats.forEach(game => {
  const colorsInThisGame = new Set();

  game.PlayerStats.forEach(player => {
    const color = player.Color;
    
    if (!color) return;

    if (!colorMap.has(color)) {
      colorMap.set(color, {
        gamesWithColor: new Set(),
        totalPlayerInstances: 0,
        totalWins: 0
      });
    }

    const colorStats = colorMap.get(color);
    colorsInThisGame.add(color);
    colorStats.totalPlayerInstances++;
    
    if (player.Victorious) {
      colorStats.totalWins++;
    }
  });

  colorsInThisGame.forEach(color => {
    colorMap.get(color).gamesWithColor.add(game.Id);
  });
});

// Calculate and display results
const results = Array.from(colorMap.entries()).map(([color, stats]) => {
  const totalGames = stats.gamesWithColor.size;
  const winRate = stats.totalPlayerInstances > 0 
    ? (stats.totalWins / stats.totalPlayerInstances) * 100 
    : 0;
  const avgPlayersPerGame = totalGames > 0 
    ? stats.totalPlayerInstances / totalGames 
    : 0;

  return {
    color,
    totalGames,
    totalPlayers: stats.totalPlayerInstances,
    totalWins: stats.totalWins,
    winRate: winRate.toFixed(2),
    avgPlayersPerGame: avgPlayersPerGame.toFixed(2)
  };
});

// Sort by win rate
results.sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));

// Display results
console.log('📊 Color Statistics Summary:');
console.log('═══════════════════════════════════════════════════════════\n');

results.forEach((stat, index) => {
  console.log(`${index + 1}. ${stat.color}`);
  console.log(`   Win Rate: ${stat.winRate}%`);
  console.log(`   Avg Players/Game: ${stat.avgPlayersPerGame}`);
  console.log(`   Total Games: ${stat.totalGames}`);
  console.log(`   Total Players: ${stat.totalPlayers}`);
  console.log(`   Total Wins: ${stat.totalWins}`);
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════');
console.log(`\n✅ Analysis complete! Found ${results.length} different colors.`);

// Find most popular color
const mostPopular = [...results].sort((a, b) => 
  parseFloat(b.avgPlayersPerGame) - parseFloat(a.avgPlayersPerGame)
)[0];
console.log(`🏆 Most used color: ${mostPopular.color} (${mostPopular.avgPlayersPerGame} players/game)`);

// Find best win rate
const bestWinRate = results[0];
console.log(`🎯 Best win rate: ${bestWinRate.color} (${bestWinRate.winRate}%)`);
