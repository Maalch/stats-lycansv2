import { useGameStatsBase } from './utils/baseStatsHook';
import { computeCampWinStats } from './utils/campWinStatsUtils';

/**
 * Hook pour calculer les statistiques de victoire par camp à partir des données brutes filtrées.
 * Implémente la même logique que _computeCampWinStats du Google Apps Script.
 */
export function useCampWinStatsFromRaw() {
  const { data: campWinStats, isLoading, error } = useGameStatsBase(computeCampWinStats);

  return {
    campWinStats,
    isLoading,
    errorInfo: error,
  };
}
