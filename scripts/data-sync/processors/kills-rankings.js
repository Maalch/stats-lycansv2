/**
 * Kills Rankings processor - handles death statistics and killer rankings
 */

import { createKillsRanking } from '../helpers.js';

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
 * Helper function to find players with highest death rates
 * @param {Array} playerDeathStats - Array of player death statistics
 * @param {number} minGames - Minimum games required
 * @returns {Array} - All players sorted by death rate (highest first)
 */
function findTopDeathRates(playerDeathStats, minGames = 25) {
  return playerDeathStats
    .filter(player => player.gamesPlayed >= minGames)
    .sort((a, b) => b.deathRate - a.deathRate);
}

/**
 * Helper function to find player's rank in death rate ranking
 * @param {Array} topDeathRates - Top death rates array (sorted by highest death rate)
 * @param {string} playerId - Player ID (Steam ID) to find
 * @returns {Object|null} - Rank info or null
 */
function findPlayerDeathRateRank(topDeathRates, playerId) {
  const index = topDeathRates.findIndex(player => player.player === playerId);
  if (index === -1) return null;
  
  const playerStats = topDeathRates[index];
  const playerValue = playerStats.deathRate;
  
  // Calculate true rank considering ties (higher death rate = higher rank)
  let rank = 1;
  for (let i = 0; i < index; i++) {
    if (topDeathRates[i].deathRate > playerValue) {
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
 * Helper function to find top Day 1 survivors (highest Day 1 survival rate)
 * @param {Array} playerDeathStats - Array of player death statistics
 * @param {number} minGames - Minimum games required
 * @returns {Array} - All players sorted by Day 1 survival rate (highest first)
 */
function findTopDay1Survivors(playerDeathStats, minGames = 25) {
  return playerDeathStats
    .filter(player => player.gamesPlayed >= minGames && player.survivalDay1Rate !== null && player.survivalDay1Rate !== undefined)
    .sort((a, b) => b.survivalDay1Rate - a.survivalDay1Rate);
}

/**
 * Helper function to find player's rank in Day 1 survival ranking
 * @param {Array} topDay1Survivors - Top Day 1 survivors array (sorted by highest survival rate)
 * @param {string} playerId - Player ID (Steam ID) to find
 * @returns {Object|null} - Rank info or null
 */
function findPlayerDay1SurvivalRank(topDay1Survivors, playerId) {
  const index = topDay1Survivors.findIndex(player => player.player === playerId);
  if (index === -1) return null;
  
  const playerStats = topDay1Survivors[index];
  const playerValue = playerStats.survivalDay1Rate;
  
  // Calculate true rank considering ties (higher survival rate = higher rank)
  let rank = 1;
  for (let i = 0; i < index; i++) {
    if (topDay1Survivors[i].survivalDay1Rate > playerValue) {
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
 * Process kills and deaths Rankings for a specific player
 * @param {Object} deathStats - Death statistics object
 * @param {Object} hunterStats - Hunter statistics object
 * @param {string} playerId - Player ID (Steam ID)
 * @param {string} suffix - Suffix for Ranking titles
 * @returns {Array} - Array of Rankings
 */
export function processKillsRankings(deathStats, hunterStats, playerId, suffix) {
  if (!deathStats) return [];

  const Rankings = [];

  // GOOD Rankings (Killer Rankings)

  // 1. Killers ranking (average per game, min. 20 games)
  const topKillersAverage = findTopKillers(deathStats.killerStats, 20, 'averageKillsPerGame');
  const killerAverageRank = findPlayerKillerRank(topKillersAverage, playerId);
  if (killerAverageRank) {
    Rankings.push(createKillsRanking(
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
    Rankings.push(createKillsRanking(
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
      Rankings.push(createKillsRanking(
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

  // BAD Rankings (Death Rankings)

  // 5. Highest death rate ranking (deaths per game, min. 25 games)
  const topDeathRates = findTopDeathRates(deathStats.playerDeathStats, 25);
  const deathRateRank = findPlayerDeathRateRank(topDeathRates, playerId);
  if (deathRateRank) {
    Rankings.push(createKillsRanking(
      `top-death-rate-${suffix ? 'modded' : 'all'}`,
      `☠️ Top ${deathRateRank.rank} Taux de Mortalité${suffix}`,
      `${deathRateRank.rank}${deathRateRank.rank === 1 ? 'er' : 'ème'} taux de mortalité le plus élevé: ${deathRateRank.value.toFixed(2)} morts par partie (min. 25 parties)`,
      'bad',
      deathRateRank.rank,
      parseFloat(deathRateRank.value.toFixed(2)),
      topDeathRates.length,
      {
        tab: 'rankings',
        subTab: 'deathStats',
        chartSection: 'death-rate'
      }
    ));
  }

  // 6. Day 1 survival rate ranking (best Day 1 survival, min. 25 games)
  const topDay1Survivors = findTopDay1Survivors(deathStats.playerDeathStats, 25);
  const day1SurvivalRank = findPlayerDay1SurvivalRank(topDay1Survivors, playerId);
  if (day1SurvivalRank) {
    Rankings.push(createKillsRanking(
      `top-day1-survivor-${suffix ? 'modded' : 'all'}`,
      `🌅 Top ${day1SurvivalRank.rank} Survie Jour 1${suffix}`,
      `${day1SurvivalRank.rank}${day1SurvivalRank.rank === 1 ? 'er' : 'ème'} meilleur taux de survie Jour 1: ${day1SurvivalRank.value.toFixed(1)}% (min. 25 parties)`,
      'good',
      day1SurvivalRank.rank,
      parseFloat(day1SurvivalRank.value.toFixed(1)),
      topDay1Survivors.length,
      {
        tab: 'rankings',
        subTab: 'deathStats',
        chartSection: 'day1-survivors'
      }
    ));
  }

  // 7. Bad hunters ranking (average Villageois kills per game, min. 5 games as hunter)
  if (hunterStats && hunterStats.hunterStats) {
    const topBadHunters = findTopBadHunters(hunterStats.hunterStats, 5);
    const badHunterRank = findPlayerBadHunterRank(topBadHunters, playerId);
    if (badHunterRank) {
      Rankings.push(createKillsRanking(
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



  return Rankings;
}
