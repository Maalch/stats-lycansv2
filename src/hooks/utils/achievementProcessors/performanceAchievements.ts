/**
 * Achievement processor for camp performance statistics
 */

import { computePlayerCampPerformance } from '../playerCampPerformanceUtils';
import type { GameLogEntry } from '../../useCombinedRawData';
import type { Achievement } from '../../../types/achievements';

// Interface for camp performance statistics
export interface PlayerCampStat {
  player: string;
  camp: string;
  games: number;
  wins: number;
  winRate: number;
  performance: number; // Performance differential vs camp average
  totalGames: number; // Total games played by this player
}

// Solo roles are camps that are not Villageois, Loup, or Amoureux
const SOLO_ROLES = [
  'Idiot du Village',
  'Agent', 
  'Espion',
  'Cannibale',
  'Scientifique',
  'La Bête',
  'Chasseur de primes',
  'Vaudou',
  'Traître'
];

// Helper function to compute camp performance statistics for all players  
function computeAllPlayersCampStats(gameData: GameLogEntry[]): PlayerCampStat[] {
  const campPerformanceData = computePlayerCampPerformance(gameData);
  if (!campPerformanceData) return [];

  const allPlayerCampStats: PlayerCampStat[] = [];

  campPerformanceData.playerPerformance.forEach(playerPerf => {
    playerPerf.campPerformance.forEach(campPerf => {
      allPlayerCampStats.push({
        player: playerPerf.player,
        camp: campPerf.camp,
        games: campPerf.games,
        wins: campPerf.wins,
        winRate: parseFloat(campPerf.winRate),
        performance: parseFloat(campPerf.performance),
        totalGames: playerPerf.totalGames
      });
    });
  });

  return allPlayerCampStats;
}

// Helper function to find top performers for a specific camp
function findTopCampPerformers(
  campStats: PlayerCampStat[], 
  targetCamp: string, 
  minGames: number, 
  sortBy: 'winRate' | 'performance' = 'performance'
): PlayerCampStat[] {
  return campStats
    .filter(stat => stat.camp === targetCamp && stat.games >= minGames)
    .sort((a, b) => b[sortBy] - a[sortBy])
    .slice(0, 10);
}

// Helper function to find top solo role performers
function findTopSoloRolePerformers(campStats: PlayerCampStat[], minGames: number): PlayerCampStat[] {
  // Get all solo role performances for each player
  const playerSoloPerformance = new Map<string, {
    totalSoloGames: number;
    totalSoloWins: number;
    avgPerformance: number;
    camps: PlayerCampStat[];
  }>();

  campStats
    .filter(stat => SOLO_ROLES.includes(stat.camp) && stat.games >= 3) // Min 3 games per solo role
    .forEach(stat => {
      if (!playerSoloPerformance.has(stat.player)) {
        playerSoloPerformance.set(stat.player, {
          totalSoloGames: 0,
          totalSoloWins: 0,
          avgPerformance: 0,
          camps: []
        });
      }
      
      const playerData = playerSoloPerformance.get(stat.player)!;
      playerData.totalSoloGames += stat.games;
      playerData.totalSoloWins += stat.wins;
      playerData.camps.push(stat);
    });

  // Calculate average performance and filter by minimum games
  const eligiblePlayers: PlayerCampStat[] = [];
  
  playerSoloPerformance.forEach((data, playerName) => {
    if (data.totalSoloGames >= minGames) {
      // Calculate weighted average performance based on games played in each role
      const totalWeightedPerformance = data.camps.reduce((sum, camp) => 
        sum + (camp.performance * camp.games), 0
      );
      const avgPerformance = totalWeightedPerformance / data.totalSoloGames;
      const winRate = (data.totalSoloWins / data.totalSoloGames) * 100;

      eligiblePlayers.push({
        player: playerName,
        camp: 'Solo', // Virtual camp for display
        games: data.totalSoloGames,
        wins: data.totalSoloWins,
        winRate: winRate,
        performance: avgPerformance,
        totalGames: data.camps[0]?.totalGames || 0 // Use total games from first camp stat
      });
    }
  });

  return eligiblePlayers.sort((a, b) => b.performance - a.performance).slice(0, 10);
}

// Helper function to find top overall performers (Hall of Fame)
function findTopOverallPerformers(campStats: PlayerCampStat[], minGames: number): PlayerCampStat[] {
  // Group by player and calculate overall weighted performance
  const playerOverallPerformance = new Map<string, {
    totalGames: number;
    totalWeightedPerformance: number;
    overallPerformance: number;
  }>();

  campStats.forEach(stat => {
    if (!playerOverallPerformance.has(stat.player)) {
      playerOverallPerformance.set(stat.player, {
        totalGames: stat.totalGames,
        totalWeightedPerformance: 0,
        overallPerformance: 0
      });
    }
    
    const playerData = playerOverallPerformance.get(stat.player)!;
    playerData.totalWeightedPerformance += stat.performance * stat.games;
  });

  // Calculate overall performance and filter by minimum games
  const eligiblePlayers: PlayerCampStat[] = [];
  
  playerOverallPerformance.forEach((data, playerName) => {
    if (data.totalGames >= minGames) {
      const totalCampGames = campStats
        .filter(stat => stat.player === playerName)
        .reduce((sum, stat) => sum + stat.games, 0);
      
      const overallPerformance = data.totalWeightedPerformance / totalCampGames;

      eligiblePlayers.push({
        player: playerName,
        camp: 'Overall', // Virtual camp for display
        games: data.totalGames,
        wins: 0, // Not directly applicable for overall performance
        winRate: 0, // Not directly applicable for overall performance
        performance: overallPerformance,
        totalGames: data.totalGames
      });
    }
  });

  return eligiblePlayers.sort((a, b) => b.performance - a.performance).slice(0, 10);
}

// Helper function to check if a player is in top 10 of camp performance
function findPlayerCampRank(
  sortedPlayers: PlayerCampStat[], 
  playerName: string
): { rank: number; value: number; games: number; performance: number } | null {
  const index = sortedPlayers.findIndex(p => p.player === playerName);
  if (index === -1 || index >= 10) return null;
  
  const playerData = sortedPlayers[index];
  return {
    rank: index + 1,
    value: playerData.winRate,
    games: playerData.games,
    performance: playerData.performance
  };
}

// Helper to create achievement object
function createAchievement(
  id: string,
  title: string,
  description: string,
  type: 'good' | 'bad',
  rank: number,
  value: number,
  redirectTo?: Achievement['redirectTo'],
  category?: Achievement['category']
): Achievement {
  return {
    id,
    title,
    description,
    type,
    category: category || 'general',
    rank,
    value,
    redirectTo: redirectTo || {
      tab: 'players',
      subTab: 'playersGeneral'
    }
  };
}

/**
 * Compute camp statistics from game data
 */
export function computeCampStats(gameData: GameLogEntry[]): PlayerCampStat[] {
  return computeAllPlayersCampStats(gameData);
}

/**
 * Process camp performance achievements for a player
 */
export function processPerformanceAchievements(
  campStats: PlayerCampStat[],
  playerName: string,
  suffix: string
): Achievement[] {
  const achievements: Achievement[] = [];

  if (!campStats || campStats.length === 0) return achievements;

  // 1. Top 10 in best "overperformer" (min. 25 games) - Hall of Fame
  const topOverallPerformers = findTopOverallPerformers(campStats, 25);
  const overallPerformanceRank = findPlayerCampRank(topOverallPerformers, playerName);
  if (overallPerformanceRank) {
    achievements.push(createAchievement(
      `hall-of-fame-${suffix ? 'modded' : 'all'}`,
      `🏆 Top ${overallPerformanceRank.rank} Hall of Fame${suffix}`,
      `${overallPerformanceRank.rank}${overallPerformanceRank.rank === 1 ? 'er' : 'ème'} meilleur overperformer: +${overallPerformanceRank.performance.toFixed(1)}% (${overallPerformanceRank.games} parties)`,
      'good',
      overallPerformanceRank.rank,
      overallPerformanceRank.performance,
      {
        tab: 'players',
        subTab: 'performances',
        chartSection: 'hall-of-fame'
      },
      'performance'
    ));
  }

  // 2. Top 10 in best Villageois (min. 25 games)
  const topVillageoisPerformers = findTopCampPerformers(campStats, 'Villageois', 25, 'performance');
  const villageoisRank = findPlayerCampRank(topVillageoisPerformers, playerName);
  if (villageoisRank) {
    achievements.push(createAchievement(
      `villageois-performance-${suffix ? 'modded' : 'all'}`,
      `🏘️ Top ${villageoisRank.rank} Villageois${suffix}`,
      `${villageoisRank.rank}${villageoisRank.rank === 1 ? 'er' : 'ème'} meilleur Villageois: ${villageoisRank.value.toFixed(1)}% (+${villageoisRank.performance.toFixed(1)}%) (${villageoisRank.games} parties)`,
      'good',
      villageoisRank.rank,
      villageoisRank.value,
      {
        tab: 'players',
        subTab: 'performances',
        chartSection: 'camp-villageois'
      },
      'performance'
    ));
  }

  // 3. Top 10 in best Loup (min. 10 games)
  const topLoupPerformers = findTopCampPerformers(campStats, 'Loup', 10, 'performance');
  const loupRank = findPlayerCampRank(topLoupPerformers, playerName);
  if (loupRank) {
    achievements.push(createAchievement(
      `loup-performance-${suffix ? 'modded' : 'all'}`,
      `🐺 Top ${loupRank.rank} Loup${suffix}`,
      `${loupRank.rank}${loupRank.rank === 1 ? 'er' : 'ème'} meilleur Loup: ${loupRank.value.toFixed(1)}% (+${loupRank.performance.toFixed(1)}%) (${loupRank.games} parties)`,
      'good',
      loupRank.rank,
      loupRank.value,
      {
        tab: 'players',
        subTab: 'performances',
        chartSection: 'camp-loup'
      },
      'performance'
    ));
  }

  // 4. Top 10 in best Idiot du Village (min. 5 games)
  const topIdiotPerformers = findTopCampPerformers(campStats, 'Idiot du Village', 5, 'performance');
  const idiotRank = findPlayerCampRank(topIdiotPerformers, playerName);
  if (idiotRank) {
    achievements.push(createAchievement(
      `idiot-performance-${suffix ? 'modded' : 'all'}`,
      `🤡 Top ${idiotRank.rank} Idiot du Village${suffix}`,
      `${idiotRank.rank}${idiotRank.rank === 1 ? 'er' : 'ème'} meilleur Idiot du Village: ${idiotRank.value.toFixed(1)}% (+${idiotRank.performance.toFixed(1)}%) (${idiotRank.games} parties)`,
      'good',
      idiotRank.rank,
      idiotRank.value,
      {
        tab: 'players',
        subTab: 'performances',
        chartSection: 'camp-idiot'
      },
      'performance'
    ));
  }

  // 5. Top 10 in best Amoureux (min. 5 games)
  const topAmoureuxPerformers = findTopCampPerformers(campStats, 'Amoureux', 5, 'performance');
  const amoureuxRank = findPlayerCampRank(topAmoureuxPerformers, playerName);
  if (amoureuxRank) {
    achievements.push(createAchievement(
      `amoureux-performance-${suffix ? 'modded' : 'all'}`,
      `💕 Top ${amoureuxRank.rank} Amoureux${suffix}`,
      `${amoureuxRank.rank}${amoureuxRank.rank === 1 ? 'er' : 'ème'} meilleur Amoureux: ${amoureuxRank.value.toFixed(1)}% (+${amoureuxRank.performance.toFixed(1)}%) (${amoureuxRank.games} parties)`,
      'good',
      amoureuxRank.rank,
      amoureuxRank.value,
      {
        tab: 'players',
        subTab: 'performances',
        chartSection: 'camp-amoureux'
      },
      'performance'
    ));
  }

  // 6. Top 10 in best solo role (min. 10 games)
  const topSoloPerformers = findTopSoloRolePerformers(campStats, 10);
  const soloRank = findPlayerCampRank(topSoloPerformers, playerName);
  if (soloRank) {
    achievements.push(createAchievement(
      `solo-performance-${suffix ? 'modded' : 'all'}`,
      `⭐ Top ${soloRank.rank} Rôles Solo${suffix}`,
      `${soloRank.rank}${soloRank.rank === 1 ? 'er' : 'ème'} meilleur joueur solo: ${soloRank.value.toFixed(1)}% (+${soloRank.performance.toFixed(1)}%) (${soloRank.games} parties)`,
      'good',
      soloRank.rank,
      soloRank.value,
      {
        tab: 'players',
        subTab: 'performances',
        chartSection: 'solo-roles'
      },
      'performance'
    ));
  }

  return achievements;
}