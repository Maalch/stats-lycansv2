import { useGameStatsBase } from './utils/baseStatsHook';
import { computePlayerVotingBehavior, type PlayerVotingBehavior } from './utils/votingAnalysisUtils';

/**
 * Hook to get individual player voting behavior analysis
 */
export function usePlayerVotingBehaviorFromRaw() {
  return useGameStatsBase((gameData) => {
    return computePlayerVotingBehavior(gameData);
  });
}

export type { PlayerVotingBehavior };