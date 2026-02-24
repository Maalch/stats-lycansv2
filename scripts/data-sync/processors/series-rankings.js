/**
 * Series Rankings processor - handles consecutive game performance
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
  const playerValue = playerSeries.seriesLength;
  
  // Calculate rank using standard competition ranking (1, 1, 1, 4)
  // Count how many players have a strictly better value
  let betterCount = 0;
  for (let i = 0; i < topSeries.length; i++) {
    if (topSeries[i].seriesLength > playerValue) {
      betterCount++;
    }
  }
  
  const rank = betterCount + 1;
  
  return {
    rank: rank,
    value: playerValue,
    series: playerSeries
  };
}

/**
 * Helper to create series Ranking object
 * @param {string} id - Ranking ID
 * @param {string} title - Ranking title
 * @param {string} description - Ranking description
 * @param {'good'|'bad'} type - Ranking type
 * @param {number} rank - Player rank
 * @param {number} value - Ranking value
 * @param {number} totalRanked - Total number of players ranked in this category
 * @param {Object} redirectTo - Navigation target
 * @returns {Object} - Ranking object
 */
function createSeriesRanking(id, title, description, type, rank, value, totalRanked, redirectTo) {
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
 * Process series Rankings for a specific player
 * @param {Object} seriesData - Player series data
 * @param {string} playerId - Player ID (Steam ID)
 * @param {string} suffix - Suffix for Ranking titles
 * @returns {Array} - Array of Rankings
 */
export function processSeriesRankings(seriesData, playerId, suffix) {
  if (!seriesData) return [];

  const Rankings = [];

  // 1. Longest Villageois series
  const topVillageoisSeries = findTopSeriesPerformers(seriesData.allVillageoisSeries, 3);
  const villageoisRank = findPlayerSeriesRank(topVillageoisSeries, playerId);
  if (villageoisRank) {
    Rankings.push(createSeriesRanking(
      `villageois-series-${suffix ? 'modded' : 'all'}`,
      `🏘️ Top ${villageoisRank.rank} Série Villageois${suffix}`,
      `${villageoisRank.rank}${villageoisRank.rank === 1 ? 'ère' : 'ème'} plus longue série Villageois: ${villageoisRank.value} parties consécutives`,
      'good',
      villageoisRank.rank,
      villageoisRank.value,
      topVillageoisSeries.length,
      {
        tab: 'rankings',
        subTab: 'series',
        chartSection: 'villageois-series'
      }
    ));
  }

  // 2. Longest Loup series
  const topLoupSeries = findTopSeriesPerformers(seriesData.allLoupsSeries, 2);
  const loupRank = findPlayerSeriesRank(topLoupSeries, playerId);
  if (loupRank) {
    Rankings.push(createSeriesRanking(
      `loup-series-${suffix ? 'modded' : 'all'}`,
      `🐺 Top ${loupRank.rank} Série Loup${suffix}`,
      `${loupRank.rank}${loupRank.rank === 1 ? 'ère' : 'ème'} plus longue série Loup: ${loupRank.value} parties consécutives`,
      'good',
      loupRank.rank,
      loupRank.value,
      topLoupSeries.length,
      {
        tab: 'rankings',
        subTab: 'series',
        chartSection: 'loup-series'
      }
    ));
  }

  // 3. Longest win series
  const topWinSeries = findTopSeriesPerformers(seriesData.allWinSeries, 3);
  const winRank = findPlayerSeriesRank(topWinSeries, playerId);
  if (winRank) {
    Rankings.push(createSeriesRanking(
      `win-series-${suffix ? 'modded' : 'all'}`,
      `🏆 Top ${winRank.rank} Série de Victoires${suffix}`,
      `${winRank.rank}${winRank.rank === 1 ? 'ère' : 'ème'} plus longue série de victoires: ${winRank.value} parties consécutives`,
      'good',
      winRank.rank,
      winRank.value,
      topWinSeries.length,
      {
        tab: 'rankings',
        subTab: 'series',
        chartSection: 'win-series'
      }
    ));
  }

  // 4. Longest loss series (bad Ranking)
  const topLossSeries = findTopSeriesPerformers(seriesData.allLossSeries, 3);
  const lossRank = findPlayerSeriesRank(topLossSeries, playerId);
  if (lossRank) {
    Rankings.push(createSeriesRanking(
      `loss-series-${suffix ? 'modded' : 'all'}`,
      `💀 Top ${lossRank.rank} Série de Défaites${suffix}`,
      `${lossRank.rank}${lossRank.rank === 1 ? 'ère' : 'ème'} plus longue série de défaites: ${lossRank.value} parties consécutives`,
      'bad',
      lossRank.rank,
      lossRank.value,
      topLossSeries.length,
      {
        tab: 'rankings',
        subTab: 'series',
        chartSection: 'loss-series'
      }
    ));
  }

  return Rankings;
}