import { useState, useEffect } from 'react';
import { fetchPlayerCampPerformance } from '../api/statsApi';
import type { PlayerCampPerformanceResponse } from '../types/api';

/**
 * Hook pour obtenir les statistiques de performance par camp pour chaque joueur.
 * Utilise l'API directement pour récupérer les données statiques.
 */
export function usePlayerCampPerformance() {
  const [playerCampPerformance, setPlayerCampPerformance] = useState<PlayerCampPerformanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchPlayerCampPerformance();
        setPlayerCampPerformance(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        console.error('Error fetching player camp performance:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return {
    playerCampPerformance,
    isLoading,
    error,
  };
}