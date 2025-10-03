import type { GameLogEntry } from '../useCombinedRawData';
import type { PlayerCampPerformanceResponse, CampAverage, PlayerPerformance, PlayerCampPerformance } from '../../types/api';
import { getPlayerCampFromRole } from '../../utils/datasyncExport';


/**
 * Calculate overall camp statistics
 */
function calculateCampStatistics(
  gameData: GameLogEntry[]
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

  // Process each game
  gameData.forEach(game => {
    // Count participation for each camp in this game
    const campsInGame = new Set<string>();
    
    game.PlayerStats.forEach(playerStat => {
      const playerCamp = getPlayerCampFromRole(playerStat.MainRoleFinal);
      campsInGame.add(playerCamp);
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

    // Count wins for camps based on victorious players
    const winningCamps = new Set<string>();
    game.PlayerStats.forEach(playerStat => {
      if (playerStat.Victorious) {
        const playerCamp = getPlayerCampFromRole(playerStat.MainRoleFinal);
        winningCamps.add(playerCamp);
      }
    });

    // Increment wins for winning camps
    winningCamps.forEach(camp => {
      if (campStats[camp]) {
        campStats[camp].wins++;
      }
    });
  });

  return campStats;
}

/**
 * Analyze player performance by camp
 */
function analyzePlayerPerformance(
  gameData: GameLogEntry[],
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
    game.PlayerStats.forEach(playerStat => {
      const player = playerStat.Username.trim();
      if (!player) return;

      // Determine player's camp using helper function
      const playerCamp = getPlayerCampFromRole(playerStat.MainRoleFinal);

      // Track player performance in this camp
      if (!campStats[playerCamp].players[player]) {
        campStats[playerCamp].players[player] = {
          games: 0,
          wins: 0,
          winRate: 0
        };
      }
      campStats[playerCamp].players[player].games++;

      // Check if player won using Victorious boolean
      if (playerStat.Victorious) {
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

      if (playerStat.Victorious) {
        playerCampPerformance[player].camps[playerCamp].wins++;
      }
    });
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
 * Compute player camp performance statistics from game log data
 */
export function computePlayerCampPerformance(
  gameData: GameLogEntry[]
): PlayerCampPerformanceResponse | null {
  if (gameData.length === 0) {
    return null;
  }

  // Calculate overall camp statistics (both participations and wins)
  const campStats = calculateCampStatistics(gameData);

  // Analyze player performance by camp
  const playerCampPerformance = analyzePlayerPerformance(gameData, campStats);

  // Calculate win rates for camps and players
  calculateWinRates(campStats);

  // Calculate performance differential (player win rate - camp average win rate)
  calculatePerformanceDifferentials(playerCampPerformance, campStats);

  // Format results with minimum game threshold
  const minGamesToInclude = 3; // Minimum games required in a camp to be included
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
