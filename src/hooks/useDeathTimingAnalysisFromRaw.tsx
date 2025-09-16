import { useGameStatsBase } from './utils/baseStatsHook';
import { computeDeathTimingAnalysis, type DeathTimingAnalysis } from './utils/deathAnalysisUtils';

/**
 * Hook to analyze death timing patterns across games
 */
export function useDeathTimingAnalysisFromRaw() {
  return useGameStatsBase((gameData) => {
    return computeDeathTimingAnalysis(gameData);
  });
}

export type { DeathTimingAnalysis };