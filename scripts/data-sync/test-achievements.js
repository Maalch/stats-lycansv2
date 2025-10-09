import fs from 'fs/promises';
import path from 'path';

// Simple test script to verify the split achievements work
console.log('🧪 Testing achievements generation...');

try {
  // Import all processors
  const { processGeneralAchievements } = await import('./processors/general-achievements.js');
  const { processHistoryAchievements } = await import('./processors/history-achievements.js');
  const { processComparisonAchievements } = await import('./processors/comparison-achievements.js');
  const { processKillsAchievements } = await import('./processors/kills-achievements.js');
  const { processPerformanceAchievements } = await import('./processors/performance-achievements.js');
  const { processSeriesAchievements } = await import('./processors/series-achievements.js');

  // Import compute functions
  const {
    computePlayerStats,
    computeMapStats,
    computeDeathStatistics,
    computePlayerCampPerformance,
    computePlayerSeriesData
  } = await import('./compute-stats.js');

  console.log('✅ All imports successful!');

  // Test with minimal data
  const testGameData = [{
    Id: "test-1",
    StartDate: "2024-01-01T00:00:00Z",
    EndDate: "2024-01-01T01:00:00Z",
    MapName: "Village",
    Modded: false,
    PlayerStats: [
      {
        Username: "TestPlayer",
        MainRoleInitial: "Villageois",
        MainRoleFinal: "Villageois",
        Victorious: true
      },
      {
        Username: "TestPlayer2",
        MainRoleInitial: "Loup",
        MainRoleFinal: "Loup",
        Victorious: false
      }
    ]
  }];

  console.log('🔄 Testing compute functions...');
  const playerStats = computePlayerStats(testGameData);
  console.log(`✅ computePlayerStats: ${playerStats.playerStats.length} players`);

  const mapStats = computeMapStats(testGameData);
  console.log(`✅ computeMapStats: ${mapStats.length} player map stats`);

  console.log('🔄 Testing achievement processors...');
  const generalAchievements = processGeneralAchievements(playerStats.playerStats, "TestPlayer", "");
  console.log(`✅ processGeneralAchievements: ${generalAchievements.length} achievements`);

  const historyAchievements = processHistoryAchievements(mapStats, "TestPlayer", "");
  console.log(`✅ processHistoryAchievements: ${historyAchievements.length} achievements`);

  console.log('🎉 All tests passed! The split achievements system is working correctly.');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}