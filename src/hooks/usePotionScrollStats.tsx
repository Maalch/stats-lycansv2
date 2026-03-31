import { useGameStatsBase } from './utils/baseStatsHook';
import { computePotionScrollStats, type CampFilter, type EffectFilter } from './utils/potionScrollStatsUtils';

export function usePotionScrollStats(campFilter: CampFilter = 'all', effectFilter: EffectFilter = 'all') {
  const { data, isLoading, error } = useGameStatsBase(
    (gameData) => computePotionScrollStats(gameData, campFilter, effectFilter)
  );

  return {
    data,
    isLoading,
    error
  };
}
