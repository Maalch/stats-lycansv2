import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

// Data sources
const LEGACY_DATA_ENDPOINTS = [
  'gameLog',
  'rawBRData'
];

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

async function fetchLegacyEndpointData(endpoint) {
  let apiBase = process.env.LYCANS_API_BASE;
  if (!apiBase) {
    console.warn('[legacy] LYCANS_API_BASE environment variable not found - skipping legacy data fetch');
    return null;
  }

  // Sanitize accidental trailing commas / spaces from workflow YAML or secrets UI
  const originalApiBase = apiBase;
  apiBase = apiBase.trim().replace(/[;,]+$/,'');
  if (apiBase !== originalApiBase) {
    console.log(`[legacy] Sanitized LYCANS_API_BASE from "${originalApiBase}" to "${apiBase}"`);
  }

  const url = `${apiBase}?action=${endpoint}`;
  console.log(`Fetching legacy ${endpoint} from ${apiBase}...`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✓ Fetched legacy ${endpoint} data`);
    return data;
  } catch (error) {
    console.error(`Failed to fetch legacy ${endpoint}:`, error.message);
    if (error.message.includes('ENOTFOUND')) {
      console.error('[legacy] DNS resolution failed - check LYCANS_API_BASE value.');
    }
    if (/HTTP 40[34]/.test(error.message)) {
      console.error('[legacy] Received 4xx error - endpoint may have changed or requires auth.');
    }
    return null;
  }
}

async function fetchStatsListUrls() {
  console.log('Fetching stats list from AWS S3...');
  
  try {
    const response = await fetch(process.env.STATS_LIST_URL);
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

async function mergeAllGameLogs(legacyGameLog, awsGameLogs) {
  console.log('Merging legacy and AWS game logs into unified structure...');
  
  const gamesByIdMap = new Map();
  let legacyCount = 0;
  let awsCount = 0;
  let mergedCount = 0;
  
  // Add legacy games to map first
  if (legacyGameLog && legacyGameLog.GameStats && Array.isArray(legacyGameLog.GameStats)) {
    legacyGameLog.GameStats.forEach(game => {
      gamesByIdMap.set(game.Id, {
        ...game,
        source: 'legacy'
      });
    });
    legacyCount = legacyGameLog.GameStats.length;
    console.log(`✓ Added ${legacyCount} legacy games to map`);
  }
  
  // Add AWS games, merging with legacy if same ID exists
  for (const gameLog of awsGameLogs) {
    if (gameLog.GameStats && Array.isArray(gameLog.GameStats)) {
      gameLog.GameStats.forEach(awsGame => {
        const gameId = awsGame.Id;
        const existingLegacyGame = gamesByIdMap.get(gameId);
        
        if (existingLegacyGame && existingLegacyGame.source === 'legacy') {
          // Merge: Use AWS data but preserve legacy Modded/Version/LegacyData
          const mergedGame = {
            ...awsGame,
            Version: existingLegacyGame.Version || gameLog.ModVersion,
            Modded: existingLegacyGame.Modded !== undefined ? existingLegacyGame.Modded : true,
            LegacyData: existingLegacyGame.LegacyData || undefined,
            source: 'merged'
          };
          gamesByIdMap.set(gameId, mergedGame);
          mergedCount++;
          console.log(`✓ Merged game ${gameId}: AWS data + legacy metadata`);
        } else {
          // Pure AWS game - add ModVersion and Modded flag
          const awsGameWithVersion = {
            ...awsGame,
            Version: gameLog.ModVersion,
            Modded: true,
            source: 'aws'
          };
          gamesByIdMap.set(gameId, awsGameWithVersion);
          awsCount++;
        }
      });
    }
  }
  
  // Convert map back to array and remove source tracking
  const allGameStats = Array.from(gamesByIdMap.values()).map(game => {
    const { source, ...gameWithoutSource } = game;
    return gameWithoutSource;
  });
  
  // Sort by StartDate to maintain chronological order
  allGameStats.sort((a, b) => new Date(a.StartDate) - new Date(b.StartDate));
  
  const mergedGameLog = {
    ModVersion: "Legacy + AWS",
    TotalRecords: allGameStats.length,
    Sources: {
      Legacy: legacyCount - mergedCount,
      AWS: awsCount,
      Merged: mergedCount
    },
    GameStats: allGameStats
  };
  
  
  return mergedGameLog;
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

async function createDataIndex(legacyAvailable, awsFilesCount, totalGames) {
  const indexData = {
    sources: {
      legacy: legacyAvailable ? "Available (gameLog-Legacy.json)" : "Not available",
      aws: `${awsFilesCount} files from S3 bucket`,
      unified: "gameLog.json (merged from all sources)"
    },
    description: "Game logs from multiple sources: Legacy Google Sheets API and AWS S3 bucket. Updated periodically via GitHub Actions.",
    totalGames: totalGames
  };

  const indexPath = path.join(ABSOLUTE_DATA_DIR, 'index.json');
  await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
  console.log('✓ Created data index');
}

async function main() {
  console.log('🚀 Starting Lycans data sync from multiple sources...');
  console.log(`📁 Data directory: ${ABSOLUTE_DATA_DIR}`);

  try {
    await ensureDataDirectory();

    // === FETCH LEGACY DATA ===
    console.log('\n📊 Fetching Legacy data from Google Sheets API...');
    let legacyGameLogData = null;
    let legacyBRData = null;
    
    for (const endpoint of LEGACY_DATA_ENDPOINTS) {
      try {
        const data = await fetchLegacyEndpointData(endpoint);
        if (data) {
          if (endpoint === 'gameLog') {
            legacyGameLogData = data;
            await saveDataToFile('gameLog-Legacy.json', data);
          } else if (endpoint === 'rawBRData') {
            legacyBRData = data;
            await saveDataToFile('rawBRData.json', data);
          }
        }
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`Failed to fetch legacy ${endpoint}:`, err.message);
      }
    }

    // === FETCH AWS DATA ===
    console.log('\n📦 Fetching AWS data from S3 bucket...');
    const gameLogUrls = await fetchStatsListUrls();
    
    const awsGameLogs = [];
    if (gameLogUrls.length > 0) {
      console.log(`📦 Fetching ${gameLogUrls.length} AWS game log files...`);
      
      for (const url of gameLogUrls) {
        try {
          const gameLog = await fetchGameLogData(url);
          awsGameLogs.push(gameLog);
          
          // Small delay between requests to be respectful to S3
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`Failed to fetch AWS game log ${url}:`, err.message);
          // Continue with other files
        }
      }
      
      console.log(`✓ Successfully fetched ${awsGameLogs.length} AWS game log files`);
    } else {
      console.log('⚠️  No AWS game log files found');
    }

    // === MERGE AND SAVE UNIFIED DATA ===
    console.log('\n🔄 Creating unified dataset...');
    const mergedGameLog = await mergeAllGameLogs(legacyGameLogData, awsGameLogs);
    await saveDataToFile('gameLog.json', mergedGameLog);
    
    // Create placeholder BR data if not fetched from legacy
    if (!legacyBRData) {
      const emptyBRData = {
        description: "Battle Royale data not available from current sources",
        data: []
      };
      await saveDataToFile('rawBRData.json', emptyBRData);
    }
    
    await createDataIndex(!!legacyGameLogData, awsGameLogs.length, mergedGameLog.TotalRecords);
    
    console.log('\n✅ Multi-source data sync completed successfully!');
    console.log(`📊 Total games processed: ${mergedGameLog.TotalRecords}`);
    console.log(`   - Legacy: ${mergedGameLog.Sources.Legacy} games`);
    console.log(`   - AWS: ${mergedGameLog.Sources.AWS} games`);
  } catch (error) {
    console.error('❌ Data sync failed:', error.message);
    process.exit(1);
  }
}

main();
