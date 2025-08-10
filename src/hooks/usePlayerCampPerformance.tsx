import { useStatsContext } from '../context/StatsContext';
import type { PlayerCampPerformanceResponse } from '../types/api';


/**
 * Hook pour obtenir les statistiques de performance par camp pour chaque joueur.
 * Utilise StatsContext pour éviter les appels API redondants.
 */
export function usePlayerCampPerformance() {
  const { combinedData, isLoading, error } = useStatsContext();

  // On suppose que le backend renvoie playerCampPerformance dans combinedData
  const playerCampPerformance: PlayerCampPerformanceResponse | null =
    combinedData && combinedData.playerCampPerformance ? combinedData.playerCampPerformance : null;

  return {
    playerCampPerformance,
    isLoading,
    error,
  };
}