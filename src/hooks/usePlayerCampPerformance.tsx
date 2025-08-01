import { useState, useEffect } from 'react';

export interface CampAverage {
  camp: string;
  totalGames: number;
  winRate: string;
}

export interface PlayerCampPerformance {
  camp: string;
  games: number;
  wins: number;
  winRate: string;
  campAvgWinRate: string;
  performance: string;
}

export interface PlayerPerformance {
  player: string;
  totalGames: number;
  campPerformance: PlayerCampPerformance[];
}

export interface PlayerCampPerformanceResponse {
  campAverages: CampAverage[];
  playerPerformance: PlayerPerformance[];
  minGamesRequired: number;
}

export function usePlayerCampPerformance() {
  const [data, setData] = useState<PlayerCampPerformanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchPlayerCampPerformance = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const apiRoot = import.meta.env.VITE_LYCANS_API_BASE || '';
        const response = await fetch(`${apiRoot}?action=playerCampPerformance`);
        
        if (!response.ok) {
          throw new Error(`Erreur réseau: ${response.status}`);
        }
        
        const jsonResult = await response.json();
        
        if (jsonResult.error) {
          throw new Error(jsonResult.error);
        }
        
        setData(jsonResult);
      } catch (err) {
        console.error('Erreur lors du chargement des statistiques de performance par camp:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPlayerCampPerformance();
  }, []);
  
  return { 
    playerCampPerformance: data, 
    isLoading, 
    error 
  };
}