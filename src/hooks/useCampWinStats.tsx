import { useState, useEffect } from 'react';
import { fetchCampWinStats } from '../api/statsApi';
import type { CampWinStatsResponse } from '../types/api';

/**
 * Hook pour obtenir les statistiques de victoire par camp.
 * Utilise l'API directement pour récupérer les données statiques.
 */
export function useCampWinStats() {
  const [campWinStats, setCampWinStats] = useState<CampWinStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchCampWinStats();
        setCampWinStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        console.error('Error fetching camp win stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return {
    campWinStats,
    isLoading,
    errorInfo: error,
  };
}