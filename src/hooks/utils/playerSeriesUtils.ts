import { getPlayerMainCampFromRole } from '../../utils/datasyncExport';
import type { GameLogEntry } from '../useCombinedRawData';


export interface CampSeries {
  player: string;
  camp: 'Villageois' | 'Loups' | 'Sans Loups';
  seriesLength: number;
  startGame: string;    // Global chronological game number (e.g., "123")
  endGame: string;      // Global chronological game number (e.g., "127")
  startDate: string;
  endDate: string;
  isOngoing: boolean; // True if the series is still active (player hasn't played since)
  gameIds: string[]; // List of global chronological game numbers (e.g., ["123", "124", "125"])
}

export interface WinSeries {
  player: string;
  seriesLength: number;
  startGame: string;    // Global chronological game number (e.g., "123")
  endGame: string;      // Global chronological game number (e.g., "127")
  startDate: string;
  endDate: string;
  campCounts: Record<string, number>; // Count of times each camp was played
  isOngoing: boolean; // True if the series is still active (player hasn't played since)
  gameIds: string[]; // List of global chronological game numbers (e.g., ["123", "124", "125"])
}

export interface LossSeries {
  player: string;
  seriesLength: number;
  startGame: string;    // Global chronological game number (e.g., "123")
  endGame: string;      // Global chronological game number (e.g., "127")
  startDate: string;
  endDate: string;
  campCounts: Record<string, number>; // Count of times each camp was played
  isOngoing: boolean; // True if the series is still active (player hasn't played since)
  gameIds: string[]; // List of global chronological game numbers (e.g., ["123", "124", "125"])
}

export interface PlayerSeriesData {
  // Full datasets for all players with series data
  allVillageoisSeries: CampSeries[];
  allLoupsSeries: CampSeries[];
  allNoWolfSeries: CampSeries[];
  allWinSeries: WinSeries[];
  allLossSeries: LossSeries[];
  totalGamesAnalyzed: number;
  // Statistics for all players
  averageVillageoisSeries: number;
  averageLoupsSeries: number;
  averageNoWolfSeries: number;
  averageWinSeries: number;
  averageLossSeries: number;
  eliteVillageoisCount: number; // Players with 5+ Villageois series
  eliteLoupsCount: number; // Players with 3+ Loups series
  eliteNoWolfCount: number; // Players with 5+ NoWolf series
  eliteWinCount: number; // Players with 5+ win series
  eliteLossCount: number; // Players with 5+ loss series
  totalPlayersCount: number;
  // Active series counts (all players currently on a streak, not just top 20)
  activeVillageoisCount: number; // Players currently on a Villageois streak
  activeLoupsCount: number; // Players currently on a Loups streak
  activeNoWolfCount: number; // Players currently on a NoWolf streak
  activeWinCount: number; // Players currently on a win streak
  activeLossCount: number; // Players currently on a loss streak
  // Record ongoing counts (players currently in their personal best streak)
  ongoingVillageoisCount: number;
  ongoingLoupsCount: number;
  ongoingNoWolfCount: number;
  ongoingWinCount: number;
  ongoingLossCount: number;
}

interface PlayerSeriesState {
  currentVillageoisSeries: number;
  currentLoupsSeries: number;
  currentNoWolfSeries: number;
  longestVillageoisSeries: CampSeries | null;
  longestLoupsSeries: CampSeries | null;
  longestNoWolfSeries: CampSeries | null;
  currentWinSeries: number;
  longestWinSeries: WinSeries | null;
  currentWinCamps: string[];
  currentLossSeries: number;
  longestLossSeries: LossSeries | null;
  currentLossCamps: string[];
  lastCamp: 'Villageois' | 'Loup' | 'Autres' | null;
  lastWon: boolean;
  villageoisSeriesStart: { game: string; date: string } | null;    // Changed to string
  loupsSeriesStart: { game: string; date: string } | null;          // Changed to string
  noWolfSeriesStart: { game: string; date: string } | null;         // New NoWolf series start
  winSeriesStart: { game: string; date: string } | null;            // Changed to string
  lossSeriesStart: { game: string; date: string } | null;           // Changed to string
  // Track game IDs for current series - now DisplayedIds
  currentVillageoisGameIds: string[];
  currentLoupsGameIds: string[];
  currentNoWolfGameIds: string[];
  currentWinGameIds: string[];
  currentLossGameIds: string[];
}

/**
 * Get all unique players from game data
 */
function getAllPlayers(gameData: GameLogEntry[]): Set<string> {
  const allPlayers = new Set<string>();
  
  gameData.forEach(game => {
    game.PlayerStats.forEach(playerStat => {
      allPlayers.add(playerStat.Username.trim());
    });
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
      currentNoWolfSeries: 0,
      longestVillageoisSeries: null,
      longestLoupsSeries: null,
      longestNoWolfSeries: null,
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
      noWolfSeriesStart: null,
      winSeriesStart: null,
      lossSeriesStart: null,
      currentVillageoisGameIds: [],
      currentLoupsGameIds: [],
      currentNoWolfGameIds: [],
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
  mainCamp: 'Villageois' | 'Loup' | 'Autres',
  gameDisplayedId: string,
  date: string
): void {
  if (mainCamp === 'Villageois' || mainCamp === 'Loup') {
    // Check Villageois series
    if (mainCamp === 'Villageois') {
      if (playerStats.lastCamp === 'Villageois') {
        playerStats.currentVillageoisSeries++;
        playerStats.currentVillageoisGameIds.push(gameDisplayedId);
      } else {
        playerStats.currentVillageoisSeries = 1;
        playerStats.villageoisSeriesStart = { game: gameDisplayedId, date };
        playerStats.currentVillageoisGameIds = [gameDisplayedId];
      }
      
      // Update longest if current is longer or equal (keep most recent in case of ties)
      if (!playerStats.longestVillageoisSeries || 
          playerStats.currentVillageoisSeries >= playerStats.longestVillageoisSeries.seriesLength) {
        playerStats.longestVillageoisSeries = {
          player,
          camp: 'Villageois',
          seriesLength: playerStats.currentVillageoisSeries,
          startGame: playerStats.villageoisSeriesStart?.game || gameDisplayedId,
          endGame: gameDisplayedId,
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
    if (mainCamp === 'Loup') {
      if (playerStats.lastCamp === 'Loup') {
        playerStats.currentLoupsSeries++;
        playerStats.currentLoupsGameIds.push(gameDisplayedId);
      } else {
        playerStats.currentLoupsSeries = 1;
        playerStats.loupsSeriesStart = { game: gameDisplayedId, date };
        playerStats.currentLoupsGameIds = [gameDisplayedId];
      }
      
      // Update longest if current is longer or equal (keep most recent in case of ties)
      if (!playerStats.longestLoupsSeries || 
          playerStats.currentLoupsSeries >= playerStats.longestLoupsSeries.seriesLength) {
        playerStats.longestLoupsSeries = {
          player,
          camp: 'Loups',
          seriesLength: playerStats.currentLoupsSeries,
          startGame: playerStats.loupsSeriesStart?.game || gameDisplayedId,
          endGame: gameDisplayedId,
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
      
      // Reset NoWolf series (playing as Loup breaks NoWolf streak)
      playerStats.currentNoWolfSeries = 0;
      playerStats.noWolfSeriesStart = null;
      playerStats.currentNoWolfGameIds = [];
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

  // Process NoWolf series (any camp that is NOT 'Loup')
  if (mainCamp !== 'Loup') {
    // Continue or start NoWolf series
    if (playerStats.currentNoWolfSeries > 0) {
      playerStats.currentNoWolfSeries++;
      playerStats.currentNoWolfGameIds.push(gameDisplayedId);
    } else {
      playerStats.currentNoWolfSeries = 1;
      playerStats.noWolfSeriesStart = { game: gameDisplayedId, date };
      playerStats.currentNoWolfGameIds = [gameDisplayedId];
    }
    
    // Update longest if current is longer or equal (keep most recent in case of ties)
    if (!playerStats.longestNoWolfSeries || 
        playerStats.currentNoWolfSeries >= playerStats.longestNoWolfSeries.seriesLength) {
      playerStats.longestNoWolfSeries = {
        player,
        camp: 'Sans Loups', // Display name for NoWolf series
        seriesLength: playerStats.currentNoWolfSeries,
        startGame: playerStats.noWolfSeriesStart?.game || gameDisplayedId,
        endGame: gameDisplayedId,
        startDate: playerStats.noWolfSeriesStart?.date || date,
        endDate: date,
        isOngoing: false, // Will be updated at the end
        gameIds: [...playerStats.currentNoWolfGameIds]
      };
    }
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
  gameDisplayedId: string,
  date: string
): void {
  if (playerWon) {
    if (playerStats.lastWon) {
      playerStats.currentWinSeries++;
      playerStats.currentWinCamps.push(actualCamp);
      playerStats.currentWinGameIds.push(gameDisplayedId);
    } else {
      playerStats.currentWinSeries = 1;
      playerStats.currentWinCamps = [actualCamp];
      playerStats.winSeriesStart = { game: gameDisplayedId, date };
      playerStats.currentWinGameIds = [gameDisplayedId];
    }
    
    // Update longest win series if current is longer or equal (keep most recent in case of ties)
    if (!playerStats.longestWinSeries || 
        playerStats.currentWinSeries >= playerStats.longestWinSeries.seriesLength) {
      
      // Calculate camp counts from the current win camps array
      const campCounts: Record<string, number> = {};
      playerStats.currentWinCamps.forEach(camp => {
        campCounts[camp] = (campCounts[camp] || 0) + 1;
      });
      
      playerStats.longestWinSeries = {
        player,
        seriesLength: playerStats.currentWinSeries,
        startGame: playerStats.winSeriesStart?.game || gameDisplayedId,
        endGame: gameDisplayedId,
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
  gameDisplayedId: string,
  date: string
): void {
  if (!playerWon) {
    // Player lost this game
    if (playerStats.currentLossSeries > 0) {
      // Continue existing loss series
      playerStats.currentLossSeries++;
      playerStats.currentLossCamps.push(actualCamp);
      playerStats.currentLossGameIds.push(gameDisplayedId);
    } else {
      // Start new loss series
      playerStats.currentLossSeries = 1;
      playerStats.currentLossCamps = [actualCamp];
      playerStats.lossSeriesStart = { game: gameDisplayedId, date };
      playerStats.currentLossGameIds = [gameDisplayedId];
    }
    
    // Update longest loss series if current is longer or equal (keep most recent in case of ties)
    if (!playerStats.longestLossSeries || 
        playerStats.currentLossSeries >= playerStats.longestLossSeries.seriesLength) {
      
      // Calculate camp counts from the current loss camps array
      const campCounts: Record<string, number> = {};
      playerStats.currentLossCamps.forEach(camp => {
        campCounts[camp] = (campCounts[camp] || 0) + 1;
      });
      
      playerStats.longestLossSeries = {
        player,
        seriesLength: playerStats.currentLossSeries,
        startGame: playerStats.lossSeriesStart?.game || gameDisplayedId,
        endGame: gameDisplayedId,
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
  allVillageoisSeries: CampSeries[];
  allLoupsSeries: CampSeries[];
  allNoWolfSeries: CampSeries[];
  allWinSeries: WinSeries[];
  allLossSeries: LossSeries[];
} {
  const allVillageoisSeries: CampSeries[] = [];
  const allLoupsSeries: CampSeries[] = [];
  const allNoWolfSeries: CampSeries[] = [];
  const allWinSeries: WinSeries[] = [];
  const allLossSeries: LossSeries[] = [];

  Object.values(playerCampSeries).forEach(stats => {
    if (stats.longestVillageoisSeries) {
      allVillageoisSeries.push(stats.longestVillageoisSeries);
    }
    if (stats.longestLoupsSeries) {
      allLoupsSeries.push(stats.longestLoupsSeries);
    }
    if (stats.longestNoWolfSeries) {
      allNoWolfSeries.push(stats.longestNoWolfSeries);
    }
    if (stats.longestWinSeries) {
      allWinSeries.push(stats.longestWinSeries);
    }
    if (stats.longestLossSeries) {
      allLossSeries.push(stats.longestLossSeries);
    }
  });

  // Sort by series length (descending) - no slicing here
  allVillageoisSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  allLoupsSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  allNoWolfSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  allWinSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  allLossSeries.sort((a, b) => b.seriesLength - a.seriesLength);

  return {
    allVillageoisSeries,
    allLoupsSeries,
    allNoWolfSeries,
    allWinSeries,
    allLossSeries
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
  averageNoWolfSeries: number;
  averageWinSeries: number;
  averageLossSeries: number;
  eliteVillageoisCount: number;
  eliteLoupsCount: number;
  eliteNoWolfCount: number;
  eliteWinCount: number;
  eliteLossCount: number;
} {
  // Collect ALL players' best series lengths (including 0 for those who never had a series)
  const allVillageoisSeries: number[] = [];
  const allLoupsSeries: number[] = [];
  const allNoWolfSeries: number[] = [];
  const allWinSeries: number[] = [];
  const allLossSeries: number[] = [];
  
  Object.values(playerCampSeries).forEach(stats => {
    // For averages, include the best series length for each player (0 if they never had one)
    allVillageoisSeries.push(stats.longestVillageoisSeries?.seriesLength || 0);
    allLoupsSeries.push(stats.longestLoupsSeries?.seriesLength || 0);
    allNoWolfSeries.push(stats.longestNoWolfSeries?.seriesLength || 0);
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
  
  const averageNoWolfSeries = totalPlayers > 0 
    ? allNoWolfSeries.reduce((sum, length) => sum + length, 0) / totalPlayers
    : 0;
  
  const averageWinSeries = totalPlayers > 0 
    ? allWinSeries.reduce((sum, length) => sum + length, 0) / totalPlayers
    : 0;
    
  const averageLossSeries = totalPlayers > 0 
    ? allLossSeries.reduce((sum, length) => sum + length, 0) / totalPlayers
    : 0;

  // Count elite players (with thresholds: Villageois 5+, Loups 3+, NoWolf 5+, Wins 5+, Losses 5+)
  const eliteVillageoisCount = allVillageoisSeries.filter(length => length >= 5).length;
  const eliteLoupsCount = allLoupsSeries.filter(length => length >= 3).length;
  const eliteNoWolfCount = allNoWolfSeries.filter(length => length >= 5).length;
  const eliteWinCount = allWinSeries.filter(length => length >= 5).length;
  const eliteLossCount = allLossSeries.filter(length => length >= 5).length;

  return {
    averageVillageoisSeries: Math.round(averageVillageoisSeries * 10) / 10, // Round to 1 decimal
    averageLoupsSeries: Math.round(averageLoupsSeries * 10) / 10,
    averageNoWolfSeries: Math.round(averageNoWolfSeries * 10) / 10,
    averageWinSeries: Math.round(averageWinSeries * 10) / 10,
    averageLossSeries: Math.round(averageLossSeries * 10) / 10,
    eliteVillageoisCount,
    eliteLoupsCount,
    eliteNoWolfCount,
    eliteWinCount,
    eliteLossCount
  };
}

/**
 * Compute player series statistics from raw data
 */
export function computePlayerSeries(
  gameData: GameLogEntry[]
): PlayerSeriesData | null {
  if (gameData.length === 0) {
    return null;
  }

  // Build game-player-camp mapping from role data
  // No longer needed - we get this directly from PlayerStats

  // Sort games by ID to ensure chronological order
  const sortedGames = [...gameData].sort((a, b) => parseInt(a.DisplayedId) - parseInt(b.DisplayedId));

  // Get all unique players
  const allPlayers = getAllPlayers(sortedGames);

  // Initialize tracking for all players
  const playerCampSeries = initializePlayerSeries(allPlayers);

  // Process each game chronologically
  sortedGames.forEach(game => {
    const gameDisplayedId = game.DisplayedId;  // Use DisplayedId instead of numeric ID
    const date = new Date(game.StartDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });

    game.PlayerStats.forEach(playerStat => {
      const player = playerStat.Username.trim();
      if (!player) return;

      const playerStats = playerCampSeries[player];
      const mainCamp = getPlayerMainCampFromRole(playerStat.MainRoleFinal);
      const playerWon = playerStat.Victorious;

      // Process camp series 
      processCampSeries(playerStats, player, mainCamp, gameDisplayedId, date);

      // Process win series 
      processWinSeries(playerStats, player, playerWon, mainCamp, gameDisplayedId, date);
      
      // Process loss series 
      processLossSeries(playerStats, player, playerWon, mainCamp, gameDisplayedId, date);
    });
  });

  // Collect and sort results
  const { 
    allVillageoisSeries,
    allLoupsSeries,
    allNoWolfSeries,
    allWinSeries,
    allLossSeries
  } = collectSeriesResults(playerCampSeries);

  // Mark ongoing series - a series is ongoing if:
  // 1. The current series length equals the longest series length
  // 2. The current series length is greater than 0 (player is currently on that type of streak)
  // 3. This indicates the player is currently in their record-tying or record-breaking streak
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

    // Check NoWolf series
    if (stats.longestNoWolfSeries && 
        stats.currentNoWolfSeries === stats.longestNoWolfSeries.seriesLength &&
        stats.currentNoWolfSeries > 0) {
      stats.longestNoWolfSeries.isOngoing = true;
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
  let activeNoWolfCount = 0;       // Players currently on a NoWolf streak
  let activeWinCount = 0;          // Players currently on a win streak
  let activeLossCount = 0;         // Players currently on a loss streak
  let ongoingVillageoisCount = 0;  // Players currently in their personal best Villageois streak
  let ongoingLoupsCount = 0;       // Players currently in their personal best Loups streak
  let ongoingNoWolfCount = 0;      // Players currently in their personal best NoWolf streak
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
    if (stats.currentNoWolfSeries > 0) {
      activeNoWolfCount++;
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
    if (stats.longestNoWolfSeries?.isOngoing) {
      ongoingNoWolfCount++;
    }
    if (stats.longestWinSeries?.isOngoing) {
      ongoingWinCount++;
    }
    if (stats.longestLossSeries?.isOngoing) {
      ongoingLossCount++;
    }
  });

  return {
    allVillageoisSeries,
    allLoupsSeries,
    allNoWolfSeries,
    allWinSeries,
    allLossSeries,
    totalGamesAnalyzed: sortedGames.length,
    totalPlayersCount: allPlayers.size,
    activeVillageoisCount,
    activeLoupsCount,
    activeNoWolfCount,
    activeWinCount,
    activeLossCount,
    ongoingVillageoisCount,
    ongoingLoupsCount,
    ongoingNoWolfCount,
    ongoingWinCount,
    ongoingLossCount,
    ...statistics
  };
}
