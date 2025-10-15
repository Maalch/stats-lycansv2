import { usePlayerStatsBase } from './utils/baseStatsHook';
import { computeSurvivalStatistics, type SurvivalStatistics } from './utils/survivalStatisticsUtils';

/**
 * Hook to get survival statistics with camp filtering
 */
export function useSurvivalStatisticsFromRaw(selectedCamp?: string) {
  return usePlayerStatsBase<SurvivalStatistics>((gameData) => {
    return computeSurvivalStatistics(gameData, selectedCamp);
  });
}