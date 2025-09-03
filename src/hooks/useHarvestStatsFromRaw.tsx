import { useGameStatsBase } from './utils/baseStatsHook';
import { computeHarvestStats } from './utils/harvestStatsUtils';

/**
 * Hook pour calculer les statistiques de récolte à partir des données brutes filtrées.
 * Implémente la même logique que _computeHarvestStats du Google Apps Script.
 */
export function useHarvestStatsFromRaw() {
  const { data: harvestStats, isLoading, error } = useGameStatsBase(computeHarvestStats);

  return {
    harvestStats,
    isLoading,
    errorInfo: error,
  };
}
