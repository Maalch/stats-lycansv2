/**
 * Standardized death type codes for consistent processing across server and client
 * This file is shared between generate-achievements.js and TypeScript utilities
 */
export const DeathTypeCode = {
  SURVIVOR: 'SURVIVOR',           // N/A - Player survived
  VOTE: 'VOTE',                   // Mort aux votes
  WEREWOLF_KILL: 'WEREWOLF_KILL', // Tué par Loup / Tué par un loup
  HUNTER_SHOT: 'HUNTER_SHOT',     // Tué par Chasseur / Abattu par une balle
  BOUNTY_HUNTER: 'BOUNTY_HUNTER', // Tué par Chasseur de primes
  LOVER_DEATH: 'LOVER_DEATH',     // Amoureux mort / Tué par son amoureux / A tué son amoureux
  LOVER_WEREWOLF: 'LOVER_WEREWOLF', // Tué par Loup amoureux
  BEAST_KILL: 'BEAST_KILL',       // Tué par La Bête
  ASSASSIN_POTION: 'ASSASSIN_POTION', // Tué par potion Assassin
  HAUNTED_POTION: 'HAUNTED_POTION', // Tué par potion Hanté
  ZOMBIE_KILL: 'ZOMBIE_KILL',     // Tué par Zombie
  RESURRECTED_WEREWOLF: 'RESURRECTED_WEREWOLF', // Tué par Loup ressuscité
  AVENGER_KILL: 'AVENGER_KILL',   // Tué par Vengeur / Tué par vengeur
  AGENT_KILL: 'AGENT_KILL',       // Tué par l'Agent
  SHERIFF_KILL: 'SHERIFF_KILL',   // Tué par Shérif
  EXPLOSION: 'EXPLOSION',         // A explosé
  CRUSHED: 'CRUSHED',            // A été écrasé
  STARVATION: 'STARVATION',      // Mort de faim
  FALL_DEATH: 'FALL_DEATH',      // Mort de chute
  BESTIAL_DEATH: 'BESTIAL_DEATH', // Mort bestiale
  AVATAR_DEATH: 'AVATAR_DEATH',   // Mort liée à l'Avatar
  DISCONNECT: 'DISCONNECT',       // Déco
  UNKNOWN: 'UNKNOWN'              // Unrecognized death type
};

/**
 * Codify death type for consistent grouping
 * @param {string|null} deathType - Death type string
 * @returns {string} - Standardized death type code
 */
export function codifyDeathType(deathType) {
  if (!deathType || deathType === 'N/A') {
    return DeathTypeCode.SURVIVOR;
  }
  
  const normalized = deathType.trim().toLowerCase();
  
  // Vote-related deaths
  if (normalized.includes('vote')) {
    return DeathTypeCode.VOTE;
  }
  
  // Werewolf kills (various forms)
  if (normalized === 'tué par loup' || 
      normalized.includes('tué par un loup') ||
      normalized.includes('tué par loup ressuscité')) {
    if (normalized.includes('ressuscité')) {
      return DeathTypeCode.RESURRECTED_WEREWOLF;
    }
    return DeathTypeCode.WEREWOLF_KILL;
  }
  
  // Lover-related deaths
  if (normalized.includes('amoureux') || normalized.includes('son amoureux')) {
    if (normalized.includes('tué par loup amoureux')) {
      return DeathTypeCode.LOVER_WEREWOLF;
    }
    return DeathTypeCode.LOVER_DEATH;
  }
  
  // Hunter-related deaths
  if (normalized.includes('chasseur') || normalized.includes('balle')) {
    if (normalized.includes('primes')) {
      return DeathTypeCode.BOUNTY_HUNTER;
    }
    return DeathTypeCode.HUNTER_SHOT;
  }
  
  // Potion deaths
  if (normalized.includes('potion')) {
    if (normalized.includes('assassin')) {
      return DeathTypeCode.ASSASSIN_POTION;
    }
    if (normalized.includes('hanté')) {
      return DeathTypeCode.HAUNTED_POTION;
    }
  }
  
  // Specific killers
  if (normalized.includes('la bête')) {
    return DeathTypeCode.BEAST_KILL;
  }
  if (normalized.includes('zombie')) {
    return DeathTypeCode.ZOMBIE_KILL;
  }
  if (normalized.includes('vengeur')) {
    return DeathTypeCode.AVENGER_KILL;
  }
  if (normalized.includes("l'agent")) {
    return DeathTypeCode.AGENT_KILL;
  }
  if (normalized.includes('shérif')) {
    return DeathTypeCode.SHERIFF_KILL;
  }
  
  // Environmental/other deaths
  if (normalized.includes('explosé')) {
    return DeathTypeCode.EXPLOSION;
  }
  if (normalized.includes('écrasé')) {
    return DeathTypeCode.CRUSHED;
  }
  if (normalized.includes('faim')) {
    return DeathTypeCode.STARVATION;
  }
  if (normalized.includes('chute')) {
    return DeathTypeCode.FALL_DEATH;
  }
  if (normalized.includes('bestiale')) {
    return DeathTypeCode.BESTIAL_DEATH;
  }
  if (normalized.includes('avatar')) {
    return DeathTypeCode.AVATAR_DEATH;
  }
  if (normalized === 'déco') {
    return DeathTypeCode.DISCONNECT;
  }
  
  return DeathTypeCode.UNKNOWN;
}