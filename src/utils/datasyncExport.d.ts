/**
 * TypeScript declarations for deathTypeConstants.js
 */
export declare const DeathTypeCode: {
  readonly VOTED: 'VOTED';
  readonly BY_WOLF: 'BY_WOLF';
  readonly BY_WOLF_REZ: 'BY_WOLF_REZ';
  readonly BY_WOLF_LOVER: 'BY_WOLF_LOVER';
  readonly BY_ZOMBIE: 'BY_ZOMBIE';
  readonly BY_BEAST: 'BY_BEAST';
  readonly BY_AVATAR_CHAIN: 'BY_AVATAR_CHAIN';
  readonly BULLET: 'BULLET';
  readonly BULLET_HUMAN: 'BULLET_HUMAN';
  readonly BULLET_WOLF: 'BULLET_WOLF';
  readonly BULLET_BOUNTYHUNTER: 'BULLET_BOUNTYHUNTER';
  readonly SHERIF: 'SHERIF';
  readonly OTHER_AGENT: 'OTHER_AGENT';
  readonly AVENGER: 'AVENGER';
  readonly SEER: 'SEER';
  readonly HANTED: 'HANTED';
  readonly ASSASSIN: 'ASSASSIN';
  readonly LOVER_DEATH: 'LOVER_DEATH';
  readonly LOVER_DEATH_OWN: 'LOVER_DEATH_OWN';
  readonly BOMB: 'BOMB';
  readonly CRUSHED: 'CRUSHED';
  readonly STARVATION: 'STARVATION';
  readonly STARVATION_AS_BEAST: 'STARVATION_AS_BEAST';
  readonly FALL: 'FALL';
  readonly UNKNOWN: 'UNKNOWN';
};

export type DeathTypeCodeType = typeof DeathTypeCode[keyof typeof DeathTypeCode];

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
 * @returns The camp name for the role
 */
export declare function getPlayerCampFromRole(
  roleName?: string, 
  groupOptions?: {
    regroupLovers?: boolean;
    regroupVillagers?: boolean;
    regroupWolfSubRoles?: boolean;
  }
): string;

/**
  * Helper function to get player's main camp from initial role name
  * @param roleName - The initial role name to get the main camp for
  * @returns The main camp name: 'Villageois', 'Loup', or 'Autres' 
*/
export declare function getPlayerMainCampFromRole(roleName: string): 'Villageois' | 'Loup' | 'Autres';

/**
 * Helper function to determine the final role of a player after role changes
 * @param mainRoleInitial - The player's initial main role
 * @param roleChanges - An array of role change objects
 * @returns The player's final main role after applying all role changes
 */
export declare function getPlayerFinalRole(mainRoleInitial: string, roleChanges: RoleChange[]): string;