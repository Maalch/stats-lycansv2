import type { RawGameData, RawRoleData } from '../useCombinedRawData';
import { splitAndTrim, didPlayerWin, buildGamePlayerCampMap, getPlayerMainCamp } from './dataUtils';

export interface CampSeries {
  player: string;
  camp: 'Villageois' | 'Loups';
  seriesLength: number;
  startGame: number;
  endGame: number;
  startDate: string;
  endDate: string;
}

export interface WinSeries {
  player: string;
  seriesLength: number;
  startGame: number;
  endGame: number;
  startDate: string;
  endDate: string;
  campCounts: Record<string, number>; // Count of times each camp was played
}

export interface PlayerSeriesData {
  longestVillageoisSeries: CampSeries[];
  longestLoupsSeries: CampSeries[];
  longestWinSeries: WinSeries[];
  totalGamesAnalyzed: number;
  // Statistics for all players
  averageVillageoisSeries: number;
  averageLoupsSeries: number;
  averageWinSeries: number;
  eliteVillageoisCount: number; // Players with 5+ Villageois series
  eliteLoupsCount: number; // Players with 3+ Loups series
  eliteWinCount: number; // Players with 5+ win series
  totalPlayersCount: number;
}

interface PlayerSeriesState {
  currentVillageoisSeries: number;
  currentLoupsSeries: number;
  longestVillageoisSeries: CampSeries | null;
  longestLoupsSeries: CampSeries | null;
  currentWinSeries: number;
  longestWinSeries: WinSeries | null;
  currentWinCamps: string[];
  lastCamp: 'Villageois' | 'Loups' | 'Autres' | null;
  lastWon: boolean;
  villageoisSeriesStart: { game: number; date: string } | null;
  loupsSeriesStart: { game: number; date: string } | null;
  winSeriesStart: { game: number; date: string } | null;
}

/**
 * Get all unique players from game data
 */
function getAllPlayers(gameData: RawGameData[]): Set<string> {
  const allPlayers = new Set<string>();
  
  gameData.forEach(gameRow => {
    const playerList = gameRow["Liste des joueurs"];
    if (playerList) {
      splitAndTrim(playerList.toString()).forEach(player => {
        allPlayers.add(player.trim());
      });
    }
  });
  
  return allPlayers;
}

/**
 * Initialize player series tracking state
 */
function initializePlayerSeries(allPlayers: Set<string>): Record<string, PlayerSeriesState> {
  const playerCampSeries: Record<string, PlayerSeriesState> = {};
  
  allPlayers.forEach(player => {
    playerCampSeries[player] = {
      currentVillageoisSeries: 0,
      currentLoupsSeries: 0,
      longestVillageoisSeries: null,
      longestLoupsSeries: null,
      currentWinSeries: 0,
      longestWinSeries: null,
      currentWinCamps: [],
      lastCamp: null,
      lastWon: false,
      villageoisSeriesStart: null,
      loupsSeriesStart: null,
      winSeriesStart: null
    };
  });
  
  return playerCampSeries;
}

/**
 * Process camp series for a player
 */
function processCampSeries(
  playerStats: PlayerSeriesState,
  player: string,
  mainCamp: 'Villageois' | 'Loups' | 'Autres',
  gameIdNum: number,
  date: string
): void {
  if (mainCamp === 'Villageois' || mainCamp === 'Loups') {
    // Check Villageois series
    if (mainCamp === 'Villageois') {
      if (playerStats.lastCamp === 'Villageois') {
        playerStats.currentVillageoisSeries++;
      } else {
        playerStats.currentVillageoisSeries = 1;
        playerStats.villageoisSeriesStart = { game: gameIdNum, date };
      }
      
      // Update longest if current is longer
      if (!playerStats.longestVillageoisSeries || 
          playerStats.currentVillageoisSeries > playerStats.longestVillageoisSeries.seriesLength) {
        playerStats.longestVillageoisSeries = {
          player,
          camp: 'Villageois',
          seriesLength: playerStats.currentVillageoisSeries,
          startGame: playerStats.villageoisSeriesStart?.game || gameIdNum,
          endGame: gameIdNum,
          startDate: playerStats.villageoisSeriesStart?.date || date,
          endDate: date
        };
      }
      
      // Reset Loups series
      playerStats.currentLoupsSeries = 0;
      playerStats.loupsSeriesStart = null;
    }
    
    // Check Loups series
    if (mainCamp === 'Loups') {
      if (playerStats.lastCamp === 'Loups') {
        playerStats.currentLoupsSeries++;
      } else {
        playerStats.currentLoupsSeries = 1;
        playerStats.loupsSeriesStart = { game: gameIdNum, date };
      }
      
      // Update longest if current is longer
      if (!playerStats.longestLoupsSeries || 
          playerStats.currentLoupsSeries > playerStats.longestLoupsSeries.seriesLength) {
        playerStats.longestLoupsSeries = {
          player,
          camp: 'Loups',
          seriesLength: playerStats.currentLoupsSeries,
          startGame: playerStats.loupsSeriesStart?.game || gameIdNum,
          endGame: gameIdNum,
          startDate: playerStats.loupsSeriesStart?.date || date,
          endDate: date
        };
      }
      
      // Reset Villageois series
      playerStats.currentVillageoisSeries = 0;
      playerStats.villageoisSeriesStart = null;
    }
    
    playerStats.lastCamp = mainCamp;
  } else {
    // Playing as special role breaks both camp series
    playerStats.currentVillageoisSeries = 0;
    playerStats.currentLoupsSeries = 0;
    playerStats.villageoisSeriesStart = null;
    playerStats.loupsSeriesStart = null;
    playerStats.lastCamp = 'Autres';
  }
}

/**
 * Process win series for a player
 */
function processWinSeries(
  playerStats: PlayerSeriesState,
  player: string,
  playerWon: boolean,
  actualCamp: string,
  gameIdNum: number,
  date: string
): void {
  if (playerWon) {
    if (playerStats.lastWon) {
      playerStats.currentWinSeries++;
      playerStats.currentWinCamps.push(actualCamp);
    } else {
      playerStats.currentWinSeries = 1;
      playerStats.currentWinCamps = [actualCamp];
      playerStats.winSeriesStart = { game: gameIdNum, date };
    }
    
    // Update longest win series if current is longer
    if (!playerStats.longestWinSeries || 
        playerStats.currentWinSeries > playerStats.longestWinSeries.seriesLength) {
      
      // Calculate camp counts from the current win camps array
      const campCounts: Record<string, number> = {};
      playerStats.currentWinCamps.forEach(camp => {
        campCounts[camp] = (campCounts[camp] || 0) + 1;
      });
      
      playerStats.longestWinSeries = {
        player,
        seriesLength: playerStats.currentWinSeries,
        startGame: playerStats.winSeriesStart?.game || gameIdNum,
        endGame: gameIdNum,
        startDate: playerStats.winSeriesStart?.date || date,
        endDate: date,
        campCounts: campCounts
      };
    }
    
    playerStats.lastWon = true;
  } else {
    // Losing breaks the win series
    playerStats.currentWinSeries = 0;
    playerStats.currentWinCamps = [];
    playerStats.winSeriesStart = null;
    playerStats.lastWon = false;
  }
}

/**
 * Collect and sort series results
 */
function collectSeriesResults(playerCampSeries: Record<string, PlayerSeriesState>): {
  longestVillageoisSeries: CampSeries[];
  longestLoupsSeries: CampSeries[];
  longestWinSeries: WinSeries[];
} {
  const longestVillageoisSeries: CampSeries[] = [];
  const longestLoupsSeries: CampSeries[] = [];
  const longestWinSeries: WinSeries[] = [];

  Object.values(playerCampSeries).forEach(stats => {
    if (stats.longestVillageoisSeries) {
      longestVillageoisSeries.push(stats.longestVillageoisSeries);
    }
    if (stats.longestLoupsSeries) {
      longestLoupsSeries.push(stats.longestLoupsSeries);
    }
    if (stats.longestWinSeries) {
      longestWinSeries.push(stats.longestWinSeries);
    }
  });

  // Sort by series length (descending)
  longestVillageoisSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  longestLoupsSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  longestWinSeries.sort((a, b) => b.seriesLength - a.seriesLength);

  return {
    longestVillageoisSeries: longestVillageoisSeries.slice(0, 10), // Top 10
    longestLoupsSeries: longestLoupsSeries.slice(0, 10), // Top 10
    longestWinSeries: longestWinSeries.slice(0, 10) // Top 10
  };
}

/**
 * Calculate statistics for all players based on their actual series data
 */
function calculatePlayerStatistics(
  playerCampSeries: Record<string, PlayerSeriesState>,
  totalPlayers: number
): {
  averageVillageoisSeries: number;
  averageLoupsSeries: number;
  averageWinSeries: number;
  eliteVillageoisCount: number;
  eliteLoupsCount: number;
  eliteWinCount: number;
} {
  // Collect ALL players' best series lengths (including 0 for those who never had a series)
  const allVillageoisSeries: number[] = [];
  const allLoupsSeries: number[] = [];
  const allWinSeries: number[] = [];
  
  Object.values(playerCampSeries).forEach(stats => {
    // For averages, include the best series length for each player (0 if they never had one)
    allVillageoisSeries.push(stats.longestVillageoisSeries?.seriesLength || 0);
    allLoupsSeries.push(stats.longestLoupsSeries?.seriesLength || 0);
    allWinSeries.push(stats.longestWinSeries?.seriesLength || 0);
  });

  // Calculate averages based on ALL players
  const averageVillageoisSeries = totalPlayers > 0 
    ? allVillageoisSeries.reduce((sum, length) => sum + length, 0) / totalPlayers
    : 0;
  
  const averageLoupsSeries = totalPlayers > 0 
    ? allLoupsSeries.reduce((sum, length) => sum + length, 0) / totalPlayers
    : 0;
  
  const averageWinSeries = totalPlayers > 0 
    ? allWinSeries.reduce((sum, length) => sum + length, 0) / totalPlayers
    : 0;

  // Count elite players (with thresholds: Villageois 5+, Loups 3+, Wins 5+)
  const eliteVillageoisCount = allVillageoisSeries.filter(length => length >= 5).length;
  const eliteLoupsCount = allLoupsSeries.filter(length => length >= 3).length;
  const eliteWinCount = allWinSeries.filter(length => length >= 5).length;

  return {
    averageVillageoisSeries: Math.round(averageVillageoisSeries * 10) / 10, // Round to 1 decimal
    averageLoupsSeries: Math.round(averageLoupsSeries * 10) / 10,
    averageWinSeries: Math.round(averageWinSeries * 10) / 10,
    eliteVillageoisCount,
    eliteLoupsCount,
    eliteWinCount
  };
}

/**
 * Compute player series statistics from raw data
 */
export function computePlayerSeries(
  gameData: RawGameData[],
  roleData: RawRoleData[]
): PlayerSeriesData | null {
  if (gameData.length === 0 || roleData.length === 0) {
    return null;
  }

  // Build game-player-camp mapping from role data
  const gamePlayerCampMap = buildGamePlayerCampMap(roleData);

  // Sort games by game ID to ensure chronological order
  const sortedGames = [...gameData].sort((a, b) => (a.Game || 0) - (b.Game || 0));

  // Get all unique players
  const allPlayers = getAllPlayers(sortedGames);

  // Initialize tracking for all players
  const playerCampSeries = initializePlayerSeries(allPlayers);

  // Process each game chronologically
  sortedGames.forEach(gameRow => {
    const gameId = gameRow["Game"]?.toString();
    const playerList = gameRow["Liste des joueurs"];
    const winnerList = gameRow["Liste des gagnants"];
    const date = gameRow["Date"]?.toString() || "";

    if (!gameId || !playerList) return;

    const players = splitAndTrim(playerList.toString());
    const gameIdNum = parseInt(gameId);

    players.forEach(playerName => {
      const player = playerName.trim();
      if (!player) return;

      const playerStats = playerCampSeries[player];
      const mainCamp = getPlayerMainCamp(gamePlayerCampMap, gameId, player);
      const playerWon = didPlayerWin(player, winnerList?.toString());
      const actualCamp = (gamePlayerCampMap[gameId] && gamePlayerCampMap[gameId][player]) || "Villageois";

      // Process camp series
      processCampSeries(playerStats, player, mainCamp, gameIdNum, date);

      // Process win series
      processWinSeries(playerStats, player, playerWon, actualCamp, gameIdNum, date);
    });
  });

  // Collect and sort results
  const { longestVillageoisSeries, longestLoupsSeries, longestWinSeries } = collectSeriesResults(playerCampSeries);

  // Calculate statistics based on ALL players' series data
  const statistics = calculatePlayerStatistics(
    playerCampSeries,
    allPlayers.size
  );

  return {
    longestVillageoisSeries,
    longestLoupsSeries,
    longestWinSeries,
    totalGamesAnalyzed: sortedGames.length,
    totalPlayersCount: allPlayers.size,
    ...statistics
  };
}
