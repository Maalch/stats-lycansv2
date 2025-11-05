import { useGameStatsBase } from './utils/baseStatsHook';
import { computeColorStats } from './utils/colorStatsUtils';

// Re-export interface for convenience
export type { ColorStats } from './utils/colorStatsUtils';

/**
 * Hook to calculate color statistics from raw filtered game data.
 * Returns statistics for each player color including win rate and average usage per game.
 */
export function useColorStatsFromRaw() {
  const { data: colorStats, isLoading, error } = useGameStatsBase(
    (gameData) => computeColorStats(gameData)
  );

  return {
    data: colorStats,
    isLoading,
    error
  };
}
