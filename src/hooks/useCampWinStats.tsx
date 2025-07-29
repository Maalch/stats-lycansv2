import { useState, useEffect } from 'react';
import type { CampWinStatsResponse } from '../types/api';

export function useCampWinStats() {
  const [lycansData, setLycansData] = useState<CampWinStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchLycansWinData = async () => {
      try {
        setIsLoading(true);
        setErrorInfo(null);
        
        const apiRoot = import.meta.env.VITE_LYCANS_API_BASE || '';
        const responseData = await fetch(`${apiRoot}?action=campWinStats`);
        
        if (!responseData.ok) {
          throw new Error(`Erreur réseau: ${responseData.status}`);
        }
        
        const jsonResult = await responseData.json();
        
        if (jsonResult.error) {
          throw new Error(jsonResult.error);
        }
        
        setLycansData(jsonResult);
      } catch (err) {
        console.error('Erreur lors du chargement des statistiques de victoire:', err);
        setErrorInfo(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLycansWinData();
  }, []);
  
  return { campWinStats: lycansData, isLoading, errorInfo };
}