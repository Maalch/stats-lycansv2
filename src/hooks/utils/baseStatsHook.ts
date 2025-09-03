import { useMemo } from 'react';
import { useCombinedFilteredRawData } from '../useCombinedRawData';
import type { RawGameData, RawRoleData, RawPonceData } from '../useCombinedRawData';

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
  requireRoleData?: boolean;
  requirePonceData?: boolean;
  requireBRData?: boolean;
}

/**
 * Base hook that provides filtered data and common loading/error handling
 */
export function useBaseStats<T>(
  computeFunction: (data: {
    gameData: RawGameData[];
    roleData: RawRoleData[];
    ponceData: RawPonceData[];
  }) => T | null,
  options: StatsHookOptions = {
    requireGameData: true,
    requireRoleData: false,
    requirePonceData: false
  }
): BaseStatsResult<T> {
  const { 
    gameData, 
    roleData, 
    ponceData, 
    isLoading, 
    error 
  } = useCombinedFilteredRawData();

  const result = useMemo((): T | null => {
    // Check data availability based on requirements
    if (options.requireGameData && (!gameData || gameData.length === 0)) {
      return null;
    }
    if (options.requireRoleData && (!roleData || roleData.length === 0)) {
      return null;
    }
    if (options.requirePonceData && (!ponceData || ponceData.length === 0)) {
      return null;
    }

    // Call the compute function with available data
    return computeFunction({
      gameData: gameData || [],
      roleData: roleData || [],
      ponceData: ponceData || []
    });
  }, [gameData, roleData, ponceData, computeFunction, options]);

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
  computeFunction: (gameData: RawGameData[]) => T | null
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
  computeFunction: (gameData: RawGameData[], roleData: RawRoleData[]) => T | null
): BaseStatsResult<T> {
  return useBaseStats(
    ({ gameData, roleData }) => computeFunction(gameData, roleData),
    { requireGameData: true, requireRoleData: true }
  );
}

/**
 * Specialized hook for statistics that need all data types
 */
export function useFullStatsBase<T>(
  computeFunction: (gameData: RawGameData[], roleData: RawRoleData[], ponceData: RawPonceData[]) => T | null
): BaseStatsResult<T> {
  return useBaseStats(
    ({ gameData, roleData, ponceData }) => computeFunction(gameData, roleData, ponceData),
    { requireGameData: true, requireRoleData: true, requirePonceData: true }
  );
}
