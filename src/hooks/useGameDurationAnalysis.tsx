import { useStatsContext } from '../context/StatsContext';
import type { GameDurationAnalysisResponse } from '../types/api';

/**
 * Hook pour obtenir les statistiques de durée de partie.
 * Utilise StatsContext pour éviter les appels API redondants.
 */
export function useGameDurationAnalysis() {
  const { combinedData, isLoading, error } = useStatsContext();

  // On suppose que le backend renvoie gameDurationAnalysis dans combinedData
  const durationAnalysis: GameDurationAnalysisResponse | null =
    combinedData && combinedData.gameDurationAnalysis ? combinedData.gameDurationAnalysis : null;

  return {
    durationAnalysis,
    fetchingData: isLoading,
    apiError: error,
  };
}