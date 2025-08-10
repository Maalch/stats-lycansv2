import { useStatsContext } from '../context/StatsContext';
import type { PlayerPairingStatsData } from '../types/api';

/**
 * Hook pour obtenir les statistiques de paires de joueurs (loups et amoureux).
 * Utilise StatsContext pour éviter les appels API redondants.
 */
export function usePlayerPairingStats() {
  const { combinedData, isLoading, error } = useStatsContext();

  // On suppose que le backend renvoie playerPairingStats dans combinedData
  const data: PlayerPairingStatsData | null =
    combinedData && combinedData.playerPairingStats ? combinedData.playerPairingStats : null;

  return { data, isLoading, error };
}