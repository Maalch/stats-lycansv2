import { useFullStatsBase } from './utils/baseStatsHook';
import { computeGameDetails, type EnrichedGameData } from './utils/gameDetailsUtils';
import type { NavigationFilters } from '../context/NavigationContext';

export type { EnrichedGameData };

/**
 * Hook pour calculer les détails des parties enrichies à partir des données brutes filtrées.
 * Combine les données de jeu, de rôles et de Ponce pour fournir une vue complète des parties.
 */
export function useGameDetailsFromRaw(filters?: NavigationFilters) {
  const { data: enrichedGames, isLoading, error } = useFullStatsBase(
    (gameData) => computeGameDetails(gameData, filters)
  );

  return {
    data: enrichedGames || [],
    isLoading,
    error
  };
}

export default useGameDetailsFromRaw;
