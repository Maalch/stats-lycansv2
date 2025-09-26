import type { GameLogEntry } from '../useCombinedRawData';
import { getPlayerCampFromRole } from '../../utils/gameUtils';

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
      // Check if this player has killed someone in this game
      const hasKills = game.PlayerStats.some(victim => victim.KillerName === player.Username);
      
      if (hasKills) {
        const camp = getPlayerCampFromRole(player.MainRoleInitial, {
          regroupLovers: true,
          regroupVillagers: true,
          regroupTraitor: true
        });
        campsSet.add(camp);
      }
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
 * Death timing phases
 */
export type DeathPhase = 'Nuit' | 'Jour' | 'Meeting';

/**
 * Parsed death timing information
 */
export interface DeathTiming {
  phase: DeathPhase;
  day: number;
  originalString: string;
}

/**
 * Death statistics by timing
 */
export interface DeathTimingStats {
  phase: DeathPhase;
  day: number;
  count: number;
  percentage: number;
}

/**
 * Death statistics by type
 */
export interface DeathTypeStats {
  type: string;
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
  killsByDeathType: Record<string, number>; // New field for death type breakdown
}

/**
 * Player death statistics
 */
export interface PlayerDeathStats {
  playerName: string;
  totalDeaths: number;
  deathsByPhase: Record<DeathPhase, number>;
  deathsByType: Record<string, number>;
  killedBy: Record<string, number>;
  averageDeathDay: number | null;
  deathRate: number; // Deaths per game played
}

/**
 * Comprehensive death statistics
 */
export interface DeathStatistics {
  totalDeaths: number;
  totalGames: number;
  averageDeathsPerGame: number;
  
  // Death timing statistics
  deathsByTiming: DeathTimingStats[];
  deathsByPhase: Record<DeathPhase, number>;
  
  // Death type statistics
  deathsByType: DeathTypeStats[];
  
  // Killer statistics
  killerStats: KillerStats[];
  
  // Player-specific death statistics
  playerDeathStats: PlayerDeathStats[];
  
  // Most dangerous phases/times
  mostDeadlyPhase: DeathPhase;
  mostDeadlyDay: number;
  mostCommonDeathType: string;
  mostDeadlyKiller: string | null;
}

/**
 * Parse death timing string (e.g., "N1", "J2", "M3")
 */
export function parseDeathTiming(deathTiming: string | null): DeathTiming | null {
  if (!deathTiming) return null;
  
  const match = deathTiming.match(/^([NJM])(\d+)$/);
  if (!match) return null;
  
  const [, phaseCode, dayStr] = match;
  const day = parseInt(dayStr, 10);
  
  let phase: DeathPhase;
  switch (phaseCode) {
    case 'N':
      phase = 'Nuit';
      break;
    case 'J':
      phase = 'Jour';
      break;
    case 'M':
      phase = 'Meeting';
      break;
    default:
      return null;
  }
  
  return {
    phase,
    day,
    originalString: deathTiming
  };
}

/**
 * Normalize death type for consistent grouping
 */
export function normalizeDeathType(deathType: string | null): string {
  if (!deathType || (deathType == 'N/A')) return 'Survivant';
  
  // Normalize common variations
  const normalized = deathType.trim();
  
  // Group similar death types
  if (normalized.includes('vote') || normalized.includes('Vote')) {
    return 'Mort aux votes';
  }
  if (normalized.includes('Loup') || normalized.includes('loup')) {
    return 'Kill en Loup';
  }
  if (normalized.includes('Zombie') || normalized.includes('zombie')) {
    return 'Kill en Zombie';
  }
  if (normalized.includes('Chasseur') || normalized.includes('chasseur')) {
    return 'Tir de Chasseur';
  }
  if (normalized.includes('Déco') || normalized.includes('déco')) {
    return 'Déconnexion';
  }
  if (normalized.includes('Potion') || normalized.includes('potion')) {
    return 'Kill avec Potion';
  }
  if (normalized.includes('vengeur') || normalized.includes('Vengeur')) {
    return 'Kill en Vengeur';
  }
  
  return normalized;
}

/**
 * Get all unique death types from game data for chart configuration
 */
export function getAllDeathTypes(gameData: GameLogEntry[]): string[] {
  const deathTypesSet = new Set<string>();
  
  gameData.forEach(game => {
    game.PlayerStats.forEach(player => {
      if (player.DeathType) {
        deathTypesSet.add(normalizeDeathType(player.DeathType));
      }
    });
  });
  
  const deathTypes = Array.from(deathTypesSet);
  
  // Sort death types to put common ones first
  const commonTypes = [
    'Kill en Loup',
    'Mort aux votes', 
    'Tir de Chasseur',
    'Kill en Zombie',
    'Kill avec Potion',
    'Kill en Vengeur',
    'Déconnexion',
    'Survivant'
  ];
  
  return [
    ...commonTypes.filter(type => deathTypes.includes(type)),
    ...deathTypes.filter(type => !commonTypes.includes(type)).sort()
  ];
}

/**
 * Extract all deaths from a game
 */
export function extractDeathsFromGame(game: GameLogEntry, campFilter?: string): Array<{
  playerName: string;
  deathTiming: DeathTiming | null;
  deathType: string;
  killerName: string | null;
  killerCamp: string | null;
}> {
  return game.PlayerStats
    .filter(player => player.DeathTiming || player.DeathType)
    .map(player => {
      // Find the killer's camp if killer exists
      let killerCamp: string | null = null;
      if (player.KillerName) {
        const killerPlayer = game.PlayerStats.find(p => p.Username === player.KillerName);
        if (killerPlayer) {
          killerCamp = getPlayerCampFromRole(killerPlayer.MainRoleInitial, {
            regroupLovers: true,
            regroupVillagers: true,
            regroupTraitor: true
          });
        }
      }
      
      return {
        playerName: player.Username,
        deathTiming: parseDeathTiming(player.DeathTiming),
        deathType: normalizeDeathType(player.DeathType),
        killerName: player.KillerName,
        killerCamp
      };
    })
    // Filter by killer's camp if specified
    .filter(death => {
      if (!campFilter || campFilter === 'Tous les camps') return true;
      // Only include deaths where the killer is from the selected camp
      return death.killerCamp === campFilter;
    });
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
    deathTiming: DeathTiming | null;
    deathType: string;
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
        const playerCamp = getPlayerCampFromRole(player.MainRoleInitial, {
          regroupLovers: true,
          regroupVillagers: true,
          regroupTraitor: true
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

  // Calculate death timing statistics
  const timingCounts: Record<string, number> = {};
  const phaseCounts: Record<DeathPhase, number> = {
    'Nuit': 0,
    'Jour': 0,
    'Meeting': 0
  };
  
  allDeaths.forEach(death => {
    if (death.deathTiming) {
      const key = `${death.deathTiming.phase}-${death.deathTiming.day}`;
      timingCounts[key] = (timingCounts[key] || 0) + 1;
      phaseCounts[death.deathTiming.phase]++;
    }
  });

  const deathsByTiming: DeathTimingStats[] = Object.entries(timingCounts)
    .map(([key, count]) => {
      const [phase, dayStr] = key.split('-');
      return {
        phase: phase as DeathPhase,
        day: parseInt(dayStr, 10),
        count,
        percentage: totalDeaths > 0 ? (count / totalDeaths) * 100 : 0
      };
    })
    .sort((a, b) => {
      if (a.phase !== b.phase) {
        const phaseOrder = { 'Nuit': 0, 'Jour': 1, 'Meeting': 2 };
        return phaseOrder[a.phase] - phaseOrder[b.phase];
      }
      return a.day - b.day;
    });

  // Calculate death type statistics
  const typeCounts: Record<string, number> = {};
  allDeaths.forEach(death => {
    typeCounts[death.deathType] = (typeCounts[death.deathType] || 0) + 1;
  });

  const deathsByType: DeathTypeStats[] = Object.entries(typeCounts)
    .map(([type, count]) => ({
      type,
      count,
      percentage: totalDeaths > 0 ? (count / totalDeaths) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);

  // Calculate killer statistics
  const killerCounts: Record<string, { kills: number; victims: Set<string>; killsByDeathType: Record<string, number> }> = {};
  allDeaths.forEach(death => {
    if (death.killerName) {
      if (!killerCounts[death.killerName]) {
        killerCounts[death.killerName] = { kills: 0, victims: new Set(), killsByDeathType: {} };
      }
      killerCounts[death.killerName].kills++;
      killerCounts[death.killerName].victims.add(death.playerName);
      
      // Track kills by death type
      const deathType = death.deathType;
      killerCounts[death.killerName].killsByDeathType[deathType] = 
        (killerCounts[death.killerName].killsByDeathType[deathType] || 0) + 1;
    }
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
    deathsByPhase: Record<DeathPhase, number>;
    deathsByType: Record<string, number>;
    killedBy: Record<string, number>;
    deathDays: number[];
  }> = {};

  allDeaths.forEach(death => {
    if (!playerDeathCounts[death.playerName]) {
      playerDeathCounts[death.playerName] = {
        totalDeaths: 0,
        deathsByPhase: { 'Nuit': 0, 'Jour': 0, 'Meeting': 0 },
        deathsByType: {},
        killedBy: {},
        deathDays: []
      };
    }
    
    const playerData = playerDeathCounts[death.playerName];
    playerData.totalDeaths++;
    
    if (death.deathTiming) {
      playerData.deathsByPhase[death.deathTiming.phase]++;
      playerData.deathDays.push(death.deathTiming.day);
    }
    
    playerData.deathsByType[death.deathType] = (playerData.deathsByType[death.deathType] || 0) + 1;
    
    if (death.killerName) {
      playerData.killedBy[death.killerName] = (playerData.killedBy[death.killerName] || 0) + 1;
    }
  });

  const playerDeathStats: PlayerDeathStats[] = Object.entries(playerDeathCounts)
    .map(([playerName, data]) => ({
      playerName,
      totalDeaths: data.totalDeaths,
      deathsByPhase: data.deathsByPhase,
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

  // Find most dangerous statistics
  const mostDeadlyPhase = Object.entries(phaseCounts)
    .reduce((max, [phase, count]) => count > max.count ? { phase: phase as DeathPhase, count } : max, 
            { phase: 'Nuit' as DeathPhase, count: 0 }).phase;

  const dayDeathCounts: Record<number, number> = {};
  allDeaths.forEach(death => {
    if (death.deathTiming) {
      dayDeathCounts[death.deathTiming.day] = (dayDeathCounts[death.deathTiming.day] || 0) + 1;
    }
  });
  
  const mostDeadlyDay = Object.entries(dayDeathCounts)
    .reduce((max, [day, count]) => count > max.count ? { day: parseInt(day, 10), count } : max,
            { day: 1, count: 0 }).day;

  const mostCommonDeathType = deathsByType.length > 0 ? deathsByType[0].type : '';
  const mostDeadlyKiller = killerStats.length > 0 ? killerStats[0].killerName : null;

  return {
    totalDeaths,
    totalGames,
    averageDeathsPerGame,
    deathsByTiming,
    deathsByPhase: phaseCounts,
    deathsByType,
    killerStats,
    playerDeathStats,
    mostDeadlyPhase,
    mostDeadlyDay,
    mostCommonDeathType,
    mostDeadlyKiller
  };
}