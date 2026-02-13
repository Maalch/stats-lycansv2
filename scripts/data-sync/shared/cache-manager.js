/**
 * Cache manager for incremental rankings generation
 * 
 * This module handles loading, saving, and managing the player statistics cache
 * to enable incremental processing of new games without recomputing everything.
 */

import fs from 'fs/promises';
import path from 'path';

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

const CACHE_VERSION = "2.0.0";
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
      votingStats: null
    },
    
    moddedGames: {
      totalGames: 0,
      playerStats: {},
      seriesState: {},
      mapStats: [],
      deathStats: null,
      hunterStats: [],
      campStats: [],
      votingStats: null
    }
  };
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
 * Detect new games by comparing game log with cache
 * @param {Array} games - Array of game objects from gameLog.json
 * @param {Object} datasetCache - Cache for specific dataset (allGames or moddedGames)
 * @returns {Object} - { newGames: [], existingGameIds: Set }
 */
export function detectNewGames(games, datasetCache) {
  const existingGameIds = new Set();
  const newGames = [];
  
  // Build set of existing game IDs from the count (we assume games are append-only)
  // We'll identify new games by comparing total count and checking end dates
  const cachedGameCount = datasetCache.totalGames || 0;
  
  // Sort games by StartDate to get chronological order
  const sortedGames = [...games].sort((a, b) => 
    new Date(a.StartDate) - new Date(b.StartDate)
  );
  
  if (sortedGames.length <= cachedGameCount) {
    // No new games
    console.log(`  No new games detected (${sortedGames.length} games, cache has ${cachedGameCount})`);
    return { newGames: [], existingGameIds: new Set(sortedGames.map(g => g.Id)) };
  }
  
  // Games are append-only, so take the last N games where N = total - cached
  const newGameCount = sortedGames.length - cachedGameCount;
  newGames.push(...sortedGames.slice(-newGameCount));
  
  sortedGames.slice(0, cachedGameCount).forEach(g => existingGameIds.add(g.Id));
  
  console.log(`  Detected ${newGames.length} new games (total: ${sortedGames.length}, cached: ${cachedGameCount})`);
  if (newGames.length > 0) {
    console.log(`    Newest game: ${newGames[newGames.length - 1].Id} (${newGames[newGames.length - 1].EndDate})`);
  }
  
  return { newGames, existingGameIds };
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
