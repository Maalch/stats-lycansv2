import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { generateAllPlayerAchievements } from './generate-achievements.js';

// Data directory relative to project root
const DATA_DIR = '../../data';
const ABSOLUTE_DATA_DIR = path.resolve(process.cwd(), DATA_DIR);

async function ensureDataDirectory() {
  try {
    await fs.access(ABSOLUTE_DATA_DIR);
  } catch {
    await fs.mkdir(ABSOLUTE_DATA_DIR, { recursive: true });
    console.log(`Created data directory: ${ABSOLUTE_DATA_DIR}`);
  }
}

async function fetchStatsListUrls() {
  const statsListUrl = process.env.STATS_LIST_URL;
  
  if (!statsListUrl) {
    throw new Error('STATS_LIST_URL environment variable not found');
  }

  console.log('Fetching stats list from AWS S3 (Discord Team)...');
  
  try {
    const response = await fetch(statsListUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const urls = await response.json();
    console.log(`✓ Found ${urls.length} files in stats list`);
    
    // Filter out the StatsList.json itself to get only game log files
    const gameLogUrls = urls.filter(url => !url.includes('StatsList.json'));
    console.log(`✓ Found ${gameLogUrls.length} game log files to process`);
    
    return gameLogUrls;
  } catch (error) {
    console.error('Failed to fetch stats list:', error.message);
    throw error;
  }
}

async function fetchGameLogData(url) {
  console.log(`Fetching game log: ${path.basename(url)}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✓ Fetched game log with ${data.GameStats?.length || 0} games`);
    
    return data;
  } catch (error) {
    console.error(`Failed to fetch game log ${url}:`, error.message);
    throw error;
  }
}

async function mergeAWSGameLogs(awsGameLogs) {
  console.log('Processing AWS game logs into unified structure (Discord Team)...');
  
  const gamesByIdMap = new Map();
  let totalGamesProcessed = 0;
  
  // Process all AWS game logs
  for (const gameLog of awsGameLogs) {
    if (gameLog.GameStats && Array.isArray(gameLog.GameStats)) {
      gameLog.GameStats.forEach(awsGame => {
        const gameId = awsGame.Id;
        
        // Check if game already exists (from another mod version file)
        if (gamesByIdMap.has(gameId)) {
          console.log(`⚠️  Duplicate game ID ${gameId} found - keeping first occurrence`);
        } else {
          // Add game with mod version metadata
          const gameWithMetadata = {
            ...awsGame,
            Version: gameLog.ModVersion,
            Modded: true
          };
          gamesByIdMap.set(gameId, gameWithMetadata);
          totalGamesProcessed++;
        }
      });
    }
  }
  
  console.log(`✓ Processed ${totalGamesProcessed} unique games from ${awsGameLogs.length} AWS files`);
  
  // Convert map back to array
  const allGameStats = Array.from(gamesByIdMap.values());
  
  // Sort by StartDate to maintain chronological order
  allGameStats.sort((a, b) => new Date(a.StartDate) - new Date(b.StartDate));
  
  const unifiedGameLog = {
    ModVersion: "Discord Team - Multiple AWS Versions",
    TotalRecords: allGameStats.length,
    Sources: {
      Legacy: 0,
      AWS: totalGamesProcessed,
      Merged: 0
    },
    GameStats: allGameStats
  };
  
  return unifiedGameLog;
}

async function saveDataToFile(filename, data) {
  const filepath = path.join(ABSOLUTE_DATA_DIR, filename);
  
  try {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(filepath, jsonData, 'utf8');
    console.log(`✓ Saved data to ${filename}`);
  } catch (error) {
    console.error(`Failed to save ${filename}:`, error.message);
    throw error;
  }
}

async function createDataIndex(awsFilesCount, totalGames) {
  const indexData = {
    sources: {
      legacy: "Not available (AWS-only sync for Discord Team)",
      aws: `${awsFilesCount} files from S3 bucket`,
      unified: "gameLog_TeamDiscord.json (AWS sources only)"
    },
    description: "Game logs from AWS S3 bucket for Discord Team. Updated periodically via GitHub Actions.",
    totalGames: totalGames
  };

  const indexPath = path.join(ABSOLUTE_DATA_DIR, 'index_TeamDiscord.json');
  await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
  console.log('✓ Created data index (Discord Team)');
}

async function createPlaceholderFiles() {
  console.log('Creating placeholder files for legacy data (Discord Team)...');
  
  // Create placeholder Legacy gameLog
  const emptyLegacyGameLog = {
    ModVersion: "No Legacy Data",
    TotalRecords: 0,
    Sources: { Legacy: 0, AWS: 0, Merged: 0 },
    GameStats: [],
    description: "Legacy data not available in AWS-only sync mode (Discord Team)"
  };
  await saveDataToFile('gameLog-Legacy_TeamDiscord.json', emptyLegacyGameLog);
  
  // Create placeholder BR data
  const emptyBRData = {
    description: "Battle Royale data not available in AWS-only sync mode (Discord Team)",
    data: []
  };
  await saveDataToFile('rawBRData_TeamDiscord.json', emptyBRData);
  
  // Create placeholder Joueurs data
  const emptyJoueursData = {
    TotalRecords: 0,
    Players: [],
    description: "Player data not available in AWS-only sync mode (Discord Team)"
  };
  await saveDataToFile('joueurs_TeamDiscord.json', emptyJoueursData);
  
  console.log('✓ Created placeholder files (Discord Team)');
}

async function main() {
  console.log('🚀 Starting Lycans Discord Team data sync (AWS-only)...');
  console.log(`📁 Data directory: ${ABSOLUTE_DATA_DIR}`);

  try {
    await ensureDataDirectory();

    // === FETCH AWS DATA ===
    console.log('\n📦 Fetching Discord Team data from S3 bucket...');
    const gameLogUrls = await fetchStatsListUrls();
    
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
    console.log('\n🔄 Creating unified dataset from AWS sources (Discord Team)...');
    const unifiedGameLog = await mergeAWSGameLogs(awsGameLogs);
    
    // Save to gameLog_TeamDiscord.json instead of gameLog.json
    await saveDataToFile('gameLog_TeamDiscord.json', unifiedGameLog);
    
    // Create placeholder files for legacy data sources
    await createPlaceholderFiles();
    
    // Create data index
    await createDataIndex(awsGameLogs.length, unifiedGameLog.TotalRecords);
    
    // === GENERATE ACHIEVEMENTS ===
    console.log('\n🏆 Generating player achievements (Discord Team)...');
    try {
      const achievementsData = generateAllPlayerAchievements(unifiedGameLog);
      await saveDataToFile('playerAchievements_TeamDiscord.json', achievementsData);
      console.log(`✓ Generated achievements for ${achievementsData.totalPlayers} players`);
    } catch (error) {
      console.error('❌ Failed to generate achievements:', error.message);
      // Don't fail the entire sync for achievements generation failure
    }
    
    console.log('\n✅ Discord Team data sync completed successfully!');
    console.log(`📊 Total games processed: ${unifiedGameLog.TotalRecords}`);
    console.log(`   - AWS: ${unifiedGameLog.Sources.AWS} games from ${awsGameLogs.length} files`);
    console.log(`📝 Output file: gameLog_TeamDiscord.json`);
    console.log(`📝 Placeholder files created for legacy data sources`);
  } catch (error) {
    console.error('❌ Discord Team data sync failed:', error.message);
    process.exit(1);
  }
}

main();
