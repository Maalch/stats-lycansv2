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
 * and now include new powers (Protecteur, Disciple)
 */
export const VILLAGEOIS_ELITE_POWERS = ['Chasseur', 'Alchimiste', 'Protecteur', 'Disciple'] as const;

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
 * Check if a player is/was an Alchimiste
 * Handles both legacy format (MainRoleInitial === 'Alchimiste') and new format (Power === 'Alchimiste')
 * Also checks final role for role changes during game
 * 
 * @param player - PlayerStat object
 * @param finalRole - Optional: the player's final role after any role changes
 * @returns true if player was an Alchimiste at any point
 */
export function isAlchimiste(player: PlayerStat, finalRole?: string): boolean {
  // Legacy format: MainRoleInitial is "Alchimiste"
  if (player.MainRoleInitial === 'Alchimiste') {
    return true;
  }
  
  // New format: Villageois Élite with Power "Alchimiste"
  if (player.MainRoleInitial === 'Villageois Élite' && player.Power === 'Alchimiste') {
    return true;
  }
  
  // Check final role if provided (for role changes during game)
  if (finalRole === 'Alchimiste') {
    return true;
  }
  
  return false;
}

/**
 * Check if a player is/was a Protecteur
 * Only available in new format (Villageois Élite with Power "Protecteur")
 * 
 * @param player - PlayerStat object
 * @param finalRole - Optional: the player's final role after any role changes
 * @returns true if player was a Protecteur at any point
 */
export function isProtecteur(player: PlayerStat, finalRole?: string): boolean {
  // New format only: Villageois Élite with Power "Protecteur"
  if (player.MainRoleInitial === 'Villageois Élite' && player.Power === 'Protecteur') {
    return true;
  }
  
  // Check final role if provided (for role changes during game)
  if (finalRole === 'Protecteur') {
    return true;
  }
  
  return false;
}

/**
 * Check if a player is/was a Disciple
 * Only available in new format (Villageois Élite with Power "Disciple")
 * 
 * @param player - PlayerStat object
 * @param finalRole - Optional: the player's final role after any role changes
 * @returns true if player was a Disciple at any point
 */
export function isDisciple(player: PlayerStat, finalRole?: string): boolean {
  // New format only: Villageois Élite with Power "Disciple"
  if (player.MainRoleInitial === 'Villageois Élite' && player.Power === 'Disciple') {
    return true;
  }
  
  // Check final role if provided (for role changes during game)
  if (finalRole === 'Disciple') {
    return true;
  }
  
  return false;
}

/**
 * Check if a player has a specific Villageois Élite power (handles both formats)
 * 
 * @param player - PlayerStat object
 * @param power - The power to check for (e.g., 'Chasseur', 'Alchimiste', 'Protecteur', 'Disciple')
 * @returns true if player has the specified power
 */
export function hasElitePower(player: PlayerStat, power: string): boolean {
  // Legacy format: MainRoleInitial is the power itself (Chasseur/Alchimiste)
  if (player.MainRoleInitial === power && LEGACY_ELITE_ROLES.includes(power as typeof LEGACY_ELITE_ROLES[number])) {
    return true;
  }
  
  // New format: Villageois Élite with matching Power
  if (player.MainRoleInitial === 'Villageois Élite' && player.Power === power) {
    return true;
  }
  
  return false;
}

/**
 * Get the display name for a Villageois Élite power
 * This ensures consistent naming across the application
 * 
 * @param player - PlayerStat object
 * @returns The power name for display, or null if not a Villageois Élite
 */
export function getElitePowerDisplayName(player: PlayerStat): string | null {
  // New format
  if (player.MainRoleInitial === 'Villageois Élite' && player.Power) {
    return player.Power;
  }
  
  // Legacy format
  if (LEGACY_ELITE_ROLES.includes(player.MainRoleInitial as typeof LEGACY_ELITE_ROLES[number])) {
    return player.MainRoleInitial;
  }
  
  return null;
}
