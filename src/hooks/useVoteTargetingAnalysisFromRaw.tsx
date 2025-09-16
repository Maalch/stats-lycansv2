import { useGameStatsBase } from './utils/baseStatsHook';
import { computeVoteTargetingAnalysis, type VoteTargetingAnalysis } from './utils/votingAnalysisUtils';

/**
 * Hook to analyze who gets targeted by votes most often
 */
export function useVoteTargetingAnalysisFromRaw() {
  return useGameStatsBase((gameData) => {
    return computeVoteTargetingAnalysis(gameData);
  });
}

export type { VoteTargetingAnalysis };