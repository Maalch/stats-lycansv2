import { useGameStatsBase } from './utils/baseStatsHook';
import { computeVotingStats, type VotingStats } from './utils/votingAnalysisUtils';

/**
 * Hook to get overall voting statistics across all games
 */
export function useVotingStatsFromRaw() {
  return useGameStatsBase((gameData) => {
    return computeVotingStats(gameData);
  });
}

export type { VotingStats };