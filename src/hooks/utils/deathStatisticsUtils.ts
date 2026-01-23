import type { GameLogEntry } from '../useCombinedRawData';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../../utils/datasyncExport';
import { DEATH_TYPES, type DeathType, isValidDeathType } from '../../types/deathTypes';
import { mainCampOrder } from '../../types/api';
import { getPlayerId } from '../../utils/playerIdentification';
import { compareVersion } from './dataUtils';

/**
 * Normalize death types by merging SURVIVALIST_NOT_SAVED into BY_WOLF
 * and converting null/undefined to UNKNOWN
 * This ensures both death types are treated as "Tué par Loup" in all statistics
 * and null deaths are properly categorized
 */
function normalizeDeathTypeForStats(deathType: DeathType | null): DeathType {
  if (!deathType) {
    return DEATH_TYPES.UNKNOWN;
  }
  if (deathType === DEATH_TYPES.SURVIVALIST_NOT_SAVED) {
    return DEATH_TYPES.BY_WOLF;
  }
  return deathType;
}

/**
 * Get all available camps from game data (camps that have at least one killer)
 */
export function getAvailableCamps(gameData: GameLogEntry[]): string[] {
  const campsSet = new Set<string>();
  
  
  gameData.forEach(game => {
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
 * Convert death type code to kill description (from killer's perspective)
 * Note: SURVIVALIST_NOT_SAVED is merged with BY_WOLF
 */
export function getKillDescription(deathTypeCode: DeathType): string {
  switch (deathTypeCode) {
    case DEATH_TYPES.VOTED:
      return 'Mort aux votes';
    case DEATH_TYPES.BY_WOLF:
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
      return 'Kill de Chasseur (sur humain)';
    case DEATH_TYPES.BULLET_WOLF:
      return 'Kill de Chasseur (sur loup)';
    case DEATH_TYPES.SHERIF_SUCCESS :
      return 'Kill de Shérif';
    case DEATH_TYPES.OTHER_AGENT:
      return 'Kill d\'Agent';
    case DEATH_TYPES.AVENGER:
      return 'Kill de Vengeur';
    case DEATH_TYPES.SEER:
      return 'Kill de Devin';
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
    case DEATH_TYPES.SMUGGLER_HUNT_KILL:
      return 'Kill sur Contrebandier';
    default:
      return '';
  }
}


/**
 * Get all unique death types from game data for chart configuration
 * Note: SURVIVALIST_NOT_SAVED is normalized to BY_WOLF, so it won't appear separately
 */
export function getAllDeathTypes(gameData: GameLogEntry[]): DeathType[] {
  const deathTypesSet = new Set<DeathType>();
  
  gameData.forEach(game => {
    game.PlayerStats.forEach(player => {
      if (player.DeathType && isValidDeathType(player.DeathType)) {
        // Normalize death type before adding to set
        const normalizedType = normalizeDeathTypeForStats(player.DeathType);
        if (normalizedType) {
          deathTypesSet.add(normalizedType);
        }
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
    DEATH_TYPES.LOVER_DEATH,
    DEATH_TYPES.SHERIF_SUCCESS
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
  playerId: string;       // Unique identifier (ID or Username fallback)
  playerName: string;     // Display name
  deathType: DeathType;
  killerId: string | null;
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
      let killerId: string | null = null;
      if (player.KillerName) {
        const killerPlayer = game.PlayerStats.find(p => p.Username === player.KillerName);
        if (killerPlayer) {
          killerId = getPlayerId(killerPlayer);
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
        playerId: getPlayerId(player),
        playerName: player.Username,
        deathType: normalizeDeathTypeForStats(player.DeathType!)!,
        killerId,
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
export function extractKillsFromGame(game: GameLogEntry, campFilter?: string, victimCampFilter?: string): Array<{
  killerId: string;       // Unique identifier
  killerName: string;     // Display name
  victimId: string;       // Unique identifier
  victimName: string;     // Display name
  deathType: DeathType;
  killerCamp: string;
  victimCamp: string;
}> {
  const kills: Array<{
    killerId: string;
    killerName: string;
    victimId: string;
    victimName: string;
    deathType: DeathType;
    killerCamp: string;
    victimCamp: string;
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
      
      // Get victim's camp from their initial role
      const victimCamp = getPlayerCampFromRole(player.MainRoleInitial, {
        regroupLovers: true,
        regroupVillagers: true,
        regroupWolfSubRoles: true
      });
      
      kills.push({
        killerId: getPlayerId(killerPlayer),
        killerName: killerPlayer.Username,
        victimId: getPlayerId(player),
        victimName: player.Username,
        deathType: normalizeDeathTypeForStats(player.DeathType)!,
        killerCamp,
        victimCamp
      });
    }
  });
  
  // Filter by killer camp if specified
  let filteredKills = kills;
  if (campFilter && campFilter !== 'Tous les camps') {
    filteredKills = filteredKills.filter(kill => kill.killerCamp === campFilter);
  }
  
  // Filter by victim camp if specified
  if (victimCampFilter && victimCampFilter !== 'Tous les camps') {
    filteredKills = filteredKills.filter(kill => {
      // Map filter option to actual camp
      if (victimCampFilter === 'Roles solo') {
        // Solo roles are camps that are not Villageois or Loup
        return kill.victimCamp !== 'Villageois' && kill.victimCamp !== 'Loup';
      }
      return kill.victimCamp === victimCampFilter;
    });
  }
  
  return filteredKills;
}

/**
 * Calculate comprehensive death statistics from game data
 */
export function computeDeathStatistics(gameData: GameLogEntry[], campFilter?: string, victimCampFilter?: string): DeathStatistics | null {
  if (gameData.length === 0) {
    return null;
  }


  if (gameData.length === 0) {
    return null;
  }

  // Extract all deaths
  const allDeaths: Array<{
    playerId: string;
    playerName: string;
    deathType: DeathType;
    killerId: string | null;
    killerName: string | null;
    killerCamp: string | null;
    gameId: string;
  }> = [];
  
  // Use IDs for counts; build display name map to latest seen name
  const playerGameCountsById: Record<string, number> = {};
  const displayNameById: Record<string, string> = {};
  
  gameData.forEach(game => {
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
      const playerId = getPlayerId(player);
      // Player names are already normalized during data loading
      const displayName = player.Username;
      displayNameById[playerId] = displayName; // Update latest
      
      if (!campFilter || campFilter === 'Tous les camps') {
        // No filter: count all games
        playerGameCountsById[playerId] = (playerGameCountsById[playerId] || 0) + 1;
      } else {
        // Filter active: only count games where player was in the filtered camp
        // Use MainRoleInitial for consistency with the new role detection logic
        const playerCamp = getPlayerCampFromRole(player.MainRoleInitial, {
          regroupLovers: true,
          regroupVillagers: true,
          regroupWolfSubRoles: false
        });
        
        if (playerCamp === campFilter) {
          playerGameCountsById[playerId] = (playerGameCountsById[playerId] || 0) + 1;
        }
      }
    });
  });

  const totalDeaths = allDeaths.length;
  const totalGames = gameData.length;
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
  const killerCountsById: Record<string, { kills: number; victims: Set<string>; killsByDeathType: Record<DeathType, number> }> = {};
  
  // Extract all kills from PlayersKilled arrays
  gameData.forEach(game => {
    const kills = extractKillsFromGame(game, campFilter, victimCampFilter);
    kills.forEach(kill => {
      displayNameById[kill.killerId] = kill.killerName; // Update latest
      displayNameById[kill.victimId] = kill.victimName; // Update latest
      if (!killerCountsById[kill.killerId]) {
        killerCountsById[kill.killerId] = { kills: 0, victims: new Set(), killsByDeathType: {} as Record<DeathType, number> };
      }
      killerCountsById[kill.killerId].kills++;
      killerCountsById[kill.killerId].victims.add(kill.victimId);
      
      // Track kills by death type
      killerCountsById[kill.killerId].killsByDeathType[kill.deathType] = 
        (killerCountsById[kill.killerId].killsByDeathType[kill.deathType] || 0) + 1;
    });
  });

  const killerStats: KillerStats[] = Object.entries(killerCountsById)
    .map(([killerId, data]) => {
      const gamesPlayed = playerGameCountsById[killerId] || 0;
      const averageKillsPerGame = gamesPlayed > 0 ? data.kills / gamesPlayed : 0;
      return {
        killerName: displayNameById[killerId] || killerId,
        kills: data.kills,
        victims: Array.from(data.victims).map(victimId => displayNameById[victimId] || victimId),
        percentage: totalDeaths > 0 ? (data.kills / totalDeaths) * 100 : 0,
        gamesPlayed,
        averageKillsPerGame,
        killsByDeathType: data.killsByDeathType
      };
    })
    .sort((a, b) => b.kills - a.kills);

  // Calculate player-specific death statistics
  const playerDeathCountsById: Record<string, {
    totalDeaths: number;
    deathsByType: Record<DeathType, number>;
    killedById: Record<string, number>;
    deathDays: number[];
  }> = {};

  allDeaths.forEach(death => {
    if (!playerDeathCountsById[death.playerId]) {
      playerDeathCountsById[death.playerId] = {
        totalDeaths: 0,
        deathsByType: {} as Record<DeathType, number>,
        killedById: {},
        deathDays: []
      };
    }
    
    const playerData = playerDeathCountsById[death.playerId];
    playerData.totalDeaths++;
    
    playerData.deathsByType[death.deathType] = (playerData.deathsByType[death.deathType] || 0) + 1;
    
    if (death.killerId) {
      playerData.killedById[death.killerId] = (playerData.killedById[death.killerId] || 0) + 1;
    }
  });

  // Create playerDeathStats for all players who played games, including those with zero deaths
  const allPlayerStats: PlayerDeathStats[] = [];
  
  // First add players who died
  Object.entries(playerDeathCountsById).forEach(([playerId, data]) => {
    const playerName = displayNameById[playerId] || playerId;
    // Convert killedById to killedBy names
    const killedBy: Record<string, number> = {};
    Object.entries(data.killedById).forEach(([killerId, n]) => {
      const name = displayNameById[killerId] || killerId;
      killedBy[name] = (killedBy[name] || 0) + n;
    });
    allPlayerStats.push({
      playerName,
      totalDeaths: data.totalDeaths,
      deathsByType: data.deathsByType,
      killedBy,
      deathRate: playerGameCountsById[playerId] > 0 
        ? data.totalDeaths / playerGameCountsById[playerId] 
        : 0,
      gamesPlayed: playerGameCountsById[playerId] || 0
    });
  });

  // Then add players who played games but never died
  Object.entries(playerGameCountsById).forEach(([playerId, gamesPlayed]) => {
    if (!playerDeathCountsById[playerId]) {
      allPlayerStats.push({
        playerName: displayNameById[playerId] || playerId,
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
  goodVictimsByCamp: Record<string, number>; // Non-Villageois + pre-0.202 Idiot du Village
  badVictimsByCamp: Record<string, number>;  // Villageois + post-0.202 Idiot du Village
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

  const hunterKillsMap: Record<string, {
    kills: DeathType[];
    gamesPlayed: number;
    victimsCamps: string[];
    gameVersions: string[]; // Track game versions for special rule handling
    gameModded: boolean[]; // Track if game was modded for special rule handling
  }> = {};

  // Track latest display names for hunter IDs
  const displayNameById: Record<string, string> = {};

  const totalGames = gameData.length;

  // Hunter-related death types
  const hunterDeathTypes: DeathType[] = [
    DEATH_TYPES.BULLET,
    DEATH_TYPES.BULLET_HUMAN,
    DEATH_TYPES.BULLET_WOLF
  ];

  // Process each game
  gameData.forEach(game => {
    // Track which players were hunters in this game (by ID)
    const huntersInGame = new Set<string>();
    
    game.PlayerStats.forEach(player => {
      // Check if player was Chasseur (handles both formats):
      // - Legacy format: MainRoleInitial === 'Chasseur'
      // - New format: MainRoleInitial === 'Villageois Élite' && Power === 'Chasseur'
      const initialRole = player.MainRoleInitial;
      const finalRole = getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []);
      const isHunterPlayer = initialRole === 'Chasseur' || finalRole === 'Chasseur' ||
                              (initialRole === 'Villageois Élite' && player.Power === 'Chasseur');
      if (isHunterPlayer) {
        const hunterId = getPlayerId(player);
        displayNameById[hunterId] = player.Username;
        huntersInGame.add(hunterId);
        
        // Initialize hunter if not exists
        if (!hunterKillsMap[hunterId]) {
          hunterKillsMap[hunterId] = {
            kills: [],
            gamesPlayed: 0,
            victimsCamps: [],
            gameVersions: [],
            gameModded: []
          };
        }
        hunterKillsMap[hunterId].gamesPlayed++;
      }
    });

    // Process deaths caused by hunters
    game.PlayerStats.forEach(victim => {
      const deathType = victim.DeathType as DeathType;
      const killerName = victim.KillerName; // username string in data
      
      // Resolve killer ID
      const killerPlayer = killerName ? game.PlayerStats.find(p => p.Username === killerName) : null;
      const killerId = killerPlayer ? getPlayerId(killerPlayer) : null;
      if (killerId && killerPlayer) {
        displayNameById[killerId] = killerPlayer.Username;
      }
      
      // Check if death was caused by a hunter
      if (deathType && hunterDeathTypes.includes(deathType) && killerId && huntersInGame.has(killerId)) {
        // Get victim's camp
        const victimCamp = getPlayerCampFromRole(victim.MainRoleInitial, {
          regroupLovers: true,
          regroupVillagers: true,
          regroupWolfSubRoles: false
        });
        
        // Apply camp filter if specified
        if (!selectedCamp || selectedCamp === 'Tous les camps' || victimCamp === selectedCamp) {
          hunterKillsMap[killerId].kills.push(deathType);
          hunterKillsMap[killerId].victimsCamps.push(victimCamp);
          hunterKillsMap[killerId].gameVersions.push(game.Version);
          hunterKillsMap[killerId].gameModded.push(game.Modded);
        }
      }
    });
  });

  // Process hunter statistics
  const hunterStats: HunterStats[] = Object.entries(hunterKillsMap)
    .map(([hunterId, data]) => {
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
      
      // Calculate non-Villageois kills with special rule for Idiot du Village
      // Rule: In modded games with version >= 0.202, killing "Idiot du Village" 
      // counts as a bad kill (the Idiot wins), otherwise it's a good kill
      let nonVillageoisKills = 0;
      let villageoisKills = 0;
      const goodVictimsByCamp: Record<string, number> = {};
      const badVictimsByCamp: Record<string, number> = {};
      
      data.victimsCamps.forEach((camp, index) => {
        const gameVersion = data.gameVersions[index];
        const gameModded = data.gameModded[index];
        
        // Special rule for Idiot du Village
        if (camp === 'Idiot du Village') {
          // If modded AND version >= 0.202, the Idiot wins when killed by hunter
          // So this counts as a bad kill (villageoisKills)
          if (gameModded && compareVersion(gameVersion, '0.202')) {
            villageoisKills++;
            badVictimsByCamp[camp] = (badVictimsByCamp[camp] || 0) + 1;
          } else {
            // Before 0.202 or not modded: killing Idiot is a good kill
            nonVillageoisKills++;
            goodVictimsByCamp[camp] = (goodVictimsByCamp[camp] || 0) + 1;
          }
        } else {
          // Normal camp-based classification
          if (camp === 'Villageois') {
            villageoisKills++;
            badVictimsByCamp[camp] = (badVictimsByCamp[camp] || 0) + 1;
          } else {
            nonVillageoisKills++;
            goodVictimsByCamp[camp] = (goodVictimsByCamp[camp] || 0) + 1;
          }
        }
      });
      
      const averageKillsPerGame = data.gamesPlayed > 0 ? totalKills / data.gamesPlayed : 0;
      const averageNonVillageoisKillsPerGame = data.gamesPlayed > 0 ? nonVillageoisKills / data.gamesPlayed : 0;
      
      return {
        hunterName: displayNameById[hunterId] || hunterId,
        totalKills,
        nonVillageoisKills,
        villageoisKills,
        gamesPlayedAsHunter: data.gamesPlayed,
        averageKillsPerGame,
        averageNonVillageoisKillsPerGame,
        killsByDeathType,
        victimsByCamp,
        goodVictimsByCamp,
        badVictimsByCamp
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


