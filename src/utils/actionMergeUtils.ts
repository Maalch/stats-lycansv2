/**
 * Action Merging Utilities
 * 
 * Merges player actions from GameLog (AWS - has Date/Position) and LegacyData (Google Sheets - has richer action types).
 * 
 * GameLog actions have:
 * - Precise Date (ISO timestamp)
 * - Position (x, y, z coordinates)
 * - Limited action types: DrinkPotion, UseGadget, Sabotage, Transform, Untransform
 * 
 * LegacyData actions have:
 * - No Date (null)
 * - No Position (null)
 * - Rich action types: UsePower, UsePowerDeath, VictimPower, VictimChaos, ChooseImitateur, NewMayor, etc.
 * - HunterShoot as explicit type (vs UseGadget with ActionName="Balle" in GameLog)
 */

import type { Action, MinimalPlayerStat, PlayerStat, GameLogEntry } from '../hooks/useCombinedRawData';

/**
 * Extended Action interface that tracks the source of the action
 */
export interface MergedAction extends Action {
  /** Whether this action has precise date/position from GameLog */
  hasGameLogData: boolean;
  /** Source of the action: 'gamelog', 'legacy', or 'merged' */
  source: 'gamelog' | 'legacy' | 'merged';
}

/**
 * Normalizes an ActionType for comparison between GameLog and LegacyData formats.
 * 
 * No special mappings currently - returns ActionType as-is.
 */
function normalizeActionType(action: Action): string {
  return action.ActionType;
}

/**
 * Creates a matching key for deduplication.
 * Actions are considered duplicates if they have the same:
 * - Normalized ActionType
 * - Timing (game phase like N1, J2, M1)
 * - ActionName (for potions, gadgets, powers)
 * - ActionTarget (for targeted actions)
 */
function createActionMatchKey(action: Action): string {
  const normalizedType = normalizeActionType(action);
  return `${normalizedType}|${action.Timing || ''}|${action.ActionName || ''}|${action.ActionTarget || ''}`;
}

/**
 * Merges actions from GameLog and LegacyData for a single player.
 * 
 * Strategy:
 * 1. Start with GameLog actions (they have Date/Position)
 * 2. Add LegacyData actions that don't exist in GameLog
 * 3. For duplicates, prefer GameLog data but enrich with LegacyData info if missing
 * 
 * @param gameLogActions - Actions from PlayerStats.Actions (AWS data)
 * @param legacyActions - Actions from LegacyData.PlayerStats.Actions (Google Sheets data)
 * @returns Merged array of actions with source tracking
 */
export function mergePlayerActions(
  gameLogActions: Action[] | undefined,
  legacyActions: Action[] | undefined
): MergedAction[] {
  const result: MergedAction[] = [];
  const matchedKeys = new Set<string>();

  // First pass: Add all GameLog actions (they have Date/Position)
  if (gameLogActions && Array.isArray(gameLogActions)) {
    for (const action of gameLogActions) {
      // IGNORE UseGadget with Balle - it's weapon reloading, not a tracked action
      if (action.ActionType === 'UseGadget' && action.ActionName === 'Balle') {
        continue;
      }
      
      const key = createActionMatchKey(action);
      matchedKeys.add(key);
      
      result.push({
        ...action,
        hasGameLogData: true,
        source: 'gamelog',
      });
    }
  }

  // Second pass: Add LegacyData actions that don't have a GameLog match
  if (legacyActions && Array.isArray(legacyActions)) {
    for (const action of legacyActions) {
      const key = createActionMatchKey(action);
      
      if (!matchedKeys.has(key)) {
        // This is a legacy-only action (like UsePower, VictimChaos, etc.)
        result.push({
          ...action,
          // Ensure Date and Position are null for legacy actions
          Date: action.Date || null as any,
          Position: action.Position || null as any,
          hasGameLogData: false,
          source: 'legacy',
        });
      }
      // If key already matched, the GameLog version is preferred (has Date/Position)
    }
  }

  // Sort by Timing for chronological order
  return result.sort((a, b) => {
    return compareTiming(a.Timing, b.Timing);
  });
}

/**
 * Compares game timing strings for sorting (e.g., "J1" < "N1" < "M1" < "J2")
 * Format: Letter (J=Jour, N=Nuit, M=Meeting) + Number
 */
function compareTiming(timingA: string | null, timingB: string | null): number {
  if (!timingA && !timingB) return 0;
  if (!timingA) return 1;
  if (!timingB) return -1;

  // Extract number and phase letter
  const parsePhase = (t: string) => {
    const match = t.match(/^([JNM])(\d+)$/i);
    if (!match) return { phase: 0, day: 0, raw: t };
    
    const letter = match[1].toUpperCase();
    const day = parseInt(match[2], 10);
    
    // Order within a day: J (morning) < N (night) < M (meeting)
    // Actually the order is typically: J (day) -> M (meeting) -> N (night)
    const phaseOrder: Record<string, number> = { 'J': 1, 'M': 2, 'N': 3 };
    
    return { phase: phaseOrder[letter] || 0, day, raw: t };
  };

  const a = parsePhase(timingA);
  const b = parsePhase(timingB);

  // Compare by day first, then by phase within day
  if (a.day !== b.day) return a.day - b.day;
  return a.phase - b.phase;
}

/**
 * Gets merged actions for a player from a game entry.
 * Handles matching between PlayerStats and LegacyData.PlayerStats by Steam ID.
 * 
 * @param game - The game log entry
 * @param playerStat - The player's stats from game.PlayerStats
 * @returns Merged actions array
 */
export function getMergedActionsForPlayer(
  game: GameLogEntry,
  playerStat: PlayerStat
): MergedAction[] {
  // Get GameLog actions
  const gameLogActions = playerStat.Actions;

  // Find matching LegacyData player by Steam ID
  let legacyActions: Action[] | undefined;
  
  if (game.LegacyData?.PlayerStats) {
    const playerId = playerStat.ID;
    const playerUsername = playerStat.Username.toLowerCase();
    
    // Try to match by Steam ID first
    let legacyPlayer: MinimalPlayerStat | undefined;
    if (playerId) {
      legacyPlayer = game.LegacyData.PlayerStats.find(
        lp => lp.ID === playerId
      );
    }
    
    // Fall back to username matching if no ID match
    if (!legacyPlayer) {
      legacyPlayer = game.LegacyData.PlayerStats.find(
        lp => lp.Username.toLowerCase() === playerUsername
      );
    }
    
    if (legacyPlayer) {
      legacyActions = legacyPlayer.Actions;
    }
  }

  return mergePlayerActions(gameLogActions, legacyActions);
}

/**
 * Checks if an action is from legacy data only (no Date/Position)
 */
export function isLegacyOnlyAction(action: MergedAction): boolean {
  return action.source === 'legacy' || !action.hasGameLogData;
}

/**
 * Maps HunterShoot from LegacyData format to statistics.
 * Only LegacyData has explicit HunterShoot actions with ActionTarget.
 * GameLog does not track hunter shots (UseGadget/Balle is weapon reloading, not shooting).
 * 
 * This function normalizes the LegacyData format for consistent statistics.
 */
export function normalizeHunterAction(action: Action | MergedAction): {
  isHunterShot: boolean;
  target: string | null;
} {
  // Only LegacyData format: HunterShoot
  if (action.ActionType === 'HunterShoot') {
    return { isHunterShot: true, target: action.ActionTarget };
  }
  
  return { isHunterShot: false, target: null };
}
