import { useGameStatsBase } from './utils/baseStatsHook';
import { computeLootStats, type CampFilter } from './utils/lootStatsUtils';

/**
 * Hook to get player loot statistics with automatic filtering
 * Uses the base hook pattern for consistent error handling and filter application
 * Excludes games without loot data (created before feature implementation)
 * 
 * @param campFilter - Filter by camp: 'all', 'villageois', 'loup', or 'autres'
 */
export function useLootStats(campFilter: CampFilter = 'all') {
  const { data, isLoading, error } = useGameStatsBase(
    (gameData) => computeLootStats(gameData, campFilter)
  );

  return {
    data,
    isLoading,
    error
  };
}
