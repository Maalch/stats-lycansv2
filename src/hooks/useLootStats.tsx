import { useGameStatsBase } from './utils/baseStatsHook';
import { computeLootStats } from './utils/lootStatsUtils';

/**
 * Hook to get player loot statistics with automatic filtering
 * Uses the base hook pattern for consistent error handling and filter application
 * Excludes games without loot data (created before feature implementation)
 */
export function useLootStats() {
  const { data, isLoading, error } = useGameStatsBase(
    (gameData) => computeLootStats(gameData)
  );

  return {
    data,
    isLoading,
    error
  };
}
