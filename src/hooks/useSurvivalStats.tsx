import { useStatsContext } from '../context/StatsContext';
import type { RoleSurvivalStatsResponse } from '../types/api';

/**
 * Hook pour obtenir les statistiques de survie par rôle/camp.
 * Utilise StatsContext pour éviter les appels API redondants.
 */
export function useRoleSurvivalStats() {
  const { combinedData, isLoading, error } = useStatsContext();

  // On suppose que le backend renvoie roleSurvivalStats dans combinedData
  const roleSurvivalStats: RoleSurvivalStatsResponse | null =
    combinedData && combinedData.roleSurvivalStats ? combinedData.roleSurvivalStats : null;

  return {
    roleSurvivalStats,
    dataLoading: isLoading,
    fetchError: error,
  };
}