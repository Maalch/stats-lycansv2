import { useStatsContext } from '../context/StatsContext';
import type { PlayerStatsData } from '../types/api';

/**
 * Hook pour obtenir les statistiques générales des joueurs.
 * Utilise StatsContext pour éviter les appels API redondants.
 */
export function usePlayerStats() {
  const { combinedData, isLoading, error } = useStatsContext();

  // On suppose que le backend renvoie playerStats dans combinedData
  const playerStatsData: PlayerStatsData | null =
    combinedData && combinedData.playerStats ? combinedData.playerStats : null;

  return {
    playerStatsData,
    dataLoading: isLoading,
    fetchError: error,
  };
}