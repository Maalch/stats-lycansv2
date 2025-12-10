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

// Import compute functions from modular files
import { computePlayerStats, updatePlayerStatsIncremental } from './compute/compute-player-stats.js';
import { computeMapStats } from './compute/compute-map-stats.js';
import { computePlayerGameHistory } from './compute/compute-player-history.js';
import { computeDeathStatistics } from './compute/compute-death-stats.js';
import { computePlayerCampPerformance } from './compute/compute-camp-performance.js';
import { computePlayerSeriesData, updatePlayerSeriesDataIncremental } from './compute/compute-series-data.js';
import { computeVotingStatistics } from './compute/compute-voting-stats.js';
import { computeHunterStatistics } from './compute/compute-hunter-stats.js';

// Import incremental compute wrappers
import {
  updateDeathStatisticsIncremental,
  updateVotingStatisticsIncremental,
  updateHunterStatisticsIncremental,
  updateMapStatsIncremental,
  updatePlayerCampPerformanceIncremental
} from './compute/incremental-compute-wrapper.js';

// Import player identification utilities
import { getPlayerId } from '../../src/utils/datasyncExport.js';

// Import data source configuration
import { DATA_SOURCES } from './shared/data-sources.js';

// Import cache manager
import { 
  loadCache, 
  saveCache, 
  detectNewGames, 
  getAffectedPlayers,
  ensurePlayerInCache,
  createEmptyCache
} from './shared/cache-manager.js';

// Default data directory relative to project root (two levels up from scripts/data-sync/)
const DATA_DIR = '../../data';
const ABSOLUTE_DATA_DIR = path.resolve(process.cwd(), DATA_DIR);

/**
 * Generate achievements for all players (full recalculation)
 * @param {Object} gameLogData - Game log data from JSON file
 * @param {boolean} returnCache - Whether to return cache structure
 * @returns {Object} - Object with achievements (and optionally cache) for all players
 */
function generateAllPlayerAchievements(gameLogData, returnCache = false) {
  // Filter out corrupted games without EndDate
  const validGames = (gameLogData.GameStats || []).filter(game => {
    if (!game.EndDate) {
      return false;
    }
    return true;
  });
  
  const allGames = validGames;
  const moddedGames = allGames.filter(game => game.Modded === true);

  console.log(`  Computing statistics for ${allGames.length} games (${moddedGames.length} modded)...`);

  // Compute statistics
  const allGamesStats = computePlayerStats(allGames);
  const moddedOnlyStats = computePlayerStats(moddedGames);
  
  // Compute map statistics
  const allGamesMapStats = computeMapStats(allGames);
  const moddedOnlyMapStats = computeMapStats(moddedGames);

  // Compute death statistics
  const allGamesDeathStats = computeDeathStatistics(allGames);
  const moddedOnlyDeathStats = computeDeathStatistics(moddedGames);

  // Compute hunter statistics
  const allGamesHunterStats = computeHunterStatistics(allGames);
  const moddedOnlyHunterStats = computeHunterStatistics(moddedGames);

  // Compute camp performance statistics
  const allGamesCampStats = computePlayerCampPerformance(allGames);
  const moddedOnlyCampStats = computePlayerCampPerformance(moddedGames);

  // Compute series statistics
  const allGamesSeriesData = computePlayerSeriesData(allGames);
  const moddedOnlySeriesData = computePlayerSeriesData(moddedGames);

  // Compute voting statistics
  const allGamesVotingStats = computeVotingStatistics(allGames);
  const moddedOnlyVotingStats = computeVotingStatistics(moddedGames);

  console.log(`  Generating achievements for ${allGamesStats.playerStats.length} players...`);

  const achievements = generateAchievementsFromStats(
    allGames,
    moddedGames,
    allGamesStats,
    moddedOnlyStats,
    allGamesMapStats,
    moddedOnlyMapStats,
    allGamesDeathStats,
    moddedOnlyDeathStats,
    allGamesHunterStats,
    moddedOnlyHunterStats,
    allGamesCampStats,
    moddedOnlyCampStats,
    allGamesSeriesData,
    moddedOnlySeriesData,
    allGamesVotingStats,
    moddedOnlyVotingStats
  );
  
  // Build cache structure if requested
  if (returnCache) {
    const cache = createEmptyCache();
    
    // Store all computed statistics for both datasets
    cache.allGames.totalGames = allGames.length;
    cache.allGames.playerStats = convertPlayerStatsToCache(allGamesStats.playerStats);
    cache.allGames.seriesState = extractSeriesState(allGamesSeriesData);
    cache.allGames.mapStats = allGamesMapStats;
    cache.allGames.deathStats = allGamesDeathStats;
    cache.allGames.hunterStats = allGamesHunterStats;
    cache.allGames.campStats = allGamesCampStats;
    cache.allGames.votingStats = allGamesVotingStats;
    
    cache.moddedGames.totalGames = moddedGames.length;
    cache.moddedGames.playerStats = convertPlayerStatsToCache(moddedOnlyStats.playerStats);
    cache.moddedGames.seriesState = extractSeriesState(moddedOnlySeriesData);
    cache.moddedGames.mapStats = moddedOnlyMapStats;
    cache.moddedGames.deathStats = moddedOnlyDeathStats;
    cache.moddedGames.hunterStats = moddedOnlyHunterStats;
    cache.moddedGames.campStats = moddedOnlyCampStats;
    cache.moddedGames.votingStats = moddedOnlyVotingStats;
    
    return { achievements, updatedCache: cache };
  }

  return achievements;
}

/**
 * Generate achievements for all players using incremental computation
 * @param {Object} gameLogData - Game log data from JSON file
 * @param {Object} cache - Existing cache object
 * @returns {Object} - Object with achievements for all players and updated cache
 */
function generateAllPlayerAchievementsIncremental(gameLogData, cache) {
  // Filter out corrupted games without EndDate
  const validGames = (gameLogData.GameStats || []).filter(game => {
    if (!game.EndDate) {
      return false;
    }
    return true;
  });
  
  const allGames = validGames;
  const moddedGames = allGames.filter(game => game.Modded === true);

  // Detect new games for both datasets
  const allGamesDetection = detectNewGames(allGames, cache.allGames);
  const moddedGamesDetection = detectNewGames(moddedGames, cache.moddedGames);

  const hasNewAllGames = allGamesDetection.newGames.length > 0;
  const hasNewModdedGames = moddedGamesDetection.newGames.length > 0;

  console.log(`  Incremental processing:`);
  console.log(`    All games: ${allGamesDetection.newGames.length} new (${allGames.length} total)`);
  console.log(`    Modded games: ${moddedGamesDetection.newGames.length} new (${moddedGames.length} total)`);

  // Compute statistics incrementally or use cached values
  let allGamesStats, moddedOnlyStats;
  let allGamesMapStats, moddedOnlyMapStats;
  let allGamesDeathStats, moddedOnlyDeathStats;
  let allGamesHunterStats, moddedOnlyHunterStats;
  let allGamesCampStats, moddedOnlyCampStats;
  let allGamesSeriesData, moddedOnlySeriesData;
  let allGamesVotingStats, moddedOnlyVotingStats;

  // All games dataset
  if (hasNewAllGames) {
    console.log(`    Computing updated stats for all games...`);
    
    allGamesStats = updatePlayerStatsIncremental(
      cache.allGames.playerStats, 
      allGamesDetection.newGames, 
      allGames.length
    );
    
    allGamesMapStats = updateMapStatsIncremental(cache.allGames.mapStats, allGames);
    allGamesDeathStats = updateDeathStatisticsIncremental(cache.allGames.deathStats, allGames);
    allGamesHunterStats = updateHunterStatisticsIncremental(cache.allGames.hunterStats, allGames);
    allGamesCampStats = updatePlayerCampPerformanceIncremental(cache.allGames.campStats, allGames);
    
    allGamesSeriesData = updatePlayerSeriesDataIncremental(
      cache.allGames.seriesState,
      allGamesDetection.newGames,
      cache.allGames.totalGames,
      allGames.length
    );
    
    allGamesVotingStats = updateVotingStatisticsIncremental(cache.allGames.votingStats, allGames);
    
    // Update cache for all games - store ALL computed statistics
    cache.allGames.totalGames = allGames.length;
    cache.allGames.playerStats = convertPlayerStatsToCache(allGamesStats.playerStats);
    cache.allGames.seriesState = extractSeriesState(allGamesSeriesData);
    cache.allGames.mapStats = allGamesMapStats;
    cache.allGames.deathStats = allGamesDeathStats;
    cache.allGames.hunterStats = allGamesHunterStats;
    cache.allGames.campStats = allGamesCampStats;
    cache.allGames.votingStats = allGamesVotingStats;
  } else {
    console.log(`    Using cached stats for all games (no new games, zero computation!)`);
    
    // TRUE zero-computation path - use all cached values
    allGamesStats = { 
      totalGames: allGames.length, 
      playerStats: Object.values(cache.allGames.playerStats) 
    };
    allGamesMapStats = cache.allGames.mapStats || [];
    allGamesDeathStats = cache.allGames.deathStats || { playerDeathStats: [], playerKillStats: [] };
    allGamesHunterStats = cache.allGames.hunterStats || [];
    allGamesCampStats = cache.allGames.campStats || [];
    allGamesSeriesData = computePlayerSeriesData(allGames); // Reconstruct from series state (fast)
    allGamesVotingStats = cache.allGames.votingStats || { playerBehavior: [], playerAccuracy: [], playerTargets: [] };
  }

  // Modded games dataset
  if (hasNewModdedGames) {
    console.log(`    Computing updated stats for modded games...`);
    
    moddedOnlyStats = updatePlayerStatsIncremental(
      cache.moddedGames.playerStats,
      moddedGamesDetection.newGames,
      moddedGames.length
    );
    
    moddedOnlyMapStats = updateMapStatsIncremental(cache.moddedGames.mapStats, moddedGames);
    moddedOnlyDeathStats = updateDeathStatisticsIncremental(cache.moddedGames.deathStats, moddedGames);
    moddedOnlyHunterStats = updateHunterStatisticsIncremental(cache.moddedGames.hunterStats, moddedGames);
    moddedOnlyCampStats = updatePlayerCampPerformanceIncremental(cache.moddedGames.campStats, moddedGames);
    
    moddedOnlySeriesData = updatePlayerSeriesDataIncremental(
      cache.moddedGames.seriesState,
      moddedGamesDetection.newGames,
      cache.moddedGames.totalGames,
      moddedGames.length
    );
    
    moddedOnlyVotingStats = updateVotingStatisticsIncremental(cache.moddedGames.votingStats, moddedGames);
    
    // Update cache for modded games - store ALL computed statistics
    cache.moddedGames.totalGames = moddedGames.length;
    cache.moddedGames.playerStats = convertPlayerStatsToCache(moddedOnlyStats.playerStats);
    cache.moddedGames.seriesState = extractSeriesState(moddedOnlySeriesData);
    cache.moddedGames.mapStats = moddedOnlyMapStats;
    cache.moddedGames.deathStats = moddedOnlyDeathStats;
    cache.moddedGames.hunterStats = moddedOnlyHunterStats;
    cache.moddedGames.campStats = moddedOnlyCampStats;
    cache.moddedGames.votingStats = moddedOnlyVotingStats;
  } else {
    console.log(`    Using cached stats for modded games (no new games, zero computation!)`);
    
    // TRUE zero-computation path - use all cached values
    moddedOnlyStats = { 
      totalGames: moddedGames.length, 
      playerStats: Object.values(cache.moddedGames.playerStats) 
    };
    moddedOnlyMapStats = cache.moddedGames.mapStats || [];
    moddedOnlyDeathStats = cache.moddedGames.deathStats || { playerDeathStats: [], playerKillStats: [] };
    moddedOnlyHunterStats = cache.moddedGames.hunterStats || [];
    moddedOnlyCampStats = cache.moddedGames.campStats || [];
    moddedOnlySeriesData = computePlayerSeriesData(moddedGames); // Reconstruct from series state (fast)
    moddedOnlyVotingStats = cache.moddedGames.votingStats || { playerBehavior: [], playerAccuracy: [], playerTargets: [] };
  }

  console.log(`  Generating achievements for ${allGamesStats.playerStats.length} players...`);

  const achievements = generateAchievementsFromStats(
    allGames,
    moddedGames,
    allGamesStats,
    moddedOnlyStats,
    allGamesMapStats,
    moddedOnlyMapStats,
    allGamesDeathStats,
    moddedOnlyDeathStats,
    allGamesHunterStats,
    moddedOnlyHunterStats,
    allGamesCampStats,
    moddedOnlyCampStats,
    allGamesSeriesData,
    moddedOnlySeriesData,
    allGamesVotingStats,
    moddedOnlyVotingStats
  );

  return { achievements, updatedCache: cache };
}

/**
 * Generate achievements from computed statistics (shared by full and incremental)
 * @returns {Object} - Achievements object
 */
function generateAchievementsFromStats(
  allGames,
  moddedGames,
  allGamesStats,
  moddedOnlyStats,
  allGamesMapStats,
  moddedOnlyMapStats,
  allGamesDeathStats,
  moddedOnlyDeathStats,
  allGamesHunterStats,
  moddedOnlyHunterStats,
  allGamesCampStats,
  moddedOnlyCampStats,
  allGamesSeriesData,
  moddedOnlySeriesData,
  allGamesVotingStats,
  moddedOnlyVotingStats
) {
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
      ...processKillsAchievements(allGamesDeathStats, allGamesHunterStats, playerId, ''),
      ...processPerformanceAchievements(allGamesCampStats, allGames, playerId, ''),
      ...processSeriesAchievements(allGamesSeriesData, playerId, ''),
      ...processVotingAchievements(allGamesVotingStats, playerId, '')
    ];
    
    const moddedOnlyAchievements = [
      ...processGeneralAchievements(moddedOnlyStats.playerStats, playerId, ' (Parties Moddées)'),
      ...processHistoryAchievements(moddedOnlyMapStats, playerId, ' (Parties Moddées)'),
      ...processComparisonAchievements(moddedOnlyStats.playerStats, moddedGames, playerId, ' (Parties Moddées)'),
      ...processKillsAchievements(moddedOnlyDeathStats, moddedOnlyHunterStats, playerId, ' (Parties Moddées)'),
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
 * Convert player stats array to cache format (object keyed by playerId)
 * @param {Array} playerStatsArray - Array of player stats
 * @returns {Object} - Cache format { [playerId]: stats }
 */
function convertPlayerStatsToCache(playerStatsArray) {
  const cache = {};
  playerStatsArray.forEach(stats => {
    cache[stats.playerId] = stats;
  });
  return cache;
}

/**
 * Extract series state from series data for caching
 * @param {Object} seriesData - Series data from compute function
 * @returns {Object} - Series state for cache
 */
function extractSeriesState(seriesData) {
  // For now, return empty object - series state is handled within the compute function
  // In a more sophisticated implementation, we'd extract and store the current series state
  return {};
}

/**
 * Main function to generate achievements
 * @param {string} sourceKey - Data source key (e.g., 'main', 'discord')
 * @param {boolean} forceFullRecalculation - Force full recalculation even if cache exists
 */
async function main(sourceKey = 'main', forceFullRecalculation = false) {
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

    let achievementsData;
    let updatedCache = null;
    let cache = null; // Declare cache in outer scope

    // Check if we should use incremental mode
    if (forceFullRecalculation) {
      console.log(`🔄 Full recalculation forced (--force-full flag)`);
      const result = generateAllPlayerAchievements(gameLogData, true); // Request cache
      achievementsData = result.achievements;
      updatedCache = result.updatedCache;
    } else {
      // Try incremental mode
      console.log(`📦 Loading cache for incremental processing...`);
      cache = await loadCache(dataDir);
      
      // Check if cache is empty (first run)
      if (cache.allGames.totalGames === 0) {
        console.log(`  No cache found - performing full calculation...`);
        const result = generateAllPlayerAchievements(gameLogData, true); // Request cache
        achievementsData = result.achievements;
        updatedCache = result.updatedCache;
      } else {
        console.log(`  Cache loaded - attempting incremental update...`);
        const result = generateAllPlayerAchievementsIncremental(gameLogData, cache);
        achievementsData = result.achievements;
        updatedCache = result.updatedCache;
      }
    }

    // Save achievements data
    const achievementsPath = path.join(dataDir, 'playerAchievements.json');
    await fs.writeFile(achievementsPath, JSON.stringify(achievementsData, null, 2));

    console.log(`✅ Achievements generated successfully!`);
    console.log(`   - Total players: ${achievementsData.totalPlayers}`);
    console.log(`   - Total games processed: ${achievementsData.totalGames}`);
    console.log(`   - Total modded games: ${achievementsData.totalModdedGames}`);
    console.log(`   - Achievements saved to: ${achievementsPath}`);

    // Save cache 
    if (updatedCache) {
      await saveCache(dataDir, updatedCache);
    }

    // Generate summary for verification
    // Try to find Ponce first, otherwise use first player
    let samplePlayer = Object.keys(achievementsData.achievements).find(playerId => {
      return achievementsData.achievements[playerId].playerName === 'Ponce';
    });
    if (!samplePlayer) {
      samplePlayer = Object.keys(achievementsData.achievements)[0];
    }
    
    if (samplePlayer) {
      const sampleAchievements = achievementsData.achievements[samplePlayer];
      console.log(`\n📝 Sample achievements for "${sampleAchievements.playerName}":`);
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
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  // Check for --force-full flag
  const forceFullIdx = args.findIndex(arg => arg === '--force-full' || arg === '-f');
  const forceFullRecalculation = forceFullIdx !== -1;
  
  // Remove flag from args
  if (forceFullIdx !== -1) {
    args.splice(forceFullIdx, 1);
  }
  
  // Get data source from remaining arguments (default: 'main')
  const sourceKey = args[0] || 'main';
  
  main(sourceKey, forceFullRecalculation);
}

export { 
  generateAllPlayerAchievements,
  generateAllPlayerAchievementsIncremental,
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