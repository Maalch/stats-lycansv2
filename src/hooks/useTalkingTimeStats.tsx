import { useGameStatsBase } from './utils/baseStatsHook';
import { computeTalkingTimeStats } from './utils/talkingTimeUtils';

/**
 * Hook to get player talking time statistics with automatic filtering
 * Uses the base hook pattern for consistent error handling and filter application
 * Excludes games without talking time data (created before feature implementation)
 */
export function useTalkingTimeStats() {
  const { data, isLoading, error } = useGameStatsBase(
    (gameData) => computeTalkingTimeStats(gameData)
  );

  return {
    data,
    isLoading,
    error
  };
}
