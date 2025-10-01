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
 */
export declare function codifyDeathType(deathType: string | null): DeathTypeCodeType;