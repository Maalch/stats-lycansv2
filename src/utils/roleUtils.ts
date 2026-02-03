/**
 * Role Utility Functions
 * 
 * Provides helper functions for handling role normalization between legacy and new formats.
 * 
 * LEGACY FORMAT (before change):
 *   - MainRoleInitial: "Chasseur" or "Alchimiste"
 *   - Power: null
 * 
 * NEW FORMAT (after change):
 *   - MainRoleInitial: "Villageois Élite"
 *   - Power: "Chasseur", "Alchimiste", "Protecteur", or "Disciple"
 * 
 * These utilities abstract away the format differences and provide consistent role checking.
 */

import type { PlayerStat } from '../hooks/useCombinedRawData';

/**
 * Powers that are exclusive to Villageois Élite role
 * These were previously standalone MainRoleInitial values (Chasseur, Alchimiste)
 * and now include new powers (Protecteur, Disciple, Inquisiteur)
 */
export const VILLAGEOIS_ELITE_POWERS = ['Chasseur', 'Alchimiste', 'Protecteur', 'Disciple', 'Inquisiteur'] as const;

/**
 * Legacy roles that are now represented as Villageois Élite + Power
 */
export const LEGACY_ELITE_ROLES = ['Chasseur', 'Alchimiste'] as const;

/**
 * Check if a player is a Villageois Élite (either format)
 * 
 * @param player - PlayerStat object
 * @returns true if player is Villageois Élite (new format) or has a legacy elite role
 */
export function isVillageoisElite(player: PlayerStat): boolean {
  // New format: MainRoleInitial is "Villageois Élite"
  if (player.MainRoleInitial === 'Villageois Élite') {
    return true;
  }
  
  // Legacy format: MainRoleInitial is "Chasseur" or "Alchimiste"
  if (LEGACY_ELITE_ROLES.includes(player.MainRoleInitial as typeof LEGACY_ELITE_ROLES[number])) {
    return true;
  }
  
  return false;
}

/**
 * Get the effective power of a player (handles both formats)
 * 
 * For Villageois Élite (new format): returns the Power field
 * For legacy Chasseur/Alchimiste: returns the MainRoleInitial as the power
 * For other players: returns the Power field as-is
 * 
 * @param player - PlayerStat object
 * @returns The effective power string, or null if no power
 */
export function getEffectivePower(player: PlayerStat): string | null {
  // New format: Villageois Élite with Power containing the actual power
  if (player.MainRoleInitial === 'Villageois Élite') {
    return player.Power || null;
  }
  
  // Legacy format: Chasseur/Alchimiste as MainRoleInitial IS the power
  if (LEGACY_ELITE_ROLES.includes(player.MainRoleInitial as typeof LEGACY_ELITE_ROLES[number])) {
    return player.MainRoleInitial;
  }
  
  // Standard case: return Power field as-is
  return player.Power || null;
}

/**
 * Check if a player is/was a Hunter (Chasseur)
 * Handles both legacy format (MainRoleInitial === 'Chasseur') and new format (Power === 'Chasseur')
 * Also checks final role for role changes during game
 * 
 * @param player - PlayerStat object
 * @param finalRole - Optional: the player's final role after any role changes
 * @returns true if player was a Hunter at any point
 */
export function isHunter(player: PlayerStat, finalRole?: string): boolean {
  // Legacy format: MainRoleInitial is "Chasseur"
  if (player.MainRoleInitial === 'Chasseur') {
    return true;
  }
  
  // New format: Villageois Élite with Power "Chasseur"
  if (player.MainRoleInitial === 'Villageois Élite' && player.Power === 'Chasseur') {
    return true;
  }
  
  // Check final role if provided (for role changes during game)
  if (finalRole === 'Chasseur') {
    return true;
  }
  
  return false;
}

/**
 * Get the display role name for any player
 * For Villageois Élite, shows the power instead of the generic role
 * For Villageois with a power, shows the power
 * For all other roles, shows the MainRoleInitial
 * 
 * @param player - PlayerStat object
 * @returns The role name to display
 */
export function getRoleDisplayName(player: PlayerStat): string {
  // If it's Villageois Élite, return the power (handles both legacy and new format)
  if (player.MainRoleInitial === 'Villageois Élite') {
    return player.Power || 'Villageois Élite';
  }
  
  // If it's a legacy elite role (Chasseur, Alchimiste as MainRoleInitial), keep it
  if (LEGACY_ELITE_ROLES.includes(player.MainRoleInitial as typeof LEGACY_ELITE_ROLES[number])) {
    return player.MainRoleInitial;
  }
  
  // If it's regular Villageois with a power, return the power
  if (player.MainRoleInitial === 'Villageois' && player.Power) {
    return player.Power;
  }
  
  // Otherwise return the main role
  return player.MainRoleInitial;
}
