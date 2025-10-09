import fs from 'fs/promises';
import path from 'path';

// Import all processors
import { processGeneralAchievements } from './processors/general-achievements.js';
import { processHistoryAchievements } from './processors/history-achievements.js';
import { processComparisonAchievements } from './processors/comparison-achievements.js';
import { processKillsAchievements } from './processors/kills-achievements.js';
import { processPerformanceAchievements } from './processors/performance-achievements.js';
import { processSeriesAchievements } from './processors/series-achievements.js';

// Import compute functions
import {
  computePlayerStats,
  computeMapStats,
  computePlayerGameHistory,
  computeDeathStatistics,
  computePlayerCampPerformance,
  computePlayerSeriesData
} from './compute-stats.js';

// Data directory relative to project root
const DATA_DIR = 'data';
const ABSOLUTE_DATA_DIR = path.resolve(process.cwd(), DATA_DIR);

/**
 * Generate achievements for all players
 * @param {Object} gameLogData - Game log data from JSON file
 * @returns {Object} - Object with achievements for all players
 */
function generateAllPlayerAchievements(gameLogData) {
  const allGames = gameLogData.GameStats || [];
  const moddedGames = allGames.filter(game => game.Modded === true);

  // Compute statistics
  const allGamesStats = computePlayerStats(allGames);
  const moddedOnlyStats = computePlayerStats(moddedGames);
  
  // Compute map statistics
  const allGamesMapStats = computeMapStats(allGames);
  const moddedOnlyMapStats = computeMapStats(moddedGames);

  // Compute death statistics
  const allGamesDeathStats = computeDeathStatistics(allGames);
  const moddedOnlyDeathStats = computeDeathStatistics(moddedGames);

  // Compute camp performance statistics
  const allGamesCampStats = computePlayerCampPerformance(allGames);
  const moddedOnlyCampStats = computePlayerCampPerformance(moddedGames);

  // Compute series statistics
  const allGamesSeriesData = computePlayerSeriesData(allGames);
  const moddedOnlySeriesData = computePlayerSeriesData(moddedGames);

  // Get all unique players
  const allPlayers = new Set();
  allGames.forEach(game => {
    game.PlayerStats.forEach(player => {
      allPlayers.add(player.Username);
    });
  });

  // Generate achievements for each player
  const playerAchievements = {};

  allPlayers.forEach(playerName => {
    const allGamesAchievements = [
      ...processGeneralAchievements(allGamesStats.playerStats, playerName, ''),
      ...processHistoryAchievements(allGamesMapStats, playerName, ''),
      ...processComparisonAchievements(allGamesStats.playerStats, allGames, playerName, ''),
      ...processKillsAchievements(allGamesDeathStats, playerName, ''),
      ...processPerformanceAchievements(allGamesCampStats, allGames, playerName, ''),
      ...processSeriesAchievements(allGamesSeriesData, playerName, '')
    ];
    
    const moddedOnlyAchievements = [
      ...processGeneralAchievements(moddedOnlyStats.playerStats, playerName, ' (Parties Moddées)'),
      ...processHistoryAchievements(moddedOnlyMapStats, playerName, ' (Parties Moddées)'),
      ...processComparisonAchievements(moddedOnlyStats.playerStats, moddedGames, playerName, ' (Parties Moddées)'),
      ...processKillsAchievements(moddedOnlyDeathStats, playerName, ' (Parties Moddées)'),
      ...processPerformanceAchievements(moddedOnlyCampStats, moddedGames, playerName, ' (Parties Moddées)'),
      ...processSeriesAchievements(moddedOnlySeriesData, playerName, ' (Parties Moddées)')
    ];

    playerAchievements[playerName] = {
      playerId: playerName,
      allGamesAchievements,
      moddedOnlyAchievements
    };
  });

  return {
    totalPlayers: allPlayers.size,
    totalGames: allGames.length,
    totalModdedGames: moddedGames.length,
    achievements: playerAchievements
  };
}

/**
 * Main function to generate achievements
 */
async function main() {
  try {
    console.log('🏆 Starting achievements generation...');

    // Read game log data
    const gameLogPath = path.join(ABSOLUTE_DATA_DIR, 'gameLog.json');
    console.log(`📖 Reading game log from: ${gameLogPath}`);
    
    const gameLogContent = await fs.readFile(gameLogPath, 'utf-8');
    const gameLogData = JSON.parse(gameLogContent);

    console.log(`📊 Processing ${gameLogData.TotalRecords} games...`);

    // Generate achievements
    const achievementsData = generateAllPlayerAchievements(gameLogData);

    // Save achievements data
    const achievementsPath = path.join(ABSOLUTE_DATA_DIR, 'playerAchievements.json');
    await fs.writeFile(achievementsPath, JSON.stringify(achievementsData, null, 2));

    console.log(`✅ Achievements generated successfully!`);
    console.log(`   - Total players: ${achievementsData.totalPlayers}`);
    console.log(`   - Total games processed: ${achievementsData.totalGames}`);
    console.log(`   - Total modded games: ${achievementsData.totalModdedGames}`);
    console.log(`   - Achievements saved to: ${achievementsPath}`);

    // Generate summary for verification
    const samplePlayer = Object.keys(achievementsData.achievements)[0];
    if (samplePlayer) {
      const sampleAchievements = achievementsData.achievements[samplePlayer];
      console.log(`\n📝 Sample achievements for "${samplePlayer}":`);
      console.log(`   - All games: ${sampleAchievements.allGamesAchievements.length} achievements`);
      console.log(`   - Modded only: ${sampleAchievements.moddedOnlyAchievements.length} achievements`);
      
      if (sampleAchievements.allGamesAchievements.length > 0) {
        console.log(`   - Example: ${sampleAchievements.allGamesAchievements[0].title}`);
      }
    }

  } catch (error) {
    console.error('❌ Achievement generation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if this script is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('generate-achievements.js')) {
  main();
}

export { 
  generateAllPlayerAchievements, 
  processGeneralAchievements, 
  processHistoryAchievements,
  processComparisonAchievements,
  processKillsAchievements,
  processPerformanceAchievements,
  processSeriesAchievements,
  computePlayerStats, 
  computeMapStats,
  computePlayerGameHistory,
  computeDeathStatistics,
  computePlayerCampPerformance,
  computePlayerSeriesData
};