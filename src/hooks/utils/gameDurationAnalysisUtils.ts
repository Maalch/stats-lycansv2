import type { RawGameData } from '../useCombinedRawData';
import type { GameDurationAnalysisResponse, DayDistribution, CampDaysData } from '../../types/api';

/**
 * Initialize game duration statistics object
 */
function initializeDurationStats(): {
  averageDays: string;
  maxDays: number;
  minDays: number;
  dayDistribution: Record<number, number>;
  daysByWinnerCamp: Record<string, { totalDays: number; count: number; average: string }>;
  daysByPlayerCount: Record<string, { totalDays: number; count: number; average: string }>;
  daysByWolfRatio: Record<string, { totalDays: number; count: number; average: string }>;
} {
  return {
    averageDays: '0',
    maxDays: 0,
    minDays: 99,
    dayDistribution: {},
    daysByWinnerCamp: {},
    daysByPlayerCount: {},
    daysByWolfRatio: {}
  };
}

/**
 * Update min/max days tracking
 */
function updateMinMaxDays(
  nbDays: number,
  durationStats: ReturnType<typeof initializeDurationStats>
): void {
  if (nbDays > durationStats.maxDays) {
    durationStats.maxDays = nbDays;
  }
  if (nbDays < durationStats.minDays) {
    durationStats.minDays = nbDays;
  }
}

/**
 * Update day distribution tracking
 */
function updateDayDistribution(
  nbDays: number,
  dayDistribution: Record<number, number>
): void {
  if (!dayDistribution[nbDays]) {
    dayDistribution[nbDays] = 0;
  }
  dayDistribution[nbDays]++;
}

/**
 * Update days by winner camp tracking
 */
function updateDaysByWinnerCamp(
  winnerCamp: string,
  nbDays: number,
  daysByWinnerCamp: Record<string, { totalDays: number; count: number; average: string }>
): void {
  if (winnerCamp && winnerCamp.trim() !== '') {
    if (!daysByWinnerCamp[winnerCamp]) {
      daysByWinnerCamp[winnerCamp] = {
        totalDays: 0,
        count: 0,
        average: '0'
      };
    }
    daysByWinnerCamp[winnerCamp].totalDays += nbDays;
    daysByWinnerCamp[winnerCamp].count++;
  }
}

/**
 * Update days by player count tracking
 */
function updateDaysByPlayerCount(
  nbPlayers: number,
  nbDays: number,
  daysByPlayerCount: Record<string, { totalDays: number; count: number; average: string }>
): void {
  if (nbPlayers && !isNaN(nbPlayers) && nbPlayers > 0) {
    const playerCountKey = nbPlayers.toString();
    if (!daysByPlayerCount[playerCountKey]) {
      daysByPlayerCount[playerCountKey] = {
        totalDays: 0,
        count: 0,
        average: '0'
      };
    }
    daysByPlayerCount[playerCountKey].totalDays += nbDays;
    daysByPlayerCount[playerCountKey].count++;
  }
}

/**
 * Update days by wolf ratio tracking
 */
function updateDaysByWolfRatio(
  nbPlayers: number,
  nbWolves: number,
  nbDays: number,
  daysByWolfRatio: Record<string, { totalDays: number; count: number; average: string }>
): void {
  if (nbPlayers && nbWolves && !isNaN(nbPlayers) && !isNaN(nbWolves) && nbPlayers > 0) {
    // Calculate ratio as a percentage
    const wolfRatioPercent = Math.round((nbWolves / nbPlayers) * 100);
    // Round to nearest 1% (same as Google Apps Script logic)
    const roundedWolfRatio = Math.round(wolfRatioPercent / 1) * 1;
    const wolfRatioKey = roundedWolfRatio.toString(); // e.g., "35" for 35%

    if (!daysByWolfRatio[wolfRatioKey]) {
      daysByWolfRatio[wolfRatioKey] = {
        totalDays: 0,
        count: 0,
        average: '0'
      };
    }
    daysByWolfRatio[wolfRatioKey].totalDays += nbDays;
    daysByWolfRatio[wolfRatioKey].count++;
  }
}

/**
 * Process a single game's duration data
 */
function processGameDuration(
  game: RawGameData,
  durationStats: ReturnType<typeof initializeDurationStats>,
  totals: { totalDays: number; gamesWithDays: number }
): void {
  const nbDays = game["Nombre de journées"];
  const winnerCamp = game["Camp victorieux"];
  const nbPlayers = game["Nombre de joueurs"];
  const nbWolves = game["Nombre de loups"];

  if (nbDays && !isNaN(nbDays) && nbDays > 0) {
    totals.gamesWithDays++;
    totals.totalDays += nbDays;

    // Update min/max
    updateMinMaxDays(nbDays, durationStats);

    // Update day distribution
    updateDayDistribution(nbDays, durationStats.dayDistribution);

    // Update days by winner camp
    updateDaysByWinnerCamp(winnerCamp, nbDays, durationStats.daysByWinnerCamp);

    // Update days by player count
    updateDaysByPlayerCount(nbPlayers, nbDays, durationStats.daysByPlayerCount);

    // Update days by wolf ratio
    updateDaysByWolfRatio(nbPlayers, nbWolves, nbDays, durationStats.daysByWolfRatio);
  }
}

/**
 * Calculate averages for all categories
 */
function calculateDurationAverages(
  durationStats: ReturnType<typeof initializeDurationStats>,
  totals: { totalDays: number; gamesWithDays: number }
): void {
  if (totals.gamesWithDays > 0) {
    durationStats.averageDays = (totals.totalDays / totals.gamesWithDays).toFixed(1);

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
}

/**
 * Convert day distribution to sorted array format
 */
function formatDayDistribution(
  dayDistribution: Record<number, number>
): DayDistribution[] {
  // Convert day distribution to array for easier frontend processing
  const dayDistributionArray: DayDistribution[] = Object.keys(dayDistribution).map(day => ({
    days: parseInt(day),
    count: dayDistribution[parseInt(day)]
  }));

  // Sort by day count
  dayDistributionArray.sort((a, b) => a.days - b.days);

  return dayDistributionArray;
}

/**
 * Compute game duration analysis from raw game data
 */
export function computeGameDurationAnalysis(rawGameData: RawGameData[]): GameDurationAnalysisResponse | null {
  if (rawGameData.length === 0) {
    return null;
  }

  // Initialize statistics object
  const durationStats = initializeDurationStats();
  const totals = { totalDays: 0, gamesWithDays: 0 };

  // Process each game
  rawGameData.forEach(game => {
    processGameDuration(game, durationStats, totals);
  });

  // Calculate averages
  calculateDurationAverages(durationStats, totals);

  // Convert day distribution to sorted array format
  const dayDistributionArray = formatDayDistribution(durationStats.dayDistribution);

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
