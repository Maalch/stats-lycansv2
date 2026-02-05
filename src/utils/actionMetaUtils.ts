import type { GameLogEntry, PlayerStat, Action } from '../hooks/useCombinedRawData';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../utils/datasyncExport';

/**
 * Parse timing string to get phase number
 * @param timing - e.g., "N1", "N2", "J3", "M4"
 * @returns Phase number (1, 2, 3, etc.) or null if invalid
 */
export function parseTimingPhase(timing: string | null): number | null {
  if (!timing) return null;
  const match = timing.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Get timing type (Night, Day, Meeting)
 * @param timing - e.g., "N1", "J2", "M3"
 * @returns "Night", "Day", "Meeting", or null
 */
export function getTimingType(timing: string | null): 'Night' | 'Day' | 'Meeting' | null {
  if (!timing) return null;
  const firstChar = timing.charAt(0).toUpperCase();
  if (firstChar === 'N') return 'Night';
  if (firstChar === 'J') return 'Day';
  if (firstChar === 'M') return 'Meeting';
  return null;
}

/**
 * Get player's camp from a game
 */
export function getPlayerCamp(playerStat: PlayerStat): string {
  const finalRole = getPlayerFinalRole(
    playerStat.MainRoleInitial,
    playerStat.MainRoleChanges || []
  );
  return getPlayerCampFromRole(finalRole, {
    regroupLovers: true,
    regroupVillagers: true,
    regroupWolfSubRoles: false
  }, playerStat.Power);
}

/**
 * Get the winning camp of a game
 */
export function getWinnerCamp(game: GameLogEntry): string | null {
  const victoriousPlayers = game.PlayerStats.filter((p: PlayerStat) => p.Victorious);
  if (victoriousPlayers.length === 0) return null;
  return getPlayerCamp(victoriousPlayers[0]);
}

/**
 * Filter actions by type
 */
export function filterActionsByType(actions: Action[], actionType: string): Action[] {
  return actions.filter(a => a.ActionType === actionType);
}

/**
 * Get first action of a specific type
 */
export function getFirstActionOfType(actions: Action[], actionType: string): Action | null {
  const filtered = filterActionsByType(actions, actionType);
  if (filtered.length === 0) return null;
  // Sort by date to get first
  return filtered.sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())[0];
}

/**
 * Count actions by name (for gadgets/potions)
 */
export function countActionsByName(actions: Action[], actionType: string): Map<string, number> {
  const counts = new Map<string, number>();
  actions
    .filter(a => a.ActionType === actionType && a.ActionName)
    .forEach(a => {
      const name = a.ActionName!;
      counts.set(name, (counts.get(name) || 0) + 1);
    });
  return counts;
}

/**
 * Check if player used specific action in game
 */
export function playerUsedAction(
  playerStat: PlayerStat,
  actionType: string,
  actionName?: string
): boolean {
  if (!playerStat.Actions) return false;
  return playerStat.Actions.some((a: Action) => {
    if (a.ActionType !== actionType) return false;
    if (actionName && a.ActionName !== actionName) return false;
    return true;
  });
}

/**
 * Get baseline win rate for a camp across all games
 */
export function getBaselineWinRate(games: GameLogEntry[], camp: string): number {
  let campWins = 0;
  let campAppearances = 0;

  games.forEach((game: GameLogEntry) => {
    game.PlayerStats.forEach((player: PlayerStat) => {
      const playerCamp = getPlayerCamp(player);
      if (playerCamp === camp) {
        campAppearances++;
        if (player.Victorious) {
          campWins++;
        }
      }
    });
  });

  return campAppearances > 0 ? (campWins / campAppearances) * 100 : 0;
}

/**
 * Calculate win rate for players who used a specific action
 */
export function calculateActionWinRate(
  games: GameLogEntry[],
  actionType: string,
  actionName?: string,
  campFilter?: string
): {
  winRate: number;
  wins: number;
  total: number;
  baselineWinRate: number;
  delta: number;
} {
  let wins = 0;
  let total = 0;

  games.forEach((game: GameLogEntry) => {
    game.PlayerStats.forEach((player: PlayerStat) => {
      // Apply camp filter if specified
      if (campFilter) {
        const playerCamp = getPlayerCamp(player);
        if (playerCamp !== campFilter) return;
      }

      // Check if player used the action
      const usedAction = playerUsedAction(player, actionType, actionName);
      if (!usedAction) return;

      total++;
      if (player.Victorious) {
        wins++;
      }
    });
  });

  const winRate = total > 0 ? (wins / total) * 100 : 0;
  const baselineWinRate = campFilter ? getBaselineWinRate(games, campFilter) : 50;
  const delta = winRate - baselineWinRate;

  return { winRate, wins, total, baselineWinRate, delta };
}
