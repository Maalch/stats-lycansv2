import { useMemo } from 'react';
import { useCombinedFilteredRawData } from './useCombinedRawData';

/**
 * Simple hook to get the date of the last recorded game
 * Extracts just this information from the raw data without additional processing
 */
export function useLastRecordedGameDate(): {
  lastRecordedGameDate: string | null;
  isLoading: boolean;
  error: string | null;
} {
  const { gameData, isLoading, error } = useCombinedFilteredRawData();

  const lastRecordedGameDate = useMemo(() => {
    if (!gameData || gameData.length === 0) {
      return null;
    }

    // Games are sorted by Game number, so the last one is the most recent
    const sortedGames = [...gameData].sort((a, b) => a.Game - b.Game);
    const lastGame = sortedGames[sortedGames.length - 1];
    
    return lastGame?.Date?.toString() || null;
  }, [gameData]);

  return {
    lastRecordedGameDate,
    isLoading,
    error
  };
}
