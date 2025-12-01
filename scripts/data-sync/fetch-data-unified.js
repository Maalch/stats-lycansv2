/**
 * Unified AWS data sync script
 * Supports multiple data sources via configuration
 * 
 * Incremental sync mode:
 * - Keeps existing gameLog.json
 * - Only fetches and adds new games
 * - Updates games from the last 6 hours (to ensure completeness)
 */
import path from 'path';
import fs from 'fs/promises';
import { generateAllPlayerAchievements } from './generate-achievements.js';
import { DATA_SOURCES } from './shared/data-sources.js';
import {
  ensureDataDirectory,
  fetchStatsListUrls,
  fetchGameLogData,
  saveDataToFile,
  createDataIndex,
  generateJoueursFromGameLog,
  createPlaceholderFiles
} from './shared/sync-utils.js';

// Time window for updating recent games (6 hours in milliseconds)
const RECENT_GAMES_WINDOW_MS = 6 * 60 * 60 * 1000;

/**
 * Load existing gameLog.json if it exists
 * @param {string} absoluteDataDir - Path to data directory
 * @returns {Object|null} - Existing game log or null
 */
async function loadExistingGameLog(absoluteDataDir) {
  const gameLogPath = path.join(absoluteDataDir, 'gameLog.json');
  
  try {
    const content = await fs.readFile(gameLogPath, 'utf8');
    const gameLog = JSON.parse(content);
    console.log(`✓ Loaded existing gameLog.json with ${gameLog.TotalRecords} games`);
    return gameLog;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️  No existing gameLog.json found - will perform full sync');
      return null;
    }
    console.error('⚠️  Failed to load existing gameLog.json:', error.message);
    console.log('ℹ️  Will perform full sync');
    return null;
  }
}

/**
 * Build a map of existing games with their EndDate for quick lookup
 * @param {Object} existingGameLog - Existing game log data
 * @returns {Map} - Map of gameId -> game data
 */
function buildExistingGamesMap(existingGameLog) {
  const gamesMap = new Map();
  
  if (existingGameLog?.GameStats) {
    existingGameLog.GameStats.forEach(game => {
      gamesMap.set(game.Id, game);
    });
  }
  
  return gamesMap;
}

/**
 * Check if a game should be updated (is within the recent time window)
 * @param {Object} game - Game data
 * @param {Date} cutoffDate - Cutoff date for recent games
 * @returns {boolean} - True if game is recent and should be updated
 */
function isRecentGame(game, cutoffDate) {
  if (!game.EndDate) return false;
  
  const gameEndDate = new Date(game.EndDate);
  return gameEndDate >= cutoffDate;
}

/**
 * Merge AWS game logs with incremental updates
 * @param {Array} awsGameLogs - Array of game log objects from AWS
 * @param {Object} config - Configuration object with filtering options
 * @param {Map} existingGamesMap - Map of existing games
 * @param {Date} cutoffDate - Cutoff date for recent games
 * @returns {Object} - Merge result with stats
 */
function mergeWithIncremental(awsGameLogs, config, existingGamesMap, cutoffDate) {
  console.log(`🔄 Processing AWS game logs with incremental merge...`);
  
  let newGamesCount = 0;
  let updatedGamesCount = 0;
  let skippedGamesCount = 0;
  let filteredGamesCount = 0;
  let corruptedGamesCount = 0;
  
  // Start with existing games (will be overwritten for recent ones)
  const gamesByIdMap = new Map(existingGamesMap);
  
  // Track which existing games are "recent" and should be replaced
  const recentExistingGameIds = new Set();
  for (const [gameId, game] of existingGamesMap) {
    if (isRecentGame(game, cutoffDate)) {
      recentExistingGameIds.add(gameId);
    }
  }
  
  if (recentExistingGameIds.size > 0) {
    console.log(`📋 Found ${recentExistingGameIds.size} recent games (last 6 hours) that may be updated`);
  }
  
  // Process all AWS game logs
  for (const gameLog of awsGameLogs) {
    if (gameLog.GameStats && Array.isArray(gameLog.GameStats)) {
      gameLog.GameStats.forEach(awsGame => {
        const gameId = awsGame.Id;
        
        // Filter out corrupted games without EndDate
        if (!awsGame.EndDate) {
          corruptedGamesCount++;
          return;
        }
        
        // Apply filter if provided
        if (config.gameFilter && !config.gameFilter(gameId)) {
          filteredGamesCount++;
          return;
        }
        
        const existingGame = existingGamesMap.get(gameId);
        const isRecent = isRecentGame(awsGame, cutoffDate);
        
        if (!existingGame) {
          // New game - add it
          const gameWithMetadata = {
            ...awsGame,
            Version: gameLog.ModVersion,
            Modded: true
          };
          gamesByIdMap.set(gameId, gameWithMetadata);
          newGamesCount++;
        } else if (isRecent || recentExistingGameIds.has(gameId)) {
          // Recent game - update it (might have new data)
          const gameWithMetadata = {
            ...awsGame,
            Version: gameLog.ModVersion,
            Modded: true,
            // Preserve legacy data if it exists
            ...(existingGame.LegacyData && { LegacyData: existingGame.LegacyData })
          };
          gamesByIdMap.set(gameId, gameWithMetadata);
          updatedGamesCount++;
        } else {
          // Old game already exists - skip
          skippedGamesCount++;
        }
      });
    }
  }
  
  // Convert map back to array
  const allGameStats = Array.from(gamesByIdMap.values());
  
  // Sort by StartDate to maintain chronological order
  allGameStats.sort((a, b) => new Date(a.StartDate) - new Date(b.StartDate));
  
  return {
    gameStats: allGameStats,
    stats: {
      newGames: newGamesCount,
      updatedGames: updatedGamesCount,
      skippedGames: skippedGamesCount,
      filteredGames: filteredGamesCount,
      corruptedGames: corruptedGamesCount,
      totalGames: allGameStats.length
    }
  };
}

/**
 * Main sync function
 * @param {string} sourceKey - Key from DATA_SOURCES config
 * @param {boolean} forceFullSync - Force a full sync instead of incremental
 */
async function syncDataSource(sourceKey, forceFullSync = false) {
  const config = DATA_SOURCES[sourceKey];
  
  if (!config) {
    throw new Error(`Unknown data source: ${sourceKey}`);
  }
  
  const ABSOLUTE_DATA_DIR = path.resolve(process.cwd(), config.outputDir);
  
  console.log(`🚀 Starting Lycans ${config.name} data sync...`);
  console.log(`📁 Data directory: ${ABSOLUTE_DATA_DIR}`);
  console.log(`📋 Sync mode: ${forceFullSync ? 'FULL (forced)' : 'INCREMENTAL'}`);

  try {
    await ensureDataDirectory(ABSOLUTE_DATA_DIR);

    // === LOAD EXISTING DATA ===
    let existingGameLog = null;
    let existingGamesMap = new Map();
    
    if (!forceFullSync) {
      existingGameLog = await loadExistingGameLog(ABSOLUTE_DATA_DIR);
      if (existingGameLog) {
        existingGamesMap = buildExistingGamesMap(existingGameLog);
      }
    }
    
    const isIncrementalSync = existingGamesMap.size > 0;
    const cutoffDate = new Date(Date.now() - RECENT_GAMES_WINDOW_MS);
    
    if (isIncrementalSync) {
      console.log(`\n📅 Incremental sync: will update games newer than ${cutoffDate.toISOString()}`);
    }

    // === FETCH AWS DATA ===
    console.log(`\n📦 Fetching ${config.name} data from S3 bucket...`);
    const gameLogUrls = await fetchStatsListUrls(config.name);
    
    if (gameLogUrls.length === 0) {
      throw new Error('No game log files found in AWS S3 bucket');
    }
    
    const awsGameLogs = [];
    console.log(`📦 Fetching ${gameLogUrls.length} AWS game log files...`);
    
    for (const url of gameLogUrls) {
      try {
        const gameLog = await fetchGameLogData(url);
        awsGameLogs.push(gameLog);
        
        // Small delay between requests to be respectful to S3
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Failed to fetch AWS game log ${url}:`, err.message);
        // Continue with other files - don't fail entire sync for one file
      }
    }
    
    if (awsGameLogs.length === 0) {
      throw new Error('Failed to fetch any AWS game log files');
    }
    
    console.log(`✓ Successfully fetched ${awsGameLogs.length} AWS game log files`);

    // === MERGE DATA ===
    console.log(`\n🔄 Creating unified dataset from AWS sources (${config.name})...`);
    
    const mergeResult = mergeWithIncremental(awsGameLogs, config, existingGamesMap, cutoffDate);
    
    // Build unified game log structure
    const unifiedGameLog = {
      ModVersion: config.modVersionLabel || "Multiple AWS Versions",
      TotalRecords: mergeResult.stats.totalGames,
      Sources: {
        Legacy: existingGameLog?.Sources?.Legacy || 0,
        AWS: mergeResult.stats.totalGames - (existingGameLog?.Sources?.Legacy || 0),
        Merged: existingGameLog?.Sources?.Merged || 0
      },
      LastSync: new Date().toISOString(),
      GameStats: mergeResult.gameStats
    };
    
    await saveDataToFile(ABSOLUTE_DATA_DIR, 'gameLog.json', unifiedGameLog);
    
    // Generate or create placeholder joueurs.json
    if (config.generateJoueurs) {
      await generateJoueursFromGameLog(ABSOLUTE_DATA_DIR, unifiedGameLog, config.name);
    } else {
      await createPlaceholderFiles(ABSOLUTE_DATA_DIR);
    }
    
    // Create data index
    await createDataIndex(
      ABSOLUTE_DATA_DIR, 
      awsGameLogs.length, 
      unifiedGameLog.TotalRecords,
      config.indexDescription
    );
    
    // === GENERATE ACHIEVEMENTS ===
    console.log(`\n🏆 Generating player achievements (${config.name})...`);
    try {
      const achievementsData = generateAllPlayerAchievements(unifiedGameLog);
      await saveDataToFile(ABSOLUTE_DATA_DIR, 'playerAchievements.json', achievementsData);
      console.log(`✓ Generated achievements for ${achievementsData.totalPlayers} players`);
    } catch (error) {
      console.error('❌ Failed to generate achievements:', error.message);
      // Don't fail the entire sync for achievements generation failure
    }
    
    // === SUMMARY ===
    console.log(`\n✅ ${config.name} data sync completed successfully!`);
    console.log(`📊 Sync summary:`);
    console.log(`   - New games added: ${mergeResult.stats.newGames}`);
    console.log(`   - Recent games updated: ${mergeResult.stats.updatedGames}`);
    console.log(`   - Existing games unchanged: ${mergeResult.stats.skippedGames}`);
    if (mergeResult.stats.filteredGames > 0) {
      console.log(`   - Games filtered out: ${mergeResult.stats.filteredGames}`);
    }
    if (mergeResult.stats.corruptedGames > 0) {
      console.log(`   - Corrupted games skipped: ${mergeResult.stats.corruptedGames}`);
    }
    console.log(`   - Total games: ${mergeResult.stats.totalGames}`);
    console.log(`📁 Output folder: ${config.outputDir}`);
    
  } catch (error) {
    console.error(`❌ ${config.name} data sync failed:`, error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const sourceKey = args.find(arg => !arg.startsWith('--')) || 'main';
const forceFullSync = args.includes('--full') || args.includes('-f');

// Validate source key
if (!DATA_SOURCES[sourceKey]) {
  console.error(`❌ Unknown data source: ${sourceKey}`);
  console.log(`Available sources: ${Object.keys(DATA_SOURCES).join(', ')}`);
  console.log(`\nUsage: node fetch-data-unified.js [source] [--full]`);
  console.log(`  source: ${Object.keys(DATA_SOURCES).join(' | ')} (default: main)`);
  console.log(`  --full, -f: Force full sync instead of incremental`);
  process.exit(1);
}

syncDataSource(sourceKey, forceFullSync);
