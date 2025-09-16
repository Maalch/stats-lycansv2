import { useGameStatsBase } from './utils/baseStatsHook';
import { computeKillerAnalysis, type KillerAnalysis } from './utils/deathAnalysisUtils';

/**
 * Hook to analyze killer performance and behavior patterns
 */
export function useKillerAnalysisFromRaw() {
  return useGameStatsBase((gameData) => {
    return computeKillerAnalysis(gameData);
  });
}

export type { KillerAnalysis };