import type { GameLogEntry } from '../useCombinedRawData';
import { getPlayerCampFromRole } from '../../utils/gameUtils';

export interface DeathStats {
  totalDeaths: number;
  totalSurvivors: number;
  survivalRate: number;
  deathsByType: Record<string, number>;
  deathsByTiming: Record<string, number>;
  deathsByPhase: {
    night: number;
    meeting: number;
    unknown: number;
  };
  averageDeathTiming: number;
  mostCommonDeathType: string | null;
  mostCommonDeathTiming: string | null;
}

export interface KillerAnalysis {
  killer: string;
  totalKills: number;
  victimsByRole: Record<string, number>;
  victims: string[];
  uniqueVictims: number;
  killsByDeathType: Record<string, number>;
  killsByTiming: Record<string, number>;
  averageKillTiming: number;
  gamesAsKiller: number;
  killsPerGame: number;
  mostTargetedRole: string | null;
  mostCommonKillType: string | null;
  preferredVictim: string | null;
}

export interface DeathTimingAnalysis {
  timing: string;
  phase: 'night' | 'meeting' | 'unknown';
  dayNumber: number;
  totalDeaths: number;
  deathsByType: Record<string, number>;
  deathsByRole: Record<string, number>;
  killers: Record<string, number>;
  survivalRateBeforeThis: number;
  averageGameProgress: number; // How far into the game this timing typically occurs
}

export interface PlayerSurvivalAnalysis {
  player: string;
  gamesPlayed: number;
  timesKilled: number;
  timesSurvived: number;
  survivalRate: number;
  averageSurvivalTiming: number;
  deathsByType: Record<string, number>;
  deathsByTiming: Record<string, number>;
  killedBy: Record<string, number>;
  mostCommonDeathType: string | null;
  mostCommonDeathTiming: string | null;
  mostFrequentKiller: string | null;
  roleBasedSurvival: Record<string, {
    played: number;
    survived: number;
    survivalRate: number;
  }>;
  longestSurvival: string | null;
  shortestSurvival: string | null;
}

export interface GameDeathAnalysis {
  gameId: string;
  gameDate: string;
  totalPlayers: number;
  totalDeaths: number;
  totalSurvivors: number;
  winningCamp: string;
  deathProgression: Array<{
    timing: string;
    victim: string;
    killer: string | null;
    deathType: string;
    phase: 'night' | 'meeting' | 'unknown';
  }>;
  deathsByPhase: Record<string, number>;
  killersInGame: Record<string, number>;
  deadliestPlayer: string | null;
  gameLength: string;
  mortalityRate: number;
}

/**
 * Parse death timing to extract phase and day number
 */
function parseDeathTiming(timing: string | null): { phase: 'night' | 'meeting' | 'unknown'; dayNumber: number } {
  if (!timing) return { phase: 'unknown', dayNumber: 0 };
  
  // Examples: "N1", "N2", "M1", "M2" etc.
  const match = timing.match(/^([NM])(\d+)$/);
  if (match) {
    const phase = match[1] === 'N' ? 'night' : 'meeting';
    const dayNumber = parseInt(match[2], 10);
    return { phase, dayNumber };
  }
  
  return { phase: 'unknown', dayNumber: 0 };
}

/**
 * Convert timing to numerical value for averaging
 */
function timingToNumber(timing: string | null): number {
  if (!timing) return 0;
  
  const { phase, dayNumber } = parseDeathTiming(timing);
  if (phase === 'unknown') return 0;
  
  // Night = x.0, Meeting = x.5 (e.g., N2 = 2.0, M2 = 2.5)
  return dayNumber + (phase === 'meeting' ? 0.5 : 0);
}

/**
 * Analyze overall death statistics across all games
 */
export function computeDeathStats(gameData: GameLogEntry[]): DeathStats | null {
  if (gameData.length === 0) {
    return null;
  }

  let totalDeaths = 0;
  let totalSurvivors = 0;
  const deathsByType: Record<string, number> = {};
  const deathsByTiming: Record<string, number> = {};
  const deathsByPhase = { night: 0, meeting: 0, unknown: 0 };
  const allTimings: number[] = [];

  gameData.forEach(game => {
    game.PlayerStats.forEach(player => {
      if (player.DeathDateIrl) {
        totalDeaths++;
        
        // Death type analysis
        const deathType = player.DeathType || 'Inconnu';
        deathsByType[deathType] = (deathsByType[deathType] || 0) + 1;
        
        // Death timing analysis
        const timing = player.DeathTiming || 'Inconnu';
        deathsByTiming[timing] = (deathsByTiming[timing] || 0) + 1;
        
        // Phase analysis
        const { phase } = parseDeathTiming(timing);
        deathsByPhase[phase]++;
        
        // Timing averaging
        const timingNum = timingToNumber(timing);
        if (timingNum > 0) {
          allTimings.push(timingNum);
        }
      } else {
        totalSurvivors++;
      }
    });
  });

  const totalPlayers = totalDeaths + totalSurvivors;
  const survivalRate = totalPlayers > 0 ? (totalSurvivors / totalPlayers) * 100 : 0;
  
  // Find most common death type and timing
  const mostCommonDeathType = Object.entries(deathsByType)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || null;
  
  const mostCommonDeathTiming = Object.entries(deathsByTiming)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || null;
  
  const averageDeathTiming = allTimings.length > 0 
    ? allTimings.reduce((sum, timing) => sum + timing, 0) / allTimings.length 
    : 0;

  return {
    totalDeaths,
    totalSurvivors,
    survivalRate,
    deathsByType,
    deathsByTiming,
    deathsByPhase,
    averageDeathTiming,
    mostCommonDeathType,
    mostCommonDeathTiming
  };
}

/**
 * Analyze killer performance and behavior
 */
export function computeKillerAnalysis(gameData: GameLogEntry[]): KillerAnalysis[] {
  if (gameData.length === 0) {
    return [];
  }

  const killerData: Record<string, KillerAnalysis> = {};

  gameData.forEach(game => {
    const killersInThisGame = new Set<string>();
    
    game.PlayerStats.forEach(player => {
      if (player.KillerName && player.DeathDateIrl) {
        const killer = player.KillerName.trim();
        killersInThisGame.add(killer);
        
        if (!killerData[killer]) {
          killerData[killer] = {
            killer,
            totalKills: 0,
            victimsByRole: {},
            victims: [],
            uniqueVictims: 0,
            killsByDeathType: {},
            killsByTiming: {},
            averageKillTiming: 0,
            gamesAsKiller: 0,
            killsPerGame: 0,
            mostTargetedRole: null,
            mostCommonKillType: null,
            preferredVictim: null
          };
        }
        
        const killerStats = killerData[killer];
        killerStats.totalKills++;
        killerStats.victims.push(player.Username);
        
        // Role targeting
        const victimRole = getPlayerCampFromRole(player.MainRoleInitial);
        killerStats.victimsByRole[victimRole] = (killerStats.victimsByRole[victimRole] || 0) + 1;
        
        // Death type analysis
        const deathType = player.DeathType || 'Inconnu';
        killerStats.killsByDeathType[deathType] = (killerStats.killsByDeathType[deathType] || 0) + 1;
        
        // Death timing analysis
        const timing = player.DeathTiming || 'Inconnu';
        killerStats.killsByTiming[timing] = (killerStats.killsByTiming[timing] || 0) + 1;
      }
    });
    
    // Count games each killer participated in
    killersInThisGame.forEach(killer => {
      if (killerData[killer]) {
        killerData[killer].gamesAsKiller++;
      }
    });
  });

  // Calculate derived statistics
  Object.values(killerData).forEach(killerStats => {
    // Unique victims
    killerStats.uniqueVictims = new Set(killerStats.victims).size;
    
    // Kills per game
    killerStats.killsPerGame = killerStats.gamesAsKiller > 0 
      ? killerStats.totalKills / killerStats.gamesAsKiller 
      : 0;
    
    // Most targeted role
    const [mostTargetedRole] = Object.entries(killerStats.victimsByRole)
      .sort(([,a], [,b]) => b - a)[0] || [null];
    killerStats.mostTargetedRole = mostTargetedRole;
    
    // Most common kill type
    const [mostCommonKillType] = Object.entries(killerStats.killsByDeathType)
      .sort(([,a], [,b]) => b - a)[0] || [null];
    killerStats.mostCommonKillType = mostCommonKillType;
    
    // Preferred victim (most killed individual)
    const victimCounts: Record<string, number> = {};
    killerStats.victims.forEach(victim => {
      victimCounts[victim] = (victimCounts[victim] || 0) + 1;
    });
    const [preferredVictim] = Object.entries(victimCounts)
      .sort(([,a], [,b]) => b - a)[0] || [null];
    killerStats.preferredVictim = preferredVictim;
    
    // Average kill timing
    const timings = Object.entries(killerStats.killsByTiming)
      .flatMap(([timing, count]) => Array(count).fill(timingToNumber(timing)))
      .filter(timing => timing > 0);
    killerStats.averageKillTiming = timings.length > 0
      ? timings.reduce((sum, timing) => sum + timing, 0) / timings.length
      : 0;
  });

  return Object.values(killerData).sort((a, b) => b.totalKills - a.totalKills);
}

/**
 * Analyze death timing patterns
 */
export function computeDeathTimingAnalysis(gameData: GameLogEntry[]): DeathTimingAnalysis[] {
  if (gameData.length === 0) {
    return [];
  }

  const timingData: Record<string, DeathTimingAnalysis> = {};
  let totalPlayers = 0;

  gameData.forEach(game => {
    totalPlayers += game.PlayerStats.length;
    
    game.PlayerStats.forEach(player => {
      if (player.DeathDateIrl && player.DeathTiming) {
        const timing = player.DeathTiming;
        const { phase, dayNumber } = parseDeathTiming(timing);
        
        if (!timingData[timing]) {
          timingData[timing] = {
            timing,
            phase,
            dayNumber,
            totalDeaths: 0,
            deathsByType: {},
            deathsByRole: {},
            killers: {},
            survivalRateBeforeThis: 0,
            averageGameProgress: 0
          };
        }
        
        const timingStats = timingData[timing];
        timingStats.totalDeaths++;
        
        // Death type analysis
        const deathType = player.DeathType || 'Inconnu';
        timingStats.deathsByType[deathType] = (timingStats.deathsByType[deathType] || 0) + 1;
        
        // Role analysis
        const role = getPlayerCampFromRole(player.MainRoleInitial);
        timingStats.deathsByRole[role] = (timingStats.deathsByRole[role] || 0) + 1;
        
        // Killer analysis
        if (player.KillerName) {
          const killer = player.KillerName;
          timingStats.killers[killer] = (timingStats.killers[killer] || 0) + 1;
        }
      }
    });
  });

  return Object.values(timingData)
    .sort((a, b) => {
      if (a.dayNumber !== b.dayNumber) {
        return a.dayNumber - b.dayNumber;
      }
      // Night comes before meeting on same day
      if (a.phase === 'night' && b.phase === 'meeting') return -1;
      if (a.phase === 'meeting' && b.phase === 'night') return 1;
      return 0;
    });
}

/**
 * Analyze individual player survival patterns
 */
export function computePlayerSurvivalAnalysis(gameData: GameLogEntry[]): PlayerSurvivalAnalysis[] {
  if (gameData.length === 0) {
    return [];
  }

  const playerData: Record<string, PlayerSurvivalAnalysis> = {};

  gameData.forEach(game => {
    game.PlayerStats.forEach(player => {
      const playerName = player.Username.trim();
      if (!playerName) return;
      
      if (!playerData[playerName]) {
        playerData[playerName] = {
          player: playerName,
          gamesPlayed: 0,
          timesKilled: 0,
          timesSurvived: 0,
          survivalRate: 0,
          averageSurvivalTiming: 0,
          deathsByType: {},
          deathsByTiming: {},
          killedBy: {},
          mostCommonDeathType: null,
          mostCommonDeathTiming: null,
          mostFrequentKiller: null,
          roleBasedSurvival: {},
          longestSurvival: null,
          shortestSurvival: null
        };
      }
      
      const playerStats = playerData[playerName];
      playerStats.gamesPlayed++;
      
      // Role-based survival tracking
      const role = getPlayerCampFromRole(player.MainRoleInitial);
      if (!playerStats.roleBasedSurvival[role]) {
        playerStats.roleBasedSurvival[role] = { played: 0, survived: 0, survivalRate: 0 };
      }
      playerStats.roleBasedSurvival[role].played++;
      
      if (player.DeathDateIrl) {
        playerStats.timesKilled++;
        
        // Death analysis
        const deathType = player.DeathType || 'Inconnu';
        playerStats.deathsByType[deathType] = (playerStats.deathsByType[deathType] || 0) + 1;
        
        const timing = player.DeathTiming || 'Inconnu';
        playerStats.deathsByTiming[timing] = (playerStats.deathsByTiming[timing] || 0) + 1;
        
        if (player.KillerName) {
          const killer = player.KillerName;
          playerStats.killedBy[killer] = (playerStats.killedBy[killer] || 0) + 1;
        }
      } else {
        playerStats.timesSurvived++;
        playerStats.roleBasedSurvival[role].survived++;
      }
    });
  });

  // Calculate derived statistics
  Object.values(playerData).forEach(playerStats => {
    playerStats.survivalRate = playerStats.gamesPlayed > 0 
      ? (playerStats.timesSurvived / playerStats.gamesPlayed) * 100 
      : 0;
    
    // Most common death type
    const [mostCommonDeathType] = Object.entries(playerStats.deathsByType)
      .sort(([,a], [,b]) => b - a)[0] || [null];
    playerStats.mostCommonDeathType = mostCommonDeathType;
    
    // Most common death timing
    const [mostCommonDeathTiming] = Object.entries(playerStats.deathsByTiming)
      .sort(([,a], [,b]) => b - a)[0] || [null];
    playerStats.mostCommonDeathTiming = mostCommonDeathTiming;
    
    // Most frequent killer
    const [mostFrequentKiller] = Object.entries(playerStats.killedBy)
      .sort(([,a], [,b]) => b - a)[0] || [null];
    playerStats.mostFrequentKiller = mostFrequentKiller;
    
    // Role-based survival rates
    Object.values(playerStats.roleBasedSurvival).forEach(roleStats => {
      roleStats.survivalRate = roleStats.played > 0 
        ? (roleStats.survived / roleStats.played) * 100 
        : 0;
    });
  });

  return Object.values(playerData).sort((a, b) => b.survivalRate - a.survivalRate);
}

/**
 * Analyze death patterns in individual games
 */
export function computeGameDeathAnalysis(gameData: GameLogEntry[]): GameDeathAnalysis[] {
  return gameData.map(game => {
    const totalPlayers = game.PlayerStats.length;
    const deaths = game.PlayerStats.filter(p => p.DeathDateIrl);
    const totalDeaths = deaths.length;
    const totalSurvivors = totalPlayers - totalDeaths;
    
    // Determine winning camp
    const winners = game.PlayerStats.filter(p => p.Victorious);
    const winningCamp = winners.length > 0 ? getPlayerCampFromRole(winners[0].MainRoleInitial) : 'Unknown';
    
    // Death progression
    const deathProgression = deaths
      .map(player => ({
        timing: player.DeathTiming || 'Unknown',
        victim: player.Username,
        killer: player.KillerName,
        deathType: player.DeathType || 'Unknown',
        phase: parseDeathTiming(player.DeathTiming).phase
      }))
      .sort((a, b) => {
        const aNum = timingToNumber(a.timing);
        const bNum = timingToNumber(b.timing);
        return aNum - bNum;
      });
    
    // Deaths by phase
    const deathsByPhase: Record<string, number> = {};
    deaths.forEach(player => {
      const timing = player.DeathTiming || 'Unknown';
      deathsByPhase[timing] = (deathsByPhase[timing] || 0) + 1;
    });
    
    // Killers in game
    const killersInGame: Record<string, number> = {};
    deaths.forEach(player => {
      if (player.KillerName) {
        const killer = player.KillerName;
        killersInGame[killer] = (killersInGame[killer] || 0) + 1;
      }
    });
    
    // Deadliest player
    const [deadliestPlayer] = Object.entries(killersInGame)
      .sort(([,a], [,b]) => b - a)[0] || [null];
    
    const mortalityRate = totalPlayers > 0 ? (totalDeaths / totalPlayers) * 100 : 0;
    
    return {
      gameId: game.Id,
      gameDate: game.StartDate,
      totalPlayers,
      totalDeaths,
      totalSurvivors,
      winningCamp,
      deathProgression,
      deathsByPhase,
      killersInGame,
      deadliestPlayer,
      gameLength: game.EndTiming || 'Unknown',
      mortalityRate
    };
  });
}