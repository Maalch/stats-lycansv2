/**
 * Pure computation functions for player pairing statistics
 */

import type { PlayerPairingStatsData, PlayerPairStat } from '../../types/api';
import type { GameLogEntry, RawRoleData } from '../useCombinedRawData';
import { splitAndTrim, didCampWin } from './dataUtils';

/**
 * Compute player pairing statistics from raw game and role data
 */
export function computePlayerPairingStats(
  gameData: RawGameData[],
  roleData: RawRoleData[]
): PlayerPairingStatsData | null {
  if (gameData.length === 0 || roleData.length === 0) {
    return null;
  }

  // Create map of game ID to winner camp from game data
  const gameWinnerMap: Record<string, string> = {};
  gameData.forEach(gameRow => {
    const gameId = gameRow.Game?.toString();
    const winnerCamp = gameRow["Camp victorieux"];
    if (gameId && winnerCamp) {
      gameWinnerMap[gameId] = winnerCamp.toString();
    }
  });

  // Initialize statistics
  const wolfPairStats: Record<string, {
    appearances: number;
    wins: number;
    players: string[];
  }> = {};

  const loverPairStats: Record<string, {
    appearances: number;
    wins: number;
    players: string[];
  }> = {};

  let totalGamesWithMultipleWolves = 0;
  let totalGamesWithLovers = 0;

  // Process role data
  roleData.forEach(roleRow => {
    const gameId = roleRow.Game?.toString();
    if (!gameId) return;

    const wolves = roleRow.Loups;
    const lovers = roleRow.Amoureux;
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
                players: [wolf1, wolf2]
              };
            }
            
            wolfPairStats[pairKey].appearances++;
            // Use didCampWin to properly handle Traître alliance
            if (didCampWin("Loups", winnerCamp)) {
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
}
