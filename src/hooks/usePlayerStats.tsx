import { useState, useEffect } from 'react';
import { fetchPlayerStats } from '../api/statsApi';
import type { PlayerStatsData } from '../types/api';

/**
 * Hook pour obtenir les statistiques générales des joueurs.
 * Utilise l'API directement pour récupérer les données statiques.
 */
export function usePlayerStats() {
  const [playerStatsData, setPlayerStatsData] = useState<PlayerStatsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchPlayerStats();
        setPlayerStatsData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        console.error('Error fetching player stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return {
    playerStatsData,
    dataLoading: isLoading,
    fetchError: error,
  };
}