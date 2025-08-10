import { useStatsContext } from '../context/StatsContext';
import type { HarvestStatsResponse } from '../types/api';

/**
 * Hook pour obtenir les statistiques de récolte.
 * Utilise StatsContext pour éviter les appels API redondants.
 */
export function useHarvestStats() {
  const { combinedData, isLoading, error } = useStatsContext();

  // On suppose que le backend renvoie harvestStats dans combinedData
  const harvestStats: HarvestStatsResponse | null =
    combinedData && combinedData.harvestStats ? combinedData.harvestStats : null;

  return {
    harvestStats,
    isLoading,
    errorMessage: error,
  };
}