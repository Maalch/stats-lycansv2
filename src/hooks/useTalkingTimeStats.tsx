import { useGameStatsBase } from './utils/baseStatsHook';
import { computeTalkingTimeStats, type CampFilter } from './utils/talkingTimeUtils';

/**
 * Hook to get player talking time statistics with automatic filtering
 * Uses the base hook pattern for consistent error handling and filter application
 * Excludes games without talking time data (created before feature implementation)
 *
 * @param campFilter - Filter by camp based on initial role: 'all', 'villageois', 'loup', or 'autres'
 */
export function useTalkingTimeStats(campFilter: CampFilter = 'all') {
  const { data, isLoading, error } = useGameStatsBase(
    (gameData) => computeTalkingTimeStats(gameData, campFilter)
  );

  return {
    data,
    isLoading,
    error
  };
}
