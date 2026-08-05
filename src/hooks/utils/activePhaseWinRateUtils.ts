import type { GameLogEntry } from '../useCombinedRawData';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../../utils/datasyncExport';
import { DEATH_TYPES, type DeathType } from '../../types/deathTypes';

export interface ActivePhaseWinRateStat {
  camp: string;
  wins: number;
  failures: number;
  total: number;
  winRate: number;
}

// Camps whose "active phase" (once launched) resolves to either a win or this specific failure death type
const ACTIVE_PHASE_CAMPS: { camp: string; failureType: DeathType }[] = [
  { camp: 'La Bête', failureType: DEATH_TYPES.STARVATION_AS_BEAST },
  { camp: 'Mercenaire', failureType: DEATH_TYPES.MERCENARY_HUNT_KILL },
  { camp: 'Contrebandier', failureType: DEATH_TYPES.SMUGGLER_HUNT_KILL },
  { camp: 'Cultiste', failureType: DEATH_TYPES.CULTIST_FAILED },
];

/**
 * Computes, for each of the 4 "active phase" solo camps, the win rate among games
 * where the active phase was actually launched (win, or the camp-specific failure death).
 * Deaths by any other means (e.g. killed before triggering the phase) are excluded from the denominator.
 */
export function computeActivePhaseWinRateStats(gameData: GameLogEntry[]): ActivePhaseWinRateStat[] {
  const counts: Record<string, { wins: number; failures: number }> = {};
  ACTIVE_PHASE_CAMPS.forEach(({ camp }) => {
    counts[camp] = { wins: 0, failures: 0 };
  });

  gameData.forEach(game => {
    game.PlayerStats.forEach(playerStat => {
      const roleForCamp = getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []);
      const camp = getPlayerCampFromRole(roleForCamp, { regroupWolfSubRoles: true });

      const config = ACTIVE_PHASE_CAMPS.find(c => c.camp === camp);
      if (!config) return;

      if (playerStat.Victorious) {
        counts[camp].wins++;
      } else if (playerStat.DeathType === config.failureType) {
        counts[camp].failures++;
      }
    });
  });

  return ACTIVE_PHASE_CAMPS.map(({ camp }) => {
    const { wins, failures } = counts[camp];
    const total = wins + failures;
    return {
      camp,
      wins,
      failures,
      total,
      winRate: total > 0 ? (wins / total) * 100 : 0
    };
  });
}
