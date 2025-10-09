/**
 * Performance achievements processor - handles camp performance rankings
 */

import { findPlayerCampRank } from '../helpers.js';

// Special roles are all camps except Villageois and Loup (exclusion list approach)
// This dynamically includes any special role that appears in the game data:
// - Amoureux (and all solo roles)
// - All solo roles: Idiot du Village, Agent, Espion, Cannibale, Scientifique, La Bête, Chasseur de primes, Vaudou, etc.
// - Any new roles added to the game will automatically be included
const isSpecialRole = (camp) => {
  return camp !== 'Villageois' && camp !== 'Loup';
};

/**
 * Find top performers for a specific camp
 * @param {Array} campStats - Array of player camp statistics
 * @param {string} targetCamp - Camp to filter by
 * @param {number} minGames - Minimum games required
 * @param {string} sortBy - Sort by 'winRate' or 'performance'
 * @returns {Array} - All performers for the camp
 */
function findTopCampPerformers(campStats, targetCamp, minGames, sortBy = 'performance') {
  return campStats
    .filter(stat => stat.camp === targetCamp && stat.games >= minGames)
    .sort((a, b) => b[sortBy] - a[sortBy]);
}

/**
 * Find top special role performers (includes Amoureux and solo roles)
 * @param {Array} campStats - Array of player camp statistics
 * @param {number} minGames - Minimum total special role games required
 * @returns {Array} - All special role performers sorted by performance
 */
function findTopSoloRolePerformers(campStats, minGames) {
  // Get all special role performances for each player
  const playerSoloPerformance = new Map();

  campStats
    .filter(stat => isSpecialRole(stat.camp) && stat.games >= 3) // Min 3 games per special role
    .forEach(stat => {
      if (!playerSoloPerformance.has(stat.player)) {
        playerSoloPerformance.set(stat.player, {
          totalSoloGames: 0,
          totalSoloWins: 0,
          avgPerformance: 0,
          camps: []
        });
      }
      
      const playerData = playerSoloPerformance.get(stat.player);
      playerData.totalSoloGames += stat.games;
      playerData.totalSoloWins += stat.wins;
      playerData.camps.push(stat);
    });

  // Calculate average performance and filter by minimum games
  const eligiblePlayers = [];
  
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
        camp: 'Rôles spéciaux', // Virtual camp for display (matches chart naming)
        games: data.totalSoloGames,
        wins: data.totalSoloWins,
        winRate: winRate,
        performance: avgPerformance,
        totalGames: data.camps[0]?.totalGames || 0 // Use total games from first camp stat
      });
    }
  });

  return eligiblePlayers.sort((a, b) => b.performance - a.performance);
}

/**
 * Find top overall performers (Hall of Fame)
 * @param {Array} campStats - Array of player camp statistics
 * @param {number} minGames - Minimum total games required
 * @returns {Array} - All overall performers sorted by performance
 */
function findTopOverallPerformers(campStats, minGames) {
  // Group by player and calculate overall weighted performance
  const playerOverallPerformance = new Map();

  campStats.forEach(stat => {
    if (!playerOverallPerformance.has(stat.player)) {
      playerOverallPerformance.set(stat.player, {
        totalGames: stat.totalGames,
        totalWeightedPerformance: 0,
        overallPerformance: 0
      });
    }
    
    const playerData = playerOverallPerformance.get(stat.player);
    playerData.totalWeightedPerformance += stat.performance * stat.games;
  });

  // Calculate overall performance and filter by minimum games
  const eligiblePlayers = [];
  
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

  return eligiblePlayers.sort((a, b) => b.performance - a.performance);
}

/**
 * Helper to create performance achievement object
 * @param {string} id - Achievement ID
 * @param {string} title - Achievement title
 * @param {string} description - Achievement description
 * @param {'good'|'bad'} type - Achievement type
 * @param {number} rank - Player rank
 * @param {number} value - Achievement value
 * @param {number} totalRanked - Total number of players ranked in this category
 * @param {Object} redirectTo - Navigation target
 * @param {string} category - Achievement category
 * @returns {Object} - Achievement object
 */
function createPerformanceAchievement(id, title, description, type, rank, value, totalRanked, redirectTo, category = 'performance') {
  return {
    id,
    title,
    description,
    type,
    category,
    rank,
    value,
    totalRanked,
    redirectTo: redirectTo || {
      tab: 'players',
      subTab: 'playersGeneral'
    }
  };
}

/**
 * Process camp performance achievements for a player
 * @param {Array} campStats - Array of player camp statistics
 * @param {string} playerName - Player name
 * @param {string} suffix - Suffix for achievement titles
 * @returns {Array} - Array of achievements
 */
export function processPerformanceAchievements(campStats, playerName, suffix) {
  const achievements = [];

  if (!campStats || campStats.length === 0) return achievements;

  // 1. Best "overperformer" ranking (min. 25 games) - Hall of Fame
  const topOverallPerformers = findTopOverallPerformers(campStats, 25);
  const overallPerformanceRank = findPlayerCampRank(topOverallPerformers, playerName);
  if (overallPerformanceRank) {
    achievements.push(createPerformanceAchievement(
      `hall-of-fame-${suffix ? 'modded' : 'all'}`,
      `🏆 Top ${overallPerformanceRank.rank} Hall of Fame${suffix}`,
      `${overallPerformanceRank.rank}${overallPerformanceRank.rank === 1 ? 'er' : 'ème'} meilleur overperformer: +${overallPerformanceRank.performance.toFixed(1)}% (${overallPerformanceRank.games} parties, min. 25)`,
      'good',
      overallPerformanceRank.rank,
      overallPerformanceRank.performance,
      topOverallPerformers.length,
      {
        tab: 'players',
        subTab: 'campPerformance',
        chartSection: 'hall-of-fame'
      },
      'performance'
    ));
  }

  // 2. Best Villageois (min. 25 games)
  const topVillageoisPerformers = findTopCampPerformers(campStats, 'Villageois', 25, 'performance');
  const villageoisRank = findPlayerCampRank(topVillageoisPerformers, playerName);
  if (villageoisRank) {
    achievements.push(createPerformanceAchievement(
      `villageois-performance-${suffix ? 'modded' : 'all'}`,
      `🏘️ Top ${villageoisRank.rank} Villageois${suffix}`,
      `${villageoisRank.rank}${villageoisRank.rank === 1 ? 'er' : 'ème'} meilleur Villageois: ${villageoisRank.value.toFixed(1)}% (+${villageoisRank.performance.toFixed(1)}%) (${villageoisRank.games} parties, min. 25)`,
      'good',
      villageoisRank.rank,
      villageoisRank.value,
      topVillageoisPerformers.length,
      {
        tab: 'players',
        subTab: 'campPerformance',
        chartSection: 'camp-villageois'
      },
      'performance'
    ));
  }

  // 3. Best Loup (min. 10 games)
  const topLoupPerformers = findTopCampPerformers(campStats, 'Loup', 10, 'performance');
  const loupRank = findPlayerCampRank(topLoupPerformers, playerName);
  if (loupRank) {
    achievements.push(createPerformanceAchievement(
      `loup-performance-${suffix ? 'modded' : 'all'}`,
      `🐺 Top ${loupRank.rank} Loup${suffix}`,
      `${loupRank.rank}${loupRank.rank === 1 ? 'er' : 'ème'} meilleur Loup: ${loupRank.value.toFixed(1)}% (+${loupRank.performance.toFixed(1)}%) (${loupRank.games} parties, min. 10)`,
      'good',
      loupRank.rank,
      loupRank.value,
      topLoupPerformers.length,
      {
        tab: 'players',
        subTab: 'campPerformance',
        chartSection: 'camp-loup'
      },
      'performance'
    ));
  }

  // 4. Best Idiot du Village (min. 5 games)
  const topIdiotPerformers = findTopCampPerformers(campStats, 'Idiot du Village', 5, 'performance');
  const idiotRank = findPlayerCampRank(topIdiotPerformers, playerName);
  if (idiotRank) {
    achievements.push(createPerformanceAchievement(
      `idiot-performance-${suffix ? 'modded' : 'all'}`,
      `🤡 Top ${idiotRank.rank} Idiot du Village${suffix}`,
      `${idiotRank.rank}${idiotRank.rank === 1 ? 'er' : 'ème'} meilleur Idiot du Village: ${idiotRank.value.toFixed(1)}% (+${idiotRank.performance.toFixed(1)}%) (${idiotRank.games} parties, min. 5)`,
      'good',
      idiotRank.rank,
      idiotRank.value,
      topIdiotPerformers.length,
      {
        tab: 'players',
        subTab: 'campPerformance',
        chartSection: 'camp-idiot'
      },
      'performance'
    ));
  }

  // 5. Best Amoureux (min. 5 games)
  const topAmoureuxPerformers = findTopCampPerformers(campStats, 'Amoureux', 5, 'performance');
  const amoureuxRank = findPlayerCampRank(topAmoureuxPerformers, playerName);
  if (amoureuxRank) {
    achievements.push(createPerformanceAchievement(
      `amoureux-performance-${suffix ? 'modded' : 'all'}`,
      `💕 Top ${amoureuxRank.rank} Amoureux${suffix}`,
      `${amoureuxRank.rank}${amoureuxRank.rank === 1 ? 'er' : 'ème'} meilleur Amoureux: ${amoureuxRank.value.toFixed(1)}% (+${amoureuxRank.performance.toFixed(1)}%) (${amoureuxRank.games} parties, min. 5)`,
      'good',
      amoureuxRank.rank,
      amoureuxRank.value,
      topAmoureuxPerformers.length,
      {
        tab: 'players',
        subTab: 'campPerformance',
        chartSection: 'camp-amoureux'
      },
      'performance'
    ));
  }

  // 6. Best special roles performance (includes Amoureux and solo roles, min. 10 games)
  const topSoloPerformers = findTopSoloRolePerformers(campStats, 10);
  const soloRank = findPlayerCampRank(topSoloPerformers, playerName);
  if (soloRank) {
    achievements.push(createPerformanceAchievement(
      `solo-performance-${suffix ? 'modded' : 'all'}`,
      `⭐ Top ${soloRank.rank} Rôles Spéciaux${suffix}`,
      `${soloRank.rank}${soloRank.rank === 1 ? 'er' : 'ème'} meilleur joueur rôles spéciaux: ${soloRank.value.toFixed(1)}% (+${soloRank.performance.toFixed(1)}%) (${soloRank.games} parties, min. 10)`,
      'good',
      soloRank.rank,
      soloRank.value,
      topSoloPerformers.length,
      {
        tab: 'players',
        subTab: 'campPerformance',
        chartSection: 'solo-roles'
      },
      'performance'
    ));
  }

  return achievements;
}