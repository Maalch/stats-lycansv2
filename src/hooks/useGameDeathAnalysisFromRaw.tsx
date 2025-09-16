import { useGameStatsBase } from './utils/baseStatsHook';
import { computeGameDeathAnalysis, type GameDeathAnalysis } from './utils/deathAnalysisUtils';

/**
 * Hook to analyze death patterns in individual games
 */
export function useGameDeathAnalysisFromRaw() {
  return useGameStatsBase((gameData) => {
    return computeGameDeathAnalysis(gameData);
  });
}

export type { GameDeathAnalysis };