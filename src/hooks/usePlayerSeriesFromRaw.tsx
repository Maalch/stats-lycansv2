import { usePlayerStatsBase } from './utils/baseStatsHook';
import { computePlayerSeries } from './utils/playerSeriesUtils';

// Re-export interfaces for convenience
export type { CampSeries, WinSeries, LossSeries, PlayerSeriesData } from './utils/playerSeriesUtils';

/**
 * Hook pour calculer les séries les plus longues des joueurs à partir des données brutes filtrées.
 * Calcule les séries de camps consécutifs (Villageois/Loups) et les séries de victoires.
 * 
 */
export function usePlayerSeriesFromRaw() {
  const { data: seriesData, isLoading, error } = usePlayerStatsBase(
    (gameData, roleData) => computePlayerSeries(gameData, roleData)
  );

  return {
    data: seriesData,
    isLoading,
    error
  };
}
