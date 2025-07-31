import { useState, useEffect } from 'react';

export interface PlayerGame {
  gameId: string;
  date: string;
  camp: string;
  won: boolean;
  winnerCamp: string;
  playersInGame: number;
}

export interface CampStats {
  appearances: number;
  wins: number;
  winRate: string;
}

export interface PlayerGameHistoryData {
  playerName: string;
  totalGames: number;
  totalWins: number;
  winRate: string;
  games: PlayerGame[];
  campStats: Record<string, CampStats>;
}

export interface PlayerGameHistoryResponse {
  data: PlayerGameHistoryData | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch detailed game history for a specific player
 * @param playerName - The name of the player to fetch history for
 * @returns Object containing data, loading state, and error state
 */
export function usePlayerGameHistory(playerName: string | null): PlayerGameHistoryResponse {
  const [data, setData] = useState<PlayerGameHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerName || playerName.trim() === '') {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const fetchPlayerGameHistory = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const baseUrl = import.meta.env.VITE_LYCANS_API_BASE;
        if (!baseUrl) {
          throw new Error('API base URL not configured');
        }

        const url = `${baseUrl}?action=playerGameHistory&playerName=${encodeURIComponent(playerName)}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }

        setData(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayerGameHistory();
  }, [playerName]);

  return { data, isLoading, error };
}