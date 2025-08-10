import { useStatsContext } from '../context/StatsContext';
import type { CampWinStatsResponse } from '../types/api';

/**
 * Hook pour obtenir les statistiques de victoire par camp.
 * Utilise StatsContext pour éviter les appels API redondants.
 */
export function useCampWinStats() {
  const { combinedData, isLoading, error } = useStatsContext();

  // On suppose que le backend renvoie campWinStats dans combinedData
  const campWinStats: CampWinStatsResponse | null =
    combinedData && combinedData.campWinStats ? combinedData.campWinStats : null;

  return {
    campWinStats,
    isLoading,
    errorInfo: error,
  };
}