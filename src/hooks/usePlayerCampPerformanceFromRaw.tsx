import { usePlayerStatsBase } from './utils/baseStatsHook';
import { 
  splitAndTrim, 
  didPlayerWin, 
  didCampWin, 
  buildGamePlayerCampMap,
  getPlayerCamp 
} from './utils/dataUtils';
import type { RawGameData, RawRoleData } from './useCombinedRawData';
import type { PlayerCampPerformanceResponse, CampAverage, PlayerPerformance, PlayerCampPerformance } from '../types/api';

/**
 * Compute player camp performance statistics from raw game and role data
 */
function computePlayerCampPerformance(gameData: RawGameData[], roleData: RawRoleData[]): PlayerCampPerformanceResponse | null {
  if (gameData.length === 0 || roleData.length === 0) {
    return null;
  }

  // Create map of game ID to player camps from role data using utility function
  const gamePlayerCampMap = buildGamePlayerCampMap(roleData);

  // Calculate overall camp statistics (both participations and wins)
  const campStats: Record<string, {
    totalGames: number;
    wins: number;
    winRate: number;
    players: Record<string, { games: number; wins: number; winRate: number }>;
  }> = {};
  let totalGames = 0;

  // First pass: count participations and wins by camp
  gameData.forEach(game => {
    const gameId = game.Game.toString();
    const playerList = game["Liste des joueurs"];
    const winnerCamp = game["Camp victorieux"];

    if (gameId && playerList && winnerCamp) {
      totalGames++;
      const players = splitAndTrim(playerList);

      // Count participation for each camp in this game
      const campsInGame = new Set<string>();
      players.forEach(playerName => {
        const player = playerName.trim();
        if (player) {
          const playerCamp = getPlayerCamp(gamePlayerCampMap, gameId, player);
          campsInGame.add(playerCamp);
        }
      });

      // Initialize and count participations
      campsInGame.forEach(camp => {
        if (!campStats[camp]) {
          campStats[camp] = {
            totalGames: 0,
            wins: 0,
            winRate: 0,
            players: {}
          };
        }
        campStats[camp].totalGames++;
      });

      // Count wins for all camps (including special cases)
      campsInGame.forEach(camp => {
        if (didCampWin(camp, winnerCamp)) {
          campStats[camp].wins++;
        }
      });
    }
  });

  // Analyze player performance by camp
  const playerCampPerformance: Record<string, {
    totalGames: number;
    camps: Record<string, {
      games: number;
      wins: number;
      winRate: number;
      performance: number;
    }>;
  }> = {};

  gameData.forEach(game => {
    const gameId = game.Game.toString();
    const playerList = game["Liste des joueurs"];
    const winnerList = game["Liste des gagnants"];

    if (gameId && playerList && winnerList) {
      const players = splitAndTrim(playerList);

      players.forEach(playerName => {
        const player = playerName.trim();
        if (player) {
          // Determine player's camp using utility function
          const playerCamp = getPlayerCamp(gamePlayerCampMap, gameId, player);

          // Track player performance in this camp
          if (!campStats[playerCamp].players[player]) {
            campStats[playerCamp].players[player] = {
              games: 0,
              wins: 0,
              winRate: 0
            };
          }
          campStats[playerCamp].players[player].games++;

          // Check if player won using utility function
          const playerWon = didPlayerWin(player, winnerList);
          if (playerWon) {
            campStats[playerCamp].players[player].wins++;
          }

          // Initialize player statistics
          if (!playerCampPerformance[player]) {
            playerCampPerformance[player] = {
              totalGames: 0,
              camps: {}
            };
          }

          // Add camp data for this player
          if (!playerCampPerformance[player].camps[playerCamp]) {
            playerCampPerformance[player].camps[playerCamp] = {
              games: 0,
              wins: 0,
              winRate: 0,
              performance: 0
            };
          }

          playerCampPerformance[player].totalGames++;
          playerCampPerformance[player].camps[playerCamp].games++;

          if (playerWon) {
            playerCampPerformance[player].camps[playerCamp].wins++;
          }
        }
      });
    }
  });

  // Calculate win rates for camps and players
  Object.keys(campStats).forEach(camp => {
    if (campStats[camp].totalGames > 0) {
      campStats[camp].winRate = parseFloat((campStats[camp].wins / campStats[camp].totalGames * 100).toFixed(2));
    }

    // Calculate each player's win rate in this camp
    Object.keys(campStats[camp].players).forEach(player => {
      const playerStat = campStats[camp].players[player];
      if (playerStat.games > 0) {
        playerStat.winRate = parseFloat((playerStat.wins / playerStat.games * 100).toFixed(2));
      }
    });
  });

  // Calculate performance differential (player win rate - camp average win rate)
  Object.keys(playerCampPerformance).forEach(player => {
    Object.keys(playerCampPerformance[player].camps).forEach(camp => {
      const playerCampStat = playerCampPerformance[player].camps[camp];

      if (playerCampStat.games > 0) {
        playerCampStat.winRate = parseFloat((playerCampStat.wins / playerCampStat.games * 100).toFixed(2));

        // Calculate performance vs camp average
        if (campStats[camp] && campStats[camp].winRate) {
          playerCampStat.performance = parseFloat((playerCampStat.winRate - campStats[camp].winRate).toFixed(2));
        }
      }
    });
  });

  // Convert player camp performance to array with minimum game threshold
  const minGamesToInclude = 5; // Minimum games required in a camp to be included
  const playerPerformanceArray: PlayerPerformance[] = [];

  Object.keys(playerCampPerformance).forEach(player => {
    const playerData = playerCampPerformance[player];
    const campPerformanceArray: PlayerCampPerformance[] = [];

    Object.keys(playerData.camps).forEach(camp => {
      const campData = playerData.camps[camp];

      // Only include if player has played this camp multiple times
      if (campData.games >= minGamesToInclude) {
        campPerformanceArray.push({
          camp: camp,
          games: campData.games,
          wins: campData.wins,
          winRate: campData.winRate.toFixed(2),
          campAvgWinRate: campStats[camp].winRate.toFixed(2),
          performance: campData.performance.toFixed(2)
        });
      }
    });

    // Sort by performance (higher first)
    campPerformanceArray.sort((a, b) => parseFloat(b.performance) - parseFloat(a.performance));

    // Only include player if they have qualifying camp data
    if (campPerformanceArray.length > 0) {
      playerPerformanceArray.push({
        player: player,
        totalGames: playerData.totalGames,
        campPerformance: campPerformanceArray
      });
    }
  });

  // Sort by total games played (descending)
  playerPerformanceArray.sort((a, b) => b.totalGames - a.totalGames);

  // Convert camp stats to campAverages format
  const campAverages: CampAverage[] = Object.keys(campStats).map(camp => ({
    camp: camp,
    totalGames: campStats[camp].totalGames,
    winRate: campStats[camp].winRate.toFixed(2)
  }));

  return {
    campAverages: campAverages,
    playerPerformance: playerPerformanceArray,
    minGamesRequired: minGamesToInclude
  };
}

/**
 * Hook pour calculer les statistiques de performance par camp pour chaque joueur à partir des données brutes filtrées.
 * Implémente la même logique que _computePlayerCampPerformance du Google Apps Script.
 */
export function usePlayerCampPerformanceFromRaw() {
  const { data: playerCampPerformance, isLoading, error } = usePlayerStatsBase(computePlayerCampPerformance);

  return {
    playerCampPerformance,
    isLoading,
    error,
  };
}
