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

    // Games are sorted by StartDate, so the last one is the most recent
    const sortedGames = [...gameData].sort(
      (a, b) => new Date(a.StartDate).getTime() - new Date(b.StartDate).getTime()
    );
    const lastGame = sortedGames[sortedGames.length - 1];
    
    if (!lastGame?.StartDate) {
      return null;
    }

    // Convert ISO date to French format DD/MM/YYYY
    const date = new Date(lastGame.StartDate);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  }, [gameData]);

  return {
    lastRecordedGameDate,
    isLoading,
    error
  };
}
