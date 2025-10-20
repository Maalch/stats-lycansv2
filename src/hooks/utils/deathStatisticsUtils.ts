import type { GameLogEntry } from '../useCombinedRawData';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../../utils/datasyncExport';
import { DEATH_TYPES, type DeathType, isValidDeathType, getDeathTypeLabel } from '../../types/deathTypes';
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
          regroupWolfSubRoles: false
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
  type: DeathType;
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
  killsByDeathType: Record<DeathType, number>; // New field for death type breakdown
}

/**
 * Player death statistics
 */
export interface PlayerDeathStats {
  playerName: string;
  totalDeaths: number;
  deathsByType: Record<DeathType, number>;
  killedBy: Record<string, number>;
  deathRate: number; // Deaths per game played
  gamesPlayed: number; // Total games played by this player
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
  mostCommonDeathType: DeathType | null;
  mostDeadlyKiller: string | null;
}


/**
 * Convert death type code to death description (from victim's perspective)
 * 
 * @deprecated Use getDeathTypeLabel from deathTypes.ts instead
 */
export function getDeathDescription(deathTypeCode: DeathType): string {
  // Use centralized label function
  return getDeathTypeLabel(deathTypeCode);
}

/**
 * Convert death type code to kill description (from killer's perspective)
 */
export function getKillDescription(deathTypeCode: DeathType): string {
  switch (deathTypeCode) {
    case DEATH_TYPES.VOTED:
      return 'Mort aux votes';
    case DEATH_TYPES.BY_WOLF:
      return 'Kill en Loup';
    case DEATH_TYPES.SURVIVALIST_NOT_SAVED:
      return 'Kill en Loup';
    case DEATH_TYPES.BY_ZOMBIE:
      return 'Kill en Zombie';
    case DEATH_TYPES.BY_BEAST:
      return 'Kill en Bête';
    case DEATH_TYPES.BY_AVATAR_CHAIN:
      return 'Mort d\'Avatar';
    case DEATH_TYPES.BULLET:
      return 'Tir de Chasseur';
    case DEATH_TYPES.BULLET_HUMAN:
      return 'Kill en Chasseur (sur humain)';
    case DEATH_TYPES.BULLET_WOLF:
      return 'Kill en Chasseur (sur loup)';
    case DEATH_TYPES.SHERIF_SUCCESS :
      return 'Kill en Shérif';
    case DEATH_TYPES.OTHER_AGENT:
      return 'Kill en Agent';
    case DEATH_TYPES.AVENGER:
      return 'Kill en Vengeur';
    case DEATH_TYPES.SEER:
      return 'Kill en Devin';
    case DEATH_TYPES.HANTED:
      return 'Kill avec Potion hantée';
    case DEATH_TYPES.ASSASSIN:
      return 'Kill avec Potion (Assassin)';
    case DEATH_TYPES.LOVER_DEATH:
      return 'Kill d\'amoureux';
    case DEATH_TYPES.BOMB:
      return 'Explosion';
    case DEATH_TYPES.CRUSHED:
      return 'Écrasement';
    case DEATH_TYPES.STARVATION:
      return 'Famine';
    case DEATH_TYPES.STARVATION_AS_BEAST:
      return 'Tuerie bestiale';
    case DEATH_TYPES.FALL:
      return 'Chute mortelle';
    case DEATH_TYPES.UNKNOWN:
      return 'Kill inconnu';
    default:
      return '';
  }
}


/**
 * Get all unique death types from game data for chart configuration
 */
export function getAllDeathTypes(gameData: GameLogEntry[]): DeathType[] {
  const deathTypesSet = new Set<DeathType>();
  
  gameData.forEach(game => {
    game.PlayerStats.forEach(player => {
      if (player.DeathType && isValidDeathType(player.DeathType)) {
        deathTypesSet.add(player.DeathType);
      }
    });
  });
  
  const deathTypes = Array.from(deathTypesSet);
  
  // Sort death types to put common ones first
  const commonTypeCodes: DeathType[] = [
    DEATH_TYPES.BY_WOLF,
    DEATH_TYPES.VOTED, 
    DEATH_TYPES.BULLET,
    DEATH_TYPES.BULLET_HUMAN,
    DEATH_TYPES.BULLET_WOLF,
    DEATH_TYPES.BY_ZOMBIE,
    DEATH_TYPES.ASSASSIN,
    DEATH_TYPES.AVENGER,
    DEATH_TYPES.LOVER_DEATH
  ];
  
  return [
    ...commonTypeCodes.filter(type => deathTypes.includes(type)),
    ...deathTypes.filter(type => !commonTypeCodes.includes(type)).sort()
  ];
}

/**
 * Extract all deaths from a game
 */
export function extractDeathsFromGame(game: GameLogEntry, campFilter?: string): Array<{
  playerName: string;
  deathType: DeathType;
  killerName: string | null;
  killerCamp: string | null;
}> {
  return game.PlayerStats
    .filter(player => {
      // Only include players who actually died (not survivors)
      return player.DeathType && isValidDeathType(player.DeathType) && (player.DeathTiming || player.DeathType);
    })
    .map(player => {
      // Find the killer's camp if killer exists
      let killerCamp: string | null = null;
      if (player.KillerName) {
        const killerPlayer = game.PlayerStats.find(p => p.Username === player.KillerName);
        if (killerPlayer) {
          const finalKillerRole = getPlayerFinalRole(killerPlayer.MainRoleInitial, killerPlayer.MainRoleChanges || []);
          // For killer statistics: use MainRoleInitial as base camp
          // But add special logic for kills when final role differs from MainRoleInitial
          killerCamp = getPlayerCampFromRole(finalKillerRole, {
            regroupLovers: true,
            regroupVillagers: true,
            regroupWolfSubRoles: false
          });
          
          // Special case: if final role is Loup or Zombie and different from MainRoleInitial,
          // categorize these kills under the final role
          if (finalKillerRole && finalKillerRole !== killerPlayer.MainRoleInitial) {
            if (finalKillerRole === 'Loup') {
              killerCamp = 'Loup';
            } else if (finalKillerRole === 'Zombie') {
              killerCamp = 'Vaudou';
            }
          }
        }
      }
      
      return {
        playerName: player.Username,
        deathType: player.DeathType!,
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
        regroupWolfSubRoles: false
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
  deathType: DeathType;
  killerCamp: string;
}> {
  const kills: Array<{
    killerName: string;
    victimName: string;
    deathType: DeathType;
    killerCamp: string;
  }> = [];
  
  game.PlayerStats.forEach(player => {
    // Only process players who were killed by someone (not environmental deaths or votes)
    if (player.KillerName && player.DeathType) {
      // Skip non-kill deaths (survivors, votes, environmental deaths)
      if (player.DeathType === DEATH_TYPES.VOTED || 
          player.DeathType === DEATH_TYPES.STARVATION || 
          player.DeathType === DEATH_TYPES.FALL || 
          player.DeathType === DEATH_TYPES.BY_AVATAR_CHAIN) {
        return;
      }
      
      // Find the killer's information
      const killerPlayer = game.PlayerStats.find(p => p.Username === player.KillerName);
      if (!killerPlayer) {
        return; // Skip if killer not found in this game
      }
      
      // For killer statistics: use MainRoleInitial as base camp
      // But add special logic for kills when final role differs from MainRoleInitial
      let killerCamp = getPlayerCampFromRole(killerPlayer.MainRoleInitial, {
        regroupLovers: true,
        regroupVillagers: true,
        regroupWolfSubRoles: false
      });
      
      // Special case: if final role is Loup or Zombie and different from MainRoleInitial,
      // categorize these kills under the final role
      const finalKillerRole = getPlayerFinalRole(killerPlayer.MainRoleInitial, killerPlayer.MainRoleChanges || []);
      if (finalKillerRole && finalKillerRole !== killerPlayer.MainRoleInitial) {
        if (finalKillerRole === 'Loup') {
          killerCamp = 'Loup';
        } else if (finalKillerRole === 'Zombie') {
          killerCamp = 'Vaudou';
        }
      }
      
      kills.push({
        killerName: player.KillerName,
        victimName: player.Username,
        deathType: player.DeathType,
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
    deathType: DeathType;
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
          regroupWolfSubRoles: false
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
  const typeCounts: Partial<Record<DeathType, number>> = {};
  allDeaths.forEach(death => {
    typeCounts[death.deathType] = (typeCounts[death.deathType] || 0) + 1;
  });

  const deathsByType: DeathTypeStats[] = Object.entries(typeCounts)
    .map(([type, count]) => ({
      type: type as DeathType,
      count: count || 0,
      percentage: totalDeaths > 0 ? ((count || 0) / totalDeaths) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);

  // Calculate killer statistics using PlayersKilled arrays
  const killerCounts: Record<string, { kills: number; victims: Set<string>; killsByDeathType: Record<DeathType, number> }> = {};
  
  // Extract all kills from PlayersKilled arrays
  filteredGameData.forEach(game => {
    const kills = extractKillsFromGame(game, campFilter);
    kills.forEach(kill => {
      if (!killerCounts[kill.killerName]) {
        killerCounts[kill.killerName] = { kills: 0, victims: new Set(), killsByDeathType: {} as Record<DeathType, number> };
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
    deathsByType: Record<DeathType, number>;
    killedBy: Record<string, number>;
    deathDays: number[];
  }> = {};

  allDeaths.forEach(death => {
    if (!playerDeathCounts[death.playerName]) {
      playerDeathCounts[death.playerName] = {
        totalDeaths: 0,
        deathsByType: {} as Record<DeathType, number>,
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

  // Create playerDeathStats for all players who played games, including those with zero deaths
  const allPlayerStats: PlayerDeathStats[] = [];
  
  // First add players who died
  Object.entries(playerDeathCounts).forEach(([playerName, data]) => {
    allPlayerStats.push({
      playerName,
      totalDeaths: data.totalDeaths,
      deathsByType: data.deathsByType,
      killedBy: data.killedBy,
      deathRate: playerGameCounts[playerName] > 0 
        ? data.totalDeaths / playerGameCounts[playerName] 
        : 0,
      gamesPlayed: playerGameCounts[playerName] || 0
    });
  });

  // Then add players who played games but never died
  Object.entries(playerGameCounts).forEach(([playerName, gamesPlayed]) => {
    if (!playerDeathCounts[playerName]) {
      allPlayerStats.push({
        playerName,
        totalDeaths: 0,
        deathsByType: {} as Record<DeathType, number>,
        killedBy: {},
        deathRate: 0,
        gamesPlayed
      });
    }
  });

  const playerDeathStats = allPlayerStats.sort((a, b) => b.totalDeaths - a.totalDeaths);

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

/**
 * Hunter statistics
 */
export interface HunterStats {
  hunterName: string;
  totalKills: number;
  nonVillageoisKills: number;
  villageoisKills: number;
  gamesPlayedAsHunter: number;
  averageKillsPerGame: number;
  averageNonVillageoisKillsPerGame: number;
  killsByDeathType: Record<DeathType, number>;
  victimsByCamp: Record<string, number>;
}

/**
 * Comprehensive hunter statistics
 */
export interface HunterStatistics {
  totalHunters: number;
  totalGames: number;
  hunterStats: HunterStats[];
  bestHunter: string | null;
  bestAverageHunter: string | null;
}

/**
 * Compute hunter-specific statistics
 * Tracks kills made by hunters (Chasseur role) and categorizes them
 */
export function computeHunterStatistics(gameData: GameLogEntry[], selectedCamp?: string): HunterStatistics {
  // Filter games to only include those with complete death information
  const filteredGameData = gameData.filter(game => 
    !game.LegacyData || game.LegacyData.deathInformationFilled === true
  );

  const hunterKillsMap: Record<string, {
    kills: DeathType[];
    gamesPlayed: number;
    victimsCamps: string[];
  }> = {};

  const totalGames = filteredGameData.length;

  // Hunter-related death types
  const hunterDeathTypes: DeathType[] = [
    DEATH_TYPES.BULLET,
    DEATH_TYPES.BULLET_HUMAN,
    DEATH_TYPES.BULLET_WOLF
  ];

  // Process each game
  filteredGameData.forEach(game => {
    // Track which players were hunters in this game
    const huntersInGame = new Set<string>();
    
    game.PlayerStats.forEach(player => {
      // Check if player was Chasseur (using MainRoleInitial OR final role)
      const initialRole = player.MainRoleInitial;
      const finalRole = getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []);
      if (initialRole === 'Chasseur' || finalRole === 'Chasseur') {
        huntersInGame.add(player.Username);
        
        // Initialize hunter if not exists
        if (!hunterKillsMap[player.Username]) {
          hunterKillsMap[player.Username] = {
            kills: [],
            gamesPlayed: 0,
            victimsCamps: []
          };
        }
        hunterKillsMap[player.Username].gamesPlayed++;
      }
    });

    // Process deaths caused by hunters
    game.PlayerStats.forEach(victim => {
      const deathType = victim.DeathType as DeathType;
      const killerName = victim.KillerName;
      
      // Check if death was caused by a hunter
      if (deathType && hunterDeathTypes.includes(deathType) && killerName && huntersInGame.has(killerName)) {
        // Get victim's camp
        const victimCamp = getPlayerCampFromRole(victim.MainRoleInitial, {
          regroupLovers: true,
          regroupVillagers: true,
          regroupWolfSubRoles: false
        });
        
        // Apply camp filter if specified
        if (!selectedCamp || selectedCamp === 'Tous les camps' || victimCamp === selectedCamp) {
          hunterKillsMap[killerName].kills.push(deathType);
          hunterKillsMap[killerName].victimsCamps.push(victimCamp);
        }
      }
    });
  });

  // Process hunter statistics
  const hunterStats: HunterStats[] = Object.entries(hunterKillsMap)
    .map(([hunterName, data]) => {
      const totalKills = data.kills.length;
      
      // Count kills by death type
      const killsByDeathType: Record<DeathType, number> = {} as Record<DeathType, number>;
      data.kills.forEach(deathType => {
        killsByDeathType[deathType] = (killsByDeathType[deathType] || 0) + 1;
      });
      
      // Count kills by victim camp
      const victimsByCamp: Record<string, number> = {};
      data.victimsCamps.forEach(camp => {
        victimsByCamp[camp] = (victimsByCamp[camp] || 0) + 1;
      });
      
      // Calculate non-Villageois kills
      const nonVillageoisKills = data.victimsCamps.filter(camp => camp !== 'Villageois').length;
      const villageoisKills = data.victimsCamps.filter(camp => camp === 'Villageois').length;
      
      const averageKillsPerGame = data.gamesPlayed > 0 ? totalKills / data.gamesPlayed : 0;
      const averageNonVillageoisKillsPerGame = data.gamesPlayed > 0 ? nonVillageoisKills / data.gamesPlayed : 0;
      
      return {
        hunterName,
        totalKills,
        nonVillageoisKills,
        villageoisKills,
        gamesPlayedAsHunter: data.gamesPlayed,
        averageKillsPerGame,
        averageNonVillageoisKillsPerGame,
        killsByDeathType,
        victimsByCamp
      };
    })
    .sort((a, b) => b.totalKills - a.totalKills);

  const bestHunter = hunterStats.length > 0 ? hunterStats[0].hunterName : null;
  const bestAverageHunter = hunterStats.length > 0 
    ? hunterStats.sort((a, b) => b.averageNonVillageoisKillsPerGame - a.averageNonVillageoisKillsPerGame)[0].hunterName 
    : null;

  return {
    totalHunters: hunterStats.length,
    totalGames,
    hunterStats,
    bestHunter,
    bestAverageHunter
  };
}

