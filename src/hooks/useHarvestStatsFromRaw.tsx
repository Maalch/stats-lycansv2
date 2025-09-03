import { useGameStatsBase } from './utils/baseStatsHook';
import type { RawGameData } from './useCombinedRawData';
import type { HarvestStatsResponse, HarvestDistribution, CampHarvestData } from '../types/api';

/**
 * Compute harvest statistics from raw game data
 */
function computeHarvestStats(gameData: RawGameData[]): HarvestStatsResponse | null {
  if (gameData.length === 0) {
    return null;
  }

    // Initialize statistics object
    const harvestStats = {
      averageHarvest: 0,
      averageHarvestPercent: '0',
      gamesWithHarvest: 0,
      harvestDistribution: {
        "0-25%": 0,
        "26-50%": 0,
        "51-75%": 0,
        "76-99%": 0,
        "100%": 0
      } as HarvestDistribution,
      harvestByWinner: {} as Record<string, { totalPercent: number; count: number; average: string }>
    };

    let totalHarvest = 0;
    let totalMaxHarvest = 0;

    // Process each game
    gameData.forEach(game => {
      const winnerCamp = game["Camp victorieux"];
      const harvest = game["Récolte"];
      const maxHarvest = game["Total récolte"];
      const harvestPercent = game["Pourcentage de récolte"];

      // Count harvest values
      if (harvest !== null && harvest !== undefined && !isNaN(harvest)) {
        totalHarvest += harvest;
      }

      if (maxHarvest !== null && maxHarvest !== undefined && !isNaN(maxHarvest)) {
        totalMaxHarvest += maxHarvest;
      }

      // Process harvest percentage
      if (harvestPercent !== null && harvestPercent !== undefined && !isNaN(harvestPercent)) {
        harvestStats.gamesWithHarvest++;

        // Categorize by percentage (harvestPercent is already a decimal between 0 and 1)
        if (harvestPercent <= 0.25) {
          harvestStats.harvestDistribution["0-25%"]++;
        } else if (harvestPercent <= 0.50) {
          harvestStats.harvestDistribution["26-50%"]++;
        } else if (harvestPercent <= 0.75) {
          harvestStats.harvestDistribution["51-75%"]++;
        } else if (harvestPercent <= 0.99) {
          harvestStats.harvestDistribution["76-99%"]++;
        } else {
          harvestStats.harvestDistribution["100%"]++;
        }

        // Track by winner camp
        if (winnerCamp && winnerCamp.trim() !== '') {
          if (!harvestStats.harvestByWinner[winnerCamp]) {
            harvestStats.harvestByWinner[winnerCamp] = {
              totalPercent: 0,
              count: 0,
              average: '0'
            };
          }

          harvestStats.harvestByWinner[winnerCamp].totalPercent += harvestPercent;
          harvestStats.harvestByWinner[winnerCamp].count++;
        }
      }
    });

    // Calculate averages
    if (harvestStats.gamesWithHarvest > 0) {
      // Overall average harvest percentage
      if (totalMaxHarvest > 0) {
        harvestStats.averageHarvestPercent = (totalHarvest / totalMaxHarvest * 100).toFixed(2);
      }
      
      // Average harvest amount
      harvestStats.averageHarvest = parseFloat((totalHarvest / harvestStats.gamesWithHarvest).toFixed(2));

      // Calculate averages for each winner camp
      Object.keys(harvestStats.harvestByWinner).forEach(camp => {
        const campData = harvestStats.harvestByWinner[camp];
        if (campData.count > 0) {
          campData.average = (campData.totalPercent / campData.count * 100).toFixed(2);
        }
      });
    }

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

/**
 * Hook pour calculer les statistiques de récolte à partir des données brutes filtrées.
 * Implémente la même logique que _computeHarvestStats du Google Apps Script.
 */
export function useHarvestStatsFromRaw() {
  const { data: harvestStats, isLoading, error } = useGameStatsBase(computeHarvestStats);

  return {
    harvestStats,
    isLoading,
    errorInfo: error,
  };
}
