import { useGameStatsBase } from './utils/baseStatsHook';
import { computeDeathStats, type DeathStats } from './utils/deathAnalysisUtils';

/**
 * Hook to get overall death statistics across all games
 */
export function useDeathStatsFromRaw() {
  return useGameStatsBase((gameData) => {
    return computeDeathStats(gameData);
  });
}

export type { DeathStats };