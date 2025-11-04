/**
 * Series achievements processor - handles consecutive game performance
 */

/**
 * Helper function to find all performers for a specific series type
 * @param {Array} seriesData - Array of series data
 * @param {number} minLength - Minimum series length
 * @returns {Array} - All performers meeting minimum requirements
 */
function findTopSeriesPerformers(seriesData, minLength = 2) {
  return seriesData
    .filter(series => series.seriesLength >= minLength)
    .sort((a, b) => b.seriesLength - a.seriesLength);
}

/**
 * Helper function to check a player's rank in series
 * @param {Array} topSeries - Top series array
 * @param {string} playerId - Player ID (Steam ID) to find
 * @returns {Object|null} - Rank info or null
 */
function findPlayerSeriesRank(topSeries, playerId) {
  const index = topSeries.findIndex(series => series.player === playerId);
  if (index === -1) return null;
  
  const playerSeries = topSeries[index];
  return {
    rank: index + 1,
    value: playerSeries.seriesLength,
    series: playerSeries
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
function createSeriesAchievement(id, title, description, type, rank, value, totalRanked, redirectTo) {
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

/**
 * Process series achievements for a specific player
 * @param {Object} seriesData - Player series data
 * @param {string} playerId - Player ID (Steam ID)
 * @param {string} suffix - Suffix for achievement titles
 * @returns {Array} - Array of achievements
 */
export function processSeriesAchievements(seriesData, playerId, suffix) {
  if (!seriesData) return [];

  const achievements = [];

  // 1. Longest Villageois series
  const topVillageoisSeries = findTopSeriesPerformers(seriesData.allVillageoisSeries, 3);
  const villageoisRank = findPlayerSeriesRank(topVillageoisSeries, playerId);
  if (villageoisRank) {
    achievements.push(createSeriesAchievement(
      `villageois-series-${suffix ? 'modded' : 'all'}`,
      `🏘️ Top ${villageoisRank.rank} Série Villageois${suffix}`,
      `${villageoisRank.rank}${villageoisRank.rank === 1 ? 'ère' : 'ème'} plus longue série Villageois: ${villageoisRank.value} parties consécutives (min. 3)`,
      'good',
      villageoisRank.rank,
      villageoisRank.value,
      topVillageoisSeries.length,
      {
        tab: 'players',
        subTab: 'series',
        chartSection: 'villageois-series'
      }
    ));
  }

  // 2. Longest Loup series
  const topLoupSeries = findTopSeriesPerformers(seriesData.allLoupsSeries, 2);
  const loupRank = findPlayerSeriesRank(topLoupSeries, playerId);
  if (loupRank) {
    achievements.push(createSeriesAchievement(
      `loup-series-${suffix ? 'modded' : 'all'}`,
      `🐺 Top ${loupRank.rank} Série Loup${suffix}`,
      `${loupRank.rank}${loupRank.rank === 1 ? 'ère' : 'ème'} plus longue série Loup: ${loupRank.value} parties consécutives (min. 2)`,
      'good',
      loupRank.rank,
      loupRank.value,
      topLoupSeries.length,
      {
        tab: 'players',
        subTab: 'series',
        chartSection: 'loup-series'
      }
    ));
  }

  // 3. Longest win series
  const topWinSeries = findTopSeriesPerformers(seriesData.allWinSeries, 3);
  const winRank = findPlayerSeriesRank(topWinSeries, playerId);
  if (winRank) {
    achievements.push(createSeriesAchievement(
      `win-series-${suffix ? 'modded' : 'all'}`,
      `🏆 Top ${winRank.rank} Série de Victoires${suffix}`,
      `${winRank.rank}${winRank.rank === 1 ? 'ère' : 'ème'} plus longue série de victoires: ${winRank.value} parties consécutives (min. 3)`,
      'good',
      winRank.rank,
      winRank.value,
      topWinSeries.length,
      {
        tab: 'players',
        subTab: 'series',
        chartSection: 'win-series'
      }
    ));
  }

  // 4. Longest loss series (bad achievement)
  const topLossSeries = findTopSeriesPerformers(seriesData.allLossSeries, 3);
  const lossRank = findPlayerSeriesRank(topLossSeries, playerId);
  if (lossRank) {
    achievements.push(createSeriesAchievement(
      `loss-series-${suffix ? 'modded' : 'all'}`,
      `💀 Top ${lossRank.rank} Série de Défaites${suffix}`,
      `${lossRank.rank}${lossRank.rank === 1 ? 'ère' : 'ème'} plus longue série de défaites: ${lossRank.value} parties consécutives (min. 3)`,
      'bad',
      lossRank.rank,
      lossRank.value,
      topLossSeries.length,
      {
        tab: 'players',
        subTab: 'series',
        chartSection: 'loss-series'
      }
    ));
  }

  return achievements;
}