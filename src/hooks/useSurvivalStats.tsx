import { useState, useEffect } from 'react';
import type { RoleSurvivalStatsResponse } from '../types/api';

export function useRoleSurvivalStats() {
  const [survivalInfo, setSurvivalInfo] = useState<RoleSurvivalStatsResponse | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  useEffect(() => {
    const obtainRoleSurvivalData = async () => {
      try {
        setDataLoading(true);
        setFetchError(null);
        
        const apiEndpoint = import.meta.env.VITE_LYCANS_API_BASE || '';
        const apiResponse = await fetch(`${apiEndpoint}?action=roleSurvivalStats`);
        
        if (!apiResponse.ok) {
          throw new Error(`Erreur de requête: ${apiResponse.status}`);
        }
        
        const parsedData = await apiResponse.json();
        
        if (parsedData.error) {
          throw new Error(parsedData.error);
        }
        
        setSurvivalInfo(parsedData);
      } catch (err) {
        console.error('Problème lors de la récupération des stats de survie des rôles:', err);
        setFetchError(err instanceof Error ? err.message : 'Erreur lors du chargement');
      } finally {
        setDataLoading(false);
      }
    };
    
    obtainRoleSurvivalData();
  }, []);
  
  return { roleSurvivalStats: survivalInfo, dataLoading, fetchError };
}