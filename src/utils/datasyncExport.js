
/**
 * Standardized death type codes for consistent processing across server and client
 * 
 * NOTE: These constants are maintained here for Node.js compatibility (data-sync scripts).
 * The TypeScript version is in src/types/deathTypes.ts with enhanced type safety and utilities.
 * 
 * These codes match the exact codes returned by the Google Script determineDeathType function.
 * 
 * @type {Record<string, string>}
 */
export const DeathTypeCode = {
  // Voting and Starvation
  VOTED: 'VOTED',                           // Mort aux votes
  STARVATION: 'STARVATION',                 // Mort de faim
  STARVATION_AS_BEAST: 'STARVATION_AS_BEAST', // Mort bestiale (GDOC specific)
  
  // Wolf Kills
  BY_WOLF: 'BY_WOLF',                       // Tué par Loup
  BY_WOLF_REZ: 'BY_WOLF_REZ',              // Tué par Loup ressuscité (GDOC specific)
  BY_WOLF_LOVER: 'BY_WOLF_LOVER',          // Tué par Loup amoureux (GDOC specific)
  
  // Other Creature Kills
  BY_ZOMBIE: 'BY_ZOMBIE',                   // Tué par Zombie
  BY_BEAST: 'BY_BEAST',                     // Tué par La Bête
  
  // Hunters and Sheriffs
  BULLET: 'BULLET',                         // Tué par Chasseur (less specific than official log)
  BULLET_HUMAN: 'BULLET_HUMAN',            // Tué par Chasseur en humain (official log specific)
  BULLET_HUMAN_ON_WOLF: 'BULLET_HUMAN_ON_WOLF',  // Tué par Chasseur en humain (sur loup non-transformé)
  BULLET_HUMAN_ON_HUMAN: 'BULLET_HUMAN_ON_HUMAN', // Tué par Chasseur en humain (sur humain)
  BULLET_WOLF: 'BULLET_WOLF',              // Tué par Chasseur en loup (official log specific)
  BULLET_BOUNTYHUNTER: 'BULLET_BOUNTYHUNTER', // Tué par Chasseur de primes (GDOC specific)
  SHERIF: 'SHERIF',                         // Tué par Shérif (less specific than official log)
  
  // Role-Based Kills
  OTHER_AGENT: 'OTHER_AGENT',               // Tué par l'Agent
  AVENGER: 'AVENGER',                       // Tué par Vengeur
  SEER: 'SEER',                             // Rôle deviné par loup
  
  // Potions
  HANTED: 'HANTED',                         // Tué par potion hantée (GDOC specific)
  ASSASSIN: 'ASSASSIN',                     // Tué par potion assassin
  
  // Lovers
  LOVER_DEATH: 'LOVER_DEATH',               // Amoureux mort
  LOVER_DEATH_OWN: 'LOVER_DEATH_OWN',      // A tué son amoureux / Tué par son amoureux (GDOC specific)
  
  // Environmental
  BOMB: 'BOMB',                             // A explosé
  CRUSHED: 'CRUSHED',                       // A été écrasé
  FALL: 'FALL',                             // Mort de chute
  BY_AVATAR_CHAIN: 'BY_AVATAR_CHAIN',      // Mort liée à l'Avatar
  
  // Unknown/Special
  UNKNOWN: 'UNKNOWN',                       // Inconnu / Unrecognized death type
  SURVIVOR: 'SURVIVOR',                     // Not dead / Survived the game (used for filtering)
};

/**
 * Helper function to calculate game duration in seconds
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @returns {number|null} Duration in seconds or null
 */
export function calculateGameDuration(startDate, endDate) {
  if (!startDate || !endDate) return null;
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    
    return Math.max(0, (end.getTime() - start.getTime()) / 1000);
  } catch (error) {
    return null;
  }
}

/**
 * Group options for camp classification
 * @typedef {Object} CampGroupOptions
 * @property {boolean} [regroupLovers] - Whether to regroup lovers
 * @property {boolean} [regroupVillagers] - Whether to regroup villagers  
 * @property {boolean} [regroupWolfSubRoles] - Whether to regroup wolves sub roles (Traitor, wolf cub...) with wolves
 */

/**
 * Helper function to get player's camp from role name
 * 
 * @param {string} roleName - The role name to get the camp for
 * @param {CampGroupOptions} [groupOptions] - An options object with grouping settings
 * @returns {string} The camp name for the role
 */
export function getPlayerCampFromRole(roleName, groupOptions) {
  if (!roleName) return 'Villageois';
  
  const options = groupOptions || {};

  //by default: regroup lovers, villagers, but not wolf sub roles
  const { regroupLovers = true, regroupVillagers = true, regroupWolfSubRoles = false } = options;
  
  // Handle Amoureux roles
  if (roleName === 'Amoureux Loup' || roleName === 'Amoureux Villageois') {
    return regroupLovers ? 'Amoureux' : roleName;
  }
  
  // Handle Villager-type roles
  if (roleName === 'Chasseur' || roleName === 'Alchimiste') {
    return regroupVillagers ? 'Villageois' : roleName;
  }

  if (roleName === 'Zombie') {
    return 'Vaudou';
  }
  
  // Handle Traitor role
  if (roleName === 'Traître' || roleName === 'Louveteau') {
    return regroupWolfSubRoles ? 'Loup' : roleName;
  }
  
  // Special roles keep their role name as camp
  return roleName;
}

/**
 * Helper function to get player's main camp from role name
 */
export function getPlayerMainCampFromRole(roleName) {
  if (!roleName) return 'Villageois';
  
  roleName = getPlayerCampFromRole(roleName, { regroupWolfSubRoles: true });

  // Loups camp (now includes Traître automatically)
  if (roleName === 'Loup') {
    return 'Loup';
  }
  else if (roleName === 'Villageois') {
    return 'Villageois';
  }
  else {
    return 'Autres';
  }
}

/**
* Help function to get the player's final role if changed during the game
* 
* @param {string} mainRoleInitial - The player's initial main role
* @param {RoleChange[]} roleChanges - Array of role change objects
* @returns {string} The player's final role 
*/
export function getPlayerFinalRole(mainRoleInitial, roleChanges) {
  let currentRole = mainRoleInitial;

  for (const change of roleChanges) {
    if (change.NewMainRole) {
      currentRole = change.NewMainRole;
    }
  }

  return currentRole;
}
