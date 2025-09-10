import { usePlayerStatsBase } from './utils/baseStatsHook';
import { computePlayerGameHistory } from './utils/playerGameHistoryUtils';

// Re-export interfaces for convenience
export type { PlayerGame, CampStats, PlayerGameHistoryData } from './utils/playerGameHistoryUtils';

/**
 * Hook pour calculer l'historique détaillé d'un joueur à partir des données brutes filtrées.
 * 
 */
export function usePlayerGameHistoryFromRaw(playerName: string | null) {
  const { data: playerGameHistory, isLoading, error } = usePlayerStatsBase(
    (gameData, roleData) => {
      if (!playerName) return null;
      return computePlayerGameHistory(playerName, gameData, roleData);
    }
  );

  return {
    data: playerGameHistory,
    isLoading,
    error
  };
}
