import { useGameStatsBase } from './utils/baseStatsHook';
import { computePlayerSurvivalAnalysis, type PlayerSurvivalAnalysis } from './utils/deathAnalysisUtils';

/**
 * Hook to analyze individual player survival patterns and death statistics
 */
export function useSurvivalAnalysisFromRaw() {
  return useGameStatsBase((gameData) => {
    return computePlayerSurvivalAnalysis(gameData);
  });
}

export type { PlayerSurvivalAnalysis };