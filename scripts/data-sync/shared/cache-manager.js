/**
 * Cache manager for incremental rankings generation
 * 
 * This module handles loading, saving, and managing the player statistics cache
 * to enable incremental processing of new games without recomputing everything.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Cache structure:
 * {
 *   version: "2.0.0",
 *   lastUpdated: "2025-12-10T12:00:00Z",
 *   lastProcessedGameId: "Ponce-20251209...",
 *   
 *   // Separate caches for allGames and moddedGames datasets
 *   allGames: {
 *     totalGames: 662,
 *     playerStats: { [playerId]: { ...rawStats } },
 *     seriesState: { [playerId]: { currentWinSeries, longestWinSeries, ... } },
 *     mapStats: [ { player, playerName, villageWinRate, chateauWinRate, ... } ],
 *     deathStats: { playerDeathStats: [...], playerKillStats: [...], ... },
 *     hunterStats: [ { playerId, playerName, totalKills, ... } ],
 *     campStats: [ { playerId, playerName, campStats: {...}, ... } ],
 *     votingStats: { playerBehavior: [...], playerAccuracy: [...], playerTargets: [...] }
 *   },
 *   
 *   moddedGames: {
 *     totalGames: 371,
 *     playerStats: { [playerId]: { ...rawStats } },
 *     seriesState: { [playerId]: { ... } },
 *     mapStats: [...],
 *     deathStats: {...},
 *     hunterStats: [...],
 *     campStats: [...],
 *     votingStats: {...}
 *   }
 * }
 */

// Bumped to 3.0.0: cache now tracks per-game content hashes (see gameHashes) to detect
// in-place edits to already-processed games, not just count-based additions.
const CACHE_VERSION = "3.0.0";
const CACHE_FILENAME = "playerStatsCache.json";

/**
 * Create an empty cache structure
 */
export function createEmptyCache() {
  return {
    version: CACHE_VERSION,
    lastUpdated: new Date().toISOString(),
    lastProcessedGameId: null,
    
    allGames: {
      totalGames: 0,
      playerStats: {},
      seriesState: {},
      mapStats: [],
      deathStats: null,
      hunterStats: [],
      campStats: [],
      votingStats: null,
      gameHashes: {}
    },
    
    moddedGames: {
      totalGames: 0,
      playerStats: {},
      seriesState: {},
      mapStats: [],
      deathStats: null,
      hunterStats: [],
      campStats: [],
      votingStats: null,
      gameHashes: {}
    }
  };
}

/**
 * Compute a stable content hash for a game, used to detect in-place edits
 * (e.g. victory-status corrections) to games that were already processed.
 * @param {Object} game - Game object from gameLog.json
 * @returns {string} - SHA1 hex hash of the game's JSON content
 */
export function hashGame(game) {
  return crypto.createHash('sha1').update(JSON.stringify(game)).digest('hex');
}

/**
 * Load cache from file, or create empty cache if file doesn't exist
 * @param {string} dataDir - Directory where cache is stored
 * @returns {Promise<Object>} - Cache object
 */
export async function loadCache(dataDir) {
  const cachePath = path.join(dataDir, CACHE_FILENAME);
  
  try {
    const cacheContent = await fs.readFile(cachePath, 'utf-8');
    const cache = JSON.parse(cacheContent);
    
    // Validate cache version
    if (cache.version !== CACHE_VERSION) {
      console.log(`⚠️  Cache version mismatch (found ${cache.version}, expected ${CACHE_VERSION}). Creating fresh cache.`);
      return createEmptyCache();
    }
    
    console.log(`✓ Loaded cache from ${CACHE_FILENAME}`);
    console.log(`  Last updated: ${cache.lastUpdated}`);
    console.log(`  All games: ${cache.allGames.totalGames}, Players: ${Object.keys(cache.allGames.playerStats).length}`);
    console.log(`  Modded games: ${cache.moddedGames.totalGames}, Players: ${Object.keys(cache.moddedGames.playerStats).length}`);
    
    return cache;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`ℹ️  No existing cache found. Starting fresh.`);
      return createEmptyCache();
    }
    
    console.error(`⚠️  Failed to load cache: ${error.message}. Starting fresh.`);
    return createEmptyCache();
  }
}

/**
 * Save cache to file
 * @param {string} dataDir - Directory where cache should be stored
 * @param {Object} cache - Cache object to save
 */
export async function saveCache(dataDir, cache) {
  const cachePath = path.join(dataDir, CACHE_FILENAME);
  
  try {
    // Update metadata
    cache.version = CACHE_VERSION;
    cache.lastUpdated = new Date().toISOString();
    
    const cacheJson = JSON.stringify(cache, null, 2);
    await fs.writeFile(cachePath, cacheJson, 'utf-8');
    
    console.log(`✓ Saved cache to ${CACHE_FILENAME}`);
    console.log(`  All games: ${cache.allGames.totalGames} games, ${Object.keys(cache.allGames.playerStats).length} players`);
    console.log(`  Modded games: ${cache.moddedGames.totalGames} games, ${Object.keys(cache.moddedGames.playerStats).length} players`);
  } catch (error) {
    console.error(`❌ Failed to save cache: ${error.message}`);
    throw error;
  }
}

/**
 * Detect new and changed games by comparing per-game content hashes against the cache.
 *
 * Unlike a count-based diff, this also catches games that were already processed but
 * later edited in place (e.g. disconnected-player victory corrections applied by
 * sync-utils.js within the 6h "recent games" update window), since the count of games
 * stays the same in that case but the content differs.
 *
 * @param {Array} games - Array of game objects from gameLog.json
 * @param {Object} datasetCache - Cache for specific dataset (allGames or moddedGames)
 * @returns {Object} - { newGames: [], changedGames: [], existingGameIds: Set, currentHashes: Object }
 */
export function detectNewGames(games, datasetCache) {
  const cachedHashes = datasetCache.gameHashes || {};
  const existingGameIds = new Set();
  const newGames = [];
  const changedGames = [];
  const currentHashes = {};

  for (const game of games) {
    const hash = hashGame(game);
    currentHashes[game.Id] = hash;
    const cachedHash = cachedHashes[game.Id];

    if (cachedHash === undefined) {
      newGames.push(game);
    } else if (cachedHash !== hash) {
      changedGames.push(game);
    } else {
      existingGameIds.add(game.Id);
    }
  }

  if (newGames.length === 0 && changedGames.length === 0) {
    console.log(`  No new or changed games detected (${games.length} games)`);
  } else {
    if (newGames.length > 0) {
      console.log(`  Detected ${newGames.length} new game(s) (total: ${games.length}, cached: ${Object.keys(cachedHashes).length})`);
    }
    if (changedGames.length > 0) {
      console.log(`  Detected ${changedGames.length} changed existing game(s) - full recalculation required for correctness`);
    }
  }

  return { newGames, changedGames, existingGameIds, currentHashes };
}

/**
 * Get list of players affected by new games
 * @param {Array} newGames - Array of new game objects
 * @param {Function} getPlayerId - Function to extract player ID from player stats
 * @returns {Set} - Set of affected player IDs
 */
export function getAffectedPlayers(newGames, getPlayerId) {
  const affectedPlayers = new Set();
  
  newGames.forEach(game => {
    if (game.PlayerStats && Array.isArray(game.PlayerStats)) {
      game.PlayerStats.forEach(player => {
        affectedPlayers.add(getPlayerId(player));
      });
    }
  });
  
  return affectedPlayers;
}

/**
 * Initialize player in cache if not exists
 * @param {Object} datasetCache - Cache for specific dataset
 * @param {string} playerId - Player ID
 * @param {string} playerName - Player name
 */
export function ensurePlayerInCache(datasetCache, playerId, playerName) {
  if (!datasetCache.playerStats[playerId]) {
    datasetCache.playerStats[playerId] = {
      playerId,
      playerName,
      gamesPlayed: 0,
      wins: 0,
      camps: {},
      // Will be populated by compute functions
    };
  }
  
  if (!datasetCache.seriesState[playerId]) {
    datasetCache.seriesState[playerId] = {
      playerId,
      playerName,
      // Will be populated by series compute function
    };
  }
  
  // Update playerName in case it changed
  datasetCache.playerStats[playerId].playerName = playerName;
  datasetCache.seriesState[playerId].playerName = playerName;
}
