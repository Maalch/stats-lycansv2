import { usePlayerStatsBase } from './utils/baseStatsHook';
import { computePlayerTalkingTimeStats } from './utils/playerTalkingTimeUtils';

// Re-export types for convenience
export type {
  PlayerTalkingTimeDetail,
  CampTalkingStats,
  RoleTalkingStats,
  WinTalkingCorrelation,
  MainCamp
} from './utils/playerTalkingTimeUtils';

/**
 * Hook to get detailed talking time statistics for a specific player
 * 
 * @param playerName - The name of the player to compute talking time stats for
 * @returns Player talking time data with camp breakdown, rankings, and correlations
 */
export function usePlayerTalkingTimeStats(playerName: string | null) {
  const { data, isLoading, error } = usePlayerStatsBase(
    (gameData) => {
      if (!playerName) return null;
      return computePlayerTalkingTimeStats(playerName, gameData);
    }
  );

  return {
    data,
    isLoading,
    error
  };
}
