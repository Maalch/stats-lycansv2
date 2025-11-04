/**
 * Helper functions for achievement generation
 */

/**
 * Helper function to find a player's rank in a sorted list
 * Handles ties properly - players with the same value get the same rank
 * @param {Array} sortedPlayers - Array of player stats sorted by the metric
 * @param {string} playerId - Steam ID or unique identifier of the player to find
 * @param {Function} valueExtractor - Function to extract the value from player stat
 * @returns {Object|null} - Object with rank and value, or null if not found
 */
export function findPlayerRank(sortedPlayers, playerId, valueExtractor) {
  const index = sortedPlayers.findIndex(p => p.player === playerId);
  if (index === -1) return null;
  
  const playerValue = valueExtractor(sortedPlayers[index]);
  
  // Find the rank by counting how many players have a BETTER value
  // Players with the same value get the same rank
  let rank = 1;
  for (let i = 0; i < index; i++) {
    const currentValue = valueExtractor(sortedPlayers[i]);
    if (currentValue > playerValue) {
      rank++;
    }
  }
  
  return {
    rank: rank,
    value: playerValue
  };
}


/**
 * Helper to find player's camp performance rank
 * Handles ties properly - players with the same performance get the same rank
 * @param {Array} sortedPlayers - Array of sorted camp stats
 * @param {string} playerId - Steam ID or unique identifier of the player to find
 * @returns {Object|null} - Object with rank, wins, games, and percentage
 */
export function findPlayerCampRank(sortedPlayers, playerId) {
  const index = sortedPlayers.findIndex(p => p.player === playerId);
  if (index === -1) return null;

  const playerData = sortedPlayers[index];
  const playerPerformance = playerData.performance || playerData.winRate || 0;
  
  // Find the rank by counting how many players have a BETTER performance
  // Players with the same performance get the same rank
  let rank = 1;
  for (let i = 0; i < index; i++) {
    const currentPerformance = sortedPlayers[i].performance || sortedPlayers[i].winRate || 0;
    if (currentPerformance > playerPerformance) {
      rank++;
    }
  }
  
  return {
    rank: rank,
    wins: playerData.wins,
    games: playerData.games,
    percentage: playerData.percentage || playerData.winRate || 0,
    performance: playerData.performance || playerData.winRate || 0,
    value: playerData.winRate || playerData.performance || 0
  };
}


/**
 * Helper to create achievement object
 * @param {string} id - Unique achievement ID
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
export function createAchievement(id, title, description, type, rank, value, totalRanked, redirectTo, category = 'general') {
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
 * Helper function to find a player's rank in a map-based sorted list
 * Handles ties properly - players with the same win rate get the same rank
 * @param {Array} sortedPlayers - Array of player map stats sorted by the metric
 * @param {string} playerId - Steam ID or unique identifier of the player to find
 * @param {string} mapType - 'village' or 'chateau'
 * @returns {Object|null} - Object with rank, value, and games, or null if not found
 */
export function findPlayerMapRank(sortedPlayers, playerId, mapType) {
  const index = sortedPlayers.findIndex(p => p.player === playerId);
  if (index === -1) return null;
  
  const playerData = sortedPlayers[index];
  const playerValue = mapType === 'village' ? playerData.villageWinRate : playerData.chateauWinRate;
  
  // Find the rank by counting how many players have a BETTER value
  let rank = 1;
  for (let i = 0; i < index; i++) {
    const currentValue = mapType === 'village' ? sortedPlayers[i].villageWinRate : sortedPlayers[i].chateauWinRate;
    if (currentValue > playerValue) {
      rank++;
    }
  }
  
  return {
    rank: rank,
    value: playerValue,
    games: mapType === 'village' ? playerData.villageGames : playerData.chateauGames
  };
}

/**
 * Helper to create comparison achievement
 * @param {string} id - Unique achievement ID
 * @param {string} title - Achievement title
 * @param {string} description - Achievement description
 * @param {'good'|'bad'} type - Achievement type
 * @param {number} value - Achievement value
 * @param {Object} redirectTo - Navigation target
 * @returns {Object} - Achievement object
 */
export function createComparisonAchievement(id, title, description, type, value, redirectTo) {
  return {
    id,
    title,
    description,
    type,
    category: 'comparison',
    value,
    redirectTo: redirectTo || {
      tab: 'players',
      subTab: 'playerComparison'
    }
  };
}

/**
 * Helper to create kills achievement
 * @param {string} id - Unique achievement ID
 * @param {string} title - Achievement title
 * @param {string} description - Achievement description
 * @param {'good'|'bad'} type - Achievement type
 * @param {number} rank - Player rank
 * @param {number} value - Achievement value
 * @param {number} totalRanked - Total number of players ranked
 * @param {Object} redirectTo - Navigation target
 * @returns {Object} - Achievement object
 */
export function createKillsAchievement(id, title, description, type, rank, value, totalRanked, redirectTo) {
  return {
    id,
    title,
    description,
    type,
    category: 'kills',
    rank,
    value,
    totalRanked,
    redirectTo: redirectTo || {
      tab: 'players',
      subTab: 'deathStats'
    }
  };
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
export function createPerformanceAchievement(id, title, description, type, rank, value, totalRanked, redirectTo, category = 'performance') {
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
 * Helper to create series achievement object
 * @param {string} id - Achievement ID
 * @param {string} title - Achievement title
 * @param {string} description - Achievement description
 * @param {'good'|'bad'} type - Achievement type
 * @param {number} rank - Player rank
 * @param {number} value - Achievement value
 * @param {number} totalRanked - Total number of players ranked in this category
 * @param {Object} redirectTo - Navigation target
 * @returns {Object} - Achievement object
 */
export function createSeriesAchievement(id, title, description, type, rank, value, totalRanked, redirectTo) {
  return {
    id,
    title,
    description,
    type,
    category: 'series',
    rank,
    value,
    totalRanked,
    redirectTo
  };
}