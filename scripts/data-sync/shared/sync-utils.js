/**
 * Shared utilities for data sync scripts
 */
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../../../src/utils/datasyncExport.js';

/**
 * Correct Victorious status for disconnected players
 * When a player disconnects, they are incorrectly marked as Victorious:false
 * even if their camp won. This function fixes that by checking the winning camp.
 * 
 * Logic:
 * 1. For each game, identify which camps won by checking Victorious:true players
 * 2. For each player in the game, check if their camp is in the winning camps
 * 3. If their camp won but they're marked as not victorious, correct it to true
 * 
 * This handles main camps (Villageois, Loup) as well as special roles (Amoureux, etc.)
 * using the same camp grouping logic as the rest of the application.
 * 
 * EXCEPTION: Agent camp is excluded - there are always 2 Agents but only 1 wins.
 * 
 * @param {Object} gameLog - The game log object with GameStats array
 * @param {Function} gameFilter - Optional filter function to determine which games to process
 * @returns {Object} - The corrected game log object
 */
export function correctVictoriousStatusForDisconnectedPlayers(gameLog, gameFilter = null) {
  if (!gameLog || !gameLog.GameStats || !Array.isArray(gameLog.GameStats)) {
    return gameLog;
  }

  let totalCorrections = 0;

  gameLog.GameStats.forEach(game => {
    // Apply game filter if provided
    if (gameFilter && !gameFilter(game.Id)) {
      return; // Skip games that don't match the filter
    }

    if (!game.PlayerStats || !Array.isArray(game.PlayerStats)) {
      return;
    }

    // Find which camps won this game by checking Victorious players
    // EXCEPTION: Exclude "Agent" camp as only 1 of 2 Agents wins
    const victoriousCamps = new Set();
    game.PlayerStats.forEach(player => {
      if (player.Victorious) {
        const finalRole = getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []);
        const camp = getPlayerCampFromRole(finalRole, { 
          regroupWolfSubRoles: true, // Group Traître/Louveteau with Loup
          regroupVillagers: true,     // Group villager roles together
          regroupLovers: true         // Group lovers together
        });
        
        // Skip Agent camp - only 1 of 2 Agents wins, so we can't auto-correct
        if (camp !== 'Agent') {
          victoriousCamps.add(camp);
        }
      }
    });

    // If no victorious camps found, skip this game
    if (victoriousCamps.size === 0) {
      return;
    }

    // Now check all players and correct those who should be victorious but aren't
    game.PlayerStats.forEach(player => {
      const finalRole = getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []);
      const playerCamp = getPlayerCampFromRole(finalRole, { 
        regroupWolfSubRoles: true,
        regroupVillagers: true,
        regroupLovers: true
      });

      // Skip Agent camp - can't auto-correct as only 1 of 2 wins
      if (playerCamp === 'Agent') {
        return;
      }

      // If this player's camp won but they're marked as not victorious, correct it
      if (victoriousCamps.has(playerCamp) && !player.Victorious) {
        player.Victorious = true;
        totalCorrections++;
        console.log(`  ✓ Corrected ${player.Username} in game ${game.Id}: ${playerCamp} won`);
      }
    });
  });

  if (totalCorrections > 0) {
    console.log(`✓ Corrected ${totalCorrections} disconnected player victory statuses`);
  }

  return gameLog;
}

/**
 * Correct Lover secondary role in game Logs
 * In old game logs entries, Lovers can have their secondary role incorrectly set to "Télépathe"
 * "Télépathe" is always a capacity of Lovers, and should not be listed as a secondary role.
 * 
 * @param {Object} gameLog - The game log object with GameStats array
 * @param {Function} gameFilter - Optional filter function to determine which games to process
 * @returns {Object} - The corrected game log object
 */
export function correctLoverSecondaryRole(gameLog, gameFilter = null) {
  if (!gameLog || !gameLog.GameStats || !Array.isArray(gameLog.GameStats)) {
    return gameLog;
  }

  gameLog.GameStats.forEach(game => {
    // Apply game filter if provided
    if (gameFilter && !gameFilter(game.Id)) {
      return; // Skip games that don't match the filter
    }

    if (!game.PlayerStats || !Array.isArray(game.PlayerStats)) {
      return;
    }

    game.PlayerStats.forEach(player => {
      if (player.SecondaryRole === "Télépathe" && (player.MainRoleInitial === "Amoureux" || player.MainRoleInitial === "Amoureux Loup" || player.MainRoleInitial === "Amoureux Villageois")) {
        player.SecondaryRole = null;
      }
    });
  });

  return gameLog;
}

/**
 * Ensure data directory exists
 */
export async function ensureDataDirectory(absoluteDataDir) {
  try {
    await fs.access(absoluteDataDir);
  } catch {
    await fs.mkdir(absoluteDataDir, { recursive: true });
    console.log(`Created data directory: ${absoluteDataDir}`);
  }
}

/**
 * Fetch stats list URLs from AWS S3
 */
export async function fetchStatsListUrls(teamName = '') {
  const statsListUrl = process.env.STATS_LIST_URL;
  
  if (!statsListUrl) {
    throw new Error('STATS_LIST_URL environment variable not found');
  }

  const teamLabel = teamName ? ` (${teamName})` : '';
  console.log(`Fetching stats list from AWS S3${teamLabel}...`);
  
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

/**
 * Fetch game log data from a URL
 */
export async function fetchGameLogData(url) {
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

/**
 * Merge AWS game logs with optional filtering
 * @param {Array} awsGameLogs - Array of game log objects
 * @param {Object} config - Configuration object with filtering options
 * @returns {Object} - Unified game log
 */
export async function mergeAWSGameLogs(awsGameLogs, config) {
  const teamLabel = config.name ? ` (${config.name})` : '';
  console.log(`Processing AWS game logs into unified structure${teamLabel}...`);
  
  if (config.gameFilter) {
    console.log('🔍 Applying game filter...');
  }
  
  const gamesByIdMap = new Map();
  let totalGamesProcessed = 0;
  let filteredGamesCount = 0;
  let corruptedGamesCount = 0;
  
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
          return; // Skip this game
        }
        
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
  
  if (config.gameFilter && filteredGamesCount > 0) {
    console.log(`✓ Filtered out ${filteredGamesCount} games`);
  }
  
  console.log(`✓ Processed ${totalGamesProcessed} unique games from ${awsGameLogs.length} AWS files`);
  
  // Convert map back to array
  const allGameStats = Array.from(gamesByIdMap.values());
  
  // Sort by StartDate to maintain chronological order
  allGameStats.sort((a, b) => new Date(a.StartDate) - new Date(b.StartDate));
  
  const unifiedGameLog = {
    ModVersion: config.modVersionLabel || "Multiple AWS Versions",
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

/**
 * Save data to a JSON file
 */
export async function saveDataToFile(absoluteDataDir, filename, data) {
  const filepath = path.join(absoluteDataDir, filename);
  
  try {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(filepath, jsonData, 'utf8');
    console.log(`✓ Saved data to ${filename}`);
  } catch (error) {
    console.error(`Failed to save ${filename}:`, error.message);
    throw error;
  }
}

/**
 * Create data index file
 */
export async function createDataIndex(absoluteDataDir, awsFilesCount, totalGames, description) {
  const indexData = {
    sources: {
      legacy: "Not available (AWS-only sync)",
      aws: `${awsFilesCount} files from S3 bucket`,
      unified: "gameLog.json (AWS sources only)"
    },
    description: description || "Game logs from AWS S3 bucket. Updated periodically via GitHub Actions.",
    totalGames: totalGames
  };

  const indexPath = path.join(absoluteDataDir, 'index.json');
  await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
  console.log('✓ Created data index');
}

/**
 * Generate joueurs.json from game log player stats
 */
export async function generateJoueursFromGameLog(absoluteDataDir, gameLog, teamName = '') {
  const teamLabel = teamName ? ` ${teamName}` : '';
  console.log(`📋 Generating joueurs.json from${teamLabel} game log...`);
  
  // Map to track players by ID (not username) - keeps only the last username per ID
  const playerIdMap = new Map();
  
  // Iterate through all games and player stats chronologically
  gameLog.GameStats.forEach(game => {
    if (game.PlayerStats && Array.isArray(game.PlayerStats)) {
      game.PlayerStats.forEach(playerStat => {
        const username = playerStat.Username;
        const id = playerStat.ID || playerStat.Id;
        const color = playerStat.Color;
        
        if (!username || !id) return; // Skip if no username or ID
        
        // Use ID as the key - this will overwrite with the latest username if it changes
        if (!playerIdMap.has(id)) {
          playerIdMap.set(id, {
            username: username,
            colors: {},
            gamesPlayed: 0
          });
        }
        
        const playerData = playerIdMap.get(id);
        
        // Update to the latest username for this ID
        playerData.username = username;
        playerData.gamesPlayed++;
        
        if (color) {
          playerData.colors[color] = (playerData.colors[color] || 0) + 1;
        }
      });
    }
  });
  
  // Create players array with most common color
  const players = [];
  
  for (const [id, data] of playerIdMap.entries()) {
    // Find the most common color for this player
    let mostCommonColor = null;
    let maxCount = 0;
    
    for (const [color, count] of Object.entries(data.colors)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonColor = color;
      }
    }
    
    players.push({
      Joueur: data.username,
      SteamID: id,
      Image: null,
      Twitch: null,
      Youtube: null,
      Couleur: mostCommonColor || "Gris"
    });
  }
  
  // Sort players alphabetically by username
  players.sort((a, b) => a.Joueur.localeCompare(b.Joueur));
  
  // Create the joueurs data structure
  const joueursData = {
    TotalRecords: players.length,
    Players: players,
    description: "Player data extracted from game logs. Social media links not available."
  };
  
  await saveDataToFile(absoluteDataDir, 'joueurs.json', joueursData);
  console.log(`✓ Generated joueurs.json with ${joueursData.TotalRecords} players`);
  
  return joueursData;
}

/**
 * Create placeholder files for legacy data sources
 */
export async function createPlaceholderFiles(absoluteDataDir) {
  console.log('Creating placeholder files for legacy data...');
  
  // Create placeholder Legacy gameLog
  const emptyLegacyGameLog = {
    ModVersion: "No Legacy Data",
    TotalRecords: 0,
    Sources: { Legacy: 0, AWS: 0, Merged: 0 },
    GameStats: [],
    description: "Legacy data not available in AWS-only sync mode"
  };
  await saveDataToFile(absoluteDataDir, 'gameLog-Legacy.json', emptyLegacyGameLog);
  
  // Create placeholder BR data
  const emptyBRData = {
    description: "Battle Royale data not available in AWS-only sync mode",
    data: []
  };
  await saveDataToFile(absoluteDataDir, 'rawBRData.json', emptyBRData);
  
  // Create placeholder Joueurs data
  const emptyJoueursData = {
    TotalRecords: 0,
    Players: [],
    description: "Player data not available in AWS-only sync mode"
  };
  await saveDataToFile(absoluteDataDir, 'joueurs.json', emptyJoueursData);
  
  console.log('✓ Created placeholder files');
}
