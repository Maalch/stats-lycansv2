import { useGameStatsBase } from './utils/baseStatsHook';
import { computePlayerStats } from './utils/playerStatsUtils';

// Re-export interfaces for convenience
export type { PlayerStatsData, PlayerStat, PlayerCamps } from '../types/api';

/**
 * Hook pour calculer les statistiques détaillées des joueurs à partir des données brutes filtrées.
 * Implémente la même logique que _computePlayerStats du Google Apps Script.
 * 
 */
export function usePlayerStatsFromRaw() {
  const { data: playerStats, isLoading, error } = useGameStatsBase(
    (gameData) => computePlayerStats(gameData)
  );

  return {
    data: playerStats,
    isLoading,
    error
  };
}
