/**
 * Incremental computation wrapper for compute functions
 * 
 * This module provides incremental update wrappers for compute functions that
 * maintain cumulative statistics (deaths, voting, kills, etc.)
 */

import { computeDeathStatistics } from './compute-death-stats.js';
import { computeVotingStatistics } from './compute-voting-stats.js';
import { computeHunterStatistics } from './compute-hunter-stats.js';
import { computeMapStats } from './compute-map-stats.js';
import { computePlayerCampPerformance } from './compute-camp-performance.js';
import { computeLootStats } from '../../processors/loot-achievements.js';

/**
 * For most compute functions that deal with cumulative statistics,
 * we can simply re-run them on ALL games (old + new) since they're fast.
 * 
 * The main performance gain comes from:
 * 1. Not re-running compute functions for unchanged datasets (modded vs all)
 * 2. Caching intermediate player stats (done in cache-manager)
 * 3. Only re-generating achievements for affected players (done in generate-achievements)
 * 
 * Future optimization: These could be made truly incremental by storing
 * intermediate state, but the complexity isn't worth it for now since
 * the ranking step requires processing all players anyway.
 */

/**
 * Wrapper for death statistics - just re-runs on all games
 * @param {Object} cachedStats - Unused for now
 * @param {Array} allGames - All games (existing + new)
 * @returns {Object} - Death statistics
 */
export function updateDeathStatisticsIncremental(cachedStats, allGames) {
  return computeDeathStatistics(allGames);
}

/**
 * Wrapper for voting statistics - just re-runs on all games
 * @param {Object} cachedStats - Unused for now
 * @param {Array} allGames - All games (existing + new)
 * @returns {Object} - Voting statistics
 */
export function updateVotingStatisticsIncremental(cachedStats, allGames) {
  return computeVotingStatistics(allGames);
}

/**
 * Wrapper for hunter statistics - just re-runs on all games
 * @param {Object} cachedStats - Unused for now
 * @param {Array} allGames - All games (existing + new)
 * @returns {Object} - Hunter statistics
 */
export function updateHunterStatisticsIncremental(cachedStats, allGames) {
  return computeHunterStatistics(allGames);
}

/**
 * Wrapper for map statistics - just re-runs on all games
 * @param {Object} cachedStats - Unused for now
 * @param {Array} allGames - All games (existing + new)
 * @returns {Object} - Map statistics
 */
export function updateMapStatsIncremental(cachedStats, allGames) {
  return computeMapStats(allGames);
}

/**
 * Wrapper for camp performance - just re-runs on all games
 * @param {Object} cachedStats - Unused for now
 * @param {Array} allGames - All games (existing + new)
 * @returns {Object} - Camp performance statistics
 */
export function updatePlayerCampPerformanceIncremental(cachedStats, allGames) {
  return computePlayerCampPerformance(allGames);
}

/**
 * Wrapper for loot statistics - just re-runs on all games
 * Note: Loot stats are computed within the achievements processor,
 * but this wrapper is provided for API consistency
 * @param {Object} cachedStats - Unused for now
 * @param {Array} allGames - All games (existing + new)
 * @returns {Array} - Loot statistics
 */
export function updateLootStatsIncremental(cachedStats, allGames) {
  return computeLootStats(allGames);
}
