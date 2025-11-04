import fs from 'fs/promises';
import path from 'path';

// Import all processors
import { processGeneralAchievements } from './processors/general-achievements.js';
import { processHistoryAchievements } from './processors/history-achievements.js';
import { processComparisonAchievements } from './processors/comparison-achievements.js';
import { processKillsAchievements } from './processors/kills-achievements.js';
import { processPerformanceAchievements } from './processors/performance-achievements.js';
import { processSeriesAchievements } from './processors/series-achievements.js';
import { processVotingAchievements } from './processors/voting-achievements.js';

// Import compute functions
import {
  computePlayerStats,
  computeMapStats,
  computePlayerGameHistory,
  computeDeathStatistics,
  computePlayerCampPerformance,
  computePlayerSeriesData,
  computeVotingStatistics
} from './compute-stats.js';

// Import player identification utilities
import { getPlayerId } from '../../src/utils/datasyncExport.js';

// Import data source configuration
import { DATA_SOURCES } from './shared/data-sources.js';

// Default data directory relative to project root (two levels up from scripts/data-sync/)
const DATA_DIR = '../../data';
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

  // Compute voting statistics
  const allGamesVotingStats = computeVotingStatistics(allGames);
  const moddedOnlyVotingStats = computeVotingStatistics(moddedGames);

  // Get all unique players by ID
  const allPlayersMap = new Map();
  allGames.forEach(game => {
    game.PlayerStats.forEach(player => {
      const playerId = getPlayerId(player);
      if (!allPlayersMap.has(playerId)) {
        allPlayersMap.set(playerId, player.Username);
      }
    });
  });

  // Generate achievements for each player
  const playerAchievements = {};

  allPlayersMap.forEach((playerName, playerId) => {
    const allGamesAchievements = [
      ...processGeneralAchievements(allGamesStats.playerStats, playerId, ''),
      ...processHistoryAchievements(allGamesMapStats, playerId, ''),
      ...processComparisonAchievements(allGamesStats.playerStats, allGames, playerId, ''),
      ...processKillsAchievements(allGamesDeathStats, playerId, ''),
      ...processPerformanceAchievements(allGamesCampStats, allGames, playerId, ''),
      ...processSeriesAchievements(allGamesSeriesData, playerId, ''),
      ...processVotingAchievements(allGamesVotingStats, playerId, '')
    ];
    
    const moddedOnlyAchievements = [
      ...processGeneralAchievements(moddedOnlyStats.playerStats, playerId, ' (Parties Moddées)'),
      ...processHistoryAchievements(moddedOnlyMapStats, playerId, ' (Parties Moddées)'),
      ...processComparisonAchievements(moddedOnlyStats.playerStats, moddedGames, playerId, ' (Parties Moddées)'),
      ...processKillsAchievements(moddedOnlyDeathStats, playerId, ' (Parties Moddées)'),
      ...processPerformanceAchievements(moddedOnlyCampStats, moddedGames, playerId, ' (Parties Moddées)'),
      ...processSeriesAchievements(moddedOnlySeriesData, playerId, ' (Parties Moddées)'),
      ...processVotingAchievements(moddedOnlyVotingStats, playerId, ' (Parties Moddées)')
    ];

    // Use playerId as the key in achievements object
    playerAchievements[playerId] = {
      playerId: playerId,
      playerName: playerName, // Keep playerName for reference
      allGamesAchievements,
      moddedOnlyAchievements
    };
  });

  return {
    totalPlayers: allPlayersMap.size,
    totalGames: allGames.length,
    totalModdedGames: moddedGames.length,
    achievements: playerAchievements
  };
}

/**
 * Main function to generate achievements
 * @param {string} sourceKey - Data source key (e.g., 'main', 'discord')
 */
async function main(sourceKey = 'main') {
  try {
    // Get configuration for the specified data source
    const config = DATA_SOURCES[sourceKey];
    if (!config) {
      throw new Error(`Unknown data source: ${sourceKey}. Available sources: ${Object.keys(DATA_SOURCES).join(', ')}`);
    }

    // Resolve path - works from project root (GitHub Actions) or script directory
    const dataDir = path.resolve(process.cwd(), config.outputDir);

    console.log(`🏆 Starting achievements generation for ${config.name}...`);

    // Read game log data
    const gameLogPath = path.join(dataDir, 'gameLog.json');
    console.log(`📖 Reading game log from: ${gameLogPath}`);
    
    const gameLogContent = await fs.readFile(gameLogPath, 'utf-8');
    const gameLogData = JSON.parse(gameLogContent);

    console.log(`📊 Processing ${gameLogData.TotalRecords} games...`);

    // Generate achievements
    const achievementsData = generateAllPlayerAchievements(gameLogData);

    // Save achievements data
    const achievementsPath = path.join(dataDir, 'playerAchievements.json');
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
  // Get data source from command line argument (default: 'main')
  const sourceKey = process.argv[2] || 'main';
  main(sourceKey);
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