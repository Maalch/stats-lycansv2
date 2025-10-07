/**
 * TypeScript declarations for deathTypeConstants.js
 */
export declare const DeathTypeCode: {
  readonly SURVIVOR: 'SURVIVOR';
  readonly VOTED: 'VOTED';
  readonly BY_WOLF: 'BY_WOLF';
  readonly BY_WOLF_REZ: 'BY_WOLF_REZ';
  readonly BY_WOLF_LOVER: 'BY_WOLF_LOVER';
  readonly BY_ZOMBIE: 'BY_ZOMBIE';
  readonly BY_BEAST: 'BY_BEAST';
  readonly BY_AVATAR_CHAIN: 'BY_AVATAR_CHAIN';
  readonly BULLET: 'BULLET';
  readonly BULLET_BOUNTYHUNTER: 'BULLET_BOUNTYHUNTER';
  readonly SHERIF: 'SHERIF';
  readonly OTHER_AGENT: 'OTHER_AGENT';
  readonly AVENGER: 'AVENGER';
  readonly SEER: 'SEER';
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