import { usePlayerStatsBase } from './utils/baseStatsHook';
import { computeDeathStatistics } from './utils/deathStatisticsUtils';

/**
 * Hook to compute comprehensive death statistics from game data
 * Uses the base stats hook pattern for consistent loading/error handling
 */
export function useDeathStatisticsFromRaw() {
  return usePlayerStatsBase((gameData) => {
    return computeDeathStatistics(gameData);
  });
}

// Individual hooks for specific death statistics aspects
export function useDeathTimingStats() {
  return usePlayerStatsBase((gameData) => {
    const stats = computeDeathStatistics(gameData);
    return stats ? {
      deathsByTiming: stats.deathsByTiming,
      deathsByPhase: stats.deathsByPhase,
      mostDeadlyPhase: stats.mostDeadlyPhase,
      mostDeadlyDay: stats.mostDeadlyDay
    } : null;
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