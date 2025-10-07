import type { GameLogEntry } from '../useCombinedRawData';
import { DeathTypeCode, getPlayerCampFromRole, type DeathTypeCodeType } from '../../utils/datasyncExport';
import { mainCampOrder } from '../../types/api';

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
        // Use MainRoleInitial for camp detection to match the new role detection logic
        const camp = getPlayerCampFromRole(player.MainRoleInitial, {
          regroupLovers: true,
          regroupVillagers: true,
          regroupTraitor: false
        });
        campsSet.add(camp);
    });
  });
  
  const camps = Array.from(campsSet);
  
  // Sort camps to put main camps first
  const sortedCamps = [
    ...mainCampOrder.filter(camp => camps.includes(camp)),
    ...camps.filter(camp => !mainCampOrder.includes(camp)).sort()
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
 * Convert death type code to death description (from victim's perspective)
 */
export function getDeathDescription(deathTypeCode: DeathTypeCodeType): string {
  switch (deathTypeCode) {
    case DeathTypeCode.SURVIVOR:
      return 'Survivant';
    case DeathTypeCode.VOTED:
      return 'Mort aux votes';
    case DeathTypeCode.BY_WOLF:
      return 'Tué par un loup';
    case DeathTypeCode.BY_WOLF_REZ:
      return 'Tué par un loup ressuscité';
    case DeathTypeCode.BY_WOLF_LOVER:
      return 'Tué par un loup amoureux';
    case DeathTypeCode.BY_ZOMBIE:
      return 'Tué par un zombie';
    case DeathTypeCode.BY_BEAST:
      return 'Dévoré par la Bête';
    case DeathTypeCode.BY_AVATAR_CHAIN:
      return 'Mort liée à l\'Avatar';
    case DeathTypeCode.BULLET:
      return 'Abattu par un chasseur';
    case DeathTypeCode.BULLET_HUMAN:
      return 'Tué par un chasseur en humain';
    case DeathTypeCode.BULLET_WOLF:
      return 'Tué par un chasseur en loup';
    case DeathTypeCode.BULLET_BOUNTYHUNTER:
      return 'Tué par un chasseur de primes';
    case DeathTypeCode.SHERIF:
      return 'Abattu par le Shérif';
    case DeathTypeCode.OTHER_AGENT:
      return 'Éliminé par l\'Agent';
    case DeathTypeCode.AVENGER:
      return 'Tué par un vengeur';
    case DeathTypeCode.SEER:
      return 'Rôle deviné par un loup';
    case DeathTypeCode.HANTED:
      return 'Tué par une potion hantée';
    case DeathTypeCode.ASSASSIN:
      return 'Tué par une potion (Assassin)';
    case DeathTypeCode.LOVER_DEATH:
      return 'Mort par amoureux';
    case DeathTypeCode.LOVER_DEATH_OWN:
      return 'Tué par son amoureux';
    case DeathTypeCode.BOMB:
      return 'Mort dans une explosion';
    case DeathTypeCode.CRUSHED:
      return 'Écrasé';
    case DeathTypeCode.STARVATION:
      return 'Mort de faim';
    case DeathTypeCode.STARVATION_AS_BEAST:
      return 'Mort bestiale';
    case DeathTypeCode.FALL:
      return 'Mort de chute';
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
    case DeathTypeCode.VOTED:
      return 'Mort aux votes';
    case DeathTypeCode.BY_WOLF:
      return 'Kill en Loup';
    case DeathTypeCode.BY_WOLF_REZ:
      return 'Kill en Loup ressuscité';
    case DeathTypeCode.BY_WOLF_LOVER:
      return 'Kill en Loup amoureux';
    case DeathTypeCode.BY_ZOMBIE:
      return 'Kill en Zombie';
    case DeathTypeCode.BY_BEAST:
      return 'Kill en Bête';
    case DeathTypeCode.BY_AVATAR_CHAIN:
      return 'Mort d\'Avatar';
    case DeathTypeCode.BULLET:
      return 'Tir de Chasseur';
    case DeathTypeCode.BULLET_HUMAN:
      return 'Kill en Chasseur (sur humain)';
    case DeathTypeCode.BULLET_WOLF:
      return 'Kill en Chasseur (sur loup)';
    case DeathTypeCode.BULLET_BOUNTYHUNTER:
      return 'Kill en Chasseur de primes';
    case DeathTypeCode.SHERIF:
      return 'Kill en Shérif';
    case DeathTypeCode.OTHER_AGENT:
      return 'Kill en Agent';
    case DeathTypeCode.AVENGER:
      return 'Kill en Vengeur';
    case DeathTypeCode.SEER:
      return 'Kill en Devin';
    case DeathTypeCode.HANTED:
      return 'Kill avec Potion hantée';
    case DeathTypeCode.ASSASSIN:
      return 'Kill avec Potion (Assassin)';
    case DeathTypeCode.LOVER_DEATH:
      return 'Kill de son amoureux';
    case DeathTypeCode.LOVER_DEATH_OWN:
      return 'Kill de son propre amoureux';
    case DeathTypeCode.BOMB:
      return 'Explosion';
    case DeathTypeCode.CRUSHED:
      return 'Écrasement';
    case DeathTypeCode.STARVATION:
      return 'Famine';
    case DeathTypeCode.STARVATION_AS_BEAST:
      return 'Tuerie bestiale';
    case DeathTypeCode.FALL:
      return 'Chute mortelle';
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
      if (player.DeathType && player.DeathType !== DeathTypeCode.SURVIVOR && player.DeathType !== '') {
        deathTypesSet.add(player.DeathType as DeathTypeCodeType);
      }
    });
  });
  
  const deathTypes = Array.from(deathTypesSet);
  
  // Sort death types to put common ones first
  const commonTypeCodes = [
    DeathTypeCode.BY_WOLF,
    DeathTypeCode.VOTED, 
    DeathTypeCode.BULLET,
    DeathTypeCode.BULLET_HUMAN,
    DeathTypeCode.BULLET_WOLF,
    DeathTypeCode.BY_ZOMBIE,
    DeathTypeCode.ASSASSIN,
    DeathTypeCode.AVENGER,
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
      return player.DeathType && player.DeathType !== DeathTypeCode.SURVIVOR && player.DeathType !== '' && (player.DeathTiming || player.DeathType);
    })
    .map(player => {
      // Find the killer's camp if killer exists
      let killerCamp: string | null = null;
      if (player.KillerName) {
        const killerPlayer = game.PlayerStats.find(p => p.Username === player.KillerName);
        if (killerPlayer) {
          // For killer statistics: use MainRoleInitial as base camp
          // But add special logic for kills when MainRoleFinal differs from MainRoleInitial
          killerCamp = getPlayerCampFromRole(killerPlayer.MainRoleInitial, {
            regroupLovers: true,
            regroupVillagers: true,
            regroupTraitor: false
          });
          
          // Special case: if MainRoleFinal is Loup or Zombie and different from MainRoleInitial,
          // categorize these kills under the final role
          if (killerPlayer.MainRoleFinal && killerPlayer.MainRoleFinal !== killerPlayer.MainRoleInitial) {
            if (killerPlayer.MainRoleFinal === 'Loup') {
              killerCamp = 'Loup';
            } else if (killerPlayer.MainRoleFinal === 'Zombie') {
              killerCamp = 'Vaudou';
            }
          }
        }
      }
      
      return {
        playerName: player.Username,
        deathType: player.DeathType as DeathTypeCodeType,
        killerName: player.KillerName,
        killerCamp
      };
    })
    // Filter by camp if specified - for victim statistics, filter by victim's camp
    .filter(death => {
      if (!campFilter || campFilter === 'Tous les camps') return true;
      
      // Find the victim's camp using MainRoleInitial
      const victimPlayer = game.PlayerStats.find(p => p.Username === death.playerName);
      if (!victimPlayer) return false;
      
      const victimCamp = getPlayerCampFromRole(victimPlayer.MainRoleInitial, {
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
      // Skip non-kill deaths (survivors, votes, environmental deaths)
      if (player.DeathType === DeathTypeCode.SURVIVOR || player.DeathType === DeathTypeCode.VOTED || 
          player.DeathType === DeathTypeCode.STARVATION || player.DeathType === DeathTypeCode.FALL || 
          player.DeathType === DeathTypeCode.BY_AVATAR_CHAIN || player.DeathType === '') {
        return;
      }
      
      // Find the killer's information
      const killerPlayer = game.PlayerStats.find(p => p.Username === player.KillerName);
      if (!killerPlayer) {
        return; // Skip if killer not found in this game
      }
      
      // For killer statistics: use MainRoleInitial as base camp
      // But add special logic for kills when MainRoleFinal differs from MainRoleInitial
      let killerCamp = getPlayerCampFromRole(killerPlayer.MainRoleInitial, {
        regroupLovers: true,
        regroupVillagers: true,
        regroupTraitor: false
      });
      
      // Special case: if MainRoleFinal is Loup or Zombie and different from MainRoleInitial,
      // categorize these kills under the final role
      if (killerPlayer.MainRoleFinal && killerPlayer.MainRoleFinal !== killerPlayer.MainRoleInitial) {
        if (killerPlayer.MainRoleFinal === 'Loup') {
          killerCamp = 'Loup';
        } else if (killerPlayer.MainRoleFinal === 'Zombie') {
          killerCamp = 'Vaudou';
        }
      }
      
      kills.push({
        killerName: player.KillerName,
        victimName: player.Username,
        deathType: player.DeathType as DeathTypeCodeType,
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
        // Use MainRoleInitial for consistency with the new role detection logic
        const playerCamp = getPlayerCampFromRole(player.MainRoleInitial, {
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
      count: count || 0,
      percentage: totalDeaths > 0 ? ((count || 0) / totalDeaths) * 100 : 0
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