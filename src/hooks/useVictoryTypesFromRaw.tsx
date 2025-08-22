import { useMemo } from 'react';
import { useFilteredRawGameData } from './useRawGameData';

export interface VictoryType {
  type: string;
  count: number;
  percentage: string;
  [camp: string]: string | number; // Dynamic camp counts
}

export interface VictoryTypesResponse {
  totalGames: number;
  victoryTypes: VictoryType[];
  winningCamps: string[];
}

/**
 * Hook pour calculer les statistiques de types de victoire à partir des données brutes filtrées.
 * Calcule la répartition des victoires par type et par camp.
 */
export function useVictoryTypesFromRaw() {
  const { data: rawGameData, isLoading: gameLoading, error: gameError } = useFilteredRawGameData();

  const victoryTypesStats = useMemo((): VictoryTypesResponse | null => {
    if (!rawGameData || rawGameData.length === 0) {
      return null;
    }

    // Calculate victory types statistics with camp breakdown
    const victoryTypes: Record<string, number> = {};
    const victoryTypesByCamp: Record<string, Record<string, number>> = {};
    let totalGames = 0;
    
    rawGameData.forEach(game => {
      const victoryType = game["Type de victoire"];
      const winnerCamp = game["Camp victorieux"];
      
      if (victoryType && victoryType.trim() !== "" && winnerCamp && winnerCamp.trim() !== "") {
        totalGames++;
        
        // Count total victories by type
        if (!victoryTypes[victoryType]) {
          victoryTypes[victoryType] = 0;
        }
        victoryTypes[victoryType]++;

        // Count victories by type and camp
        if (!victoryTypesByCamp[victoryType]) {
          victoryTypesByCamp[victoryType] = {};
        }
        if (!victoryTypesByCamp[victoryType][winnerCamp]) {
          victoryTypesByCamp[victoryType][winnerCamp] = 0;
        }
        victoryTypesByCamp[victoryType][winnerCamp]++;
      }
    });

    // Get all unique camps that have won at least once
    const allWinningCamps = new Set<string>();
    Object.values(victoryTypesByCamp).forEach(campCounts => {
      Object.keys(campCounts).forEach(camp => allWinningCamps.add(camp));
    });

    // Convert to array and sort by frequency
    const victoryTypesArray = Object.keys(victoryTypes).map(type => {
      const typeData: any = {
        type: type,
        count: victoryTypes[type],
        percentage: ((victoryTypes[type] / totalGames) * 100).toFixed(1)
      };

      // Add camp counts and percentages for this victory type
      const campCounts = victoryTypesByCamp[type] || {};
      allWinningCamps.forEach(camp => {
        const campCount = campCounts[camp] || 0;
        const campPercentage = victoryTypes[type] > 0 ? ((campCount / victoryTypes[type]) * 100).toFixed(1) : "0.0";
        typeData[camp] = campCount;
        typeData[`${camp}_percentage`] = campPercentage;
      });

      return typeData;
    });
    victoryTypesArray.sort((a, b) => b.count - a.count);

    // Store the winning camps list for the component
    const winningCampsList = Array.from(allWinningCamps).sort();

    const result: VictoryTypesResponse = {
      totalGames: totalGames,
      victoryTypes: victoryTypesArray,
      winningCamps: winningCampsList
    };

    return result;
  }, [rawGameData]);

  const isLoading = gameLoading;
  const error = gameError;

  return {
    victoryTypesStats,
    isLoading,
    errorInfo: error,
  };
}
