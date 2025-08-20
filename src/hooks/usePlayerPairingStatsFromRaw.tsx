import { useMemo } from 'react';
import { useFilteredRawGameData, useFilteredRawRoleData } from './useRawGameData';
import type { PlayerPairingStatsData, PlayerPairStat } from '../types/api';

/**
 * Hook pour calculer les statistiques de paires de joueurs (loups et amoureux) à partir des données brutes filtrées.
 * Implémente la même logique que _computePlayerPairingStats du Google Apps Script.
 */
export function usePlayerPairingStatsFromRaw() {
  const { data: rawGameData, isLoading: gameLoading, error: gameError } = useFilteredRawGameData();
  const { data: rawRoleData, isLoading: roleLoading, error: roleError } = useFilteredRawRoleData();

  const playerPairingStats = useMemo((): PlayerPairingStatsData | null => {
    if (!rawGameData || rawGameData.length === 0 || !rawRoleData || rawRoleData.length === 0) {
      return null;
    }

    // Helper function to split and trim strings like the Google Apps Script
    const splitAndTrim = (str: string | null | undefined): string[] => {
      return str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
    };

    // Create map of game ID to winner camp from game data
    const gameWinnerMap: Record<string, string> = {};
    rawGameData.forEach(gameRow => {
      const gameId = gameRow["Game"]?.toString();
      const winnerCamp = gameRow["Camp victorieux"];
      if (gameId && winnerCamp) {
        gameWinnerMap[gameId] = winnerCamp.toString();
      }
    });

    // Initialize statistics
    const wolfPairStats: Record<string, {
      appearances: number;
      wins: number;
      winRate: number;
      players: string[];
    }> = {};

    const loverPairStats: Record<string, {
      appearances: number;
      wins: number;
      winRate: number;
      players: string[];
    }> = {};

    let totalGamesWithMultipleWolves = 0;
    let totalGamesWithLovers = 0;

    // Process role data
    rawRoleData.forEach(roleRow => {
      const gameId = roleRow["Game"]?.toString();
      if (!gameId) return;

      const wolves = roleRow["Loups"];
      const lovers = roleRow["Amoureux"];
      const winnerCamp = gameWinnerMap[gameId];

      // Process wolf pairs
      if (wolves) {
        const wolfArray = splitAndTrim(wolves.toString());
        // Only process if there are multiple wolves
        if (wolfArray.length >= 2) {
          totalGamesWithMultipleWolves++;
          // Generate all possible wolf pairs
          for (let i = 0; i < wolfArray.length; i++) {
            for (let j = i + 1; j < wolfArray.length; j++) {
              const wolf1 = wolfArray[i];
              const wolf2 = wolfArray[j];
              // Create a consistent key for the pair (alphabetical order)
              const pairKey = [wolf1, wolf2].sort().join(" & ");
              
              if (!wolfPairStats[pairKey]) {
                wolfPairStats[pairKey] = {
                  appearances: 0,
                  wins: 0,
                  winRate: 0,
                  players: [wolf1, wolf2]
                };
              }
              
              wolfPairStats[pairKey].appearances++;
              if (winnerCamp === "Loups") {
                wolfPairStats[pairKey].wins++;
              }
            }
          }
        }
      }

      // Process lover pairs
      if (lovers) {
        const loverArray = splitAndTrim(lovers.toString());

        // Only process if there are lovers (should be pairs)
        if (loverArray.length >= 2) {
          totalGamesWithLovers++;

          // Generate lover pairs (should usually be just one pair per game)
          for (let i = 0; i < loverArray.length; i += 2) {
            // Make sure we have both lovers of the pair
            if (i + 1 < loverArray.length) {
              const lover1 = loverArray[i];
              const lover2 = loverArray[i + 1];

              // Create a consistent key for the pair (alphabetical order)
              const pairKey = [lover1, lover2].sort().join(" & ");

              if (!loverPairStats[pairKey]) {
                loverPairStats[pairKey] = {
                  appearances: 0,
                  wins: 0,
                  winRate: 0,
                  players: [lover1, lover2]
                };
              }

              loverPairStats[pairKey].appearances++;
              if (winnerCamp === "Amoureux") {
                loverPairStats[pairKey].wins++;
              }
            }
          }
        }
      }
    });

    // Calculate win rates and convert to arrays
    const wolfPairArray: PlayerPairStat[] = Object.keys(wolfPairStats).map(key => {
      const stats = wolfPairStats[key];
      const winRate = stats.appearances > 0 ? (stats.wins / stats.appearances * 100).toFixed(2) : "0.00";
      return {
        pair: key,
        appearances: stats.appearances,
        wins: stats.wins,
        winRate: winRate,
        players: stats.players
      };
    });

    const loverPairArray: PlayerPairStat[] = Object.keys(loverPairStats).map(key => {
      const stats = loverPairStats[key];
      const winRate = stats.appearances > 0 ? (stats.wins / stats.appearances * 100).toFixed(2) : "0.00";
      return {
        pair: key,
        appearances: stats.appearances,
        wins: stats.wins,
        winRate: winRate,
        players: stats.players
      };
    });

    // Sort by number of appearances (descending)
    wolfPairArray.sort((a, b) => b.appearances - a.appearances);
    loverPairArray.sort((a, b) => b.appearances - a.appearances);

    return {
      wolfPairs: {
        totalGames: totalGamesWithMultipleWolves,
        pairs: wolfPairArray
      },
      loverPairs: {
        totalGames: totalGamesWithLovers,
        pairs: loverPairArray
      }
    };
  }, [rawGameData, rawRoleData]);

  return {
    data: playerPairingStats,
    isLoading: gameLoading || roleLoading,
    error: gameError || roleError
  };
}
