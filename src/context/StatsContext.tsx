// src/context/StatsContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { fetchCombinedStats } from '../api/statsApi';
import type { 
  CampWinStatsResponse, 
  HarvestStatsResponse, 
  GameDurationAnalysisResponse, 
  PlayerStatsData, 
  PlayerPairingStatsData, 
  PlayerCampPerformanceResponse 
} from '../types/api';

// Define more specific types using existing interfaces
export interface CombinedStatsData {
  campWinStats?: CampWinStatsResponse;
  harvestStats?: HarvestStatsResponse;
  gameDurationAnalysis?: GameDurationAnalysisResponse;
  playerStats?: PlayerStatsData;
  playerPairingStats?: PlayerPairingStatsData;
  playerCampPerformance?: PlayerCampPerformanceResponse;
}

type StatsContextType = {
  combinedData: CombinedStatsData | null;
  isLoading: boolean;
  error: string | null;
  refetchData: () => void;
};

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export function StatsProvider({ children }: { children: ReactNode }) {
  const [combinedData, setCombinedData] = useState<CombinedStatsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all commonly used stats at once
      const data = await fetchCombinedStats([
        'campWinStats',
        'harvestStats',
        'gameDurationAnalysis',
        'playerStats',
        'playerPairingStats',
        'playerCampPerformance'
      ]);
      setCombinedData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      console.error('Error fetching combined stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <StatsContext.Provider value={{ combinedData, isLoading, error, refetchData: fetchData }}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStatsContext() {
  const context = useContext(StatsContext);
  if (context === undefined) {
    throw new Error('useStatsContext must be used within a StatsProvider');
  }
  return context;
}