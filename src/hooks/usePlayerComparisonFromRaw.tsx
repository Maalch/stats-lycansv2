import { useMemo } from 'react';
import { usePlayerStatsFromRaw } from './usePlayerStatsFromRaw';
import { useCombinedFilteredRawData } from './useCombinedRawData';
import { 
  generatePlayerComparison,
  getAvailablePlayersForComparison,
  type PlayerComparisonData
} from './utils/playerComparisonUtils';

export { type PlayerComparisonMetrics, type PlayerComparisonData } from './utils/playerComparisonUtils';

/**
 * Hook for generating detailed player comparison metrics with dynamic scaling
 * 
 */
export function usePlayerComparisonFromRaw() {
  const { data: playerStatsData, isLoading: statsLoading, error: statsError } = usePlayerStatsFromRaw();
  const { gameData: rawGameData, isLoading: dataLoading, error: dataError } = useCombinedFilteredRawData();

  const availablePlayers = useMemo(() => {
    return getAvailablePlayersForComparison(playerStatsData);
  }, [playerStatsData]);

  const generateComparison = useMemo(() => {
    return (player1Name: string, player2Name: string): PlayerComparisonData | null => {
      
      if (!playerStatsData?.playerStats || !rawGameData) {
        return null;
      }
      
      try {
        const result = generatePlayerComparison(
          player1Name, 
          player2Name, 
          playerStatsData, 
          rawGameData
        );
        return result;
      } catch (error) {
        return null;
      }
    };
  }, [playerStatsData, rawGameData]);

  return {
    availablePlayers,
    generateComparison,
    isLoading: statsLoading || dataLoading,
    error: statsError || dataError
  };
}
