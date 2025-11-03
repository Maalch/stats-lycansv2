import { usePlayerStatsBase } from './utils/baseStatsHook';
import { computeDeathStatistics, getAvailableCamps, computeHunterStatistics } from './utils/deathStatisticsUtils';

/**
 * Hook to compute comprehensive death statistics from game data
 * Uses the base stats hook pattern for consistent loading/error handling
 */
export function useDeathStatisticsFromRaw(campFilter?: string, victimCampFilter?: string) {
  return usePlayerStatsBase((gameData) => {
    return computeDeathStatistics(gameData, campFilter, victimCampFilter);
  });
}

/**
 * Hook to get available camps from game data
 */
export function useAvailableCampsFromRaw() {
  return usePlayerStatsBase((gameData) => {
    return getAvailableCamps(gameData);
  });
}

export function useDeathTypeStats() {
  return usePlayerStatsBase((gameData) => {
    const stats = computeDeathStatistics(gameData);
    return stats ? {
      deathsByType: stats.deathsByType,
      mostCommonDeathType: stats.mostCommonDeathType
    } : null;
  });
}

export function useKillerStats() {
  return usePlayerStatsBase((gameData) => {
    const stats = computeDeathStatistics(gameData);
    return stats ? {
      killerStats: stats.killerStats,
      mostDeadlyKiller: stats.mostDeadlyKiller
    } : null;
  });
}

export function usePlayerDeathStats() {
  return usePlayerStatsBase((gameData) => {
    const stats = computeDeathStatistics(gameData);
    return stats ? {
      playerDeathStats: stats.playerDeathStats,
      totalGames: stats.totalGames
    } : null;
  });
}
/**
 * Hook to compute hunter-specific statistics from game data
 * Tracks kills made by Chasseur role players
 */
export function useHunterStatisticsFromRaw(campFilter?: string) {
  return usePlayerStatsBase((gameData) => {
    return computeHunterStatistics(gameData, campFilter);
  });
}
