/**
 * Shared utilities for data sync scripts
 */
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
 * Time window for updating recent games (6 hours in milliseconds).
 * Games ending within this window may be re-fetched/updated in place even if
 * already present, since disconnected-player/lover corrections can arrive late.
 */
export const RECENT_GAMES_WINDOW_MS = 6 * 60 * 60 * 1000;

/** Time window for file-level filtering (7 days in milliseconds) */
export const FILE_AGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Minimum number of players required for a valid main Werewolf game (not applied to Battle Royale games) */
export const MIN_PLAYERS = 8;

/**
 * Parse date from filename (format: Prefix-YYYYMMDDHHMMSS.json)
 * @param {string} url - Full URL or filename
 * @returns {Date|null} - Parsed date or null if parsing fails
 */
export function parseDateFromFilename(url) {
  try {
    const filename = url.split('/').pop();
    const match = filename.match(/-(\d{14})\.json$/);
    if (!match) return null;
    
    const dateStr = match[1]; // YYYYMMDDHHMMSS
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(8, 10);
    const minute = dateStr.substring(10, 12);
    const second = dateStr.substring(12, 14);
    
    const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    const date = new Date(isoString);
    
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (error) {
    return null;
  }
}

/**
 * Filter URLs to only include recent session files
 * @param {Array<string>} urls - List of file URLs
 * @param {Date} cutoffDate - Cutoff date for file filtering
 * @param {boolean} forceFullSync - If true, skip filtering
 * @returns {Object} - Filtered URLs and stats
 */
export function filterRecentSessionFiles(urls, cutoffDate, forceFullSync) {
  if (forceFullSync) {
    return { filteredUrls: urls, skippedCount: 0, totalCount: urls.length };
  }
  
  const filteredUrls = [];
  let skippedCount = 0;
  
  for (const url of urls) {
    const fileDate = parseDateFromFilename(url);
    
    if (!fileDate) {
      // Can't parse date - include the file to be safe
      console.log(`⚠️  Could not parse date from ${url.split('/').pop()} - including file`);
      filteredUrls.push(url);
    } else if (fileDate >= cutoffDate) {
      filteredUrls.push(url);
    } else {
      skippedCount++;
    }
  }
  
  return { filteredUrls, skippedCount, totalCount: urls.length };
}

/**
 * Check if a game is within the recent time window and should be updated
 * @param {Object} game - Game data
 * @param {Date} cutoffDate - Cutoff date for recent games
 * @returns {boolean} - True if game is recent
 */
export function isRecentGame(game, cutoffDate) {
  if (!game.EndDate) return false;
  const gameEndDate = new Date(game.EndDate);
  return gameEndDate >= cutoffDate;
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
 * Generate/update joueurs.json from game log player stats.
 *
 * IMPORTANT: This merges with any existing joueurs.json rather than overwriting it,
 * preserving curated fields (Image, Twitch, Youtube, Couleur) for known players.
 * Only players not already present (by SteamID or Username) are added, with a
 * best-guess Couleur derived from their most frequently used in-game color.
 */
export async function generateJoueursFromGameLog(absoluteDataDir, gameLog, teamName = '') {
  const teamLabel = teamName ? ` ${teamName}` : '';
  console.log(`📋 Generating joueurs.json from${teamLabel} game log...`);

  // Load existing joueurs.json to preserve curated data (Image/Twitch/Youtube/Couleur)
  let existingPlayers = [];
  try {
    const existingContent = await fs.readFile(path.join(absoluteDataDir, 'joueurs.json'), 'utf8');
    existingPlayers = JSON.parse(existingContent).Players || [];
    console.log(`  Found existing joueurs.json with ${existingPlayers.length} players - will preserve curated data`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`⚠️  Failed to read existing joueurs.json: ${error.message}`);
    }
  }

  const existingBySteamID = new Map();
  const existingByUsername = new Map();
  existingPlayers.forEach(player => {
    if (player.SteamID) existingBySteamID.set(String(player.SteamID), player);
    if (player.Joueur) existingByUsername.set(player.Joueur, player);
  });

  // Track brand-new players (and their color usage) discovered in the game log
  const newPlayersMap = new Map();

  gameLog.GameStats.forEach(game => {
    if (game.PlayerStats && Array.isArray(game.PlayerStats)) {
      game.PlayerStats.forEach(playerStat => {
        const username = playerStat.Username;
        const id = playerStat.ID || playerStat.Id;
        const color = playerStat.Color;
        
        if (!username || !id) return; // Skip if no username or ID
        
        // Skip players we already know about - never overwrite curated data
        if (existingBySteamID.has(String(id)) || existingByUsername.has(username)) return;
        
        if (!newPlayersMap.has(id)) {
          newPlayersMap.set(id, { username, colors: {} });
        }
        
        const playerData = newPlayersMap.get(id);
        playerData.username = username; // Use the latest username for this ID
        if (color) {
          playerData.colors[color] = (playerData.colors[color] || 0) + 1;
        }
      });
    }
  });
  
  // Build new player entries with their most common color
  const newPlayers = [];
  
  for (const [id, data] of newPlayersMap.entries()) {
    let mostCommonColor = null;
    let maxCount = 0;
    
    for (const [color, count] of Object.entries(data.colors)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonColor = color;
      }
    }
    
    newPlayers.push({
      Joueur: data.username,
      SteamID: id,
      Image: null,
      Twitch: null,
      Youtube: null,
      Couleur: mostCommonColor || "Gris"
    });
  }
  
  // Merge preserved existing players with newly discovered ones
  const players = [...existingPlayers, ...newPlayers];
  players.sort((a, b) => a.Joueur.localeCompare(b.Joueur));
  
  const joueursData = {
    TotalRecords: players.length,
    Players: players
  };
  
  await saveDataToFile(absoluteDataDir, 'joueurs.json', joueursData);
  if (newPlayers.length > 0) {
    console.log(`✓ Added ${newPlayers.length} new player(s) to joueurs.json (${joueursData.TotalRecords} total, curated data preserved)`);
  } else {
    console.log(`✓ joueurs.json unchanged - no new players found (${joueursData.TotalRecords} total)`);
  }
  
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

/**
 * Helper to compare two version strings (e.g., "0.207" >= "0.202")
 * Returns true if version >= targetVersion
 * @param {string} version - The version to compare
 * @param {string} targetVersion - The target version to compare against
 * @returns {boolean} - True if version >= targetVersion
 */
export function compareVersion(version, targetVersion) {
  if (!version || !targetVersion) return false;
  
  const versionParts = version.split('.').map(Number);
  const targetParts = targetVersion.split('.').map(Number);
  
  for (let i = 0; i < Math.max(versionParts.length, targetParts.length); i++) {
    const v = versionParts[i] || 0;
    const t = targetParts[i] || 0;
    
    if (v > t) return true;
    if (v < t) return false;
  }
  
  return true; // Equal versions
}
