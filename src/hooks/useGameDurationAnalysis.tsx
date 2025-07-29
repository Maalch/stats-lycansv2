import { useState, useEffect } from 'react';
import type { GameDurationAnalysisResponse } from '../types/api';

export function useGameDurationAnalysis() {
  const [gameMetrics, setGameMetrics] = useState<GameDurationAnalysisResponse | null>(null);
  const [fetchingData, setFetchingData] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  
  useEffect(() => {
    const retrieveDurationStats = async () => {
      try {
        setFetchingData(true);
        setApiError(null);
        
        const serviceUrl = import.meta.env.VITE_LYCANS_API_BASE || '';
        const dataRequest = await fetch(`${serviceUrl}?action=gameDurationAnalysis`);
        
        if (!dataRequest.ok) {
          throw new Error(`Échec de la requête: ${dataRequest.statusText}`);
        }
        
        const analyticsData = await dataRequest.json();
        
        if (analyticsData.error) {
          throw new Error(analyticsData.error);
        }
        
        setGameMetrics(analyticsData);
      } catch (exception) {
        console.error('Impossible de charger les données de durée de partie:', exception);
        setApiError(exception instanceof Error ? exception.message : 'Erreur inconnue');
      } finally {
        setFetchingData(false);
      }
    };
    
    retrieveDurationStats();
  }, []);
  
  return { durationAnalysis: gameMetrics, fetchingData, apiError };
}