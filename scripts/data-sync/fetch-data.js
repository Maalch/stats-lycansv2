import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { generateAllPlayerAchievements } from './generate-achievements.js';
import { fetchStatsListUrls, fetchGameLogData } from './shared/sync-utils.js';

// Data sources
const LEGACY_DATA_ENDPOINTS = [
  'gameLog',
  'rawBRData',
  'joueurs'
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
    
    // Check if the response contains an error
    if (data && typeof data === 'object' && data.error) {
      console.error(`API returned error for ${endpoint}:`, data.error);
      return null;
    }
    
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
        
        // Filter: Only process Main Team games (Ponce- prefix)
        if (!gameId || !gameId.startsWith('Ponce-')) {
          return; // Skip non-Main Team games
        }
        
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
    ModVersion: awsCount > 0 ? "Legacy + AWS Merged" : "Legacy Only",
    TotalRecords: allGameStats.length,
    Sources: {
      Legacy: legacyCount,
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

async function mergeJoueursWithAWSPlayers(legacyJoueursData, awsGameLogs) {
  console.log('\n📋 Merging joueurs data with AWS game log players...');
  
  // Start with legacy joueurs data or empty structure
  const joueursData = legacyJoueursData ? JSON.parse(JSON.stringify(legacyJoueursData)) : {
    TotalRecords: 0,
    Players: []
  };
  
  // Create a map of existing players by Steam ID and username for quick lookup
  const existingPlayersBySteamID = new Map();
  const existingPlayersByUsername = new Map();
  
  joueursData.Players.forEach(player => {
    if (player.SteamID) {
      existingPlayersBySteamID.set(player.SteamID, player);
    }
    existingPlayersByUsername.set(player.Joueur, player);
  });
  
  // Track new players found in AWS data
  const newPlayersMap = new Map();
  const newPlayerStats = new Map(); // Track stats for color determination
  
  // Scan all AWS game logs for players (only Main Team games)
  awsGameLogs.forEach(gameLog => {
    if (gameLog.GameStats && Array.isArray(gameLog.GameStats)) {
      gameLog.GameStats.forEach(game => {
        // Filter: Only process Main Team games (Ponce- prefix)
        if (!game.Id || !game.Id.startsWith('Ponce-')) {
          return; // Skip non-Main Team games
        }
        
        if (game.PlayerStats && Array.isArray(game.PlayerStats)) {
          game.PlayerStats.forEach(playerStat => {
            const steamID = playerStat.ID || playerStat.Id;
            const username = playerStat.Username;
            const color = playerStat.Color;
            
            if (!steamID || !username) return;
            
            // Check if player exists in legacy data by Steam ID
            const existsByID = existingPlayersBySteamID.has(steamID);
            const existsByUsername = existingPlayersByUsername.has(username);
            
            if (!existsByID && !existsByUsername) {
              // New player not in legacy data
              if (!newPlayersMap.has(steamID)) {
                newPlayersMap.set(steamID, {
                  Joueur: username,
                  SteamID: steamID,
                  Image: null,
                  Twitch: null,
                  Youtube: null,
                  Couleur: "Gris" // Default, will be updated
                });
                newPlayerStats.set(steamID, { username, colors: {} });
              }
              
              // Track color usage for this new player
              const stats = newPlayerStats.get(steamID);
              stats.username = username; // Update to latest username
              if (color) {
                stats.colors[color] = (stats.colors[color] || 0) + 1;
              }
            }
          });
        }
      });
    }
  });
  
  // Add new players with their most common color
  let addedCount = 0;
  for (const [steamID, playerData] of newPlayersMap.entries()) {
    const stats = newPlayerStats.get(steamID);
    
    // Find most common color
    let mostCommonColor = "Gris";
    let maxCount = 0;
    for (const [color, count] of Object.entries(stats.colors)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonColor = color;
      }
    }
    
    playerData.Couleur = mostCommonColor;
    playerData.Joueur = stats.username; // Use latest username
    joueursData.Players.push(playerData);
    addedCount++;
  }
  
  // Sort players alphabetically
  joueursData.Players.sort((a, b) => a.Joueur.localeCompare(b.Joueur));
  
  // Update total count
  joueursData.TotalRecords = joueursData.Players.length;
  
  if (addedCount > 0) {
    console.log(`✓ Added ${addedCount} new players from AWS game logs`);
  } else {
    console.log('✓ No new players to add from AWS game logs');
  }
  
  return joueursData;
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
    let legacyJoueursData = null;
    
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
          } else if (endpoint === 'joueurs') {
            legacyJoueursData = data;
            await saveDataToFile('joueurs.json', data);
          }
        } else {
          console.warn(`⚠️  No valid data received for ${endpoint} - existing file will not be overwritten`);
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
    
    let mergedGameLog;
    if (legacyGameLogData) {
      // We have fresh data from API
      mergedGameLog = await mergeAllGameLogs(legacyGameLogData, awsGameLogs);
      await saveDataToFile('gameLog.json', mergedGameLog);
    } else {
      // No fresh data, try to use existing gameLog.json for achievements generation
      console.log('⚠️  No fresh data from API, attempting to use existing gameLog.json for achievements...');
      try {
        const existingGameLogPath = path.join(ABSOLUTE_DATA_DIR, 'gameLog.json');
        const existingGameLogContent = await fs.readFile(existingGameLogPath, 'utf-8');
        mergedGameLog = JSON.parse(existingGameLogContent);
        console.log(`✓ Using existing gameLog.json with ${mergedGameLog.TotalRecords} games`);
      } catch (error) {
        console.error('❌ Could not read existing gameLog.json:', error.message);
        // Create empty data structure
        mergedGameLog = {
          ModVersion: "No Data",
          TotalRecords: 0,
          Sources: { Legacy: 0, AWS: 0, Merged: 0 },
          GameStats: []
        };
        await saveDataToFile('gameLog.json', mergedGameLog);
      }
    }
    
    // Create placeholder BR data if not fetched from legacy
    if (!legacyBRData) {
      const emptyBRData = {
        description: "Battle Royale data not available from current sources",
        data: []
      };
      await saveDataToFile('rawBRData.json', emptyBRData);
    }
    
    // Merge joueurs data with AWS players
    const mergedJoueursData = await mergeJoueursWithAWSPlayers(legacyJoueursData, awsGameLogs);
    await saveDataToFile('joueurs.json', mergedJoueursData);
    
    await createDataIndex(!!legacyGameLogData, awsGameLogs.length, mergedGameLog.TotalRecords);
    
    // === GENERATE ACHIEVEMENTS ===
    console.log('\n🏆 Generating player achievements...');
    try {
      const achievementsData = generateAllPlayerAchievements(mergedGameLog);
      await saveDataToFile('playerAchievements.json', achievementsData);
      console.log(`✓ Generated achievements for ${achievementsData.totalPlayers} players`);
    } catch (error) {
      console.error('❌ Failed to generate achievements:', error.message);
      // Don't fail the entire sync for achievements generation failure
    }
    
    console.log('\n✅ Data sync completed successfully!');
    console.log(`📊 Total games processed: ${mergedGameLog.TotalRecords}`);
    console.log(`   - Legacy: ${mergedGameLog.Sources.Legacy} games`);
    console.log(`   - AWS: ${mergedGameLog.Sources.AWS} games`);
    console.log(`   - Merged: ${mergedGameLog.Sources.Merged} games`);
    console.log(`👥 Player data: ${mergedJoueursData.TotalRecords} players`);
    if (legacyJoueursData) {
      const legacyCount = legacyJoueursData.TotalRecords || 0;
      const newPlayersCount = mergedJoueursData.TotalRecords - legacyCount;
      if (newPlayersCount > 0) {
        console.log(`   - ${legacyCount} from legacy data, ${newPlayersCount} new from AWS`);
      } else {
        console.log(`   - All from legacy data`);
      }
    }
    if (legacyBRData) {
      const brParticipants = legacyBRData.BRParties?.totalRecords || 0;
      const brGames = legacyBRData.BRRefParties?.totalRecords || 0;
      console.log(`🎯 Battle Royale data: ${brParticipants} participants across ${brGames} games`);
    }
  } catch (error) {
    console.error('❌ Data sync failed:', error.message);
    process.exit(1);
  }
}

main();
