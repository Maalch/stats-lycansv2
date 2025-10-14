/**
 * Hook for calculating global voting statistics (non-player-focused)
 */
import { usePlayerStatsBase } from './utils/baseStatsHook';
import { calculateGlobalVotingStats, type GlobalVotingStats } from './utils/votingStatsUtils';

/**
 * Computes global voting statistics across all games
 * Includes: meeting day analysis, camp accuracy, and overall metrics
 */
export function useGlobalVotingStatsFromRaw() {
  return usePlayerStatsBase((gameData): GlobalVotingStats | null => {
    if (!gameData || gameData.length === 0) {
      return null;
    }

    // Filter games that have voting data
    const gamesWithVotingData = gameData.filter(game => 
      game.PlayerStats.some(player => player.Votes && player.Votes.length > 0)
    );

    if (gamesWithVotingData.length === 0) {
      return null;
    }

    return calculateGlobalVotingStats(gamesWithVotingData);
  });
}
