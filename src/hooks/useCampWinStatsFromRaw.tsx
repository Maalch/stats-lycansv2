import { useMemo } from 'react';
import { useFilteredRawGameData } from './useRawGameData';
import type { CampWinStatsResponse, CampStat, SoloCamp } from '../types/api';

/**
 * Hook pour calculer les statistiques de victoire par camp à partir des données brutes filtrées.
 * Implémente la même logique que _computeCampWinStats du Google Apps Script.
 */
export function useCampWinStatsFromRaw() {
  const { data: rawGameData, isLoading, error } = useFilteredRawGameData();

  const campWinStats = useMemo((): CampWinStatsResponse | null => {
    if (!rawGameData || rawGameData.length === 0) {
      return null;
    }

    // Initialize statistics objects
    const soloCamps: Record<string, number> = {};
    const campWins: Record<string, number> = {};
    let totalGames = 0;

    // Helper function to split and trim strings like the Google Apps Script
    const splitAndTrim = (str: string | null): string[] => {
      return str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
    };

    // Process each game
    rawGameData.forEach(game => {
      const soloRoles = game["Rôles solo"];
      const winnerCamp = game["Camp victorieux"];

      // Process solo roles if they exist
      if (soloRoles && soloRoles.toString().trim() !== "") {
        // Split by comma and process each solo role
        const soloRolesList = splitAndTrim(soloRoles.toString());
        soloRolesList.forEach(soloRole => {
          const trimmedRole = soloRole.trim();
          if (trimmedRole !== "") {
            // Track solo camps
            if (!soloCamps[trimmedRole]) {
              soloCamps[trimmedRole] = 0;
            }
            soloCamps[trimmedRole]++;
          }
        });
      }

      // Process regular winner camp
      if (winnerCamp && winnerCamp.trim() !== "") {
        totalGames++;
        if (!campWins[winnerCamp]) {
          campWins[winnerCamp] = 0;
        }
        campWins[winnerCamp]++;
      }
    });

    // Calculate win percentages
    const campStats: CampStat[] = [];
    Object.keys(campWins).forEach(camp => {
      campStats.push({
        camp: camp,
        wins: campWins[camp],
        winRate: (campWins[camp] / totalGames * 100).toFixed(2)
      });
    });

    // Sort by win count (descending)
    campStats.sort((a, b) => b.wins - a.wins);

    // Convert soloCamps to array for easier frontend processing
    const soloCampStats: SoloCamp[] = [];
    Object.keys(soloCamps).forEach(soloRole => {
      soloCampStats.push({
        soloRole: soloRole,
        appearances: soloCamps[soloRole]
      });
    });

    // Sort solo camps by appearances (descending)
    soloCampStats.sort((a, b) => b.appearances - a.appearances);

    const result: CampWinStatsResponse = {
      totalGames: totalGames,
      campStats: campStats,
      soloCamps: soloCampStats
    };

    return result;
  }, [rawGameData]);

  return {
    campWinStats,
    isLoading,
    errorInfo: error,
  };
}
