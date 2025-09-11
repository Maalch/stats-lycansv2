import type { RawGameData, RawRoleData } from '../useCombinedRawData';
import { 
  splitAndTrim, 
  didPlayerWin, 
  didCampWin, 
  buildGamePlayerCampMap,
  getPlayerCamp 
} from './dataUtils';
import type { PlayerCampPerformanceResponse, CampAverage, PlayerPerformance, PlayerCampPerformance } from '../../types/api';

/**
 * Calculate overall camp statistics
 */
function calculateCampStatistics(
  gameData: RawGameData[],
  gamePlayerCampMap: Record<string, Record<string, string>>
): Record<string, {
  totalGames: number;
  wins: number;
  winRate: number;
  players: Record<string, { games: number; wins: number; winRate: number }>;
}> {
  const campStats: Record<string, {
    totalGames: number;
    wins: number;
    winRate: number;
    players: Record<string, { games: number; wins: number; winRate: number }>;
  }> = {};

  // First pass: count participations and wins by camp
  gameData.forEach(game => {
    const gameId = game.Game.toString();
    const playerList = game["Liste des joueurs"];
    const winnerCamp = game["Camp victorieux"];

    if (gameId && playerList && winnerCamp) {
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

  return campStats;
}

/**
 * Analyze player performance by camp
 */
function analyzePlayerPerformance(
  gameData: RawGameData[],
  gamePlayerCampMap: Record<string, Record<string, string>>,
  campStats: Record<string, {
    totalGames: number;
    wins: number;
    winRate: number;
    players: Record<string, { games: number; wins: number; winRate: number }>;
  }>
): Record<string, {
  totalGames: number;
  camps: Record<string, {
    games: number;
    wins: number;
    winRate: number;
    performance: number;
  }>;
}> {
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

  return playerCampPerformance;
}

/**
 * Calculate win rates for camps and players
 */
function calculateWinRates(
  campStats: Record<string, {
    totalGames: number;
    wins: number;
    winRate: number;
    players: Record<string, { games: number; wins: number; winRate: number }>;
  }>
): void {
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
}

/**
 * Calculate performance differential (player win rate - camp average win rate)
 */
function calculatePerformanceDifferentials(
  playerCampPerformance: Record<string, {
    totalGames: number;
    camps: Record<string, {
      games: number;
      wins: number;
      winRate: number;
      performance: number;
    }>;
  }>,
  campStats: Record<string, {
    totalGames: number;
    wins: number;
    winRate: number;
    players: Record<string, { games: number; wins: number; winRate: number }>;
  }>
): void {
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
}

/**
 * Format results for output
 */
function formatResults(
  playerCampPerformance: Record<string, {
    totalGames: number;
    camps: Record<string, {
      games: number;
      wins: number;
      winRate: number;
      performance: number;
    }>;
  }>,
  campStats: Record<string, {
    totalGames: number;
    wins: number;
    winRate: number;
    players: Record<string, { games: number; wins: number; winRate: number }>;
  }>,
  minGamesToInclude: number
): {
  campAverages: CampAverage[];
  playerPerformanceArray: PlayerPerformance[];
} {
  // Convert player camp performance to array with minimum game threshold
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
    wins: campStats[camp].wins,
    winRate: campStats[camp].winRate.toFixed(2)
  }));

  return {
    campAverages,
    playerPerformanceArray
  };
}

/**
 * Compute player camp performance statistics from raw game and role data
 */
export function computePlayerCampPerformance(
  gameData: RawGameData[], 
  roleData: RawRoleData[]
): PlayerCampPerformanceResponse | null {
  if (gameData.length === 0 || roleData.length === 0) {
    return null;
  }

  // Create map of game ID to player camps from role data using utility function
  const gamePlayerCampMap = buildGamePlayerCampMap(roleData);

  // Calculate overall camp statistics (both participations and wins)
  const campStats = calculateCampStatistics(gameData, gamePlayerCampMap);

  // Analyze player performance by camp
  const playerCampPerformance = analyzePlayerPerformance(gameData, gamePlayerCampMap, campStats);

  // Calculate win rates for camps and players
  calculateWinRates(campStats);

  // Calculate performance differential (player win rate - camp average win rate)
  calculatePerformanceDifferentials(playerCampPerformance, campStats);

  // Format results with minimum game threshold
  const minGamesToInclude = 5; // Minimum games required in a camp to be included
  const { campAverages, playerPerformanceArray } = formatResults(
    playerCampPerformance, 
    campStats, 
    minGamesToInclude
  );

  return {
    campAverages,
    playerPerformance: playerPerformanceArray,
    minGamesRequired: minGamesToInclude
  };
}
