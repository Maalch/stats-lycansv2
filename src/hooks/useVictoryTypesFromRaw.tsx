import { useGameStatsBase } from './utils/baseStatsHook';
import { 
  computeVictoryTypesStats,
  type VictoryType,
  type VictoryTypesResponse 
} from './utils/victoryTypesUtils';

export type { VictoryType, VictoryTypesResponse };

/**
 * Hook pour calculer les statistiques de types de victoire à partir des données brutes filtrées.
 * Calcule la répartition des victoires par type et par camp.
 */
export function useVictoryTypesFromRaw() {
  const { data: victoryTypesStats, isLoading, error } = useGameStatsBase(computeVictoryTypesStats);

  return {
    victoryTypesStats,
    isLoading,
    errorInfo: error,
  };
}
