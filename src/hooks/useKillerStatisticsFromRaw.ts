import { usePlayerStatsBase } from './utils/baseStatsHook';
import { computeKillerStatistics, type KillerStatistics } from './utils/killerStatisticsUtils';

/**
 * Hook to get killer statistics (max kills per game and per night)
 */
export function useKillerStatisticsFromRaw() {
  return usePlayerStatsBase<KillerStatistics>((gameData) => {
    return computeKillerStatistics(gameData);
  });
}
