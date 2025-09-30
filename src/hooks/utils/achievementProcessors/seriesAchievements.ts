/**
 * Achievement processor for player series statistics (longest streaks)
 */

import type { Achievement } from '../../../types/achievements';
import type { PlayerSeriesData } from '../playerSeriesUtils';

// Helper function to find top performers for a specific series type
function findTopSeriesPerformers<T extends { player: string; seriesLength: number }>(
  seriesData: T[], 
  minLength: number = 2
): T[] {
  return seriesData
    .filter(series => series.seriesLength >= minLength)
    .sort((a, b) => b.seriesLength - a.seriesLength)
    .slice(0, 10);
}

// Helper function to check if a player is in top 10 of series
function findPlayerSeriesRank<T extends { player: string; seriesLength: number }>(
  topSeries: T[], 
  playerName: string
): { rank: number; value: number; series: T } | null {
  const index = topSeries.findIndex(series => series.player === playerName);
  if (index === -1) return null;
  
  const playerSeries = topSeries[index];
  return {
    rank: index + 1,
    value: playerSeries.seriesLength,
    series: playerSeries
  };
}

// Helper to create series achievement object
function createSeriesAchievement(
  id: string,
  title: string,
  description: string,
  type: 'good' | 'bad',
  rank: number,
  value: number,
  redirectTo: Achievement['redirectTo']
): Achievement {
  return {
    id,
    title,
    description,
    type,
    category: 'series',
    rank,
    value,
    redirectTo
  };
}

/**
 * Process series achievements for a specific player
 */
export function processSeriesAchievements(
  seriesData: PlayerSeriesData,
  playerName: string,
  suffix: string
): Achievement[] {
  if (!seriesData) return [];

  const achievements: Achievement[] = [];

  // 1. Top 10 in longest Villageois series
  const topVillageoisSeries = findTopSeriesPerformers(seriesData.allVillageoisSeries, 3);
  const villageoisRank = findPlayerSeriesRank(topVillageoisSeries, playerName);
  if (villageoisRank) {
    achievements.push(createSeriesAchievement(
      `villageois-series-${suffix ? 'modded' : 'all'}`,
      `🏘️ Top ${villageoisRank.rank} Série Villageois${suffix}`,
      `${villageoisRank.rank}${villageoisRank.rank === 1 ? 'ère' : 'ème'} plus longue série Villageois: ${villageoisRank.value} parties consécutives`,
      'good',
      villageoisRank.rank,
      villageoisRank.value,
      {
        tab: 'players',
        subTab: 'series',
        chartSection: 'villageois-series'
      }
    ));
  }

  // 2. Top 10 in longest Loup series
  const topLoupSeries = findTopSeriesPerformers(seriesData.allLoupsSeries, 2);
  const loupRank = findPlayerSeriesRank(topLoupSeries, playerName);
  if (loupRank) {
    achievements.push(createSeriesAchievement(
      `loup-series-${suffix ? 'modded' : 'all'}`,
      `🐺 Top ${loupRank.rank} Série Loup${suffix}`,
      `${loupRank.rank}${loupRank.rank === 1 ? 'ère' : 'ème'} plus longue série Loup: ${loupRank.value} parties consécutives`,
      'good',
      loupRank.rank,
      loupRank.value,
      {
        tab: 'players',
        subTab: 'series',
        chartSection: 'loup-series'
      }
    ));
  }

  // 3. Top 10 in longest win series
  const topWinSeries = findTopSeriesPerformers(seriesData.allWinSeries, 3);
  const winRank = findPlayerSeriesRank(topWinSeries, playerName);
  if (winRank) {
    achievements.push(createSeriesAchievement(
      `win-series-${suffix ? 'modded' : 'all'}`,
      `🏆 Top ${winRank.rank} Série de Victoires${suffix}`,
      `${winRank.rank}${winRank.rank === 1 ? 'ère' : 'ème'} plus longue série de victoires: ${winRank.value} parties consécutives`,
      'good',
      winRank.rank,
      winRank.value,
      {
        tab: 'players',
        subTab: 'series',
        chartSection: 'win-series'
      }
    ));
  }

  // 4. Top 10 in longest loss series (bad achievement)
  const topLossSeries = findTopSeriesPerformers(seriesData.allLossSeries, 3);
  const lossRank = findPlayerSeriesRank(topLossSeries, playerName);
  if (lossRank) {
    achievements.push(createSeriesAchievement(
      `loss-series-${suffix ? 'modded' : 'all'}`,
      `💀 Top ${lossRank.rank} Série de Défaites${suffix}`,
      `${lossRank.rank}${lossRank.rank === 1 ? 'ère' : 'ème'} plus longue série de défaites: ${lossRank.value} parties consécutives`,
      'bad',
      lossRank.rank,
      lossRank.value,
      {
        tab: 'players',
        subTab: 'series',
        chartSection: 'loss-series'
      }
    ));
  }

  return achievements;
}