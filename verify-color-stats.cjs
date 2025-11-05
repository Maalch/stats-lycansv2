const fs = require('fs');
const path = require('path');

// Read the game log data
const gameLogPath = path.join(__dirname, 'data', 'gameLog.json');
const gameLog = JSON.parse(fs.readFileSync(gameLogPath, 'utf8'));

// Compute color statistics (same logic as colorStatsUtils.ts)
function computeColorStats(gameData) {
  const totalGamesCount = gameData.length;
  const colorMap = new Map();

  gameData.forEach(game => {
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

  const colorStats = Array.from(colorMap.entries()).map(([color, stats]) => {
    const totalGames = stats.gamesWithColor.size;
    const winRate = stats.totalPlayerInstances > 0 
      ? (stats.totalWins / stats.totalPlayerInstances) * 100 
      : 0;
    // avgPlayersPerGame now uses total games count
    const avgPlayersPerGame = totalGamesCount > 0 
      ? stats.totalPlayerInstances / totalGamesCount 
      : 0;

    return {
      color,
      totalGames,
      totalPlayers: stats.totalPlayerInstances,
      totalWins: stats.totalWins,
      winRate,
      avgPlayersPerGame
    };
  });

  return colorStats.sort((a, b) => b.winRate - a.winRate);
}

// Compute statistics
const colorStats = computeColorStats(gameLog.GameStats);

console.log('🎨 Analyzing Color Statistics...\n');
console.log(`📊 Color Statistics Summary (Total Games: ${gameLog.GameStats.length}):`);
console.log('═══════════════════════════════════════════════════════════\n');

colorStats.forEach((stat, index) => {
  console.log(`${index + 1}. ${stat.color}`);
  console.log(`   Win Rate: ${stat.winRate.toFixed(2)}%`);
  console.log(`   Avg Players/Game: ${stat.avgPlayersPerGame.toFixed(2)}`);
  console.log(`   Games with Color: ${stat.totalGames}`);
  console.log(`   Total Players: ${stat.totalPlayers}`);
  console.log(`   Total Wins: ${stat.totalWins}`);
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log(`✅ Analysis complete! Found ${colorStats.length} different colors.`);

// Find most used color
const mostUsed = colorStats.reduce((max, stat) => 
  stat.avgPlayersPerGame > max.avgPlayersPerGame ? stat : max
);
console.log(`🏆 Most used color: ${mostUsed.color} (${mostUsed.avgPlayersPerGame.toFixed(2)} players/game)`);

// Find best win rate
const bestWinRate = colorStats[0]; // Already sorted by win rate
console.log(`🎯 Best win rate: ${bestWinRate.color} (${bestWinRate.winRate.toFixed(2)}%)`);
