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
  const index = topKillers.findIndex(killer => killer.killerId === playerId);
  if (index === -1) return null;
  
  const playerStats = topKillers[index];
  const playerValue = playerStats.kills;
  
  // Calculate true rank considering ties
  let rank = 1;
  for (let i = 0; i < index; i++) {
    if (topKillers[i].kills > playerValue) {
      rank++;
    }
  }
  
  return {
    rank: rank,
    value: playerValue,
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
  const playerValue = valueType === 'totalDeaths' ? playerStats.totalDeaths : playerStats.deathRate;
  
  // Calculate true rank considering ties
  let rank = 1;
  for (let i = 0; i < index; i++) {
    const currentValue = valueType === 'totalDeaths' ? topDeaths[i].totalDeaths : topDeaths[i].deathRate;
    if (currentValue > playerValue) {
      rank++;
    }
  }
  
  return {
    rank: rank,
    value: playerValue,
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
  const playerValue = playerStats.deathRate;
  
  // Calculate true rank considering ties (lower death rate is better)
  let rank = 1;
  for (let i = 0; i < index; i++) {
    if (topSurvivors[i].deathRate < playerValue) {
      rank++;
    }
  }
  
  return {
    rank: rank,
    value: playerValue,
    stats: playerStats
  };
}

/**
 * Helper function to find top hunters (good hunters - non-Villageois kills)
 * @param {Array} hunterStats - Array of hunter statistics
 * @param {number} minGames - Minimum games required
 * @returns {Array} - All hunters sorted by averageNonVillageoisKillsPerGame
 */
function findTopGoodHunters(hunterStats, minGames = 5) {
  return hunterStats
    .filter(hunter => hunter.gamesPlayedAsHunter >= minGames)
    .sort((a, b) => b.averageNonVillageoisKillsPerGame - a.averageNonVillageoisKillsPerGame);
}

/**
 * Helper function to find top bad hunters (Villageois kills)
 * @param {Array} hunterStats - Array of hunter statistics
 * @param {number} minGames - Minimum games required
 * @returns {Array} - All hunters sorted by averageVillageoisKills
 */
function findTopBadHunters(hunterStats, minGames = 5) {
  return hunterStats
    .filter(hunter => hunter.gamesPlayedAsHunter >= minGames)
    .map(hunter => ({
      ...hunter,
      averageVillageoisKills: hunter.gamesPlayedAsHunter > 0 
        ? hunter.villageoisKills / hunter.gamesPlayedAsHunter 
        : 0
    }))
    .sort((a, b) => b.averageVillageoisKills - a.averageVillageoisKills);
}

/**
 * Helper function to find player's rank in good hunters
 * @param {Array} topGoodHunters - Top good hunters array
 * @param {string} playerId - Player ID (Steam ID) to find
 * @returns {Object|null} - Rank info or null
 */
function findPlayerGoodHunterRank(topGoodHunters, playerId) {
  const index = topGoodHunters.findIndex(hunter => hunter.hunterId === playerId);
  if (index === -1) return null;
  
  const playerStats = topGoodHunters[index];
  const playerValue = playerStats.averageNonVillageoisKillsPerGame;
  
  // Calculate true rank considering ties
  let rank = 1;
  for (let i = 0; i < index; i++) {
    if (topGoodHunters[i].averageNonVillageoisKillsPerGame > playerValue) {
      rank++;
    }
  }
  
  return {
    rank: rank,
    value: playerValue,
    stats: playerStats
  };
}

/**
 * Helper function to find player's rank in bad hunters
 * @param {Array} topBadHunters - Top bad hunters array
 * @param {string} playerId - Player ID (Steam ID) to find
 * @returns {Object|null} - Rank info or null
 */
function findPlayerBadHunterRank(topBadHunters, playerId) {
  const index = topBadHunters.findIndex(hunter => hunter.hunterId === playerId);
  if (index === -1) return null;
  
  const playerStats = topBadHunters[index];
  const playerValue = playerStats.averageVillageoisKills;
  
  // Calculate true rank considering ties
  let rank = 1;
  for (let i = 0; i < index; i++) {
    if (topBadHunters[i].averageVillageoisKills > playerValue) {
      rank++;
    }
  }
  
  return {
    rank: rank,
    value: playerValue,
    stats: playerStats
  };
}

/**
 * Process kills and deaths achievements for a specific player
 * @param {Object} deathStats - Death statistics object
 * @param {Object} hunterStats - Hunter statistics object
 * @param {string} playerId - Player ID (Steam ID)
 * @param {string} suffix - Suffix for achievement titles
 * @returns {Array} - Array of achievements
 */
export function processKillsAchievements(deathStats, hunterStats, playerId, suffix) {
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
        tab: 'rankings',
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
        tab: 'rankings',
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
        tab: 'rankings',
        subTab: 'deathStats',
        chartSection: 'survivors-average'
      }
    ));
  }

  // 4. Good hunters ranking (average non-Villageois kills per game, min. 5 games as hunter)
  if (hunterStats && hunterStats.hunterStats) {
    const topGoodHunters = findTopGoodHunters(hunterStats.hunterStats, 5);
    const goodHunterRank = findPlayerGoodHunterRank(topGoodHunters, playerId);
    if (goodHunterRank) {
      achievements.push(createKillsAchievement(
        `top-good-hunter-${suffix ? 'modded' : 'all'}`,
        `🎯 Top ${goodHunterRank.rank} Bon Chasseur${suffix}`,
        `${goodHunterRank.rank}${goodHunterRank.rank === 1 ? 'er' : 'ème'} meilleur chasseur: ${goodHunterRank.value.toFixed(2)} éliminations non-Villageois par partie en Chasseur (${goodHunterRank.stats.gamesPlayedAsHunter} parties, min. 5)`,
        'good',
        goodHunterRank.rank,
        parseFloat(goodHunterRank.value.toFixed(2)),
        topGoodHunters.length,
        {
          tab: 'rankings',
          subTab: 'deathStats',
          chartSection: 'hunters-good'
        }
      ));
    }
  }

  // BAD ACHIEVEMENTS (Death achievements)

  // 5. Most killed ranking (total deaths)
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
        tab: 'rankings',
        subTab: 'deathStats',
        chartSection: 'deaths'
      }
    ));
  }

  // 6. Bad hunters ranking (average Villageois kills per game, min. 5 games as hunter)
  if (hunterStats && hunterStats.hunterStats) {
    const topBadHunters = findTopBadHunters(hunterStats.hunterStats, 5);
    const badHunterRank = findPlayerBadHunterRank(topBadHunters, playerId);
    if (badHunterRank) {
      achievements.push(createKillsAchievement(
        `top-bad-hunter-${suffix ? 'modded' : 'all'}`,
        `😱 Top ${badHunterRank.rank} Mauvais Chasseur${suffix}`,
        `${badHunterRank.rank}${badHunterRank.rank === 1 ? 'er' : 'ème'} pire chasseur: ${badHunterRank.value.toFixed(2)} éliminations Villageois par partie en Chasseur (${badHunterRank.stats.gamesPlayedAsHunter} parties, min. 5)`,
        'bad',
        badHunterRank.rank,
        parseFloat(badHunterRank.value.toFixed(2)),
        topBadHunters.length,
        {
          tab: 'rankings',
          subTab: 'deathStats',
          chartSection: 'hunters-bad'
        }
      ));
    }
  }



  return achievements;
}
