import { useState, useEffect } from 'react';

// Types pour les statistiques des joueurs
export interface PlayerCamps {
  Villageois: number;
  Loups: number;
  Traître: number;
  "Idiot du Village": number;
  Cannibale: number;
  Agent: number;
  Espion: number;
  Scientifique: number;
  Amoureux: number;
  "La Bête": number;
  "Chasseur de primes": number;
  Vaudou: number;
}

export interface PlayerStat {
  player: string;
  gamesPlayed: number;
  gamesPlayedPercent: string;
  wins: number;
  winPercent: string;
  camps: PlayerCamps;
}

export interface PlayerStatsData {
  totalGames: number;
  playerStats: PlayerStat[];
}

export function usePlayerStats() {
  const [playerStatsData, setPlayerStatsData] = useState<PlayerStatsData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setDataLoading(true);
        setFetchError(null);

        const apiBase = import.meta.env.VITE_LYCANS_API_BASE;
        const response = await fetch(`${apiBase}?action=playerStats`);

        if (!response.ok) {
          throw new Error(`Erreur API: ${response.status}`);
        }

        const data = await response.json();
        setPlayerStatsData(data);
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques des joueurs:', error);
        setFetchError(error instanceof Error ? error.message : 'Erreur inconnue');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, []);

  return { playerStatsData, dataLoading, fetchError };
}