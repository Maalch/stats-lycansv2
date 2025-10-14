import { useMemo } from 'react';
import { usePlayerStatsBase } from './utils/baseStatsHook';
import { calculateAggregatedVotingStats } from './utils/votingStatsUtils';
import type { 
  VotingBehaviorStats,
  VotingAccuracyStats, 
  VotingTargetStats
} from './utils/votingStatsUtils';

export interface VotingStatisticsResult {
  playerBehaviorStats: VotingBehaviorStats[];
  playerAccuracyStats: VotingAccuracyStats[];
  playerTargetStats: VotingTargetStats[];
  overallMeetingStats: {
    totalMeetings: number;
    averageParticipationRate: number;
    totalVotes: number;
    totalSkips: number;
    totalAbstentions: number;
  };
}

/**
 * Hook to get comprehensive voting behavior statistics from game data
 */
export function useVotingStatisticsFromRaw() {
  return usePlayerStatsBase((gameData): VotingStatisticsResult | null => {
    if (!gameData || gameData.length === 0) {
      return null;
    }

    // Filter games that have voting data (at least one player with votes)
    const gamesWithVotingData = gameData.filter(game => 
      game.PlayerStats.some(player => player.Votes && player.Votes.length > 0)
    );

    if (gamesWithVotingData.length === 0) {
      return null;
    }

    return calculateAggregatedVotingStats(gamesWithVotingData);
  });
}

/**
 * Hook to get voting statistics filtered by minimum participation threshold
 */
export function useFilteredVotingStatistics(minMeetings: number = 5) {
  const { data: allVotingStats, isLoading, error } = useVotingStatisticsFromRaw();
  
  const filteredData = useMemo(() => {
    if (!allVotingStats) return null;

    return {
      ...allVotingStats,
      playerBehaviorStats: allVotingStats.playerBehaviorStats.filter(
        player => player.totalMeetings >= minMeetings
      ),
      playerAccuracyStats: allVotingStats.playerAccuracyStats.filter(
        player => player.totalVotes >= Math.ceil(minMeetings * 0.6) // At least 60% voting rate
      ),
      playerTargetStats: allVotingStats.playerTargetStats.filter(
        player => player.totalTimesTargeted >= Math.ceil(minMeetings * 0.3) // Targeted at least 30% of the time
      )
    };
  }, [allVotingStats, minMeetings]);

  return {
    data: filteredData,
    isLoading,
    error
  };
}