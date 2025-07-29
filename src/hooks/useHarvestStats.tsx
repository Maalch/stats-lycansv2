import { useState, useEffect } from 'react';
import type { HarvestStatsResponse } from '../types/api';

export function useHarvestStats() {
  const [harvestData, setHarvestData] = useState<HarvestStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  useEffect(() => {
    const getLycansHarvestData = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        
        const baseUrl = import.meta.env.VITE_LYCANS_API_BASE || '';
        const response = await fetch(`${baseUrl}?action=harvestStats`);
        
        if (!response.ok) {
          throw new Error(`Problème serveur: ${response.statusText}`);
        }
        
        const resultJson = await response.json();
        
        if (resultJson.error) {
          throw new Error(resultJson.error);
        }
        
        setHarvestData(resultJson);
      } catch (error) {
        console.error('Échec du chargement des données de récolte:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Erreur pendant le chargement');
      } finally {
        setIsLoading(false);
      }
    };
    
    getLycansHarvestData();
  }, []);
  
  return { harvestStats: harvestData, isLoading, errorMessage };
}