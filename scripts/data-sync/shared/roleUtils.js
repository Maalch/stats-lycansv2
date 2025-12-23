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

/**
 * Check if a player is a Villageois Élite (either format)
 * 
 * @param {Object} player - Player object
 * @returns {boolean} true if player is Villageois Élite
 */
export function isVillageoisEliteJS(player) {
  if (player.MainRoleInitial === 'Villageois Élite') {
    return true;
  }
  if (LEGACY_ELITE_ROLES.includes(player.MainRoleInitial)) {
    return true;
  }
  return false;
}

/**
 * Check if a player is/was a Hunter (Chasseur)
 * 
 * @param {Object} player - Player object
 * @returns {boolean} true if player was a Hunter
 */
export function isHunterJS(player) {
  if (player.MainRoleInitial === 'Chasseur') {
    return true;
  }
  if (player.MainRoleInitial === 'Villageois Élite' && player.Power === 'Chasseur') {
    return true;
  }
  return false;
}

/**
 * Check if a player is/was an Alchimiste
 * 
 * @param {Object} player - Player object
 * @returns {boolean} true if player was an Alchimiste
 */
export function isAlchimisteJS(player) {
  if (player.MainRoleInitial === 'Alchimiste') {
    return true;
  }
  if (player.MainRoleInitial === 'Villageois Élite' && player.Power === 'Alchimiste') {
    return true;
  }
  return false;
}
