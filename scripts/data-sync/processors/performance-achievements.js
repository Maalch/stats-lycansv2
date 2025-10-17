/**
 * Performance achievements processor - handles camp performance rankings
 */

import { findPlayerCampRank } from '../helpers.js';
import { getPlayerCampFromRole, getPlayerFinalRole } from '../../../src/utils/datasyncExport.js';

// Special roles are all camps except Villageois and Loup camps (exclusion list approach)
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
 * Matches client-side logic: treats "Rôles spéciaux" as a single unified camp
 * Calculates directly from game data to avoid 3-game per-camp filtering
 * @param {Array} gameData - Array of game entries
 * @param {number} minGames - Minimum total special role games required
 * @returns {Array} - All special role performers sorted by performance
 */
function findTopSoloRolePerformers(gameData, minGames) {
  // Calculate player special role performance directly from game data
  const playerSoloPerformance = new Map();
  const playerTotalGames = new Map();
  
  // Calculate overall camp average for all special roles combined
  let totalSpecialRoleGames = 0;
  let totalSpecialRoleWins = 0;

  // Process each game to count special role performance and total games
  gameData.forEach(game => {
    if (!game.PlayerStats) return;

    game.PlayerStats.forEach(player => {
      const roleName = getPlayerFinalRole(player.MainRoleInitial, player.MainRoleChanges || []);
      const camp = getPlayerCampFromRole(roleName);
      const playerName = player.Username;
      const won = player.Victorious;

      // Track total games for each player
      playerTotalGames.set(playerName, (playerTotalGames.get(playerName) || 0) + 1);

      // Only process special roles
      if (isSpecialRole(camp)) {
        // Track individual player stats
        if (!playerSoloPerformance.has(playerName)) {
          playerSoloPerformance.set(playerName, {
            totalSoloGames: 0,
            totalSoloWins: 0
          });
        }
        
        const playerData = playerSoloPerformance.get(playerName);
        playerData.totalSoloGames++;
        if (won) playerData.totalSoloWins++;

        // Track overall special roles stats for camp average
        totalSpecialRoleGames++;
        if (won) totalSpecialRoleWins++;
      }
    });
  });

  // Calculate camp average win rate for special roles
  const campAverageWinRate = totalSpecialRoleGames > 0 
    ? (totalSpecialRoleWins / totalSpecialRoleGames) * 100 
    : 0;

  // Calculate player performance vs camp average (matching client-side logic)
  const eligiblePlayers = [];
  
  playerSoloPerformance.forEach((data, playerName) => {
    if (data.totalSoloGames >= minGames) {
      // Calculate player's win rate in special roles
      const playerWinRate = (data.totalSoloWins / data.totalSoloGames) * 100;
      
      // Performance = player win rate - camp average win rate (matches client-side)
      const performance = playerWinRate - campAverageWinRate;

      eligiblePlayers.push({
        player: playerName,
        camp: 'Rôles spéciaux', // Virtual camp for display (matches chart naming)
        games: data.totalSoloGames,
        wins: data.totalSoloWins,
        winRate: playerWinRate,
        performance: performance,
        totalGames: playerTotalGames.get(playerName) || 0
      });
    }
  });

  return eligiblePlayers.sort((a, b) => b.performance - a.performance);
}

/**
 * Find top overall performers (Hall of Fame)
 * Ranks players by their BEST single camp performance (highest +% in any category)
 * @param {Array} campStats - Array of player camp statistics
 * @param {number} minTotalGames - Minimum total games required overall
 * @param {number} minCampGames - Minimum games required in the specific camp for Hall of Fame eligibility
 * @returns {Array} - All overall performers sorted by their best camp performance
 */
function findTopOverallPerformers(campStats, minTotalGames, minCampGames = 25) {
  // Group by player and find their best camp performance
  const playerBestPerformance = new Map();

  campStats.forEach(stat => {
    // Only consider camps where player has enough games for Hall of Fame eligibility
    if (stat.games < minCampGames) return;

    if (!playerBestPerformance.has(stat.player)) {
      playerBestPerformance.set(stat.player, {
        totalGames: stat.totalGames,
        bestPerformance: stat.performance,
        bestCamp: stat.camp,
        bestCampGames: stat.games,
        bestCampWinRate: stat.winRate
      });
    } else {
      const current = playerBestPerformance.get(stat.player);
      // Update if this camp performance is better
      if (stat.performance > current.bestPerformance) {
        current.bestPerformance = stat.performance;
        current.bestCamp = stat.camp;
        current.bestCampGames = stat.games;
        current.bestCampWinRate = stat.winRate;
      }
    }
  });

  // Filter by minimum total games and convert to array
  const eligiblePlayers = [];
  
  playerBestPerformance.forEach((data, playerName) => {
    if (data.totalGames >= minTotalGames) {
      eligiblePlayers.push({
        player: playerName,
        camp: data.bestCamp, // Show the camp where they performed best
        games: data.totalGames,
        wins: 0, // Not directly applicable for best performance
        winRate: data.bestCampWinRate, // Win rate in their best camp
        performance: data.bestPerformance, // Their best camp performance
        totalGames: data.totalGames,
        bestCampGames: data.bestCampGames // Games in their best camp
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
 * @param {Array} gameData - Array of game entries (for special roles calculation)
 * @param {string} playerName - Player name
 * @param {string} suffix - Suffix for achievement titles
 * @returns {Array} - Array of achievements
 */
export function processPerformanceAchievements(campStats, gameData, playerName, suffix) {
  const achievements = [];

  if (!campStats || campStats.length === 0) return achievements;

  // 1. Best "overperformer" ranking (min. 25 games in specific camp) - Hall of Fame
  const topOverallPerformers = findTopOverallPerformers(campStats, 25, 25);
  const overallPerformanceRank = findPlayerCampRank(topOverallPerformers, playerName);
  if (overallPerformanceRank) {
    const playerData = topOverallPerformers.find(p => p.player === playerName);
    achievements.push(createPerformanceAchievement(
      `hall-of-fame-${suffix ? 'modded' : 'all'}`,
      `🏆 Top ${overallPerformanceRank.rank} Hall of Fame${suffix}`,
      `${overallPerformanceRank.rank}${overallPerformanceRank.rank === 1 ? 'er' : 'ème'} meilleur overperformer: +${overallPerformanceRank.performance.toFixed(1)} en ${playerData.camp} (${playerData.bestCampGames} parties, min. 25)`,
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
      `${villageoisRank.rank}${villageoisRank.rank === 1 ? 'er' : 'ème'} meilleur Villageois: ${villageoisRank.value.toFixed(1)}% (+${villageoisRank.performance.toFixed(1)}) (${villageoisRank.games} parties, min. 25)`,
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
      `${loupRank.rank}${loupRank.rank === 1 ? 'er' : 'ème'} meilleur Loup: ${loupRank.value.toFixed(1)}% (+${loupRank.performance.toFixed(1)}) (${loupRank.games} parties, min. 10)`,
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
      `${idiotRank.rank}${idiotRank.rank === 1 ? 'er' : 'ème'} meilleur Idiot du Village: ${idiotRank.value.toFixed(1)}% (+${idiotRank.performance.toFixed(1)}) (${idiotRank.games} parties, min. 5)`,
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
      `${amoureuxRank.rank}${amoureuxRank.rank === 1 ? 'er' : 'ème'} meilleur Amoureux: ${amoureuxRank.value.toFixed(1)}% (+${amoureuxRank.performance.toFixed(1)}) (${amoureuxRank.games} parties, min. 5)`,
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
  const topSoloPerformers = findTopSoloRolePerformers(gameData, 10);
  const soloRank = findPlayerCampRank(topSoloPerformers, playerName);
  if (soloRank) {
    achievements.push(createPerformanceAchievement(
      `solo-performance-${suffix ? 'modded' : 'all'}`,
      `⭐ Top ${soloRank.rank} Rôles Spéciaux${suffix}`,
      `${soloRank.rank}${soloRank.rank === 1 ? 'er' : 'ème'} meilleur joueur rôles spéciaux: ${soloRank.value.toFixed(1)}% (+${soloRank.performance.toFixed(1)}) (${soloRank.games} parties, min. 10)`,
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