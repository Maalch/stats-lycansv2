/**
 * Kills achievements processor - handles death statistics and killer rankings
 */

import { createKillsAchievement } from '../helpers.js';

/**
 * Helper function to find top killers based on different criteria
 * @param {Array} killerStats - Array of killer statistics
 * @param {number} minGames - Minimum games required
 * @param {string} sortBy - Sort criteria ('kills' or 'averageKillsPerGame')
 * @returns {Array} - All killers sorted by criteria
 */
function findTopKillers(killerStats, minGames = 1, sortBy = 'kills') {
  return killerStats
    .filter(killer => killer.gamesPlayed >= minGames)
    .sort((a, b) => b[sortBy] - a[sortBy]);
}

/**
 * Helper function to find top players who died the most
 * @param {Array} playerDeathStats - Array of player death statistics
 * @param {string} sortBy - Sort criteria ('totalDeaths' or 'deathRate')
 * @param {number} minGames - Minimum games required
 * @returns {Array} - All players sorted by death criteria
 */
function findTopDeaths(playerDeathStats, sortBy = 'totalDeaths', minGames = 1) {
  return playerDeathStats
    .filter(player => {
      // For deathRate, we need to ensure they have enough games
      if (sortBy === 'deathRate') {
        return player.deathRate > 0 && player.totalDeaths >= minGames * 0.3; // Rough estimate
      }
      return true;
    })
    .sort((a, b) => b[sortBy] - a[sortBy]);
}

/**
 * Helper function to find top survivors (lowest death rates)
 * @param {Array} playerDeathStats - Array of player death statistics
 * @param {number} minGames - Minimum games required
 * @returns {Array} - All players sorted by survival rate (lowest death rate first)
 */
function findTopSurvivors(playerDeathStats, minGames = 1) {
  return playerDeathStats
    .filter(player => player.gamesPlayed >= minGames)
    .sort((a, b) => a.deathRate - b.deathRate); // Sort by lowest death rate first
}

/**
 * Helper function to check if a player is in top killers
 * @param {Array} topKillers - Top killers array
 * @param {string} playerId - Player ID (Steam ID) to find
 * @returns {Object|null} - Rank info or null
 */
function findPlayerKillerRank(topKillers, playerId) {
  // Note: killerStats don't have a 'player' field, only 'killerName'
  // We need to match by killer name, but we're receiving playerId
  // The killerStats should have been updated to include killerId field
  const index = topKillers.findIndex(killer => killer.killerId === playerId);
  if (index === -1) return null;
  
  const playerStats = topKillers[index];
  return {
    rank: index + 1,
    value: playerStats.kills,
    stats: playerStats
  };
}

/**
 * Helper function to check if a player is in top deaths
 * @param {Array} topDeaths - Top deaths array
 * @param {string} playerId - Player ID (Steam ID) to find
 * @param {string} valueType - Value type ('totalDeaths' or 'deathRate')
 * @returns {Object|null} - Rank info or null
 */
function findPlayerDeathRank(topDeaths, playerId, valueType = 'totalDeaths') {
  const index = topDeaths.findIndex(death => death.player === playerId);
  if (index === -1) return null;
  
  const playerStats = topDeaths[index];
  return {
    rank: index + 1,
    value: valueType === 'totalDeaths' ? playerStats.totalDeaths : playerStats.deathRate,
    stats: playerStats
  };
}

/**
 * Helper function to check if a player is in top survivors
 * @param {Array} topSurvivors - Top survivors array (sorted by lowest death rate)
 * @param {string} playerId - Player ID (Steam ID) to find
 * @returns {Object|null} - Rank info or null
 */
function findPlayerSurvivalRank(topSurvivors, playerId) {
  const index = topSurvivors.findIndex(survivor => survivor.player === playerId);
  if (index === -1) return null;
  
  const playerStats = topSurvivors[index];
  return {
    rank: index + 1,
    value: playerStats.deathRate,
    stats: playerStats
  };
}

/**
 * Process kills and deaths achievements for a specific player
 * @param {Object} deathStats - Death statistics object
 * @param {string} playerId - Player ID (Steam ID)
 * @param {string} suffix - Suffix for achievement titles
 * @returns {Array} - Array of achievements
 */
export function processKillsAchievements(deathStats, playerId, suffix) {
  if (!deathStats) return [];

  const achievements = [];

  // GOOD ACHIEVEMENTS (Killer achievements)

  // 1. Killers ranking (total kills)
  const topKillers = findTopKillers(deathStats.killerStats, 1, 'kills');
  const killerRank = findPlayerKillerRank(topKillers, playerId);
  if (killerRank) {
    achievements.push(createKillsAchievement(
      `top-killer-${suffix ? 'modded' : 'all'}`,
      `⚔️ Top ${killerRank.rank} Tueur${suffix}`,
      `${killerRank.rank}${killerRank.rank === 1 ? 'er' : 'ème'} plus grand tueur avec ${killerRank.value} éliminations`,
      'good',
      killerRank.rank,
      killerRank.value,
      topKillers.length,
      {
        tab: 'players',
        subTab: 'deathStats',
        chartSection: 'killers'
      }
    ));
  }

  // 2. Killers ranking (average per game, min. 20 games)
  const topKillersAverage = findTopKillers(deathStats.killerStats, 20, 'averageKillsPerGame');
  const killerAverageRank = findPlayerKillerRank(topKillersAverage, playerId);
  if (killerAverageRank) {
    achievements.push(createKillsAchievement(
      `top-killer-average-${suffix ? 'modded' : 'all'}`,
      `🎯 Top ${killerAverageRank.rank} Tueur Efficace${suffix}`,
      `${killerAverageRank.rank}${killerAverageRank.rank === 1 ? 'er' : 'ème'} meilleur ratio d'éliminations: ${killerAverageRank.stats.averageKillsPerGame.toFixed(2)} par partie (${killerAverageRank.stats.gamesPlayed} parties, min. 20)`,
      'good',
      killerAverageRank.rank,
      parseFloat(killerAverageRank.stats.averageKillsPerGame.toFixed(2)),
      topKillersAverage.length,
      {
        tab: 'players',
        subTab: 'deathStats',
        chartSection: 'killers-average'
      }
    ));
  }

  // 3. Less killed ranking (lowest death rate, min. 25 games)
  const topSurvivors = findTopSurvivors(deathStats.playerDeathStats, 25);
  const survivalRank = findPlayerSurvivalRank(topSurvivors, playerId);
  if (survivalRank) {
    achievements.push(createKillsAchievement(
      `top-survivor-${suffix ? 'modded' : 'all'}`,
      `🛡️ Top ${survivalRank.rank} Survivant${suffix}`,
      `${survivalRank.rank}${survivalRank.rank === 1 ? 'er' : 'ème'} meilleur taux de survie: ${survivalRank.value.toFixed(2)} morts par partie (min. 25 parties)`,
      'good',
      survivalRank.rank,
      parseFloat(survivalRank.value.toFixed(2)),
      topSurvivors.length,
      {
        tab: 'players',
        subTab: 'deathStats',
        chartSection: 'survivors-average'
      }
    ));
  }

  // BAD ACHIEVEMENTS (Death achievements)

  // 4. Most killed ranking (total deaths)
  const topDeaths = findTopDeaths(deathStats.playerDeathStats, 'totalDeaths', 1);
  const deathRank = findPlayerDeathRank(topDeaths, playerId, 'totalDeaths');
  if (deathRank) {
    achievements.push(createKillsAchievement(
      `top-killed-${suffix ? 'modded' : 'all'}`,
      `💀 Top ${deathRank.rank} Victime${suffix}`,
      `${deathRank.rank}${deathRank.rank === 1 ? 'ère' : 'ème'} joueur le plus éliminé avec ${deathRank.value} morts`,
      'bad',
      deathRank.rank,
      deathRank.value,
      topDeaths.length,
      {
        tab: 'players',
        subTab: 'deathStats',
        chartSection: 'deaths'
      }
    ));
  }



  return achievements;
}
