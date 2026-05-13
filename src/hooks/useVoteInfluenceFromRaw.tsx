/**
 * Hook for calculating vote influence statistics (speaking time & timing impact)
 */
import { usePlayerStatsBase } from './utils/baseStatsHook';
import { calculateVoteInfluenceStats, type VoteInfluenceStats } from './utils/voteInfluenceUtils';

/**
 * Computes vote influence statistics across timed modded games.
 * Analyzes relationships between speaking time, vote timing, and vote outcomes.
 */
export function useVoteInfluenceFromRaw() {
  return usePlayerStatsBase((gameData): VoteInfluenceStats | null => {
    if (!gameData || gameData.length === 0) {
      return null;
    }

    return calculateVoteInfluenceStats(gameData);
  });
}
