import { usePlayerStatsBase } from './utils/baseStatsHook';
import { computeMeetingSurvivalStatistics, type MeetingSurvivalStatistics } from './utils/meetingSurvivalUtils';

/**
 * Hook to get meeting survival statistics with camp filtering
 */
export function useMeetingSurvivalStatisticsFromRaw(selectedCamp?: string) {
  return usePlayerStatsBase<MeetingSurvivalStatistics>((gameData) => {
    return computeMeetingSurvivalStatistics(gameData, selectedCamp);
  });
}
