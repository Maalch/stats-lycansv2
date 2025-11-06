import { usePlayerStatsBase } from './utils/baseStatsHook';
import { computePlayerGameHistory } from './utils/playerGameHistoryUtils';

// Re-export interfaces for convenience
export type { PlayerGame, CampStats, PlayerGameHistoryData } from './utils/playerGameHistoryUtils';

/**
 * Hook pour calculer l'historique détaillé d'un joueur à partir des données brutes filtrées.
 * 
 * @param playerName - The name of the player to compute history for
 * @param campFilter - Optional camp filter to only include games where player was in specific camp
 */
export function usePlayerGameHistoryFromRaw(playerName: string | null, campFilter?: string) {
  const { data: playerGameHistory, isLoading, error } = usePlayerStatsBase(
    (gameData) => {
      if (!playerName) return null;
      return computePlayerGameHistory(playerName, gameData, campFilter);
    }
  );

  return {
    data: playerGameHistory,
    isLoading,
    error
  };
}
