import { useGameStatsBase } from './utils/baseStatsHook';
import { computeTeamCompositionStats } from './utils/teamCompositionUtils';

/**
 * Hook to get team composition statistics
 * Uses the base hook pattern for automatic filtering support
 */
export function useTeamCompositionStatsFromRaw() {
  const { data, isLoading, error } = useGameStatsBase(
    computeTeamCompositionStats
  );

  return {
    teamCompositionStats: data,
    isLoading,
    error,
  };
}
