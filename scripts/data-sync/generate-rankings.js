import fs from 'fs/promises';
import path from 'path';

// Import all processors
import { processGeneralRankings } from './processors/general-rankings.js';
import { processHistoryRankings } from './processors/history-rankings.js';
import { processComparisonRankings } from './processors/comparison-rankings.js';
import { processKillsRankings } from './processors/kills-rankings.js';
import { processPerformanceRankings } from './processors/performance-rankings.js';
import { processSeriesRankings } from './processors/series-rankings.js';
import { processVotingRankings } from './processors/voting-rankings.js';
import { processCommunicationRankings } from './processors/communication-rankings.js';
import { processLootRankings } from './processors/loot-rankings.js';

// Import compute functions from modular files
import { computePlayerStats, updatePlayerStatsIncremental } from './compute/compute-player-stats.js';
import { computeMapStats } from './compute/compute-map-stats.js';
import { computePlayerGameHistory } from './compute/compute-player-history.js';
import { computeDeathStatistics } from './compute/compute-death-stats.js';
import { computePlayerCampPerformance } from './compute/compute-camp-performance.js';
import { computePlayerSeriesData, updatePlayerSeriesDataIncremental } from './compute/compute-series-data.js';
import { computeVotingStatistics } from './compute/compute-voting-stats.js';
import { computeHunterStatistics } from './compute/compute-hunter-stats.js';
import { computeTalkingTimeStats } from './compute/compute-talking-stats.js';

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
  createEmptyCache
} from './shared/cache-manager.js';

// Default data directory relative to project root (two levels up from scripts/data-sync/)
const DATA_DIR = '../../data';
const ABSOLUTE_DATA_DIR = path.resolve(process.cwd(), DATA_DIR);

/**
 * Generate Rankings for all players (full recalculation)
 * @param {Object} gameLogData - Game log data from JSON file
 * @param {boolean} returnCache - Whether to return cache structure
 * @returns {Object} - Object with Rankings (and optionally cache) for all players
 */
function generateAllPlayerRankings(gameLogData, returnCache = false) {
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

  // Compute talking time statistics
  const allGamesTalkingStats = computeTalkingTimeStats(allGames);
  const moddedOnlyTalkingStats = computeTalkingTimeStats(moddedGames);

  console.log(`  Generating Rankings for ${allGamesStats.playerStats.length} players...`);

  const Rankings = generateRankingsFromStats(
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
    moddedOnlyVotingStats,
    allGamesTalkingStats,
    moddedOnlyTalkingStats
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
    
    return { Rankings, updatedCache: cache };
  }

  return Rankings;
}

/**
 * Generate Rankings for all players using incremental computation
 * @param {Object} gameLogData - Game log data from JSON file
 * @param {Object} cache - Existing cache object
 * @returns {Object} - Object with Rankings for all players and updated cache
 */
function generateAllPlayerRankingsIncremental(gameLogData, cache) {
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
  let allGamesTalkingStats, moddedOnlyTalkingStats;

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
    
    // Recompute talking stats (always full recalculation for simplicity)
    allGamesTalkingStats = computeTalkingTimeStats(allGames);
    
    // Update cache for all games - store ALL computed statistics
    cache.allGames.totalGames = allGames.length;
    cache.allGames.playerStats = convertPlayerStatsToCache(allGamesStats.playerStats);
    cache.allGames.seriesState = extractSeriesState(allGamesSeriesData);
    cache.allGames.mapStats = allGamesMapStats;
    cache.allGames.deathStats = allGamesDeathStats;
    cache.allGames.hunterStats = allGamesHunterStats;
    cache.allGames.campStats = allGamesCampStats;
    cache.allGames.votingStats = allGamesVotingStats;
    cache.allGames.talkingStats = allGamesTalkingStats;
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
    allGamesTalkingStats = cache.allGames.talkingStats || { playerStats: [], totalGames: 0, gamesWithTalkingData: 0 };
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
    
    // Recompute talking stats (always full recalculation for simplicity)
    moddedOnlyTalkingStats = computeTalkingTimeStats(moddedGames);
    
    // Update cache for modded games - store ALL computed statistics
    cache.moddedGames.totalGames = moddedGames.length;
    cache.moddedGames.playerStats = convertPlayerStatsToCache(moddedOnlyStats.playerStats);
    cache.moddedGames.seriesState = extractSeriesState(moddedOnlySeriesData);
    cache.moddedGames.mapStats = moddedOnlyMapStats;
    cache.moddedGames.deathStats = moddedOnlyDeathStats;
    cache.moddedGames.hunterStats = moddedOnlyHunterStats;
    cache.moddedGames.campStats = moddedOnlyCampStats;
    cache.moddedGames.votingStats = moddedOnlyVotingStats;
    cache.moddedGames.talkingStats = moddedOnlyTalkingStats;
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
    moddedOnlyTalkingStats = cache.moddedGames.talkingStats || { playerStats: [], totalGames: 0, gamesWithTalkingData: 0 };
  }

  console.log(`  Generating Rankings for ${allGamesStats.playerStats.length} players...`);

  const Rankings = generateRankingsFromStats(
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
    moddedOnlyVotingStats,
    allGamesTalkingStats,
    moddedOnlyTalkingStats
  );

  return { Rankings, updatedCache: cache };
}

/**
 * Generate Rankings from computed statistics (shared by full and incremental)
 * @returns {Object} - Rankings object
 */
function generateRankingsFromStats(
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
  moddedOnlyVotingStats,
  allGamesTalkingStats,
  moddedOnlyTalkingStats
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

  // Generate Rankings for each player
  const playerRankings = {};

  allPlayersMap.forEach((playerName, playerId) => {
    const allGamesRankings = [
      ...processGeneralRankings(allGamesStats.playerStats, playerId, ''),
      ...processHistoryRankings(allGamesMapStats, playerId, ''),
      ...processComparisonRankings(allGamesStats.playerStats, allGames, playerId, ''),
      ...processKillsRankings(allGamesDeathStats, allGamesHunterStats, playerId, ''),
      ...processPerformanceRankings(allGamesCampStats, allGames, playerId, ''),
      ...processSeriesRankings(allGamesSeriesData, playerId, ''),
      ...processVotingRankings(allGamesVotingStats, playerId, ''),
      ...processCommunicationRankings(allGamesTalkingStats, playerId, ''),
      ...processLootRankings(allGames, playerId, '')
    ];
    
    const moddedOnlyRankings = [
      ...processGeneralRankings(moddedOnlyStats.playerStats, playerId, ' (Parties Moddées)'),
      ...processHistoryRankings(moddedOnlyMapStats, playerId, ' (Parties Moddées)'),
      ...processComparisonRankings(moddedOnlyStats.playerStats, moddedGames, playerId, ' (Parties Moddées)'),
      ...processKillsRankings(moddedOnlyDeathStats, moddedOnlyHunterStats, playerId, ' (Parties Moddées)'),
      ...processPerformanceRankings(moddedOnlyCampStats, moddedGames, playerId, ' (Parties Moddées)'),
      ...processSeriesRankings(moddedOnlySeriesData, playerId, ' (Parties Moddées)'),
      ...processVotingRankings(moddedOnlyVotingStats, playerId, ' (Parties Moddées)'),
      ...processCommunicationRankings(moddedOnlyTalkingStats, playerId, ' (Parties Moddées)'),
      ...processLootRankings(moddedGames, playerId, ' (Parties Moddées)')
    ];

    // Use playerId as the key in Rankings object
    playerRankings[playerId] = {
      playerId: playerId,
      playerName: playerName, // Keep playerName for reference
      allGamesRankings,
      moddedOnlyRankings
    };
  });

  return {
    totalPlayers: allPlayersMap.size,
    totalGames: allGames.length,
    totalModdedGames: moddedGames.length,
    Rankings: playerRankings
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
 * Main function to generate Rankings
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

    console.log(`🏆 Starting Rankings generation for ${config.name}...`);

    // Read game log data
    const gameLogPath = path.join(dataDir, 'gameLog.json');
    console.log(`📖 Reading game log from: ${gameLogPath}`);
    
    const gameLogContent = await fs.readFile(gameLogPath, 'utf-8');
    const gameLogData = JSON.parse(gameLogContent);

    console.log(`📊 Processing ${gameLogData.TotalRecords} games...`);

    let RankingsData;
    let updatedCache = null;
    let cache = null; // Declare cache in outer scope

    // Check if we should use incremental mode
    if (forceFullRecalculation) {
      console.log(`🔄 Full recalculation forced (--force-full flag)`);
      const result = generateAllPlayerRankings(gameLogData, true); // Request cache
      RankingsData = result.Rankings;
      updatedCache = result.updatedCache;
    } else {
      // Try incremental mode
      console.log(`📦 Loading cache for incremental processing...`);
      cache = await loadCache(dataDir);
      
      // Check if cache is empty (first run)
      if (cache.allGames.totalGames === 0) {
        console.log(`  No cache found - performing full calculation...`);
        const result = generateAllPlayerRankings(gameLogData, true); // Request cache
        RankingsData = result.Rankings;
        updatedCache = result.updatedCache;
      } else {
        console.log(`  Cache loaded - attempting incremental update...`);
        const result = generateAllPlayerRankingsIncremental(gameLogData, cache);
        RankingsData = result.Rankings;
        updatedCache = result.updatedCache;
      }
    }

    // Save Rankings data
    const RankingsPath = path.join(dataDir, 'playerRankings.json');
    await fs.writeFile(RankingsPath, JSON.stringify(RankingsData, null, 2));

    console.log(`✅ Rankings generated successfully!`);
    console.log(`   - Total players: ${RankingsData.totalPlayers}`);
    console.log(`   - Total games processed: ${RankingsData.totalGames}`);
    console.log(`   - Total modded games: ${RankingsData.totalModdedGames}`);
    console.log(`   - Rankings saved to: ${RankingsPath}`);

    // Save cache 
    if (updatedCache) {
      await saveCache(dataDir, updatedCache);
    }

    // Generate summary for verification
    // Try to find Ponce first, otherwise use first player
    let samplePlayer = Object.keys(RankingsData.Rankings).find(playerId => {
      return RankingsData.Rankings[playerId].playerName === 'Ponce';
    });
    if (!samplePlayer) {
      samplePlayer = Object.keys(RankingsData.Rankings)[0];
    }
    
    if (samplePlayer) {
      const sampleRankings = RankingsData.Rankings[samplePlayer];
      console.log(`\n📝 Sample Rankings for "${sampleRankings.playerName}":`);
      console.log(`   - All games: ${sampleRankings.allGamesRankings.length} Rankings`);
      console.log(`   - Modded only: ${sampleRankings.moddedOnlyRankings.length} Rankings`);
      
      if (sampleRankings.allGamesRankings.length > 0) {
        console.log(`   - Example: ${sampleRankings.allGamesRankings[0].title}`);
      }
    }

  } catch (error) {
    console.error('❌ Ranking generation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if this script is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('generate-rankings.js')) {
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
  generateAllPlayerRankings,
  generateAllPlayerRankingsIncremental,
  processGeneralRankings, 
  processHistoryRankings,
  processComparisonRankings,
  processKillsRankings,
  processPerformanceRankings,
  processSeriesRankings,
  processCommunicationRankings,
  processLootRankings,
  computePlayerStats, 
  computeMapStats,
  computePlayerGameHistory,
  computeDeathStatistics,
  computePlayerCampPerformance,
  computePlayerSeriesData,
  computeTalkingTimeStats
};