import { usePlayerStatsBase } from './utils/baseStatsHook';
import { computePlayerCampPerformance } from './utils/playerCampPerformanceUtils';

/**
 * Hook pour calculer les statistiques de performance par camp pour chaque joueur à partir des données brutes filtrées.
 * Implémente la même logique que _computePlayerCampPerformance du Google Apps Script.
 */
export function usePlayerCampPerformanceFromRaw() {
  const { data: playerCampPerformance, isLoading, error } = usePlayerStatsBase(computePlayerCampPerformance);

  return {
    playerCampPerformance,
    isLoading,
    error,
  };
}
