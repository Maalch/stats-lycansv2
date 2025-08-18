import { useState, useEffect } from 'react';
import { fetchGameDurationAnalysis } from '../api/statsApi';
import type { GameDurationAnalysisResponse } from '../types/api';

/**
 * Hook pour obtenir les statistiques de durée de partie.
 * Utilise l'API directement pour récupérer les données statiques.
 */
export function useGameDurationAnalysis() {
  const [durationAnalysis, setDurationAnalysis] = useState<GameDurationAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchGameDurationAnalysis();
        setDurationAnalysis(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        console.error('Error fetching game duration analysis:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return {
    durationAnalysis,
    fetchingData: isLoading,
    apiError: error,
  };
}