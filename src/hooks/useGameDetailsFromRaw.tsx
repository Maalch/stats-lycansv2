import { useFullStatsBase } from './utils/baseStatsHook';
import { computeGameDetailsFromGameLog } from './utils/gameDetailsUtils';
import type { NavigationFilters } from '../context/NavigationContext';

/**
 * Hook pour calculer les détails des parties enrichies à partir des données brutes filtrées.
 * Combine les données de jeu pour fournir une vue complète des parties.
 */
export function useGameDetailsFromRaw(filters?: NavigationFilters) {
  const { data: enrichedGames, isLoading, error } = useFullStatsBase(
    (gameData) => computeGameDetailsFromGameLog(gameData, filters)
  );

  return {
    data: enrichedGames || [],
    isLoading,
    error
  };
}

export default useGameDetailsFromRaw;
