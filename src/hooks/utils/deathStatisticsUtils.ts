import type { GameLogEntry } from '../useCombinedRawData';
import { getPlayerCampFromRole } from '../../utils/gameUtils';

/**
 * Standardized death type codes for consistent processing
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
} as const;

export type DeathTypeCodeType = typeof DeathTypeCode[keyof typeof DeathTypeCode];

/**
 * Get all available camps from game data (camps that have at least one killer)
 */
export function getAvailableCamps(gameData: GameLogEntry[]): string[] {
  const campsSet = new Set<string>();
  
  // Filter games to only include those with complete death information
  // Include games where LegacyData.deathInformationFilled is true OR where LegacyData is not present
  const filteredGameData = gameData.filter(game => 
    !game.LegacyData || game.LegacyData.deathInformationFilled === true
  );
  
  filteredGameData.forEach(game => {
    game.PlayerStats.forEach(player => {

        const camp = getPlayerCampFromRole(player.MainRoleFinal, {
          regroupLovers: true,
          regroupVillagers: true,
          regroupTraitor: false
        });
        campsSet.add(camp);
    });
  });
  
  const camps = Array.from(campsSet);
  
  // Sort camps to put main camps first
  const mainCamps = ['Villageois', 'Loup', 'Amoureux'];
  const sortedCamps = [
    ...mainCamps.filter(camp => camps.includes(camp)),
    ...camps.filter(camp => !mainCamps.includes(camp)).sort()
  ];


  return sortedCamps;
}

/**
 * Death statistics by type
 */
export interface DeathTypeStats {
  type: DeathTypeCodeType;
  count: number;
  percentage: number;
}

/**
 * Killer statistics
 */
export interface KillerStats {
  killerName: string;
  kills: number;
  victims: string[];
  percentage: number;
  gamesPlayed: number;
  averageKillsPerGame: number;
  killsByDeathType: Record<DeathTypeCodeType, number>; // New field for death type breakdown
}

/**
 * Player death statistics
 */
export interface PlayerDeathStats {
  playerName: string;
  totalDeaths: number;
  deathsByType: Record<DeathTypeCodeType, number>;
  killedBy: Record<string, number>;
  deathRate: number; // Deaths per game played
}

/**
 * Comprehensive death statistics
 */
export interface DeathStatistics {
  totalDeaths: number;
  totalGames: number;
  averageDeathsPerGame: number;
  
  // Death type statistics
  deathsByType: DeathTypeStats[];
  
  // Killer statistics
  killerStats: KillerStats[];
  
  // Player-specific death statistics
  playerDeathStats: PlayerDeathStats[];
  
  // Most dangerous phases/times
  mostCommonDeathType: DeathTypeCodeType | null;
  mostDeadlyKiller: string | null;
}


/**
 * Codify death type for consistent grouping
 */
export function codifyDeathType(deathType: string | null): DeathTypeCodeType {
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

/**
 * Convert death type code to death description (from victim's perspective)
 */
export function getDeathDescription(deathTypeCode: DeathTypeCodeType): string {
  switch (deathTypeCode) {
    case DeathTypeCode.SURVIVOR:
      return 'Survivant';
    case DeathTypeCode.VOTE:
      return 'Mort aux votes';
    case DeathTypeCode.WEREWOLF_KILL:
      return 'Tué par un loup';
    case DeathTypeCode.HUNTER_SHOT:
      return 'Abattu par un chasseur';
    case DeathTypeCode.BOUNTY_HUNTER:
      return 'Tué par un chasseur de primes';
    case DeathTypeCode.LOVER_DEATH:
      return 'Mort par amoureux';
    case DeathTypeCode.LOVER_WEREWOLF:
      return 'Tué par un loup amoureux';
    case DeathTypeCode.BEAST_KILL:
      return 'Dévoré par la Bête';
    case DeathTypeCode.ASSASSIN_POTION:
      return 'Tué par une potion (Assassin)';
    case DeathTypeCode.HAUNTED_POTION:
      return 'Tué par une potion (Hanté)';
    case DeathTypeCode.ZOMBIE_KILL:
      return 'Tué par un zombie';
    case DeathTypeCode.RESURRECTED_WEREWOLF:
      return 'Tué par un loup ressuscité';
    case DeathTypeCode.AVENGER_KILL:
      return 'Tué par un vengeur';
    case DeathTypeCode.AGENT_KILL:
      return 'Éliminé par l\'Agent';
    case DeathTypeCode.SHERIFF_KILL:
      return 'Abattu par le Shérif';
    case DeathTypeCode.EXPLOSION:
      return 'Mort dans une explosion';
    case DeathTypeCode.CRUSHED:
      return 'Écrasé';
    case DeathTypeCode.STARVATION:
      return 'Mort de faim';
    case DeathTypeCode.FALL_DEATH:
      return 'Mort de chute';
    case DeathTypeCode.BESTIAL_DEATH:
      return 'Mort bestiale';
    case DeathTypeCode.AVATAR_DEATH:
      return 'Mort liée à l\'Avatar';
    case DeathTypeCode.DISCONNECT:
      return 'Déconnexion';
    case DeathTypeCode.UNKNOWN:
    default:
      return 'Mort inconnue';
  }
}

/**
 * Convert death type code to kill description (from killer's perspective)
 */
export function getKillDescription(deathTypeCode: DeathTypeCodeType): string {
  switch (deathTypeCode) {
    case DeathTypeCode.SURVIVOR:
      return 'Survivant';
    case DeathTypeCode.VOTE:
      return 'Mort aux votes';
    case DeathTypeCode.WEREWOLF_KILL:
      return 'Kill en Loup';
    case DeathTypeCode.HUNTER_SHOT:
      return 'Tir de Chasseur';
    case DeathTypeCode.BOUNTY_HUNTER:
      return 'Kill en Chasseur de primes';
    case DeathTypeCode.LOVER_DEATH:
      return 'Kill de son amoureux';
    case DeathTypeCode.LOVER_WEREWOLF:
      return 'Kill en Loup amoureux';
    case DeathTypeCode.BEAST_KILL:
      return 'Kill en Bête';
    case DeathTypeCode.ASSASSIN_POTION:
      return 'Kill avec Potion (Assassin)';
    case DeathTypeCode.HAUNTED_POTION:
      return 'Kill avec Potion (Hanté)';
    case DeathTypeCode.ZOMBIE_KILL:
      return 'Kill en Zombie';
    case DeathTypeCode.RESURRECTED_WEREWOLF:
      return 'Kill en Loup ressuscité';
    case DeathTypeCode.AVENGER_KILL:
      return 'Kill en Vengeur';
    case DeathTypeCode.AGENT_KILL:
      return 'Kill en Agent';
    case DeathTypeCode.SHERIFF_KILL:
      return 'Kill en Shérif';
    case DeathTypeCode.EXPLOSION:
      return 'Explosion';
    case DeathTypeCode.CRUSHED:
      return 'Écrasement';
    case DeathTypeCode.STARVATION:
      return 'Famine';
    case DeathTypeCode.FALL_DEATH:
      return 'Chute mortelle';
    case DeathTypeCode.BESTIAL_DEATH:
      return 'Tuerie bestiale';
    case DeathTypeCode.AVATAR_DEATH:
      return 'Mort d\'Avatar';
    case DeathTypeCode.DISCONNECT:
      return 'Déconnexion';
    case DeathTypeCode.UNKNOWN:
    default:
      return 'Kill inconnu';
  }
}


/**
 * Get all unique death types from game data for chart configuration
 */
export function getAllDeathTypes(gameData: GameLogEntry[]): DeathTypeCodeType[] {
  const deathTypesSet = new Set<DeathTypeCodeType>();
  
  gameData.forEach(game => {
    game.PlayerStats.forEach(player => {
      if (player.DeathType) {
        const deathCode = codifyDeathType(player.DeathType);
        deathTypesSet.add(deathCode);
      }
    });
  });
  
  const deathTypes = Array.from(deathTypesSet);
  
  // Sort death types to put common ones first
  const commonTypeCodes = [
    DeathTypeCode.WEREWOLF_KILL,
    DeathTypeCode.VOTE, 
    DeathTypeCode.HUNTER_SHOT,
    DeathTypeCode.ZOMBIE_KILL,
    DeathTypeCode.ASSASSIN_POTION,
    DeathTypeCode.HAUNTED_POTION,
    DeathTypeCode.AVENGER_KILL,
    DeathTypeCode.LOVER_DEATH,
    DeathTypeCode.SURVIVOR
  ];
  
  return [
    ...commonTypeCodes.filter(type => deathTypes.includes(type)),
    ...deathTypes.filter(type => !(commonTypeCodes as readonly DeathTypeCodeType[]).includes(type)).sort()
  ];
}

/**
 * Extract all deaths from a game
 */
export function extractDeathsFromGame(game: GameLogEntry, campFilter?: string): Array<{
  playerName: string;
  deathType: DeathTypeCodeType;
  killerName: string | null;
  killerCamp: string | null;
}> {
  return game.PlayerStats
    .filter(player => {
      // Only include players who actually died (not survivors)
      const deathCode = codifyDeathType(player.DeathType);
      return deathCode !== 'SURVIVOR' && (player.DeathTiming || player.DeathType);
    })
    .map(player => {
      // Find the killer's camp if killer exists
      let killerCamp: string | null = null;
      if (player.KillerName) {
        const killerPlayer = game.PlayerStats.find(p => p.Username === player.KillerName);
        if (killerPlayer) {
          killerCamp = getPlayerCampFromRole(killerPlayer.MainRoleFinal, {
            regroupLovers: true,
            regroupVillagers: true,
            regroupTraitor: false
          });
        }
      }
      
      const deathCode = codifyDeathType(player.DeathType);
      return {
        playerName: player.Username,
        deathType: deathCode,
        killerName: player.KillerName,
        killerCamp
      };
    })
    // Filter by camp if specified - for victim statistics, filter by victim's camp
    .filter(death => {
      if (!campFilter || campFilter === 'Tous les camps') return true;
      
      // Find the victim's camp
      const victimPlayer = game.PlayerStats.find(p => p.Username === death.playerName);
      if (!victimPlayer) return false;
      
      const victimCamp = getPlayerCampFromRole(victimPlayer.MainRoleFinal, {
        regroupLovers: true,
        regroupVillagers: true,
        regroupTraitor: false
      });
      
      // Only include deaths where the victim is from the selected camp
      return victimCamp === campFilter;
    });
}

/**
 * Extract all kills from a game by analyzing the KillerName field from victim perspectives
 */
export function extractKillsFromGame(game: GameLogEntry, campFilter?: string): Array<{
  killerName: string;
  victimName: string;
  deathType: DeathTypeCodeType;
  killerCamp: string;
}> {
  const kills: Array<{
    killerName: string;
    victimName: string;
    deathType: DeathTypeCodeType;
    killerCamp: string;
  }> = [];
  
  game.PlayerStats.forEach(player => {
    // Only process players who were killed by someone (not environmental deaths or votes)
    if (player.KillerName && player.DeathType) {
      const deathCode = codifyDeathType(player.DeathType);
      
      // Skip non-kill deaths (survivors, votes, environmental deaths)
      if (deathCode === 'SURVIVOR' || deathCode === 'VOTE' || 
          deathCode === 'DISCONNECT' || deathCode === 'STARVATION' || 
          deathCode === 'FALL_DEATH' || deathCode === 'AVATAR_DEATH') {
        return;
      }
      
      // Find the killer's information
      const killerPlayer = game.PlayerStats.find(p => p.Username === player.KillerName);
      if (!killerPlayer) {
        return; // Skip if killer not found in this game
      }
      
      const killerCamp = getPlayerCampFromRole(killerPlayer.MainRoleFinal, {
        regroupLovers: true,
        regroupVillagers: true,
        regroupTraitor: false
      });
      
      kills.push({
        killerName: player.KillerName,
        victimName: player.Username,
        deathType: deathCode,
        killerCamp
      });
    }
  });
  
  // Filter by camp if specified - for killer statistics, filter by killer's camp
  if (campFilter && campFilter !== 'Tous les camps') {
    return kills.filter(kill => kill.killerCamp === campFilter);
  }
  
  return kills;
}

/**
 * Calculate comprehensive death statistics from game data
 */
export function computeDeathStatistics(gameData: GameLogEntry[], campFilter?: string): DeathStatistics | null {
  if (gameData.length === 0) {
    return null;
  }

  // Filter games to only include those with complete death information
  // Include games where LegacyData.deathInformationFilled is true OR where LegacyData is not present
  const filteredGameData = gameData.filter(game => 
    !game.LegacyData || game.LegacyData.deathInformationFilled === true
  );

  if (filteredGameData.length === 0) {
    return null;
  }

  // Extract all deaths
  const allDeaths: Array<{
    playerName: string;
    deathType: DeathTypeCodeType;
    killerName: string | null;
    killerCamp: string | null;
    gameId: string;
  }> = [];
  
  const playerGameCounts: Record<string, number> = {};
  
  filteredGameData.forEach(game => {
    const deaths = extractDeathsFromGame(game, campFilter);
    deaths.forEach(death => {
      allDeaths.push({
        ...death,
        gameId: game.Id
      });
    });
    
    // Count total games per player (for killer statistics)
    // When filtering by camp, only count games where the player was in that camp
    game.PlayerStats.forEach(player => {
      const playerName = player.Username;
      
      if (!campFilter || campFilter === 'Tous les camps') {
        // No filter: count all games
        playerGameCounts[playerName] = (playerGameCounts[playerName] || 0) + 1;
      } else {
        // Filter active: only count games where player was in the filtered camp
        const playerCamp = getPlayerCampFromRole(player.MainRoleFinal, {
          regroupLovers: true,
          regroupVillagers: true,
          regroupTraitor: false
        });
        
        if (playerCamp === campFilter) {
          playerGameCounts[playerName] = (playerGameCounts[playerName] || 0) + 1;
        }
      }
    });
  });

  const totalDeaths = allDeaths.length;
  const totalGames = filteredGameData.length;
  const averageDeathsPerGame = totalGames > 0 ? totalDeaths / totalGames : 0;


  // Calculate death type statistics
  const typeCounts: Partial<Record<DeathTypeCodeType, number>> = {};
  allDeaths.forEach(death => {
    typeCounts[death.deathType] = (typeCounts[death.deathType] || 0) + 1;
  });

  const deathsByType: DeathTypeStats[] = Object.entries(typeCounts)
    .map(([type, count]) => ({
      type: type as DeathTypeCodeType,
      count,
      percentage: totalDeaths > 0 ? (count / totalDeaths) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);

  // Calculate killer statistics using PlayersKilled arrays
  const killerCounts: Record<string, { kills: number; victims: Set<string>; killsByDeathType: Record<DeathTypeCodeType, number> }> = {};
  
  // Extract all kills from PlayersKilled arrays
  filteredGameData.forEach(game => {
    const kills = extractKillsFromGame(game, campFilter);
    kills.forEach(kill => {
      if (!killerCounts[kill.killerName]) {
        killerCounts[kill.killerName] = { kills: 0, victims: new Set(), killsByDeathType: {} as Record<DeathTypeCodeType, number> };
      }
      killerCounts[kill.killerName].kills++;
      killerCounts[kill.killerName].victims.add(kill.victimName);
      
      // Track kills by death type
      killerCounts[kill.killerName].killsByDeathType[kill.deathType] = 
        (killerCounts[kill.killerName].killsByDeathType[kill.deathType] || 0) + 1;
    });
  });

  const killerStats: KillerStats[] = Object.entries(killerCounts)
    .map(([killerName, data]) => {
      const gamesPlayed = playerGameCounts[killerName] || 0;
      const averageKillsPerGame = gamesPlayed > 0 ? data.kills / gamesPlayed : 0;
      return {
        killerName,
        kills: data.kills,
        victims: Array.from(data.victims),
        percentage: totalDeaths > 0 ? (data.kills / totalDeaths) * 100 : 0,
        gamesPlayed,
        averageKillsPerGame,
        killsByDeathType: data.killsByDeathType
      };
    })
    .sort((a, b) => b.kills - a.kills);

  // Calculate player-specific death statistics
  const playerDeathCounts: Record<string, {
    totalDeaths: number;
    deathsByType: Record<DeathTypeCodeType, number>;
    killedBy: Record<string, number>;
    deathDays: number[];
  }> = {};

  allDeaths.forEach(death => {
    if (!playerDeathCounts[death.playerName]) {
      playerDeathCounts[death.playerName] = {
        totalDeaths: 0,
        deathsByType: {} as Record<DeathTypeCodeType, number>,
        killedBy: {},
        deathDays: []
      };
    }
    
    const playerData = playerDeathCounts[death.playerName];
    playerData.totalDeaths++;
    
    playerData.deathsByType[death.deathType] = (playerData.deathsByType[death.deathType] || 0) + 1;
    
    if (death.killerName) {
      playerData.killedBy[death.killerName] = (playerData.killedBy[death.killerName] || 0) + 1;
    }
  });

  const playerDeathStats: PlayerDeathStats[] = Object.entries(playerDeathCounts)
    .map(([playerName, data]) => ({
      playerName,
      totalDeaths: data.totalDeaths,
      deathsByType: data.deathsByType,
      killedBy: data.killedBy,
      averageDeathDay: data.deathDays.length > 0 
        ? data.deathDays.reduce((sum, day) => sum + day, 0) / data.deathDays.length 
        : null,
      deathRate: playerGameCounts[playerName] > 0 
        ? data.totalDeaths / playerGameCounts[playerName] 
        : 0
    }))
    .sort((a, b) => b.totalDeaths - a.totalDeaths);

  const mostCommonDeathType = deathsByType.length > 0 ? deathsByType[0].type : null;
  const mostDeadlyKiller = killerStats.length > 0 ? killerStats[0].killerName : null;

  return {
    totalDeaths,
    totalGames,
    averageDeathsPerGame,
    deathsByType,
    killerStats,
    playerDeathStats,
    mostCommonDeathType,
    mostDeadlyKiller
  };
}