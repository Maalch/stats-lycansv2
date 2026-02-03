/**
 * TypeScript declarations for datasyncExport.js
 * 
 * NOTE: Death type constants are now centralized in src/types/deathTypes.ts
 * This re-export maintains backward compatibility.
 */

// Re-export from centralized death types module
export { DEATH_TYPES as DeathTypeCode, type DeathType as DeathTypeCodeType } from '../types/deathTypes';

export interface RoleChange {
  NewMainRole: string;            // New main role after change
  RoleChangeDateIrl: string;     // Date of role change
}

/**
 * Helper function to calculate game duration in seconds
 * @param startDate - Start date string
 * @param endDate - End date string
 * @returns Duration in seconds or null
 */
export declare function calculateGameDuration(startDate: string, endDate: string): number | null;

/**
 * Helper function to get player's camp from role name
 * @param roleName - The role name to get the camp for
 * @param groupOptions - An options object with grouping settings
 * @param groupOptions.regroupLovers - Whether to group lover roles
 * @param groupOptions.regroupVillagers - Whether to group villager-type roles
 * @param groupOptions.regroupWolfSubRoles - Whether to group wolf sub-roles
 * @param power - Optional power field for Villageois Élite roles (Chasseur, Alchimiste, Protecteur, Disciple, Inquisiteur)
 * @returns The camp name for the role
 */
export declare function getPlayerCampFromRole(
  roleName?: string, 
  groupOptions?: {
    regroupLovers?: boolean;
    regroupVillagers?: boolean;
    regroupWolfSubRoles?: boolean;
  },
  power?: string | null
): string;

/**
  * Helper function to get player's main camp from initial role name
  * @param roleName - The initial role name to get the main camp for
  * @returns The main camp name: 'Villageois', 'Loup', or 'Autres' 
*/
export declare function getPlayerMainCampFromRole(roleName: string, power?: string | null): 'Villageois' | 'Loup' | 'Autres';

/**
 * Helper function to determine the final role of a player after role changes
 * @param mainRoleInitial - The player's initial main role
 * @param roleChanges - An array of role change objects
 * @returns The player's final main role after applying all role changes
 */
export declare function getPlayerFinalRole(mainRoleInitial: string, roleChanges: RoleChange[]): string;