import { useGameStatsBase } from './utils/baseStatsHook';
import { computeSessionTimesAnalysis } from './utils/sessionTimesAnalysisUtils';
import type { SessionTimesAnalysis } from './utils/sessionTimesAnalysisUtils';

export type { SessionTimesAnalysis };

export function useSessionTimesAnalysis(): {
  sessionTimesData: SessionTimesAnalysis | null;
  isLoading: boolean;
  error: string | null;
} {
  const { data, isLoading, error } = useGameStatsBase(computeSessionTimesAnalysis);
  return { sessionTimesData: data, isLoading, error };
}
