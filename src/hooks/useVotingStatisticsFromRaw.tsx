import { useMemo } from 'react';
import { usePlayerStatsBase } from './utils/baseStatsHook';
import { calculateAggregatedVotingStats, calculateVotingTimingStats } from './utils/votingStatsUtils';
import type { 
  VotingBehaviorStats,
  VotingAccuracyStats, 
  VotingTargetStats,
  VotingTimingStats
} from './utils/votingStatsUtils';

export interface VotingStatisticsResult {
  playerBehaviorStats: VotingBehaviorStats[];
  playerAccuracyStats: VotingAccuracyStats[];
  playerTargetStats: VotingTargetStats[];
  playerTimingStats: VotingTimingStats[];
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

    const aggregatedStats = calculateAggregatedVotingStats(gamesWithVotingData);
    const timingStats = calculateVotingTimingStats(gamesWithVotingData);

    return {
      ...aggregatedStats,
      playerTimingStats: timingStats
    };
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
        player => player.totalMeetings >= minMeetings
      ),
      playerTargetStats: allVotingStats.playerTargetStats.filter(
        player => player.totalTimesTargeted >= minMeetings
      ),
      playerTimingStats: allVotingStats.playerTimingStats.filter(
        player => player.totalTimedVotes >= minMeetings
      )
    };
  }, [allVotingStats, minMeetings]);

  return {
    data: filteredData,
    isLoading,
    error
  };
}