/**
 * Unified AWS data sync script
 * Supports multiple data sources via configuration
 */
import path from 'path';
import { generateAllPlayerAchievements } from './generate-achievements.js';
import { DATA_SOURCES } from './shared/data-sources.js';
import {
  ensureDataDirectory,
  fetchStatsListUrls,
  fetchGameLogData,
  mergeAWSGameLogs,
  saveDataToFile,
  createDataIndex,
  generateJoueursFromGameLog,
  createPlaceholderFiles
} from './shared/sync-utils.js';

/**
 * Main sync function
 * @param {string} sourceKey - Key from DATA_SOURCES config
 */
async function syncDataSource(sourceKey) {
  const config = DATA_SOURCES[sourceKey];
  
  if (!config) {
    throw new Error(`Unknown data source: ${sourceKey}`);
  }
  
  const ABSOLUTE_DATA_DIR = path.resolve(process.cwd(), config.outputDir);
  
  console.log(`🚀 Starting Lycans ${config.name} data sync (AWS-only)...`);
  console.log(`📁 Data directory: ${ABSOLUTE_DATA_DIR}`);

  try {
    await ensureDataDirectory(ABSOLUTE_DATA_DIR);

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

    // === MERGE AND SAVE UNIFIED DATA ===
    console.log(`\n🔄 Creating unified dataset from AWS sources (${config.name})...`);
    const unifiedGameLog = await mergeAWSGameLogs(awsGameLogs, config);
    
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
    
    console.log(`\n✅ ${config.name} data sync completed successfully!`);
    console.log(`📊 Total games processed: ${unifiedGameLog.TotalRecords}`);
    console.log(`   - AWS: ${unifiedGameLog.Sources.AWS} games from ${awsGameLogs.length} files`);
    console.log(`📁 Output folder: ${config.outputDir}`);
    
  } catch (error) {
    console.error(`❌ ${config.name} data sync failed:`, error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const sourceKey = args[0] || 'main';

// Validate source key
if (!DATA_SOURCES[sourceKey]) {
  console.error(`❌ Unknown data source: ${sourceKey}`);
  console.log(`Available sources: ${Object.keys(DATA_SOURCES).join(', ')}`);
  process.exit(1);
}

syncDataSource(sourceKey);
