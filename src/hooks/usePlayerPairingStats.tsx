import { useState, useEffect } from 'react';
import { fetchPlayerPairingStats } from '../api/statsApi';
import type { PlayerPairingStatsData } from '../types/api';

/**
 * Hook pour obtenir les statistiques de paires de joueurs (loups et amoureux).
 * Utilise l'API directement pour récupérer les données statiques.
 */
export function usePlayerPairingStats() {
  const [data, setData] = useState<PlayerPairingStatsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchPlayerPairingStats();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        console.error('Error fetching player pairing stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return { data, isLoading, error };
}