import type { GameLogEntry } from '../useCombinedRawData';

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
  gamesWithDeaths: number; // Games that have at least 1 death/killer
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
  if (!deathType) return 'Survivant';
  
  // Normalize common variations
  const normalized = deathType.trim();
  
  // Group similar death types
  if (normalized.includes('vote') || normalized.includes('Vote')) {
    return 'Mort aux votes';
  }
  if (normalized.includes('Loup') || normalized.includes('loup')) {
    return 'Tué par Loup';
  }
  if (normalized.includes('Zombie') || normalized.includes('zombie')) {
    return 'Tué par Zombie';
  }
  if (normalized.includes('Chasseur') || normalized.includes('chasseur')) {
    return 'Tué par Chasseur';
  }
  if (normalized.includes('Déco') || normalized.includes('déco')) {
    return 'Déconnexion';
  }
  if (normalized.includes('Potion') || normalized.includes('potion')) {
    return 'Tué par Potion';
  }
  
  return normalized;
}

/**
 * Extract all deaths from a game
 */
export function extractDeathsFromGame(game: GameLogEntry): Array<{
  playerName: string;
  deathTiming: DeathTiming | null;
  deathType: string;
  killerName: string | null;
}> {
  return game.PlayerStats
    .filter(player => player.DeathTiming || player.DeathType)
    .map(player => ({
      playerName: player.Username,
      deathTiming: parseDeathTiming(player.DeathTiming),
      deathType: normalizeDeathType(player.DeathType),
      killerName: player.KillerName
    }));
}

/**
 * Calculate comprehensive death statistics from game data
 */
export function computeDeathStatistics(gameData: GameLogEntry[]): DeathStatistics | null {
  if (gameData.length === 0) {
    return null;
  }

  // Extract all deaths
  const allDeaths: Array<{
    playerName: string;
    deathTiming: DeathTiming | null;
    deathType: string;
    killerName: string | null;
    gameId: string;
  }> = [];
  
  const playerGameCounts: Record<string, number> = {};
  const gamesWithDeathsSet = new Set<string>(); // Track unique games with deaths
  
  gameData.forEach(game => {
    const deaths = extractDeathsFromGame(game);
    if (deaths.length > 0) {
      gamesWithDeathsSet.add(game.Id); // Mark this game as having deaths
    }
    deaths.forEach(death => {
      allDeaths.push({
        ...death,
        gameId: game.Id
      });
    });
    
    // Count total games per player
    game.PlayerStats.forEach(player => {
      const playerName = player.Username;
      playerGameCounts[playerName] = (playerGameCounts[playerName] || 0) + 1;
    });
  });

  const totalDeaths = allDeaths.length;
  const totalGames = gameData.length;
  const gamesWithDeaths = gamesWithDeathsSet.size;
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
  const killerCounts: Record<string, { kills: number; victims: Set<string> }> = {};
  allDeaths.forEach(death => {
    if (death.killerName) {
      if (!killerCounts[death.killerName]) {
        killerCounts[death.killerName] = { kills: 0, victims: new Set() };
      }
      killerCounts[death.killerName].kills++;
      killerCounts[death.killerName].victims.add(death.playerName);
    }
  });

  const killerStats: KillerStats[] = Object.entries(killerCounts)
    .map(([killerName, data]) => ({
      killerName,
      kills: data.kills,
      victims: Array.from(data.victims),
      percentage: totalDeaths > 0 ? (data.kills / totalDeaths) * 100 : 0
    }))
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
    gamesWithDeaths,
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