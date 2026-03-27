import { useGameStatsBase } from './utils/baseStatsHook';
import { computeColorStats, computePlayerColorMatrix } from './utils/colorStatsUtils';

// Re-export interfaces for convenience
export type { ColorStats, PlayerColorMatrix, PlayerColorCell } from './utils/colorStatsUtils';

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

/**
 * Hook to calculate player-color matrix from raw filtered game data.
 * Returns a matrix of players × colors with game counts for bubble chart visualization.
 */
export function usePlayerColorMatrixFromRaw() {
  const { data: matrixData, isLoading, error } = useGameStatsBase(
    (gameData) => computePlayerColorMatrix(gameData)
  );

  return {
    data: matrixData,
    isLoading,
    error
  };
}
