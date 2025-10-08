import { usePlayerStatsBase } from './utils/baseStatsHook';
import type { GameTimeAnalysisResponse } from './utils/gameTimeAnalysisUtils';
import { computeGameTimeAnalysis } from './utils/gameTimeAnalysisUtils';

/**
 * Hook to get game time analysis from filtered game data
 */
export function useGameTimeAnalysisFromRaw(): {
  gameTimeAnalysis: GameTimeAnalysisResponse | null;
  fetchingData: boolean;
  apiError: string | null;
} {
  const { data, isLoading, error } = usePlayerStatsBase((gameData) => {
    return computeGameTimeAnalysis(gameData);
  });

  return {
    gameTimeAnalysis: data,
    fetchingData: isLoading,
    apiError: error
  };
}