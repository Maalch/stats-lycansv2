import { useState, useEffect } from 'react';
import { fetchHarvestStats } from '../api/statsApi';
import type { HarvestStatsResponse } from '../types/api';

/**
 * Hook pour obtenir les statistiques de récolte.
 * Utilise l'API directement pour récupérer les données statiques.
 */
export function useHarvestStats() {
  const [harvestStats, setHarvestStats] = useState<HarvestStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchHarvestStats();
        setHarvestStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        console.error('Error fetching harvest stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return {
    harvestStats,
    isLoading,
    errorInfo: error,
  };
}