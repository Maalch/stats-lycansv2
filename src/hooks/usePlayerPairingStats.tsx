import { useEffect, useState } from 'react';

export interface PlayerPairStat {
  pair: string;
  appearances: number;
  wins: number;
  winRate: string;
  players: string[];
}

export interface PlayerPairingStatsData {
  wolfPairs: {
    totalGames: number;
    pairs: PlayerPairStat[];
  };
  loverPairs: {
    totalGames: number;
    pairs: PlayerPairStat[];
  };
}

export function usePlayerPairingStats() {
  const [data, setData] = useState<PlayerPairingStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const apiBase = import.meta.env.VITE_LYCANS_API_BASE;
        const response = await fetch(`${apiBase}?action=playerPairingStats`);

        if (!response.ok) {
          throw new Error(`Erreur API: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Erreur lors de la récupération des statistiques de paires:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, isLoading, error };
}