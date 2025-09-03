import { useGameStatsBase } from './utils/baseStatsHook';
import type { RawGameData } from './useCombinedRawData';
import type { GameDurationAnalysisResponse, DayDistribution, CampDaysData } from '../types/api';

/**
 * Compute game duration analysis from raw game data
 */
function computeGameDurationAnalysis(rawGameData: RawGameData[]): GameDurationAnalysisResponse | null {
  if (rawGameData.length === 0) {
    return null;
  }

  // Initialize statistics object
  const durationStats = {
    averageDays: '0',
    maxDays: 0,
    minDays: 99,
    dayDistribution: {} as Record<number, number>,
    daysByWinnerCamp: {} as Record<string, { totalDays: number; count: number; average: string }>,
    daysByPlayerCount: {} as Record<string, { totalDays: number; count: number; average: string }>,
    daysByWolfRatio: {} as Record<string, { totalDays: number; count: number; average: string }>
  };

  let totalDays = 0;
  let gamesWithDays = 0;

  // Process each game
  rawGameData.forEach(game => {
    const nbDays = game["Nombre de journées"];
    const winnerCamp = game["Camp victorieux"];
    const nbPlayers = game["Nombre de joueurs"];
    const nbWolves = game["Nombre de loups"];

    if (nbDays && !isNaN(nbDays) && nbDays > 0) {
      gamesWithDays++;
      totalDays += nbDays;

      // Update max/min
      if (nbDays > durationStats.maxDays) {
        durationStats.maxDays = nbDays;
      }
      if (nbDays < durationStats.minDays) {
        durationStats.minDays = nbDays;
      }

      // Update day distribution
      if (!durationStats.dayDistribution[nbDays]) {
        durationStats.dayDistribution[nbDays] = 0;
      }
      durationStats.dayDistribution[nbDays]++;

      // Update days by winner camp
      if (winnerCamp && winnerCamp.trim() !== '') {
        if (!durationStats.daysByWinnerCamp[winnerCamp]) {
          durationStats.daysByWinnerCamp[winnerCamp] = {
            totalDays: 0,
            count: 0,
            average: '0'
          };
        }
        durationStats.daysByWinnerCamp[winnerCamp].totalDays += nbDays;
        durationStats.daysByWinnerCamp[winnerCamp].count++;
      }

      // Update days by player count
      if (nbPlayers && !isNaN(nbPlayers) && nbPlayers > 0) {
        const playerCountKey = nbPlayers.toString();
        if (!durationStats.daysByPlayerCount[playerCountKey]) {
          durationStats.daysByPlayerCount[playerCountKey] = {
            totalDays: 0,
            count: 0,
            average: '0'
          };
        }
        durationStats.daysByPlayerCount[playerCountKey].totalDays += nbDays;
        durationStats.daysByPlayerCount[playerCountKey].count++;
      }

      // Update days by wolf ratio
      if (nbPlayers && nbWolves && !isNaN(nbPlayers) && !isNaN(nbWolves) && nbPlayers > 0) {
        // Calculate ratio as a percentage
        const wolfRatioPercent = Math.round((nbWolves / nbPlayers) * 100);
        // Round to nearest 1% (same as Google Apps Script logic)
        const roundedWolfRatio = Math.round(wolfRatioPercent / 1) * 1;
        const wolfRatioKey = roundedWolfRatio.toString(); // e.g., "35" for 35%

        if (!durationStats.daysByWolfRatio[wolfRatioKey]) {
          durationStats.daysByWolfRatio[wolfRatioKey] = {
            totalDays: 0,
            count: 0,
            average: '0'
          };
        }
        durationStats.daysByWolfRatio[wolfRatioKey].totalDays += nbDays;
        durationStats.daysByWolfRatio[wolfRatioKey].count++;
      }
    }
  });

  // Calculate averages
  if (gamesWithDays > 0) {
    durationStats.averageDays = (totalDays / gamesWithDays).toFixed(1);

    // Calculate averages for each category
    Object.keys(durationStats.daysByWinnerCamp).forEach(camp => {
      const campData = durationStats.daysByWinnerCamp[camp];
      if (campData.count > 0) {
        campData.average = (campData.totalDays / campData.count).toFixed(1);
      }
    });

    Object.keys(durationStats.daysByPlayerCount).forEach(playerCount => {
      const playerData = durationStats.daysByPlayerCount[playerCount];
      if (playerData.count > 0) {
        playerData.average = (playerData.totalDays / playerData.count).toFixed(1);
      }
    });

    Object.keys(durationStats.daysByWolfRatio).forEach(ratio => {
      const ratioData = durationStats.daysByWolfRatio[ratio];
      if (ratioData.count > 0) {
        ratioData.average = (ratioData.totalDays / ratioData.count).toFixed(1);
      }
    });
  }

  // Convert day distribution to array for easier frontend processing
  const dayDistributionArray: DayDistribution[] = Object.keys(durationStats.dayDistribution).map(day => ({
    days: parseInt(day),
    count: durationStats.dayDistribution[parseInt(day)]
  }));

  // Sort by day count
  dayDistributionArray.sort((a, b) => a.days - b.days);

  // Convert the internal format to the expected API format
  return {
    averageDays: durationStats.averageDays,
    maxDays: durationStats.maxDays,
    minDays: durationStats.minDays,
    dayDistribution: dayDistributionArray,
    daysByWinnerCamp: durationStats.daysByWinnerCamp as Record<string, CampDaysData>,
    daysByPlayerCount: durationStats.daysByPlayerCount as Record<string, CampDaysData>,
    daysByWolfRatio: durationStats.daysByWolfRatio as Record<string, CampDaysData>
  };
}

/**
 * Hook pour calculer les statistiques de durée de partie à partir des données brutes filtrées.
 * Implémente la même logique que _computeGameDurationAnalysis du Google Apps Script.
 */
export function useGameDurationAnalysisFromRaw() {
  const { data: durationAnalysis, isLoading, error } = useGameStatsBase(computeGameDurationAnalysis);

  return {
    durationAnalysis,
    fetchingData: isLoading,
    apiError: error,
  };
}
