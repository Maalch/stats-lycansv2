import { usePlayerStatsBase } from './utils/baseStatsHook';
import { computeKillerStatistics, type KillerStatistics } from './utils/killerStatisticsUtils';

/**
 * Hook to get killer statistics (max kills per game and per night)
 * @param killerCampFilter - Filter for killer's camp (e.g., 'Tous les camps', 'Villageois', 'Loups')
 * @param victimCampFilter - Filter for victim's camp (e.g., 'Tous les camps', 'Villageois', 'Loups', 'Roles solo')
 */
export function useKillerStatisticsFromRaw(
  killerCampFilter: string = 'Tous les camps',
  victimCampFilter: string = 'Tous les camps'
) {
  return usePlayerStatsBase<KillerStatistics>((gameData) => {
    return computeKillerStatistics(gameData, killerCampFilter, victimCampFilter);
  });
}
