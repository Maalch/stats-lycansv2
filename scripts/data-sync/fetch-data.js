import fs from 'fs/promises';
import path from 'path';
import { generateAllPlayerAchievements } from './generate-achievements.js';
import { 
  fetchStatsListUrls, 
  fetchGameLogData,
  correctVictoriousStatusForDisconnectedPlayers,
  correctLoverSecondaryRole
} from './shared/sync-utils.js';

// Parse command line arguments
const args = process.argv.slice(2);
const forceFullSync = args.includes('--full') || args.includes('-f');

// Time window for updating recent games (6 hours in milliseconds)
const RECENT_GAMES_WINDOW_MS = 6 * 60 * 60 * 1000;

// Time window for file-level filtering (7 days in milliseconds)
const FILE_AGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// Minimum number of players required for a valid main Werewolf game
// NOTE: This filter is NOT applied to Battle Royale games
const MIN_PLAYERS = 8;

// Main Team game filter
const MAIN_TEAM_FILTER = (gameId) => gameId?.startsWith('Ponce-') || gameId?.startsWith('Tsuna-') || gameId?.startsWith('khalen-');

/**
 * Parse date from filename (format: Prefix-YYYYMMDDHHMMSS.json)
 * @param {string} url - Full URL or filename
 * @returns {Date|null} - Parsed date or null if parsing fails
 */
function parseDateFromFilename(url) {
  try {
    const filename = url.split('/').pop();
    const match = filename.match(/-(\d{14})\.json$/);
    if (!match) return null;
    
    const dateStr = match[1];
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
function filterRecentSessionFiles(urls, cutoffDate, forceFullSync) {
  if (forceFullSync) {
    return { filteredUrls: urls, skippedCount: 0, totalCount: urls.length };
  }
  
  const filteredUrls = [];
  let skippedCount = 0;
  
  for (const url of urls) {
    const fileDate = parseDateFromFilename(url);
    
    if (!fileDate) {
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
 * Load existing gameLog.json if it exists (for incremental sync)
 * @returns {Object|null} - Existing game log or null
 */
async function loadExistingGameLog() {
  const gameLogPath = path.join(ABSOLUTE_DATA_DIR, 'gameLog.json');
  
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
    return null;
  }
}

/**
 * Build a set of existing AWS game IDs for quick lookup
 * @param {Object} existingGameLog - Existing game log data
 * @returns {Set} - Set of existing game IDs (AWS games only)
 */
function buildExistingAwsGameIds(existingGameLog) {
  const gameIds = new Set();
  
  if (existingGameLog?.GameStats) {
    existingGameLog.GameStats.forEach(game => {
      // Only track games that came from AWS (have Version field and no LegacyData without FullDataExported)
      const isAWSGame = game.Version && (!game.LegacyData || game.LegacyData?.FullDataExported === false);
      if (isAWSGame && MAIN_TEAM_FILTER(game.Id)) {
        gameIds.add(game.Id);
      }
    });
  }
  
  return gameIds;
}

/**
 * Check if a game is within the recent time window and should be updated
 * @param {Object} game - Game data
 * @param {Date} cutoffDate - Cutoff date for recent games
 * @returns {boolean} - True if game is recent
 */
function isRecentGame(game, cutoffDate) {
  if (!game.EndDate) return false;
  const gameEndDate = new Date(game.EndDate);
  return gameEndDate >= cutoffDate;
}

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

// ============================================================================
// ACTION MERGING UTILITIES
// Merges player actions from GameLog (AWS - has Date/Position) and 
// LegacyData (Google Sheets - has richer action types like UsePower, VictimChaos, etc.)
// ============================================================================

/**
 * Creates a matching key for deduplication.
 * Actions are considered duplicates if they have the same:
 * - ActionType, Timing, ActionName, ActionTarget
 */
function createActionMatchKey(action) {
  return `${action.ActionType}|${action.Timing || ''}|${action.ActionName || ''}|${action.ActionTarget || ''}`;
}

/**
 * Compares game timing strings for sorting (e.g., "J1" < "N1" < "M1" < "J2")
 */
function compareTiming(timingA, timingB) {
  if (!timingA && !timingB) return 0;
  if (!timingA) return 1;
  if (!timingB) return -1;

  const parsePhase = (t) => {
    const match = t.match(/^([JNM])(\d+)$/i);
    if (!match) return { phase: 0, day: 0 };
    
    const letter = match[1].toUpperCase();
    const day = parseInt(match[2], 10);
    const phaseOrder = { 'J': 1, 'M': 2, 'N': 3 };
    
    return { phase: phaseOrder[letter] || 0, day };
  };

  const a = parsePhase(timingA);
  const b = parsePhase(timingB);

  if (a.day !== b.day) return a.day - b.day;
  return a.phase - b.phase;
}

/**
 * Merges actions from GameLog and LegacyData for a single player.
 * 
 * Strategy:
 * 1. Start with GameLog actions (they have Date/Position)
 * 2. Add LegacyData actions that don't exist in GameLog (using count-based matching)
 * 3. Handle multiple identical actions correctly using occurrence counting
 * 
 * @param {Array} gameLogActions - Actions from PlayerStats.Actions (AWS data)
 * @param {Array} legacyActions - Actions from LegacyData.PlayerStats.Actions (Google Sheets data)
 * @returns {Array} Merged array of actions
 */
function mergePlayerActions(gameLogActions, legacyActions) {
  const result = [];
  
  // Count occurrences of each action key in GameLog
  const gameLogKeyCounts = new Map();
  
  // First pass: Add all GameLog actions (they have Date/Position)
  if (gameLogActions && Array.isArray(gameLogActions)) {
    for (const action of gameLogActions) {
      // IGNORE UseGadget with Balle - it's weapon reloading, not a tracked action
      if (action.ActionType === 'UseGadget' && action.ActionName === 'Balle') {
        continue;
      }
      
      const key = createActionMatchKey(action);
      gameLogKeyCounts.set(key, (gameLogKeyCounts.get(key) || 0) + 1);
      result.push(action);
    }
  }

  // Second pass: Add LegacyData actions that exceed GameLog count for that key
  // This handles the case of multiple identical actions correctly
  if (legacyActions && Array.isArray(legacyActions)) {
    const legacyKeySeenCounts = new Map();
    
    for (const action of legacyActions) {
      const key = createActionMatchKey(action);
      const seenCount = (legacyKeySeenCounts.get(key) || 0) + 1;
      legacyKeySeenCounts.set(key, seenCount);
      
      const gameLogCount = gameLogKeyCounts.get(key) || 0;
      
      if (seenCount > gameLogCount) {
        // This legacy action has no GameLog counterpart (exceeds count), add it
        result.push({
          ...action,
          // Ensure Date and Position are null for legacy actions
          Date: action.Date || null,
          Position: action.Position || null,
        });
      }
      // If seenCount <= gameLogCount, the GameLog already has this occurrence
    }
  }

  // Sort by Timing for chronological order
  return result.sort((a, b) => compareTiming(a.Timing, b.Timing));
}

/**
 * Merges LegacyData.PlayerStats actions into main PlayerStats for a game.
 * Also removes LegacyData.PlayerStats from the game to reduce output size.
 * 
 * @param {Object} game - Game object with PlayerStats and optional LegacyData.PlayerStats
 * @returns {Object} Game with merged actions and cleaned LegacyData
 */
function mergeGameActionsAndCleanLegacyData(game) {
  if (!game.LegacyData?.PlayerStats || !game.PlayerStats) {
    return game;
  }
  
  // Build a map of legacy players by ID for quick lookup
  const legacyPlayersByID = new Map();
  const legacyPlayersByUsername = new Map();
  
  for (const legacyPlayer of game.LegacyData.PlayerStats) {
    if (legacyPlayer.ID) {
      legacyPlayersByID.set(legacyPlayer.ID, legacyPlayer);
    }
    if (legacyPlayer.Username) {
      legacyPlayersByUsername.set(legacyPlayer.Username.toLowerCase(), legacyPlayer);
    }
  }
  
  // Merge actions for each player
  const mergedPlayerStats = game.PlayerStats.map(player => {
    // Find matching legacy player by Steam ID first, then by username
    let legacyPlayer = null;
    if (player.ID) {
      legacyPlayer = legacyPlayersByID.get(player.ID);
    }
    if (!legacyPlayer && player.Username) {
      legacyPlayer = legacyPlayersByUsername.get(player.Username.toLowerCase());
    }
    
    if (!legacyPlayer?.Actions) {
      // No legacy actions to merge
      return player;
    }
    
    // Merge actions
    const mergedActions = mergePlayerActions(player.Actions, legacyPlayer.Actions);
    
    return {
      ...player,
      Actions: mergedActions,
    };
  });
  
  // Remove PlayerStats from LegacyData but keep other fields
  const { PlayerStats: _removedPlayerStats, ...cleanedLegacyData } = game.LegacyData;
  
  return {
    ...game,
    PlayerStats: mergedPlayerStats,
    LegacyData: Object.keys(cleanedLegacyData).length > 0 ? cleanedLegacyData : undefined,
  };
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

async function mergeAllGameLogs(legacyGameLog, awsGameLogs, existingGameLog = null, gameCutoffDate = null) {
  console.log('Merging legacy and AWS game logs into unified structure...');
  
  const gamesByIdMap = new Map();
  // Track legacy games by their GameModId for matching with AWS games
  // Key: GameModId, Value: { game, fullDataExported }
  const legacyGamesByModId = new Map();
  let legacyCount = 0;
  let legacyMetadataOnlyCount = 0;
  let legacyFullDataCount = 0;
  let awsCount = 0;
  let awsNewCount = 0;
  let awsUpdatedCount = 0;
  let awsSkippedCount = 0;
  let awsFilteredCount = 0;
  let awsSkippedDueToGSheetPriority = 0;
  let mergedCount = 0;
  
  // Build set of existing AWS game IDs and their end dates for incremental updates
  const existingAwsGames = new Map();
  const recentExistingGameIds = new Set();
  
  if (existingGameLog?.GameStats) {
    existingGameLog.GameStats.forEach(game => {
      // Track existing games for incremental processing
      existingAwsGames.set(game.Id, game);
      
      // Track which existing games are "recent" and should be updated
      if (gameCutoffDate && isRecentGame(game, gameCutoffDate)) {
        recentExistingGameIds.add(game.Id);
      }
    });
    
    if (recentExistingGameIds.size > 0) {
      console.log(`📋 Found ${recentExistingGameIds.size} recent games (last 6 hours) that may be updated`);
    }
  }
  
  // Add legacy games to map first (including games without EndDate for merging LegacyData)
  if (legacyGameLog && legacyGameLog.GameStats && Array.isArray(legacyGameLog.GameStats)) {
    legacyGameLog.GameStats.forEach(game => {
      // Check if this game has GameModId (means it has matching AWS game)
      const gameModId = game.LegacyData?.GameModId;
      const fullDataExported = game.LegacyData?.FullDataExported;
      
      if (gameModId) {
        // Track by GameModId for AWS matching
        legacyGamesByModId.set(gameModId, { game, fullDataExported });
        
        if (fullDataExported === true) {
          // GSHEETPRIORITY is set - add to map with GameModId as key (will replace AWS game)
          gamesByIdMap.set(gameModId, {
            ...game,
            source: 'legacy-priority'
          });
          legacyFullDataCount++;
          console.log(`  📋 GSheet priority game: ${game.Id} (GameModId: ${gameModId})`);
        } else {
          // Has GameModId but FullDataExported:false - metadata only, will be merged with AWS
          legacyMetadataOnlyCount++;
        }
      } else {
        // No GameModId - regular legacy game, add to map
        gamesByIdMap.set(game.Id, {
          ...game,
          source: 'legacy'
        });
        
        if (game.EndDate) {
          legacyCount++;
        } else {
          legacyMetadataOnlyCount++;
        }
      }
    });
    console.log(`✓ Added ${gamesByIdMap.size} legacy games to map (${legacyCount} complete, ${legacyMetadataOnlyCount} metadata-only, ${legacyFullDataCount} full GSheet priority)`);
    if (legacyGamesByModId.size > 0) {
      console.log(`  🔗 ${legacyGamesByModId.size} games have GameModId for AWS matching`);
    }
  }
  
  // Add AWS games, merging with legacy if same ID exists (excluding games without EndDate)
  for (const gameLog of awsGameLogs) {
    if (gameLog.GameStats && Array.isArray(gameLog.GameStats)) {
      gameLog.GameStats.forEach(awsGame => {
        if (!awsGame.EndDate) {
          awsFilteredCount++;
          return;
        }
        
        // Filter: Only process games with at least MIN_PLAYERS players
        const playerCount = awsGame.PlayerStats?.length || 0;
        if (playerCount < MIN_PLAYERS) {
          awsFilteredCount++;
          return;
        }
        
        const gameId = awsGame.Id;
        
        // Filter: Only process Main Team games (Ponce-, Tsuna-, khalen- prefixes)
        if (!gameId || (!gameId.startsWith('Ponce-') && !gameId.startsWith('Tsuna-') && !gameId.startsWith('khalen-'))) {
          return; // Skip non-Main Team games
        }
        
        // Check if there's a legacy game with matching GameModId
        const legacyMatch = legacyGamesByModId.get(gameId);
        
        if (legacyMatch) {
          if (legacyMatch.fullDataExported === true) {
            // GSheet has priority - skip this AWS game entirely (GSheet data already in map)
            awsSkippedDueToGSheetPriority++;
            console.log(`✓ Skipping AWS game ${gameId}: GSheet has priority (FullDataExported: true)`);
            return;
          } else {
            // FullDataExported: false - Use AWS data but merge LegacyData and Clips from GSheet
            const mergedGame = {
              ...awsGame,
              Version: legacyMatch.game.Version || gameLog.ModVersion,
              Modded: legacyMatch.game.Modded !== undefined ? legacyMatch.game.Modded : true,
              LegacyData: legacyMatch.game.LegacyData || undefined,
              Clips: legacyMatch.game.Clips || awsGame.Clips || [],
              source: 'merged'
            };
            gamesByIdMap.set(gameId, mergedGame);
            mergedCount++;
            console.log(`✓ Merged game ${gameId}: AWS data + GSheet LegacyData + Clips`);
            return;
          }
        }
        
        // Check if game already exists in map (exact ID match - shouldn't happen often)
        const existingGame = gamesByIdMap.get(gameId);
        
        if (existingGame) {
          // Game already exists - skip (could be legacy-priority or duplicate)
          if (existingGame.source === 'legacy-priority') {
            awsSkippedDueToGSheetPriority++;
          }
          return;
        }
        
        // === INCREMENTAL SYNC LOGIC ===
        const existingAwsGame = existingAwsGames.get(gameId);
        const isRecent = gameCutoffDate && isRecentGame(awsGame, gameCutoffDate);
        const wasRecent = recentExistingGameIds.has(gameId);
        
        // Pure AWS game - add with ModVersion and Modded flag
        const awsGameWithVersion = {
          ...awsGame,
          Version: gameLog.ModVersion,
          Modded: true,
          // Preserve LegacyData and Clips from existing game if it has any
          ...(existingAwsGame?.LegacyData && { LegacyData: existingAwsGame.LegacyData }),
          ...(existingAwsGame?.Clips && { Clips: existingAwsGame.Clips }),
          source: 'aws'
        };
        
        if (!existingAwsGame) {
          // New game - add it
          gamesByIdMap.set(gameId, awsGameWithVersion);
          awsCount++;
          awsNewCount++;
        } else if (isRecent || wasRecent) {
          // Recent game - update it (might have new data)
          gamesByIdMap.set(gameId, awsGameWithVersion);
          awsCount++;
          awsUpdatedCount++;
        } else {
          // Old game already exists and hasn't been updated from AWS - use existing
          gamesByIdMap.set(gameId, { ...existingAwsGame, source: 'aws' });
          awsCount++;
          awsSkippedCount++;
        }
      });
    }
  }
  
  // Also add any existing AWS games that weren't in the fetched files (for incremental sync)
  // This preserves games from older session files that weren't re-fetched
  if (existingGameLog?.GameStats) {
    existingGameLog.GameStats.forEach(game => {
      if (!gamesByIdMap.has(game.Id) && MAIN_TEAM_FILTER(game.Id)) {
        // Check if it's not a legacy-priority game
        const legacyMatch = legacyGamesByModId.get(game.Id);
        if (!legacyMatch || legacyMatch.fullDataExported !== true) {
          gamesByIdMap.set(game.Id, { ...game, source: 'aws' });
          // Don't increment counters - these games are just preserved from previous sync,
          // not processed in this run. They're already part of the total output.
        }
      }
    });
  }
  
  // Convert map back to array, merge actions, and remove source tracking
  let actionsMergedCount = 0;
  const allGameStats = Array.from(gamesByIdMap.values()).map(game => {
    const { source, ...gameWithoutSource } = game;
    
    // Merge LegacyData.PlayerStats actions into main PlayerStats and clean up
    if (gameWithoutSource.LegacyData?.PlayerStats) {
      actionsMergedCount++;
      return mergeGameActionsAndCleanLegacyData(gameWithoutSource);
    }
    
    return gameWithoutSource;
  });
  
  if (actionsMergedCount > 0) {
    console.log(`✓ Merged legacy actions for ${actionsMergedCount} games`);
  }
  
  // Sort by StartDate to maintain chronological order
  allGameStats.sort((a, b) => new Date(a.StartDate) - new Date(b.StartDate));
  
  const mergedGameLog = {
    ModVersion: awsCount > 0 ? "Legacy + AWS Merged" : "Legacy Only",
    TotalRecords: allGameStats.length,
    Sources: {
      Legacy: legacyCount,
      LegacyFullData: legacyFullDataCount,
      AWS: awsCount,
      AWSNew: awsNewCount,
      AWSUpdated: awsUpdatedCount,
      AWSUnchanged: awsSkippedCount,
      Merged: mergedCount,
      AWSSkippedDueToGSheetPriority: awsSkippedDueToGSheetPriority
    },
    LastSync: new Date().toISOString(),
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
  
  // Start with legacy joueurs data, or try to read existing file if API failed
  let joueursData;
  if (legacyJoueursData) {
    joueursData = JSON.parse(JSON.stringify(legacyJoueursData));
  } else {
    // API failed - try to read existing joueurs.json to preserve data
    try {
      const existingJoueursPath = path.join(ABSOLUTE_DATA_DIR, 'joueurs.json');
      const existingJoueursContent = await fs.readFile(existingJoueursPath, 'utf-8');
      joueursData = JSON.parse(existingJoueursContent);
      console.log(`⚠️  Legacy API unavailable - using existing joueurs.json with ${joueursData.TotalRecords} players`);
    } catch (error) {
      console.log('⚠️  No existing joueurs.json found - starting with empty player list');
      joueursData = {
        TotalRecords: 0,
        Players: []
      };
    }
  }
  
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
        // Filter: Only process Main Team games (Ponce- and Tsuna- prefixes)
        if (!game.Id || (!game.Id.startsWith('Ponce-') && !game.Id.startsWith('Tsuna-') && !game.Id.startsWith('khalen-'))) {
          return; // Skip non-Main Team games
        }
        
        // Filter: Only process games with at least MIN_PLAYERS players
        const playerCount = game.PlayerStats?.length || 0;
        if (playerCount < MIN_PLAYERS) {
          return; // Skip test games
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
  console.log(`📋 Sync mode: ${forceFullSync ? 'FULL (forced)' : 'INCREMENTAL'}`);

  try {
    await ensureDataDirectory();
    
    // === LOAD EXISTING DATA FOR INCREMENTAL SYNC ===
    let existingGameLog = null;
    if (!forceFullSync) {
      existingGameLog = await loadExistingGameLog();
    }
    
    const isIncrementalSync = existingGameLog !== null && !forceFullSync;
    const gameCutoffDate = new Date(Date.now() - RECENT_GAMES_WINDOW_MS);
    const fileCutoffDate = new Date(Date.now() - FILE_AGE_WINDOW_MS);
    
    if (isIncrementalSync) {
      console.log(`\n📅 Incremental sync settings:`);
      console.log(`   - File-level filter: skip sessions older than ${fileCutoffDate.toISOString()} (7 days)`);
      console.log(`   - Game-level update: refresh games newer than ${gameCutoffDate.toISOString()} (6 hours)`);
    }

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
            // Don't save directly - will be merged with AWS players later
            console.log(`✓ Fetched ${data.TotalRecords || data.Players?.length || 0} players from legacy API`);
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
    const allGameLogUrls = await fetchStatsListUrls();
    
    // Filter URLs based on file age (unless full sync)
    const { filteredUrls: gameLogUrls, skippedCount, totalCount } = filterRecentSessionFiles(
      allGameLogUrls,
      fileCutoffDate,
      forceFullSync
    );
    
    if (skippedCount > 0) {
      console.log(`🔍 File-level filtering: skipping ${skippedCount} old session files (${gameLogUrls.length}/${totalCount} will be fetched)`);
    }
    
    const awsGameLogs = [];
    if (gameLogUrls.length > 0) {
      console.log(`📦 Fetching ${gameLogUrls.length} AWS game log files...`);
      console.log('🔧 Correcting victorious status for disconnected players...');
      
      for (const url of gameLogUrls) {
        try {
          const gameLog = await fetchGameLogData(url);
          
          // Correct victorious status for disconnected players and Lover secondary role (Main Team only)
          let correctedGameLog = correctVictoriousStatusForDisconnectedPlayers(gameLog, MAIN_TEAM_FILTER);
          correctedGameLog = correctLoverSecondaryRole(correctedGameLog, MAIN_TEAM_FILTER);
          awsGameLogs.push(correctedGameLog);
          
          // Small delay between requests to be respectful to S3
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`Failed to fetch AWS game log ${url}:`, err.message);
          // Continue with other files
        }
      }
      
      console.log(`✓ Successfully fetched ${awsGameLogs.length} AWS game log files`);
    } else if (isIncrementalSync && allGameLogUrls.length > 0) {
      console.log(`ℹ️  No recent session files to fetch - all AWS data is up to date`);
    } else {
      console.log('⚠️  No AWS game log files found');
    }

    // === MERGE AND SAVE UNIFIED DATA ===
    console.log('\n🔄 Creating unified dataset...');
    
    let mergedGameLog;
    if (legacyGameLogData || awsGameLogs.length > 0 || existingGameLog) {
      // We have data to merge (legacy, AWS, or existing)
      mergedGameLog = await mergeAllGameLogs(
        legacyGameLogData, 
        awsGameLogs, 
        existingGameLog, 
        isIncrementalSync ? gameCutoffDate : null
      );
      await saveDataToFile('gameLog.json', mergedGameLog);
    } else {
      // No data at all
      console.log('⚠️  No data available from any source...');
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
        BRParties: { totalRecords: 0, data: [] },
        BRRefParties: { totalRecords: 0, data: [] }
      };
      await saveDataToFile('rawBRData.json', emptyBRData);
    }
    
    // Merge joueurs data with AWS players
    const mergedJoueursData = await mergeJoueursWithAWSPlayers(legacyJoueursData, awsGameLogs);
    await saveDataToFile('joueurs.json', mergedJoueursData);
    
    await createDataIndex(!!legacyGameLogData, awsGameLogs.length, mergedGameLog.TotalRecords);
    
    console.log('\n✅ Data sync completed successfully!');
    console.log(`📊 Total games processed: ${mergedGameLog.TotalRecords}`);
    console.log(`   - Legacy: ${mergedGameLog.Sources.Legacy || 0} games`);
    if (mergedGameLog.Sources.LegacyFullData > 0) {
      console.log(`   - Legacy Full Data (GSHEETPRIORITY): ${mergedGameLog.Sources.LegacyFullData} games`);
    }
    console.log(`   - AWS: ${mergedGameLog.Sources.AWS || 0} games`);
    if (mergedGameLog.Sources.AWSNew > 0 || mergedGameLog.Sources.AWSUpdated > 0) {
      console.log(`     • New: ${mergedGameLog.Sources.AWSNew || 0}`);
      console.log(`     • Updated: ${mergedGameLog.Sources.AWSUpdated || 0}`);
      console.log(`     • Unchanged: ${mergedGameLog.Sources.AWSUnchanged || 0}`);
    }
    console.log(`   - Merged: ${mergedGameLog.Sources.Merged || 0} games`);
    if (mergedGameLog.Sources.AWSSkippedDueToGSheetPriority > 0) {
      console.log(`   - AWS skipped (GSheet priority): ${mergedGameLog.Sources.AWSSkippedDueToGSheetPriority} games`);
    }
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
      console.log(`🎯 Battle Royale data: ${brParticipants} participants across ${brGames} games (no player minimum filter)`);
    }
  } catch (error) {
    console.error('❌ Data sync failed:', error.message);
    process.exit(1);
  }
}

main();
