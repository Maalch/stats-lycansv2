/**
 * Statistics calculation and result collection functions
 */

import type { 
  PlayerSeriesState, 
  CampSeries, 
  WinSeries, 
  LossSeries, 
  DeathSeries, 
  SurvivalSeries 
} from './playerSeriesTypes';

/**
 * Collect and sort series results
 */
export function collectSeriesResults(playerCampSeries: Record<string, PlayerSeriesState>): {
  allVillageoisSeries: CampSeries[];
  allLoupsSeries: CampSeries[];
  allNoWolfSeries: CampSeries[];
  allSoloSeries: CampSeries[];
  allWinSeries: WinSeries[];
  allLossSeries: LossSeries[];
  allDeathSeries: DeathSeries[];
  allSurvivalSeries: SurvivalSeries[];
} {
  const allVillageoisSeries: CampSeries[] = [];
  const allLoupsSeries: CampSeries[] = [];
  const allNoWolfSeries: CampSeries[] = [];
  const allSoloSeries: CampSeries[] = [];
  const allWinSeries: WinSeries[] = [];
  const allLossSeries: LossSeries[] = [];
  const allDeathSeries: DeathSeries[] = [];
  const allSurvivalSeries: SurvivalSeries[] = [];

  Object.values(playerCampSeries).forEach(stats => {
    if (stats.longestVillageoisSeries) {
      allVillageoisSeries.push(stats.longestVillageoisSeries);
    }
    if (stats.longestLoupsSeries) {
      allLoupsSeries.push(stats.longestLoupsSeries);
    }
    if (stats.longestNoWolfSeries) {
      allNoWolfSeries.push(stats.longestNoWolfSeries);
    }
    if (stats.longestSoloSeries) {
      allSoloSeries.push(stats.longestSoloSeries);
    }
    if (stats.longestWinSeries) {
      allWinSeries.push(stats.longestWinSeries);
    }
    if (stats.longestLossSeries) {
      allLossSeries.push(stats.longestLossSeries);
    }
    if (stats.longestDeathSeries) {
      allDeathSeries.push(stats.longestDeathSeries);
    }
    if (stats.longestSurvivalSeries) {
      allSurvivalSeries.push(stats.longestSurvivalSeries);
    }
  });

  // Sort by series length (descending) - no slicing here
  allVillageoisSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  allLoupsSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  allNoWolfSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  allSoloSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  allWinSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  allLossSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  allDeathSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  allSurvivalSeries.sort((a, b) => b.seriesLength - a.seriesLength);

  return {
    allVillageoisSeries,
    allLoupsSeries,
    allNoWolfSeries,
    allSoloSeries,
    allWinSeries,
    allLossSeries,
    allDeathSeries,
    allSurvivalSeries
  };
}

/**
 * Calculate statistics for all players based on their actual series data
 */
export function calculatePlayerStatistics(
  playerCampSeries: Record<string, PlayerSeriesState>,
  totalPlayers: number
): {
  averageVillageoisSeries: number;
  averageLoupsSeries: number;
  averageNoWolfSeries: number;
  averageSoloSeries: number;
  averageWinSeries: number;
  averageLossSeries: number;
  averageDeathSeries: number;
  averageSurvivalSeries: number;
  eliteVillageoisCount: number;
  eliteLoupsCount: number;
  eliteNoWolfCount: number;
  eliteSoloCount: number;
  eliteWinCount: number;
  eliteLossCount: number;
  eliteDeathCount: number;
  eliteSurvivalCount: number;
} {
  // Collect ALL players' best series lengths (including 0 for those who never had a series)
  const allVillageoisSeries: number[] = [];
  const allLoupsSeries: number[] = [];
  const allNoWolfSeries: number[] = [];
  const allSoloSeries: number[] = [];
  const allWinSeries: number[] = [];
  const allLossSeries: number[] = [];
  const allDeathSeries: number[] = [];
  const allSurvivalSeries: number[] = [];
  
  Object.values(playerCampSeries).forEach(stats => {
    // For averages, include the best series length for each player (0 if they never had one)
    allVillageoisSeries.push(stats.longestVillageoisSeries?.seriesLength || 0);
    allLoupsSeries.push(stats.longestLoupsSeries?.seriesLength || 0);
    allNoWolfSeries.push(stats.longestNoWolfSeries?.seriesLength || 0);
    allSoloSeries.push(stats.longestSoloSeries?.seriesLength || 0);
    allWinSeries.push(stats.longestWinSeries?.seriesLength || 0);
    allLossSeries.push(stats.longestLossSeries?.seriesLength || 0);
    allDeathSeries.push(stats.longestDeathSeries?.seriesLength || 0);
    allSurvivalSeries.push(stats.longestSurvivalSeries?.seriesLength || 0);
  });

  // Calculate averages based on ALL players
  const averageVillageoisSeries = totalPlayers > 0 
    ? allVillageoisSeries.reduce((sum, length) => sum + length, 0) / totalPlayers
    : 0;
  
  const averageLoupsSeries = totalPlayers > 0 
    ? allLoupsSeries.reduce((sum, length) => sum + length, 0) / totalPlayers
    : 0;
  
  const averageNoWolfSeries = totalPlayers > 0 
    ? allNoWolfSeries.reduce((sum, length) => sum + length, 0) / totalPlayers
    : 0;
  
  const averageSoloSeries = totalPlayers > 0 
    ? allSoloSeries.reduce((sum, length) => sum + length, 0) / totalPlayers
    : 0;
  
  const averageWinSeries = totalPlayers > 0 
    ? allWinSeries.reduce((sum, length) => sum + length, 0) / totalPlayers
    : 0;
    
  const averageLossSeries = totalPlayers > 0 
    ? allLossSeries.reduce((sum, length) => sum + length, 0) / totalPlayers
    : 0;

  const averageDeathSeries = totalPlayers > 0 
    ? allDeathSeries.reduce((sum, length) => sum + length, 0) / totalPlayers
    : 0;

  const averageSurvivalSeries = totalPlayers > 0 
    ? allSurvivalSeries.reduce((sum, length) => sum + length, 0) / totalPlayers
    : 0;

  // Count elite players (with thresholds: Villageois 5+, Loups 3+, NoWolf 5+, Solo 3+, Wins 5+, Losses 5+, Deaths 5+, Survival 5+)
  const eliteVillageoisCount = allVillageoisSeries.filter(length => length >= 5).length;
  const eliteLoupsCount = allLoupsSeries.filter(length => length >= 3).length;
  const eliteNoWolfCount = allNoWolfSeries.filter(length => length >= 5).length;
  const eliteSoloCount = allSoloSeries.filter(length => length >= 3).length;
  const eliteWinCount = allWinSeries.filter(length => length >= 5).length;
  const eliteLossCount = allLossSeries.filter(length => length >= 5).length;
  const eliteDeathCount = allDeathSeries.filter(length => length >= 5).length;
  const eliteSurvivalCount = allSurvivalSeries.filter(length => length >= 5).length;

  return {
    averageVillageoisSeries: Math.round(averageVillageoisSeries * 10) / 10, // Round to 1 decimal
    averageLoupsSeries: Math.round(averageLoupsSeries * 10) / 10,
    averageNoWolfSeries: Math.round(averageNoWolfSeries * 10) / 10,
    averageSoloSeries: Math.round(averageSoloSeries * 10) / 10,
    averageWinSeries: Math.round(averageWinSeries * 10) / 10,
    averageLossSeries: Math.round(averageLossSeries * 10) / 10,
    averageDeathSeries: Math.round(averageDeathSeries * 10) / 10,
    averageSurvivalSeries: Math.round(averageSurvivalSeries * 10) / 10,
    eliteVillageoisCount,
    eliteLoupsCount,
    eliteNoWolfCount,
    eliteSoloCount,
    eliteWinCount,
    eliteLossCount,
    eliteDeathCount,
    eliteSurvivalCount
  };
}
