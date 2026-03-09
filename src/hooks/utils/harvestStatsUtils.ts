import type { GameLogEntry } from '../useCombinedRawData';
import type { HarvestStatsResponse, HarvestDistribution, CampHarvestData } from '../../types/api';
import { getWinnerCampFromGame } from '../../utils/gameUtils';

/**
 * Initialize harvest statistics object
 */
function initializeHarvestStats(): {
  averageHarvest: number;
  averageHarvestPercent: string;
  gamesWithHarvest: number;
  harvestDistribution: HarvestDistribution;
  harvestByWinner: Record<string, { totalPercent: number; count: number; average: string }>;
} {
  return {
    averageHarvest: 0,
    averageHarvestPercent: '0',
    gamesWithHarvest: 0,
    harvestDistribution: {
      "0-25%": 0,
      "26-50%": 0,
      "51-75%": 0,
      "76-99%": 0,
      "100+%": 0
    },
    harvestByWinner: {}
  };
}

/**
 * Categorize harvest percentage into distribution buckets
 * Note: Values over 100% (harvestPercent > 1.0) are treated as 100+%
 */
function categorizeHarvestPercentage(
  harvestPercent: number,
  harvestDistribution: HarvestDistribution
): void {
  if (harvestPercent <= 0.25) {
    harvestDistribution["0-25%"]++;
  } else if (harvestPercent <= 0.50) {
    harvestDistribution["26-50%"]++;
  } else if (harvestPercent <= 0.75) {
    harvestDistribution["51-75%"]++;
  } else if (harvestPercent <= 0.99) {
    harvestDistribution["76-99%"]++;
  } else {
    // Catches both exactly 100% and over 100% (displayed as "100+%")
    harvestDistribution["100+%"]++;
  }
}

/**
 * Track harvest statistics by winner camp
 * For display purposes, cap harvest percentage at 100% for averaging
 */
function trackHarvestByWinner(
  winnerCamp: string,
  harvestPercent: number,
  harvestByWinner: Record<string, { totalPercent: number; count: number; average: string }>
): void {
  if (winnerCamp && winnerCamp.trim() !== '') {
    if (!harvestByWinner[winnerCamp]) {
      harvestByWinner[winnerCamp] = {
        totalPercent: 0,
        count: 0,
        average: '0'
      };
    }

    // Cap at 100% for averaging purposes (display shows 100+% in distribution)
    const cappedPercent = Math.min(harvestPercent, 1.0);
    harvestByWinner[winnerCamp].totalPercent += cappedPercent;
    harvestByWinner[winnerCamp].count++;
  }
}

/**
 * Process a single game's harvest data
 */
function processGameHarvest(
  game: GameLogEntry,
  harvestStats: ReturnType<typeof initializeHarvestStats>,
  totals: { totalHarvest: number; totalMaxHarvest: number }
): void {
  // Extract data from GameLogEntry structure
  const harvest = game.HarvestDone;
  const maxHarvest = game.HarvestGoal;
  const harvestPercent = maxHarvest > 0 ? harvest / maxHarvest : 0;
  
  // Determine winner camp from PlayerStats
  let winnerCamp = getWinnerCampFromGame(game);

  // Count harvest values
  if (harvest !== null && harvest !== undefined && !isNaN(harvest)) {
    totals.totalHarvest += harvest;
  }

  if (maxHarvest !== null && maxHarvest !== undefined && !isNaN(maxHarvest)) {
    totals.totalMaxHarvest += maxHarvest;
  }

  // Process harvest percentage
  if (harvestPercent !== null && harvestPercent !== undefined && !isNaN(harvestPercent)) {
    harvestStats.gamesWithHarvest++;

    // Categorize by percentage (harvestPercent is already a decimal between 0 and 1)
    categorizeHarvestPercentage(harvestPercent, harvestStats.harvestDistribution);

    // Track by winner camp
    trackHarvestByWinner(winnerCamp, harvestPercent, harvestStats.harvestByWinner);
  }
}

/**
 * Calculate final averages and percentages
 */
function calculateAverages(
  harvestStats: ReturnType<typeof initializeHarvestStats>,
  totals: { totalHarvest: number; totalMaxHarvest: number }
): void {
  if (harvestStats.gamesWithHarvest > 0) {
    // Overall average harvest percentage
    if (totals.totalMaxHarvest > 0) {
      harvestStats.averageHarvestPercent = (totals.totalHarvest / totals.totalMaxHarvest * 100).toFixed(2);
    }
    
    // Average harvest amount
    harvestStats.averageHarvest = parseFloat((totals.totalHarvest / harvestStats.gamesWithHarvest).toFixed(2));

    // Calculate averages for each winner camp
    Object.keys(harvestStats.harvestByWinner).forEach(camp => {
      const campData = harvestStats.harvestByWinner[camp];
      if (campData.count > 0) {
        campData.average = (campData.totalPercent / campData.count * 100).toFixed(2);
      }
    });
  }
}

/**
 * Compute harvest statistics from raw game data
 */
export function computeHarvestStats(gameData: GameLogEntry[]): HarvestStatsResponse | null {
  if (gameData.length === 0) {
    return null;
  }

  // Initialize statistics object
  const harvestStats = initializeHarvestStats();
  const totals = { totalHarvest: 0, totalMaxHarvest: 0 };

  // Process each game
  gameData.forEach(game => {
    processGameHarvest(game, harvestStats, totals);
  });

  // Calculate averages
  calculateAverages(harvestStats, totals);

  // Convert the internal format to the expected API format
  const result: HarvestStatsResponse = {
    averageHarvest: harvestStats.averageHarvest,
    averageHarvestPercent: harvestStats.averageHarvestPercent,
    gamesWithHarvest: harvestStats.gamesWithHarvest,
    harvestDistribution: harvestStats.harvestDistribution,
    harvestByWinner: harvestStats.harvestByWinner as Record<string, CampHarvestData>
  };

  return result;
}
