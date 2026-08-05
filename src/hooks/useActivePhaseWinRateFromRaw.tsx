import { useGameStatsBase } from './utils/baseStatsHook';
import { computeActivePhaseWinRateStats } from './utils/activePhaseWinRateUtils';

/**
 * Hook pour calculer le taux de victoire des camps à "phase active" (La Bête, Mercenaire,
 * Contrebandier, Cultiste) parmi les parties où cette phase a été lancée.
 */
export function useActivePhaseWinRateFromRaw() {
  const { data: activePhaseWinRateStats, isLoading, error } = useGameStatsBase(computeActivePhaseWinRateStats);

  return {
    activePhaseWinRateStats,
    isLoading,
    errorInfo: error,
  };
}
