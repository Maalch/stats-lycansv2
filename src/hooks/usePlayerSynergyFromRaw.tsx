import { usePlayerStatsBase } from './utils/baseStatsHook';
import { computePlayerSynergyStats } from './utils/playerSynergyUtils';

export type { PlayerSynergyData, PlayerSynergyPair, ChartSynergyPair } from './utils/playerSynergyUtils';

/**
 * Hook pour calculer les scores de synergie entre joueurs à partir des données brutes filtrées.
 */
export function usePlayerSynergyFromRaw() {
  const { data: synergyStats, isLoading, error } = usePlayerStatsBase(
    (gameData) => computePlayerSynergyStats(gameData)
  );

  return {
    data: synergyStats,
    isLoading,
    error
  };
}
