import { usePlayerStatsBase } from './utils/baseStatsHook';
import { computePlayerPairingStats } from './utils/playerPairingUtils';

// Re-export interfaces for convenience
export type { PlayerPairingStatsData, PlayerPairStat, AgentPlayerPairStat } from '../types/api';

/**
 * Hook pour calculer les statistiques de paires de joueurs (loups et amoureux) à partir des données brutes filtrées.
 * 
 */
export function usePlayerPairingStatsFromRaw() {
  const { data: playerPairingStats, isLoading, error } = usePlayerStatsBase(
    (gameData) => computePlayerPairingStats(gameData)
  );

  return {
    data: playerPairingStats,
    isLoading,
    error
  };
}
