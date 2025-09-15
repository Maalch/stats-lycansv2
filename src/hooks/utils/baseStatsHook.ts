import { useMemo } from 'react';
import { useCombinedFilteredRawData } from '../useCombinedRawData';
import type { GameLogEntry } from '../useCombinedRawData';

/**
 * Base hook template for statistics calculation from raw data
 * Provides common patterns and reduces code duplication
 */

// Common result interface
export interface BaseStatsResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

// Hook options for different data requirements
export interface StatsHookOptions {
  requireGameData?: boolean;
  requireBRData?: boolean;
}

/**
 * Base hook that provides filtered data and common loading/error handling
 */
export function useBaseStats<T>(
  computeFunction: (data: {
    gameData: GameLogEntry[];
  }) => T | null,
  options: StatsHookOptions = {
    requireGameData: true
  }
): BaseStatsResult<T> {
  const { 
    gameData, 
    isLoading, 
    error 
  } = useCombinedFilteredRawData();

  const result = useMemo((): T | null => {
    // Check data availability based on requirements
    if (options.requireGameData && (!gameData || gameData.length === 0)) {
      return null;
    }

    // Call the compute function with available data
    return computeFunction({
      gameData: gameData || []
    });
  }, [gameData, computeFunction, options]);

  return {
    data: result,
    isLoading,
    error
  };
}

/**
 * Specialized hook for statistics that only need game data
 */
export function useGameStatsBase<T>(
  computeFunction: (gameData: GameLogEntry[]) => T | null
): BaseStatsResult<T> {
  return useBaseStats(
    ({ gameData }) => computeFunction(gameData),
    { requireGameData: true }
  );
}

/**
 * Specialized hook for statistics that need game + role data
 */
export function usePlayerStatsBase<T>(
  computeFunction: (gameData: GameLogEntry[]) => T | null
): BaseStatsResult<T> {
  return useBaseStats(
    ({ gameData }) => computeFunction(gameData),
    { requireGameData: true }
  );
}

/**
 * Specialized hook for statistics that need all data types
 */
export function useFullStatsBase<T>(
  computeFunction: (gameData: GameLogEntry[]) => T | null
): BaseStatsResult<T> {
  return useBaseStats(
    ({ gameData }) => computeFunction(gameData),
    { requireGameData: true }
  );
}
