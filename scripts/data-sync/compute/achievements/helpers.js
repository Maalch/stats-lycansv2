/**
 * Achievement Helpers
 * 
 * Shared utility functions used by achievement evaluators.
 * Also re-exports datasyncExport utilities for convenience.
 */

// Re-export datasyncExport utilities used by evaluators
export { getPlayerId, getPlayerMainCampFromRole, getPlayerCampFromRole, getPlayerFinalRole, DeathTypeCode } from '../../../../src/utils/datasyncExport.js';

import { getPlayerCampFromRole, getPlayerFinalRole, getPlayerMainCampFromRole } from '../../../../src/utils/datasyncExport.js';

/**
 * Get player's camp accounting for role transformations.
 * useFinalRole : Use the final role after transformations.
 * groupOptions : Optional group options that may affect camp calculation (regroup Villageois, regroup Loup)
 * This ensures consistency with PlayerHistoryCamp calculations.
 */
export function getPlayerCampForAchievement(playerStat, useFinalRole = true, groupOptions = undefined) {
  const roleForCamp = useFinalRole
      ? getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || [])
      : playerStat.MainRoleInitial;
  const power = playerStat.Power ?? null;
  return getPlayerCampFromRole(roleForCamp, groupOptions, power);
}

/**
 * Check if a role is a "solo" camp (not Villageois, not Loup)
 */
export function isSoloCamp(role, power) {
  const mainCamp = getPlayerMainCampFromRole(role, power);
  return mainCamp === 'Autres';
}

/**
 * Check if player was a hunter (Chasseur) in legacy or new format
 */
export function isHunterRole(player) {
  const role = player.MainRoleInitial;
  const power = player.Power;
  const finalRole = getPlayerFinalRole(role, player.MainRoleChanges || []);
  return role === 'Chasseur' || finalRole === 'Chasseur' ||
         (role === 'Villageois Élite' && power === 'Chasseur');
}

/**
 * Check if player was a wolf (Loup camp)
 */
export function isWolfCamp(player, useFinalRole = false) {
  const camp = getPlayerCampForAchievement(player, useFinalRole, { regroupWolfSubRoles: true });
  return camp === 'Loup';
}

/**
 * Extract timing day number from DeathTiming string (e.g., "N1" → 1, "J3" → 3)
 */
export function getDeathDay(timing) {
  if (!timing) return null;
  const match = timing.match(/[NJ](\d+)/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Get the phase prefix from timing (N or J)
 */
export function getDeathPhase(timing) {
  if (!timing) return null;
  return timing.charAt(0); // 'N' or 'J'
}

/**
 * Check if a player is alive at a given meeting day.
 * Timing sequence within a cycle is: J(k) → N(k) → M(k).
 * - Died at J(k) or N(k): dead at M(k) and all later meetings
 * - Died at M(k): alive during M(k) itself (voted out at that meeting), dead afterwards
 */
export function isAliveAtMeeting(playerStat, day) {
  if (!playerStat.DeathTiming) return true;
  const match = playerStat.DeathTiming.match(/^([JNM])(\d+)$/);
  if (!match) return true;
  const phase = match[1];
  const cycle = parseInt(match[2]);
  if (phase === 'M') return cycle >= day; // alive at their own elimination meeting
  return cycle > day; // J or N deaths happen before M of same cycle
}
