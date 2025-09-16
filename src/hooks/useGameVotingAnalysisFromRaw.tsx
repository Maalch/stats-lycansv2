import { useGameStatsBase } from './utils/baseStatsHook';
import { computeGameVotingAnalysis, type GameVotingAnalysis, type MeetingVoteAnalysis } from './utils/votingAnalysisUtils';

/**
 * Hook to analyze voting patterns in individual games
 */
export function useGameVotingAnalysisFromRaw() {
  return useGameStatsBase((gameData) => {
    return computeGameVotingAnalysis(gameData);
  });
}

export type { GameVotingAnalysis, MeetingVoteAnalysis };