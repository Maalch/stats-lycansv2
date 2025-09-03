import { useGameStatsBase } from './utils/baseStatsHook';
import { computeGameDurationAnalysis } from './utils/gameDurationAnalysisUtils';

/**
 * Hook pour calculer les statistiques de durée de partie à partir des données brutes filtrées.
 * Implémente la même logique que _computeGameDurationAnalysis du Google Apps Script.
 */
export function useGameDurationAnalysisFromRaw() {
  const { data: durationAnalysis, isLoading, error } = useGameStatsBase(computeGameDurationAnalysis);

  return {
    durationAnalysis,
    fetchingData: isLoading,
    apiError: error,
  };
}
