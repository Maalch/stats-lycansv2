import { useGameStatsBase } from './utils/baseStatsHook';
import { computePotionScrollStats, type CampFilter } from './utils/potionScrollStatsUtils';

export function usePotionScrollStats(campFilter: CampFilter = 'all') {
  const { data, isLoading, error } = useGameStatsBase(
    (gameData) => computePotionScrollStats(gameData, campFilter)
  );

  return {
    data,
    isLoading,
    error
  };
}
