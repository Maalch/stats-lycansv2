import type { GameLogEntry, RawRoleData } from '../useCombinedRawData';
import { splitAndTrim, didPlayerWin, buildGamePlayerCampMap, getPlayerMainCamp } from './dataUtils';

export interface CampSeries {
  player: string;
  camp: 'Villageois' | 'Loups';
  seriesLength: number;
  startGame: number;
  endGame: number;
  startDate: string;
  endDate: string;
  isOngoing: boolean; // True if the series is still active (player hasn't played since)
  gameIds: number[]; // List of game IDs that comprise this series
}

export interface WinSeries {
  player: string;
  seriesLength: number;
  startGame: number;
  endGame: number;
  startDate: string;
  endDate: string;
  campCounts: Record<string, number>; // Count of times each camp was played
  isOngoing: boolean; // True if the series is still active (player hasn't played since)
  gameIds: number[]; // List of game IDs that comprise this series
}

export interface LossSeries {
  player: string;
  seriesLength: number;
  startGame: number;
  endGame: number;
  startDate: string;
  endDate: string;
  campCounts: Record<string, number>; // Count of times each camp was played
  isOngoing: boolean; // True if the series is still active (player hasn't played since)
  gameIds: number[]; // List of game IDs that comprise this series
}

export interface PlayerSeriesData {
  longestVillageoisSeries: CampSeries[];
  longestLoupsSeries: CampSeries[];
  longestWinSeries: WinSeries[];
  longestLossSeries: LossSeries[];
  totalGamesAnalyzed: number;
  // Statistics for all players
  averageVillageoisSeries: number;
  averageLoupsSeries: number;
  averageWinSeries: number;
  averageLossSeries: number;
  eliteVillageoisCount: number; // Players with 5+ Villageois series
  eliteLoupsCount: number; // Players with 3+ Loups series
  eliteWinCount: number; // Players with 5+ win series
  eliteLossCount: number; // Players with 5+ loss series
  totalPlayersCount: number;
  // Active series counts (all players currently on a streak, not just top 20)
  activeVillageoisCount: number; // Players currently on a Villageois streak
  activeLoupsCount: number; // Players currently on a Loups streak
  activeWinCount: number; // Players currently on a win streak
  activeLossCount: number; // Players currently on a loss streak
  // Record ongoing counts (players currently in their personal best streak)
  ongoingVillageoisCount: number;
  ongoingLoupsCount: number;
  ongoingWinCount: number;
  ongoingLossCount: number;
}

interface PlayerSeriesState {
  currentVillageoisSeries: number;
  currentLoupsSeries: number;
  longestVillageoisSeries: CampSeries | null;
  longestLoupsSeries: CampSeries | null;
  currentWinSeries: number;
  longestWinSeries: WinSeries | null;
  currentWinCamps: string[];
  currentLossSeries: number;
  longestLossSeries: LossSeries | null;
  currentLossCamps: string[];
  lastCamp: 'Villageois' | 'Loups' | 'Autres' | null;
  lastWon: boolean;
  villageoisSeriesStart: { game: number; date: string } | null;
  loupsSeriesStart: { game: number; date: string } | null;
  winSeriesStart: { game: number; date: string } | null;
  lossSeriesStart: { game: number; date: string } | null;
  // Track game IDs for current series
  currentVillageoisGameIds: number[];
  currentLoupsGameIds: number[];
  currentWinGameIds: number[];
  currentLossGameIds: number[];
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
      currentLossSeries: 0,
      longestLossSeries: null,
      currentLossCamps: [],
      lastCamp: null,
      lastWon: false,
      villageoisSeriesStart: null,
      loupsSeriesStart: null,
      winSeriesStart: null,
      lossSeriesStart: null,
      currentVillageoisGameIds: [],
      currentLoupsGameIds: [],
      currentWinGameIds: [],
      currentLossGameIds: []
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
        playerStats.currentVillageoisGameIds.push(gameIdNum);
      } else {
        playerStats.currentVillageoisSeries = 1;
        playerStats.villageoisSeriesStart = { game: gameIdNum, date };
        playerStats.currentVillageoisGameIds = [gameIdNum];
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
          endDate: date,
          isOngoing: false, // Will be updated at the end
          gameIds: [...playerStats.currentVillageoisGameIds]
        };
      }
      
      // Reset Loups series
      playerStats.currentLoupsSeries = 0;
      playerStats.loupsSeriesStart = null;
      playerStats.currentLoupsGameIds = [];
    }
    
    // Check Loups series
    if (mainCamp === 'Loups') {
      if (playerStats.lastCamp === 'Loups') {
        playerStats.currentLoupsSeries++;
        playerStats.currentLoupsGameIds.push(gameIdNum);
      } else {
        playerStats.currentLoupsSeries = 1;
        playerStats.loupsSeriesStart = { game: gameIdNum, date };
        playerStats.currentLoupsGameIds = [gameIdNum];
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
          endDate: date,
          isOngoing: false, // Will be updated at the end
          gameIds: [...playerStats.currentLoupsGameIds]
        };
      }
      
      // Reset Villageois series
      playerStats.currentVillageoisSeries = 0;
      playerStats.villageoisSeriesStart = null;
      playerStats.currentVillageoisGameIds = [];
    }
    
    playerStats.lastCamp = mainCamp;
  } else {
    // Playing as special role breaks both camp series
    playerStats.currentVillageoisSeries = 0;
    playerStats.currentLoupsSeries = 0;
    playerStats.villageoisSeriesStart = null;
    playerStats.loupsSeriesStart = null;
    playerStats.currentVillageoisGameIds = [];
    playerStats.currentLoupsGameIds = [];
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
      playerStats.currentWinGameIds.push(gameIdNum);
    } else {
      playerStats.currentWinSeries = 1;
      playerStats.currentWinCamps = [actualCamp];
      playerStats.winSeriesStart = { game: gameIdNum, date };
      playerStats.currentWinGameIds = [gameIdNum];
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
        campCounts: campCounts,
        isOngoing: false, // Will be updated at the end
        gameIds: [...playerStats.currentWinGameIds]
      };
    }
    
    playerStats.lastWon = true;
  } else {
    // Losing breaks the win series
    playerStats.currentWinSeries = 0;
    playerStats.currentWinCamps = [];
    playerStats.winSeriesStart = null;
    playerStats.currentWinGameIds = [];
    playerStats.lastWon = false;
  }
}

/**
 * Process loss series for a player
 */
function processLossSeries(
  playerStats: PlayerSeriesState,
  player: string,
  playerWon: boolean,
  actualCamp: string,
  gameIdNum: number,
  date: string
): void {
  if (!playerWon) {
    // Player lost this game
    if (playerStats.currentLossSeries > 0) {
      // Continue existing loss series
      playerStats.currentLossSeries++;
      playerStats.currentLossCamps.push(actualCamp);
      playerStats.currentLossGameIds.push(gameIdNum);
    } else {
      // Start new loss series
      playerStats.currentLossSeries = 1;
      playerStats.currentLossCamps = [actualCamp];
      playerStats.lossSeriesStart = { game: gameIdNum, date };
      playerStats.currentLossGameIds = [gameIdNum];
    }
    
    // Update longest loss series if current is longer
    if (!playerStats.longestLossSeries || 
        playerStats.currentLossSeries > playerStats.longestLossSeries.seriesLength) {
      
      // Calculate camp counts from the current loss camps array
      const campCounts: Record<string, number> = {};
      playerStats.currentLossCamps.forEach(camp => {
        campCounts[camp] = (campCounts[camp] || 0) + 1;
      });
      
      playerStats.longestLossSeries = {
        player,
        seriesLength: playerStats.currentLossSeries,
        startGame: playerStats.lossSeriesStart?.game || gameIdNum,
        endGame: gameIdNum,
        startDate: playerStats.lossSeriesStart?.date || date,
        endDate: date,
        campCounts: campCounts,
        isOngoing: false, // Will be updated at the end
        gameIds: [...playerStats.currentLossGameIds]
      };
    }
  } else {
    // Winning breaks the loss series
    playerStats.currentLossSeries = 0;
    playerStats.currentLossCamps = [];
    playerStats.lossSeriesStart = null;
    playerStats.currentLossGameIds = [];
  }
}

/**
 * Collect and sort series results
 */
function collectSeriesResults(playerCampSeries: Record<string, PlayerSeriesState>): {
  longestVillageoisSeries: CampSeries[];
  longestLoupsSeries: CampSeries[];
  longestWinSeries: WinSeries[];
  longestLossSeries: LossSeries[];
} {
  const longestVillageoisSeries: CampSeries[] = [];
  const longestLoupsSeries: CampSeries[] = [];
  const longestWinSeries: WinSeries[] = [];
  const longestLossSeries: LossSeries[] = [];

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
    if (stats.longestLossSeries) {
      longestLossSeries.push(stats.longestLossSeries);
    }
  });

  // Sort by series length (descending)
  longestVillageoisSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  longestLoupsSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  longestWinSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  longestLossSeries.sort((a, b) => b.seriesLength - a.seriesLength);

  return {
    longestVillageoisSeries: longestVillageoisSeries.slice(0, 20), // Top 20
    longestLoupsSeries: longestLoupsSeries.slice(0, 20), // Top 20
    longestWinSeries: longestWinSeries.slice(0, 20), // Top 20
    longestLossSeries: longestLossSeries.slice(0, 20) // Top 20
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
  averageLossSeries: number;
  eliteVillageoisCount: number;
  eliteLoupsCount: number;
  eliteWinCount: number;
  eliteLossCount: number;
} {
  // Collect ALL players' best series lengths (including 0 for those who never had a series)
  const allVillageoisSeries: number[] = [];
  const allLoupsSeries: number[] = [];
  const allWinSeries: number[] = [];
  const allLossSeries: number[] = [];
  
  Object.values(playerCampSeries).forEach(stats => {
    // For averages, include the best series length for each player (0 if they never had one)
    allVillageoisSeries.push(stats.longestVillageoisSeries?.seriesLength || 0);
    allLoupsSeries.push(stats.longestLoupsSeries?.seriesLength || 0);
    allWinSeries.push(stats.longestWinSeries?.seriesLength || 0);
    allLossSeries.push(stats.longestLossSeries?.seriesLength || 0);
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
    
  const averageLossSeries = totalPlayers > 0 
    ? allLossSeries.reduce((sum, length) => sum + length, 0) / totalPlayers
    : 0;

  // Count elite players (with thresholds: Villageois 5+, Loups 3+, Wins 5+, Losses 5+)
  const eliteVillageoisCount = allVillageoisSeries.filter(length => length >= 5).length;
  const eliteLoupsCount = allLoupsSeries.filter(length => length >= 3).length;
  const eliteWinCount = allWinSeries.filter(length => length >= 5).length;
  const eliteLossCount = allLossSeries.filter(length => length >= 5).length;

  return {
    averageVillageoisSeries: Math.round(averageVillageoisSeries * 10) / 10, // Round to 1 decimal
    averageLoupsSeries: Math.round(averageLoupsSeries * 10) / 10,
    averageWinSeries: Math.round(averageWinSeries * 10) / 10,
    averageLossSeries: Math.round(averageLossSeries * 10) / 10,
    eliteVillageoisCount,
    eliteLoupsCount,
    eliteWinCount,
    eliteLossCount
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
      
      // Process loss series
      processLossSeries(playerStats, player, playerWon, actualCamp, gameIdNum, date);
    });
  });

  // Collect and sort results
  const { longestVillageoisSeries, longestLoupsSeries, longestWinSeries, longestLossSeries } = collectSeriesResults(playerCampSeries);

  // Mark ongoing series - a series is ongoing if:
  // 1. The current series length equals the longest series length
  // 2. This indicates the player hasn't played since the series started
  Object.values(playerCampSeries).forEach(stats => {
    // Check Villageois series
    if (stats.longestVillageoisSeries && 
        stats.currentVillageoisSeries === stats.longestVillageoisSeries.seriesLength &&
        stats.currentVillageoisSeries > 0) {
      stats.longestVillageoisSeries.isOngoing = true;
    }

    // Check Loups series
    if (stats.longestLoupsSeries && 
        stats.currentLoupsSeries === stats.longestLoupsSeries.seriesLength &&
        stats.currentLoupsSeries > 0) {
      stats.longestLoupsSeries.isOngoing = true;
    }

    // Check Win series
    if (stats.longestWinSeries && 
        stats.currentWinSeries === stats.longestWinSeries.seriesLength &&
        stats.currentWinSeries > 0) {
      stats.longestWinSeries.isOngoing = true;
    }

    // Check Loss series
    if (stats.longestLossSeries && 
        stats.currentLossSeries === stats.longestLossSeries.seriesLength &&
        stats.currentLossSeries > 0) {
      stats.longestLossSeries.isOngoing = true;
    }
  });

  // Calculate statistics based on ALL players' series data
  const statistics = calculatePlayerStatistics(
    playerCampSeries,
    allPlayers.size
  );

  // Count active and ongoing series from ALL players
  let activeVillageoisCount = 0;   // Players currently on a Villageois streak
  let activeLoupsCount = 0;        // Players currently on a Loups streak  
  let activeWinCount = 0;          // Players currently on a win streak
  let activeLossCount = 0;         // Players currently on a loss streak
  let ongoingVillageoisCount = 0;  // Players currently in their personal best Villageois streak
  let ongoingLoupsCount = 0;       // Players currently in their personal best Loups streak
  let ongoingWinCount = 0;         // Players currently in their personal best win streak
  let ongoingLossCount = 0;        // Players currently in their personal best loss streak

  Object.values(playerCampSeries).forEach(stats => {
    // Count active series (any current streak > 0)
    if (stats.currentVillageoisSeries > 0) {
      activeVillageoisCount++;
    }
    if (stats.currentLoupsSeries > 0) {
      activeLoupsCount++;
    }
    if (stats.currentWinSeries > 0) {
      activeWinCount++;
    }
    if (stats.currentLossSeries > 0) {
      activeLossCount++;
    }

    // Count ongoing record series (current streak equals personal best)
    if (stats.longestVillageoisSeries?.isOngoing) {
      ongoingVillageoisCount++;
    }
    if (stats.longestLoupsSeries?.isOngoing) {
      ongoingLoupsCount++;
    }
    if (stats.longestWinSeries?.isOngoing) {
      ongoingWinCount++;
    }
    if (stats.longestLossSeries?.isOngoing) {
      ongoingLossCount++;
    }
  });

  return {
    longestVillageoisSeries,
    longestLoupsSeries,
    longestWinSeries,
    longestLossSeries,
    totalGamesAnalyzed: sortedGames.length,
    totalPlayersCount: allPlayers.size,
    activeVillageoisCount,
    activeLoupsCount,
    activeWinCount,
    activeLossCount,
    ongoingVillageoisCount,
    ongoingLoupsCount,
    ongoingWinCount,
    ongoingLossCount,
    ...statistics
  };
}
