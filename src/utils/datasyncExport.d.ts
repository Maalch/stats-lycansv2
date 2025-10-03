/**
 * TypeScript declarations for deathTypeConstants.js
 */
export declare const DeathTypeCode: {
  readonly SURVIVOR: 'SURVIVOR';
  readonly VOTE: 'VOTE';
  readonly WEREWOLF_KILL: 'WEREWOLF_KILL';
  readonly HUNTER_SHOT: 'HUNTER_SHOT';
  readonly BOUNTY_HUNTER: 'BOUNTY_HUNTER';
  readonly LOVER_DEATH: 'LOVER_DEATH';
  readonly LOVER_WEREWOLF: 'LOVER_WEREWOLF';
  readonly BEAST_KILL: 'BEAST_KILL';
  readonly ASSASSIN_POTION: 'ASSASSIN_POTION';
  readonly HAUNTED_POTION: 'HAUNTED_POTION';
  readonly ZOMBIE_KILL: 'ZOMBIE_KILL';
  readonly RESURRECTED_WEREWOLF: 'RESURRECTED_WEREWOLF';
  readonly AVENGER_KILL: 'AVENGER_KILL';
  readonly AGENT_KILL: 'AGENT_KILL';
  readonly SHERIFF_KILL: 'SHERIFF_KILL';
  readonly EXPLOSION: 'EXPLOSION';
  readonly CRUSHED: 'CRUSHED';
  readonly STARVATION: 'STARVATION';
  readonly FALL_DEATH: 'FALL_DEATH';
  readonly BESTIAL_DEATH: 'BESTIAL_DEATH';
  readonly AVATAR_DEATH: 'AVATAR_DEATH';
  readonly DISCONNECT: 'DISCONNECT';
  readonly UNKNOWN: 'UNKNOWN';
};

export type DeathTypeCodeType = typeof DeathTypeCode[keyof typeof DeathTypeCode];

/**
 * Codify death type for consistent grouping
 * @param deathType - Death type string
 * @returns Standardized death type code
 */
export declare function codifyDeathType(deathType: string | null): DeathTypeCodeType;

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
 * @param groupOptions.regroupTraitor - Whether to group traitor with werewolves
 * @returns The camp name for the role
 */
export declare function getPlayerCampFromRole(
  roleName?: string, 
  groupOptions?: {
    regroupLovers?: boolean;
    regroupVillagers?: boolean;
    regroupTraitor?: boolean;
  }
): string;


export declare function getPlayerMainCampFromRole(roleName: string): 'Villageois' | 'Loup' | 'Autres';