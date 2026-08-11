import { usePlayerStatsBase } from './utils/baseStatsHook';
import { computeSurvivalStatistics, computeTimeAliveStatistics, type SurvivalStatistics, type TimeAliveStatistics } from './utils/survivalStatisticsUtils';

/**
 * Hook to get survival statistics with camp filtering
 */
export function useSurvivalStatisticsFromRaw(selectedCamp?: string) {
  return usePlayerStatsBase<SurvivalStatistics>((gameData) => {
    return computeSurvivalStatistics(gameData, selectedCamp);
  });
}

/**
 * Hook to get time-alive statistics (percentage of game duration spent alive) with camp filtering
 */
export function useTimeAliveStatisticsFromRaw(selectedCamp?: string) {
  return usePlayerStatsBase<TimeAliveStatistics>((gameData) => {
    return computeTimeAliveStatistics(gameData, selectedCamp);
  });
}