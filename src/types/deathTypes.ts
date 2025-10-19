/**
 * Centralized Death Type System
 * 
 * This module provides type-safe death type constants and utilities.
 * Replaces scattered string literals with a single source of truth.
 * 
 * These codes match the exact codes returned by the Google Script determineDeathType function
 * and are used consistently across server (data-sync) and client (React) code.
 */

/**
 * Standardized death type codes as const object for type safety
 */
export const DEATH_TYPES = {
  // Voting and Starvation
  VOTED: 'VOTED',                           // Mort aux votes
  STARVATION: 'STARVATION',                 // Mort de faim
  STARVATION_AS_BEAST: 'STARVATION_AS_BEAST', // Mort bestiale (GDOC specific)
  
  // Wolf Kills
  BY_WOLF: 'BY_WOLF',                       // Tué par Loup
  SURVIVALIST_NOT_SAVED: 'SURVIVALIST_NOT_SAVED', // Tué par Loup (Survivaliste non sauvé)
  
  // Other Creature Kills
  BY_ZOMBIE: 'BY_ZOMBIE',                   // Tué par Zombie
  BY_BEAST: 'BY_BEAST',                     // Tué par La Bête
  
  // Hunters and Sheriffs
  BULLET: 'BULLET',                         // Tué par Chasseur (less specific than official log)
  BULLET_HUMAN: 'BULLET_HUMAN',            // Tué par Chasseur en humain (official log specific)
  BULLET_WOLF: 'BULLET_WOLF',              // Tué par Chasseur en loup (official log specific)
  SHERIF_SUCCESS: 'SHERIF_SUCCESS',                         // Tué par Shérif (less specific than official log)
  
  // Role-Based Kills
  OTHER_AGENT: 'OTHER_AGENT',               // Tué par l'Agent
  AVENGER: 'AVENGER',                       // Tué par Vengeur
  SEER: 'SEER',                             // Rôle deviné par loup
  
  // Potions
  HANTED: 'HANTED',                         // Tué par potion hantée (GDOC specific)
  ASSASSIN: 'ASSASSIN',                     // Tué par potion assassin
  
  // Lovers
  LOVER_DEATH: 'LOVER_DEATH',               // Amoureux mort
  
  // Environmental
  BOMB: 'BOMB',                             // A explosé
  CRUSHED: 'CRUSHED',                       // A été écrasé
  FALL: 'FALL',                             // Mort de chute
  BY_AVATAR_CHAIN: 'BY_AVATAR_CHAIN',      // Mort liée à l'Avatar
  
  // Unknown/Special
  UNKNOWN: 'UNKNOWN',                       // Inconnu / Unrecognized death type
  SURVIVOR: 'SURVIVOR',                     // Not dead / Survived the game (used for filtering)
} as const;

/**
 * Type-safe death type - derived from DEATH_TYPES object
 * This ensures TypeScript knows all possible death type values
 */
export type DeathType = typeof DEATH_TYPES[keyof typeof DEATH_TYPES];

/**
 * Death type categories for grouping and analysis
 */
export const DEATH_TYPE_CATEGORIES = {
  VOTING: [DEATH_TYPES.VOTED],
  
  WOLF_KILLS: [
    DEATH_TYPES.BY_WOLF
  ],
  
  CREATURE_KILLS: [
    DEATH_TYPES.BY_ZOMBIE,
    DEATH_TYPES.BY_BEAST,
  ],
  
  HUNTER_KILLS: [
    DEATH_TYPES.BULLET,
    DEATH_TYPES.BULLET_HUMAN,
    DEATH_TYPES.BULLET_WOLF
  ],
  
  ROLE_KILLS: [
    DEATH_TYPES.OTHER_AGENT,
    DEATH_TYPES.AVENGER,
    DEATH_TYPES.SEER,
  ],
  
  POTIONS: [
    DEATH_TYPES.HANTED,
    DEATH_TYPES.ASSASSIN,
  ],
  
  LOVER_DEATHS: [
    DEATH_TYPES.LOVER_DEATH
  ],
  
  ENVIRONMENTAL: [
    DEATH_TYPES.STARVATION,
    DEATH_TYPES.STARVATION_AS_BEAST,
    DEATH_TYPES.BOMB,
    DEATH_TYPES.CRUSHED,
    DEATH_TYPES.FALL,
    DEATH_TYPES.BY_AVATAR_CHAIN,
  ],
} as const;

/**
 * Death types that don't require a killer (system deaths)
 */
export const SYSTEM_DEATH_TYPES: readonly DeathType[] = [
  DEATH_TYPES.VOTED,
  DEATH_TYPES.STARVATION,
  DEATH_TYPES.STARVATION_AS_BEAST,
  DEATH_TYPES.FALL,
  DEATH_TYPES.BY_AVATAR_CHAIN,
  DEATH_TYPES.UNKNOWN,
] as const;

/**
 * Death types that typically involve a killer
 */
export const KILLER_DEATH_TYPES: readonly DeathType[] = [
  DEATH_TYPES.BY_WOLF,
  DEATH_TYPES.SURVIVALIST_NOT_SAVED,
  DEATH_TYPES.BY_ZOMBIE,
  DEATH_TYPES.BY_BEAST,
  DEATH_TYPES.BULLET,
  DEATH_TYPES.BULLET_HUMAN,
  DEATH_TYPES.BULLET_WOLF,
  DEATH_TYPES.SHERIF_SUCCESS,
  DEATH_TYPES.OTHER_AGENT,
  DEATH_TYPES.AVENGER,
  DEATH_TYPES.SEER,
  DEATH_TYPES.HANTED,
  DEATH_TYPES.ASSASSIN,
  DEATH_TYPES.LOVER_DEATH,
  DEATH_TYPES.BOMB,
  DEATH_TYPES.CRUSHED,
] as const;

/**
 * Human-readable labels for death types (in French)
 */
export const DEATH_TYPE_LABELS: Record<DeathType, string> = {
  [DEATH_TYPES.VOTED]: 'Mort aux votes',
  [DEATH_TYPES.BY_WOLF]: 'Tué par Loup',
  [DEATH_TYPES.SURVIVALIST_NOT_SAVED]: 'Tué par Loup',
  [DEATH_TYPES.BY_ZOMBIE]: 'Tué par Zombie',
  [DEATH_TYPES.BY_BEAST]: 'Tué par La Bête',
  [DEATH_TYPES.BY_AVATAR_CHAIN]: 'Mort liée à l\'Avatar',
  [DEATH_TYPES.BULLET]: 'Tué par Chasseur',
  [DEATH_TYPES.BULLET_HUMAN]: 'Tué par Chasseur (humain)',
  [DEATH_TYPES.BULLET_WOLF]: 'Tué par Chasseur (loup)',
  [DEATH_TYPES.SHERIF_SUCCESS]: 'Tué par Shérif',
  [DEATH_TYPES.OTHER_AGENT]: 'Tué par l\'Agent',
  [DEATH_TYPES.AVENGER]: 'Tué par Vengeur',
  [DEATH_TYPES.SEER]: 'Rôle deviné par loup',
  [DEATH_TYPES.HANTED]: 'Tué par potion hantée',
  [DEATH_TYPES.ASSASSIN]: 'Tué par potion assassin',
  [DEATH_TYPES.LOVER_DEATH]: 'Amoureux mort',
  [DEATH_TYPES.BOMB]: 'A explosé',
  [DEATH_TYPES.CRUSHED]: 'A été écrasé',
  [DEATH_TYPES.STARVATION]: 'Mort de faim',
  [DEATH_TYPES.STARVATION_AS_BEAST]: 'Mort bestiale',
  [DEATH_TYPES.FALL]: 'Mort de chute',
  [DEATH_TYPES.UNKNOWN]: 'Inconnu',
  [DEATH_TYPES.SURVIVOR]: 'Survivant',
};

/**
 * Type guard to check if a value is a valid DeathType
 * @param value - Value to check
 * @returns true if value is a valid DeathType
 */
export function isValidDeathType(value: unknown): value is DeathType {
  return typeof value === 'string' && Object.values(DEATH_TYPES).includes(value as DeathType);
}

/**
 * Type guard to check if a death type is a system death (no killer)
 * @param deathType - Death type to check
 * @returns true if death type is a system death
 */
export function isSystemDeath(deathType: DeathType | string | null): boolean {
  if (!deathType) return false;
  return SYSTEM_DEATH_TYPES.includes(deathType as DeathType);
}

/**
 * Type guard to check if a death type requires a killer
 * @param deathType - Death type to check
 * @returns true if death type typically has a killer
 */
export function requiresKiller(deathType: DeathType | string | null): boolean {
  if (!deathType) return false;
  return KILLER_DEATH_TYPES.includes(deathType as DeathType);
}

/**
 * Get category for a death type
 * @param deathType - Death type to categorize
 * @returns Category name or 'UNKNOWN'
 */
export function getDeathTypeCategory(deathType: DeathType | string | null): string {
  if (!deathType) return 'UNKNOWN';
  
  for (const [category, types] of Object.entries(DEATH_TYPE_CATEGORIES)) {
    if ((types as readonly DeathType[]).includes(deathType as DeathType)) {
      return category;
    }
  }
  
  return 'UNKNOWN';
}

/**
 * Get human-readable label for death type
 * @param deathType - Death type to get label for
 * @returns Human-readable label in French
 */
export function getDeathTypeLabel(deathType: DeathType | string | null): string {
  if (!deathType || !isValidDeathType(deathType)) {
    return DEATH_TYPE_LABELS[DEATH_TYPES.UNKNOWN];
  }
  return DEATH_TYPE_LABELS[deathType];
}

/**
 * Normalize a death type string to ensure it's valid
 * Returns UNKNOWN if the type is invalid or empty
 * @param deathType - Death type string to normalize
 * @returns Normalized death type
 */
export function normalizeDeathType(deathType: string | null | undefined): DeathType {
  if (!deathType || deathType === '' || deathType === 'N/A') {
    return DEATH_TYPES.UNKNOWN;
  }
  
  if (isValidDeathType(deathType)) {
    return deathType;
  }
  
  return DEATH_TYPES.UNKNOWN;
}
