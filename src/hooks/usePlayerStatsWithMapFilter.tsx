import { useGameStatsBase } from './utils/baseStatsHook';
import { computePlayerStatsWithMapFilter } from './utils/playerStatsUtils';
import type { PlayerStatsData } from '../types/api';

/**
 * Hook to get player statistics with optional map filtering
 */
export function usePlayerStatsWithMapFilter(mapFilter?: string): {
  data: PlayerStatsData | null;
  isLoading: boolean;
  error: string | null;
} {
  return useGameStatsBase(
    (gameData) => computePlayerStatsWithMapFilter(gameData, mapFilter)
  );
}