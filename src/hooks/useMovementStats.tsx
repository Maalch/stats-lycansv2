import { useGameStatsBase } from './utils/baseStatsHook';
import { computeMovementStats, type CampFilter } from './utils/movementStatsUtils';

/**
 * Hook to get player movement statistics with automatic filtering
 * Uses the base hook pattern for consistent error handling and filter application
 * Excludes games without movement data (created before feature implementation)
 * 
 * @param campFilter - Filter by camp: 'all', 'villageois', 'loup', or 'autres'
 */
export function useMovementStats(campFilter: CampFilter = 'all') {
  const { data, isLoading, error } = useGameStatsBase(
    (gameData) => computeMovementStats(gameData, campFilter)
  );

  return {
    data,
    isLoading,
    error
  };
}
