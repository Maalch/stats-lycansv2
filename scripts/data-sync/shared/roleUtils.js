/**
 * Role Utility Functions (JavaScript version for server-side scripts)
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
 */

/**
 * Powers that are exclusive to Villageois Élite role
 */
export const VILLAGEOIS_ELITE_POWERS = ['Chasseur', 'Alchimiste', 'Protecteur', 'Disciple'];

/**
 * Legacy roles that became powers
 */
export const LEGACY_ELITE_ROLES = ['Chasseur', 'Alchimiste'];

/**
 * Get the effective power of a player (handles both formats)
 * 
 * For Villageois Élite (new format): returns the Power field
 * For legacy Chasseur/Alchimiste: returns the MainRoleInitial as the power
 * For other players: returns the Power field as-is
 * 
 * @param {Object} player - Player object with MainRoleInitial and Power fields
 * @returns {string|null} The effective power string, or null if no power
 */
export function getEffectivePowerJS(player) {
  // New format: Villageois Élite with Power containing the actual power
  if (player.MainRoleInitial === 'Villageois Élite') {
    return player.Power || null;
  }
  
  // Legacy format: Chasseur/Alchimiste as MainRoleInitial IS the power
  if (LEGACY_ELITE_ROLES.includes(player.MainRoleInitial)) {
    return player.MainRoleInitial;
  }
  
  // Standard case: return Power field as-is
  return player.Power || null;
}
