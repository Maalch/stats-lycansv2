import type { GameLogEntry } from '../useCombinedRawData';
import type { PlayerCampPerformanceResponse, CampAverage, PlayerPerformance, PlayerCampPerformance } from '../../types/api';
import { getPlayerCampFromRole, getPlayerFinalRole, getPlayerMainCampFromRole } from '../../utils/datasyncExport';
import { getPlayerId, getPlayerDisplayName } from '../../utils/playerIdentification';


/**
 * Calculate overall camp statistics
 * Uses ID-based player tracking with display name mapping
 */
function calculateCampStatistics(
  gameData: GameLogEntry[],
  regroupWolfSubRoles: boolean = false,
  regroupVillagers: boolean = false
): Record<string, {
  totalGames: number;
  wins: number;
  winRate: number;
  players: Record<string, { games: number; wins: number; winRate: number; displayName: string }>;
}> {
  const campStats: Record<string, {
    totalGames: number;
    wins: number;
    winRate: number;
    players: Record<string, { games: number; wins: number; winRate: number; displayName: string }>;
  }> = {};

  // Process each game
  gameData.forEach(game => {
    // Count participation for each camp in this game
    const campsInGame = new Set<string>();
    
    game.PlayerStats.forEach(playerStat => {
      const playerCamp = getPlayerCampFromRole(getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []), { regroupWolfSubRoles, regroupVillagers });
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
        const playerCamp = getPlayerCampFromRole(getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []), { regroupWolfSubRoles, regroupVillagers });
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
 * Uses ID-based player tracking with display name mapping
 */
function analyzePlayerPerformance(
  gameData: GameLogEntry[],
  campStats: Record<string, {
    totalGames: number;
    wins: number;
    winRate: number;
    players: Record<string, { games: number; wins: number; winRate: number; displayName: string }>;
  }>,
  regroupWolfSubRoles: boolean = false,
  regroupVillagers: boolean = false
): Record<string, {
  totalGames: number;
  camps: Record<string, {
    games: number;
    wins: number;
    winRate: number;
    performance: number;
  }>;
  displayName: string;
}> {
  const playerCampPerformance: Record<string, {
    totalGames: number;
    camps: Record<string, {
      games: number;
      wins: number;
      winRate: number;
      performance: number;
    }>;
    displayName: string;
  }> = {};

  gameData.forEach(game => {
    game.PlayerStats.forEach(playerStat => {
      const playerId = getPlayerId(playerStat);
      const displayName = getPlayerDisplayName(playerStat);

      // Determine player's camp using helper function
      const mainCamp = getPlayerCampFromRole(getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []), { regroupWolfSubRoles, regroupVillagers });
      const playerCamp = mainCamp === 'Autres' ? 'Rôles spéciaux' : mainCamp;

      // Track player performance in this camp
      if (!campStats[playerCamp].players[playerId]) {
        campStats[playerCamp].players[playerId] = {
          games: 0,
          wins: 0,
          winRate: 0,
          displayName: displayName
        };
      }
      campStats[playerCamp].players[playerId].games++;
      campStats[playerCamp].players[playerId].displayName = displayName; // Update to latest

      // Check if player won using Victorious boolean
      if (playerStat.Victorious) {
        campStats[playerCamp].players[playerId].wins++;
      }

      // Initialize player statistics
      if (!playerCampPerformance[playerId]) {
        playerCampPerformance[playerId] = {
          totalGames: 0,
          camps: {},
          displayName: displayName
        };
      }
      playerCampPerformance[playerId].displayName = displayName; // Update to latest

      // Add camp data for this player
      if (!playerCampPerformance[playerId].camps[playerCamp]) {
        playerCampPerformance[playerId].camps[playerCamp] = {
          games: 0,
          wins: 0,
          winRate: 0,
          performance: 0
        };
      }

      playerCampPerformance[playerId].totalGames++;
      playerCampPerformance[playerId].camps[playerCamp].games++;

      if (playerStat.Victorious) {
        playerCampPerformance[playerId].camps[playerCamp].wins++;
      }
    });
  });

  return playerCampPerformance;
}

/**
 * Calculate camp statistics for special roles grouping
 * Uses ID-based player tracking with display name mapping
 */
function calculateSpecialRolesCampStatistics(
  gameData: GameLogEntry[]
): Record<string, {
  totalGames: number;
  wins: number;
  winRate: number;
  players: Record<string, { games: number; wins: number; winRate: number; displayName: string }>;
}> {
  const campStats: Record<string, {
    totalGames: number;
    wins: number;
    winRate: number;
    players: Record<string, { games: number; wins: number; winRate: number; displayName: string }>;
  }> = {};

  // Initialize "Rôles spéciaux" category
  campStats['Rôles spéciaux'] = {
    totalGames: 0,
    wins: 0,
    winRate: 0,
    players: {}
  };

  // Process each game - count individual player participations, not game occurrences
  gameData.forEach(game => {
    game.PlayerStats.forEach(playerStat => {
      const mainCamp = getPlayerMainCampFromRole(getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []));
      
      // Count each player participation in special roles
      if (mainCamp === 'Autres') {
        campStats['Rôles spéciaux'].totalGames++;
        
        // Count each player win in special roles
        if (playerStat.Victorious) {
          campStats['Rôles spéciaux'].wins++;
        }
      }
    });
  });

  return campStats;
}

/**
 * Analyze player performance for special roles grouping
 * Uses ID-based player tracking with display name mapping
 */
function analyzeSpecialRolesPlayerPerformance(
  gameData: GameLogEntry[],
  campStats: Record<string, {
    totalGames: number;
    wins: number;
    winRate: number;
    players: Record<string, { games: number; wins: number; winRate: number; displayName: string }>;
  }>
): Record<string, {
  totalGames: number;
  camps: Record<string, {
    games: number;
    wins: number;
    winRate: number;
    performance: number;
  }>;
  displayName: string;
}> {
  const playerCampPerformance: Record<string, {
    totalGames: number;
    camps: Record<string, {
      games: number;
      wins: number;
      winRate: number;
      performance: number;
    }>;
    displayName: string;
  }> = {};

  gameData.forEach(game => {
    game.PlayerStats.forEach(playerStat => {
      const playerId = getPlayerId(playerStat);
      const displayName = getPlayerDisplayName(playerStat);

      // Check if this player is playing a special role
      const mainCamp = getPlayerMainCampFromRole(getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []));
      
      if (mainCamp === 'Autres') {
        const playerCamp = 'Rôles spéciaux';

        // Track player performance in special roles camp
        if (!campStats[playerCamp].players[playerId]) {
          campStats[playerCamp].players[playerId] = {
            games: 0,
            wins: 0,
            winRate: 0,
            displayName: displayName
          };
        }
        campStats[playerCamp].players[playerId].games++;
        campStats[playerCamp].players[playerId].displayName = displayName; // Update to latest

        // Check if player won using Victorious boolean
        if (playerStat.Victorious) {
          campStats[playerCamp].players[playerId].wins++;
        }

        // Initialize player statistics
        if (!playerCampPerformance[playerId]) {
          playerCampPerformance[playerId] = {
            totalGames: 0,
            camps: {},
            displayName: displayName
          };
        }
        playerCampPerformance[playerId].displayName = displayName; // Update to latest

        // Add camp data for this player
        if (!playerCampPerformance[playerId].camps[playerCamp]) {
          playerCampPerformance[playerId].camps[playerCamp] = {
            games: 0,
            wins: 0,
            winRate: 0,
            performance: 0
          };
        }

        playerCampPerformance[playerId].totalGames++;
        playerCampPerformance[playerId].camps[playerCamp].games++;

        if (playerStat.Victorious) {
          playerCampPerformance[playerId].camps[playerCamp].wins++;
        }
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
    players: Record<string, { games: number; wins: number; winRate: number; displayName: string }>;
  }>
): void {
  Object.keys(campStats).forEach(camp => {
    if (campStats[camp].totalGames > 0) {
      campStats[camp].winRate = parseFloat((campStats[camp].wins / campStats[camp].totalGames * 100).toFixed(2));
    }

    // Calculate each player's win rate in this camp
    Object.keys(campStats[camp].players).forEach(playerId => {
      const playerStat = campStats[camp].players[playerId];
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
    displayName: string;
  }>,
  campStats: Record<string, {
    totalGames: number;
    wins: number;
    winRate: number;
    players: Record<string, { games: number; wins: number; winRate: number; displayName: string }>;
  }>
): void {
  Object.keys(playerCampPerformance).forEach(playerId => {
    Object.keys(playerCampPerformance[playerId].camps).forEach(camp => {
      const playerCampStat = playerCampPerformance[playerId].camps[camp];

      if (playerCampStat.games > 0) {
        playerCampStat.winRate = parseFloat((playerCampStat.wins / playerCampStat.games * 100).toFixed(2));

        // Calculate performance vs camp average
        if (campStats[camp] && campStats[camp].winRate !== undefined) {
          playerCampStat.performance = parseFloat((playerCampStat.winRate - campStats[camp].winRate).toFixed(2));
        } else {
          // If camp stats don't exist, set performance to 0 
          playerCampStat.performance = 0;
        }
      }
    });
  });
}

/**
 * Format results for output
 * Converts ID-based internal tracking to display names for UI
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
    displayName: string;
  }>,
  campStats: Record<string, {
    totalGames: number;
    wins: number;
    winRate: number;
    players: Record<string, { games: number; wins: number; winRate: number; displayName: string }>;
  }>,
  minGamesToInclude: number
): {
  campAverages: CampAverage[];
  playerPerformanceArray: PlayerPerformance[];
} {
  // Convert player camp performance to array with minimum game threshold
  const playerPerformanceArray: PlayerPerformance[] = [];

  Object.keys(playerCampPerformance).forEach(playerId => {
    const playerData = playerCampPerformance[playerId];
    const campPerformanceArray: PlayerCampPerformance[] = [];

    Object.keys(playerData.camps).forEach(camp => {
      const campData = playerData.camps[camp];

      // Only include if player has played this camp multiple times
      if (campData.games >= minGamesToInclude) {
        // Ensure camp statistics exist before accessing them
        const campAvgWinRate = campStats[camp] && campStats[camp].winRate !== undefined 
          ? campStats[camp].winRate.toFixed(2) 
          : '0.00';
        
        campPerformanceArray.push({
          camp: camp,
          games: campData.games,
          wins: campData.wins,
          winRate: campData.winRate.toFixed(2),
          campAvgWinRate: campAvgWinRate,
          performance: campData.performance.toFixed(2)
        });
      }
    });

    // Sort by performance (higher first)
    campPerformanceArray.sort((a, b) => parseFloat(b.performance) - parseFloat(a.performance));

    // Only include player if they have qualifying camp data
    if (campPerformanceArray.length > 0) {
      playerPerformanceArray.push({
        player: playerData.displayName, // Use display name for UI
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
  const campStats = calculateCampStatistics(gameData, false, false);
  
  // Also calculate with regrouped wolf sub roles for "Camp Loup" and "Camp Villageois" option
  const campStatsWithSubRoles = calculateCampStatistics(gameData, true, true);

  // Calculate special roles grouping
  const campStatsSpecialRoles = calculateSpecialRolesCampStatistics(gameData);

  // Analyze player performance by camp
  const playerCampPerformance = analyzePlayerPerformance(gameData, campStats, false, false);
  const playerCampPerformanceWithSubRoles = analyzePlayerPerformance(gameData, campStatsWithSubRoles, true, true);
  const playerCampPerformanceSpecialRoles = analyzeSpecialRolesPlayerPerformance(gameData, campStatsSpecialRoles);

  // Calculate win rates for camps and players
  calculateWinRates(campStats);
  calculateWinRates(campStatsWithSubRoles);
  calculateWinRates(campStatsSpecialRoles);

  // Calculate performance differential (player win rate - camp average win rate)
  calculatePerformanceDifferentials(playerCampPerformance, campStats);
  calculatePerformanceDifferentials(playerCampPerformanceWithSubRoles, campStatsWithSubRoles);
  calculatePerformanceDifferentials(playerCampPerformanceSpecialRoles, campStatsSpecialRoles);

  // Merge both datasets - add "Camp Loup" and "Camp Villageois" as a virtual camp
  const mergedCampStats = { ...campStats };
  const mergedPlayerPerformance = { ...playerCampPerformance };
  
  // Add "Camp Loup" camp if it exists in regrouped data
  if (campStatsWithSubRoles['Loup']) {
    mergedCampStats['Camp Loup'] = campStatsWithSubRoles['Loup'];

    // Add "Camp Loup" performance for each player
    Object.keys(playerCampPerformanceWithSubRoles).forEach(playerId => {
      if (!mergedPlayerPerformance[playerId]) {
        mergedPlayerPerformance[playerId] = playerCampPerformanceWithSubRoles[playerId];
      }

      if (playerCampPerformanceWithSubRoles[playerId].camps['Loup']) {
        mergedPlayerPerformance[playerId].camps['Camp Loup'] = 
          playerCampPerformanceWithSubRoles[playerId].camps['Loup'];
      }
    });
  }

  // Add "Camp Villageois" camp if it exists in villagers data
  if (campStatsWithSubRoles['Villageois']) {
    mergedCampStats['Camp Villageois'] = campStatsWithSubRoles['Villageois'];

    // Add "Camp Villageois" performance for each player
    Object.keys(playerCampPerformanceWithSubRoles).forEach(playerId => {
      if (!mergedPlayerPerformance[playerId]) {
        mergedPlayerPerformance[playerId] = playerCampPerformanceWithSubRoles[playerId];
      }
      
      if (playerCampPerformanceWithSubRoles[playerId].camps['Villageois']) {
        mergedPlayerPerformance[playerId].camps['Camp Villageois'] = 
          playerCampPerformanceWithSubRoles[playerId].camps['Villageois'];
      }
    });
  }

  // Add "Rôles spéciaux" camp if it exists in special roles data
  if (campStatsSpecialRoles['Rôles spéciaux']) {
    mergedCampStats['Rôles spéciaux'] = campStatsSpecialRoles['Rôles spéciaux'];
    
    // Add "Rôles spéciaux" performance for each player
    Object.keys(playerCampPerformanceSpecialRoles).forEach(playerId => {
      if (!mergedPlayerPerformance[playerId]) {
        mergedPlayerPerformance[playerId] = playerCampPerformanceSpecialRoles[playerId];
      }
      
      if (playerCampPerformanceSpecialRoles[playerId].camps['Rôles spéciaux']) {
        mergedPlayerPerformance[playerId].camps['Rôles spéciaux'] = 
          playerCampPerformanceSpecialRoles[playerId].camps['Rôles spéciaux'];
      }
    });
  }

  // Format results with minimum game threshold
  const minGamesToInclude = 3; // Minimum games required in a camp to be included
  const { campAverages, playerPerformanceArray } = formatResults(
    mergedPlayerPerformance, 
    mergedCampStats, 
    minGamesToInclude
  );

  return {
    campAverages,
    playerPerformance: playerPerformanceArray,
    minGamesRequired: minGamesToInclude
  };
}
