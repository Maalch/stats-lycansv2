import type { GameLogEntry } from '../useCombinedRawData';
import type { GameDurationAnalysisResponse, DurationDistribution, CampDurationData } from '../../types/api';
import { getWinnerCampFromGame } from '../../utils/gameUtils';
import { calculateGameDuration, getPlayerFinalRole } from '../../utils/datasyncExport';

/**
 * Format duration in seconds to a human-readable string
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h${minutes.toString().padStart(2, '0')}m${secs.toString().padStart(2, '0')}s`;
  } else if (minutes > 0) {
    return `${minutes}m${secs.toString().padStart(2, '0')}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Round duration to nearest interval for grouping (in minutes)
 */
function roundDurationForGrouping(durationInSeconds: number, intervalMinutes: number = 10): number {
  const durationInMinutes = Math.round(durationInSeconds / 60);
  return Math.round(durationInMinutes / intervalMinutes) * intervalMinutes;
}

/**
 * Initialize game duration statistics object
 */
function initializeDurationStats(): {
  averageDuration: string;
  maxDuration: number;
  minDuration: number;
  maxDurationGameId: string | null;
  minDurationGameId: string | null;
  durationDistribution: Record<number, number>;
  durationsByWinnerCamp: Record<string, { totalDuration: number; count: number; average: string }>;
  durationsByPlayerCount: Record<string, { totalDuration: number; count: number; average: string }>;
  durationsByWolfRatio: Record<string, { totalDuration: number; count: number; average: string }>;
} {
  return {
    averageDuration: '0s',
    maxDuration: 0,
    minDuration: Infinity,
    maxDurationGameId: null,
    minDurationGameId: null,
    durationDistribution: {},
    durationsByWinnerCamp: {},
    durationsByPlayerCount: {},
    durationsByWolfRatio: {}
  };
}

/**
 * Update min/max duration tracking
 */
function updateMinMaxDuration(
  duration: number,
  gameDisplayedId: string,
  durationStats: ReturnType<typeof initializeDurationStats>
): void {
  if (duration > durationStats.maxDuration) {
    durationStats.maxDuration = duration;
    durationStats.maxDurationGameId = gameDisplayedId;
  }
  if (duration < durationStats.minDuration) {
    durationStats.minDuration = duration;
    durationStats.minDurationGameId = gameDisplayedId;
  }
}

/**
 * Update duration distribution tracking (grouped by 2-minute intervals)
 */
function updateDurationDistribution(
  duration: number,
  durationDistribution: Record<number, number>
): void {
  // Round to nearest 2-minute interval for grouping
  const roundedDuration = roundDurationForGrouping(duration, 2);
  if (!durationDistribution[roundedDuration]) {
    durationDistribution[roundedDuration] = 0;
  }
  durationDistribution[roundedDuration]++;
}

/**
 * Update durations by winner camp tracking
 */
function updateDurationsByWinnerCamp(
  winnerCamp: string,
  duration: number,
  durationsByWinnerCamp: Record<string, { totalDuration: number; count: number; average: string }>
): void {
  if (winnerCamp && winnerCamp.trim() !== '') {
    if (!durationsByWinnerCamp[winnerCamp]) {
      durationsByWinnerCamp[winnerCamp] = {
        totalDuration: 0,
        count: 0,
        average: '0s'
      };
    }
    durationsByWinnerCamp[winnerCamp].totalDuration += duration;
    durationsByWinnerCamp[winnerCamp].count++;
  }
}

/**
 * Update durations by player count tracking
 */
function updateDurationsByPlayerCount(
  nbPlayers: number,
  duration: number,
  durationsByPlayerCount: Record<string, { totalDuration: number; count: number; average: string }>
): void {
  if (nbPlayers && !isNaN(nbPlayers) && nbPlayers > 0) {
    const playerCountKey = nbPlayers.toString();
    if (!durationsByPlayerCount[playerCountKey]) {
      durationsByPlayerCount[playerCountKey] = {
        totalDuration: 0,
        count: 0,
        average: '0s'
      };
    }
    durationsByPlayerCount[playerCountKey].totalDuration += duration;
    durationsByPlayerCount[playerCountKey].count++;
  }
}

/**
 * Update durations by wolf ratio tracking
 */
function updateDurationsByWolfRatio(
  nbPlayers: number,
  nbWolves: number,
  duration: number,
  durationsByWolfRatio: Record<string, { totalDuration: number; count: number; average: string }>
): void {
  if (nbPlayers && nbWolves && !isNaN(nbPlayers) && !isNaN(nbWolves) && nbPlayers > 0) {
    // Calculate wolves/villagers ratio as a percentage
    const nbVillagers = nbPlayers - nbWolves;
    if (nbVillagers > 0) {
      const wolfRatioPercent = Math.round((nbWolves / nbVillagers) * 100);
      // Round to nearest 1% 
      const roundedWolfRatio = Math.round(wolfRatioPercent / 1) * 1;
      const wolfRatioKey = roundedWolfRatio.toString(); // e.g., "35" for 35%

      if (!durationsByWolfRatio[wolfRatioKey]) {
        durationsByWolfRatio[wolfRatioKey] = {
          totalDuration: 0,
          count: 0,
          average: '0s'
        };
      }
      durationsByWolfRatio[wolfRatioKey].totalDuration += duration;
      durationsByWolfRatio[wolfRatioKey].count++;
    }
  }
}

/**
 * Process a single game's duration data
 */
function processGameDuration(
  game: GameLogEntry,
  durationStats: ReturnType<typeof initializeDurationStats>,
  totals: { totalDuration: number; gamesWithDuration: number }
): void {
  // Extract data from GameLogEntry structure
  const nbPlayers = game.PlayerStats.length;
  const nbWolves = game.PlayerStats.filter(p => getPlayerFinalRole(p.MainRoleInitial, p.MainRoleChanges || []) === 'Loup').length;
  
  // Determine winner camp from PlayerStats
  let winnerCamp = getWinnerCampFromGame(game);
  
  // Calculate actual game duration in seconds
  const gameDuration = calculateGameDuration(game.StartDate, game.EndDate);

  if (gameDuration && !isNaN(gameDuration) && gameDuration > 0) {
    totals.gamesWithDuration++;
    totals.totalDuration += gameDuration;

    // Update min/max using DisplayedId
    updateMinMaxDuration(gameDuration, game.DisplayedId, durationStats);

    // Update duration distribution
    updateDurationDistribution(gameDuration, durationStats.durationDistribution);

    // Update durations by winner camp
    updateDurationsByWinnerCamp(winnerCamp, gameDuration, durationStats.durationsByWinnerCamp);

    // Update durations by player count
    updateDurationsByPlayerCount(nbPlayers, gameDuration, durationStats.durationsByPlayerCount);

    // Update durations by wolf ratio
    updateDurationsByWolfRatio(nbPlayers, nbWolves, gameDuration, durationStats.durationsByWolfRatio);
  }
}

/**
 * Calculate averages for all categories
 */
function calculateDurationAverages(
  durationStats: ReturnType<typeof initializeDurationStats>,
  totals: { totalDuration: number; gamesWithDuration: number }
): void {
  if (totals.gamesWithDuration > 0) {
    const averageDurationSeconds = totals.totalDuration / totals.gamesWithDuration;
    durationStats.averageDuration = formatDuration(Math.round(averageDurationSeconds));

    // Calculate averages for each category
    Object.keys(durationStats.durationsByWinnerCamp).forEach(camp => {
      const campData = durationStats.durationsByWinnerCamp[camp];
      if (campData.count > 0) {
        const avgSeconds = campData.totalDuration / campData.count;
        campData.average = formatDuration(Math.round(avgSeconds));
      }
    });

    Object.keys(durationStats.durationsByPlayerCount).forEach(playerCount => {
      const playerData = durationStats.durationsByPlayerCount[playerCount];
      if (playerData.count > 0) {
        const avgSeconds = playerData.totalDuration / playerData.count;
        playerData.average = formatDuration(Math.round(avgSeconds));
      }
    });

    Object.keys(durationStats.durationsByWolfRatio).forEach(ratio => {
      const ratioData = durationStats.durationsByWolfRatio[ratio];
      if (ratioData.count > 0) {
        const avgSeconds = ratioData.totalDuration / ratioData.count;
        ratioData.average = formatDuration(Math.round(avgSeconds));
      }
    });
  }
}

/**
 * Convert duration distribution to sorted array format
 */
function formatDurationDistribution(
  durationDistribution: Record<number, number>
): DurationDistribution[] {
  // Convert duration distribution to array for easier frontend processing
  const durationDistributionArray: DurationDistribution[] = Object.keys(durationDistribution).map(duration => ({
    duration: parseInt(duration), // duration in minutes (rounded to 2-minute intervals)
    count: durationDistribution[parseInt(duration)]
  }));

  // Sort by duration
  durationDistributionArray.sort((a, b) => a.duration - b.duration);

  return durationDistributionArray;
}

/**
 * Compute game duration analysis from raw game data
 */
export function computeGameDurationAnalysis(rawGameData: GameLogEntry[]): GameDurationAnalysisResponse | null {
  if (rawGameData.length === 0) {
    return null;
  }

  // Initialize statistics object
  const durationStats = initializeDurationStats();
  const totals = { totalDuration: 0, gamesWithDuration: 0 };

  // Process each game
  rawGameData.forEach((game) => {
    processGameDuration(game, durationStats, totals);
  });

  // Calculate averages
  calculateDurationAverages(durationStats, totals);

  // Convert duration distribution to sorted array format
  const durationDistributionArray = formatDurationDistribution(durationStats.durationDistribution);

  // Convert the internal format to the expected API format
  return {
    averageDuration: durationStats.averageDuration,
    maxDuration: durationStats.maxDuration,
    minDuration: durationStats.minDuration === Infinity ? 0 : durationStats.minDuration,
    maxDurationGameId: durationStats.maxDurationGameId,
    minDurationGameId: durationStats.minDurationGameId,
    durationDistribution: durationDistributionArray,
    durationsByWinnerCamp: durationStats.durationsByWinnerCamp as Record<string, CampDurationData>,
    durationsByPlayerCount: durationStats.durationsByPlayerCount as Record<string, CampDurationData>,
    durationsByWolfRatio: durationStats.durationsByWolfRatio as Record<string, CampDurationData>
  };
}
