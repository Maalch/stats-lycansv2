import { getPlayerFinalRole, getPlayerMainCampFromRole } from '../../utils/datasyncExport';
import type { GameLogEntry } from '../useCombinedRawData';
import { getPlayerId } from '../../utils/playerIdentification';
import { formatLycanDate } from './dataUtils';
// Note: Player names are already normalized during data loading, so we can use Username directly


export interface CampSeries {
  player: string;
  camp: 'Villageois' | 'Loups' | 'Sans Loups' | 'Rôles Solos';
  seriesLength: number;
  startGame: string;    // Global chronological game number (e.g., "123")
  endGame: string;      // Global chronological game number (e.g., "127")
  startDate: string;
  endDate: string;
  campCounts?: Record<string, number>; // Count of times each camp was played (optional, mainly for NoWolf series)
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
  allSoloSeries: CampSeries[];
  allWinSeries: WinSeries[];
  allLossSeries: LossSeries[];
  // Current ongoing series for ALL players (not just their best)
  currentVillageoisSeries: CampSeries[];
  currentLoupsSeries: CampSeries[];
  currentNoWolfSeries: CampSeries[];
  currentSoloSeries: CampSeries[];
  currentWinSeries: WinSeries[];
  currentLossSeries: LossSeries[];
  totalGamesAnalyzed: number;
  // Statistics for all players
  averageVillageoisSeries: number;
  averageLoupsSeries: number;
  averageNoWolfSeries: number;
  averageSoloSeries: number;
  averageWinSeries: number;
  averageLossSeries: number;
  eliteVillageoisCount: number; // Players with 5+ Villageois series
  eliteLoupsCount: number; // Players with 3+ Loups series
  eliteNoWolfCount: number; // Players with 5+ NoWolf series
  eliteSoloCount: number; // Players with 3+ Solo series
  eliteWinCount: number; // Players with 5+ win series
  eliteLossCount: number; // Players with 5+ loss series
  totalPlayersCount: number;
  // Active series counts (all players currently on a streak, not just top 20)
  activeVillageoisCount: number; // Players currently on a Villageois streak
  activeLoupsCount: number; // Players currently on a Loups streak
  activeNoWolfCount: number; // Players currently on a NoWolf streak
  activeSoloCount: number; // Players currently on a Solo streak
  activeWinCount: number; // Players currently on a win streak
  activeLossCount: number; // Players currently on a loss streak
  // Record ongoing counts (players currently in their personal best streak)
  ongoingVillageoisCount: number;
  ongoingLoupsCount: number;
  ongoingNoWolfCount: number;
  ongoingSoloCount: number;
  ongoingWinCount: number;
  ongoingLossCount: number;
}

interface PlayerSeriesState {
  currentVillageoisSeries: number;
  currentLoupsSeries: number;
  currentNoWolfSeries: number;
  currentSoloSeries: number;
  longestVillageoisSeries: CampSeries | null;
  longestLoupsSeries: CampSeries | null;
  longestNoWolfSeries: CampSeries | null;
  longestSoloSeries: CampSeries | null;
  currentWinSeries: number;
  longestWinSeries: WinSeries | null;
  currentWinCamps: string[];
  currentLossSeries: number;
  longestLossSeries: LossSeries | null;
  currentLossCamps: string[];
  currentNoWolfCamps: string[]; // Track camps during NoWolf series
  currentSoloCamps: string[]; // Track camps during Solo series
  lastCamp: 'Villageois' | 'Loup' | 'Autres' | null;
  lastWon: boolean;
  villageoisSeriesStart: { game: string; date: string } | null;    // Changed to string
  loupsSeriesStart: { game: string; date: string } | null;          // Changed to string
  noWolfSeriesStart: { game: string; date: string } | null;         // New NoWolf series start
  soloSeriesStart: { game: string; date: string } | null;           // New Solo series start
  winSeriesStart: { game: string; date: string } | null;            // Changed to string
  lossSeriesStart: { game: string; date: string } | null;           // Changed to string
  // Track game IDs for current series - now DisplayedIds
  currentVillageoisGameIds: string[];
  currentLoupsGameIds: string[];
  currentNoWolfGameIds: string[];
  currentSoloGameIds: string[];
  currentWinGameIds: string[];
  currentLossGameIds: string[];
}

/**
 * Get all unique players from game data (by ID)
 * Returns a Map of player IDs to their latest display names
 */
function getAllPlayers(gameData: GameLogEntry[]): Map<string, string> {
  const playerMap = new Map<string, string>();
  
  gameData.forEach(game => {
    game.PlayerStats.forEach(playerStat => {
      const playerId = getPlayerId(playerStat);
      // Player names are already normalized during data loading
      const displayName = playerStat.Username;
      // Update to latest seen display name
      playerMap.set(playerId, displayName);
    });
  });
  
  return playerMap;
}

/**
 * Initialize player series tracking state
 * @param playerMap - Map of player IDs to display names
 */
function initializePlayerSeries(playerMap: Map<string, string>): Record<string, PlayerSeriesState> {
  const playerCampSeries: Record<string, PlayerSeriesState> = {};
  
  playerMap.forEach((_displayName, playerId) => {
    playerCampSeries[playerId] = {
      currentVillageoisSeries: 0,
      currentLoupsSeries: 0,
      currentNoWolfSeries: 0,
      currentSoloSeries: 0,
      longestVillageoisSeries: null,
      longestLoupsSeries: null,
      longestNoWolfSeries: null,
      longestSoloSeries: null,
      currentWinSeries: 0,
      longestWinSeries: null,
      currentWinCamps: [],
      currentLossSeries: 0,
      longestLossSeries: null,
      currentLossCamps: [],
      currentNoWolfCamps: [],
      currentSoloCamps: [],
      lastCamp: null,
      lastWon: false,
      villageoisSeriesStart: null,
      loupsSeriesStart: null,
      noWolfSeriesStart: null,
      soloSeriesStart: null,
      winSeriesStart: null,
      lossSeriesStart: null,
      currentVillageoisGameIds: [],
      currentLoupsGameIds: [],
      currentNoWolfGameIds: [],
      currentSoloGameIds: [],
      currentWinGameIds: [],
      currentLossGameIds: []
    };
  });
  
  return playerCampSeries;
}

/**
 * Process camp series for a player
 * @param displayName - Display name for the player (used in output)
 */
function processCampSeries(
  playerStats: PlayerSeriesState,
  displayName: string,
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
          player: displayName,
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
          player: displayName,
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
      playerStats.currentNoWolfCamps = [];
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
      playerStats.currentNoWolfCamps.push(mainCamp);
    } else {
      playerStats.currentNoWolfSeries = 1;
      playerStats.noWolfSeriesStart = { game: gameDisplayedId, date };
      playerStats.currentNoWolfGameIds = [gameDisplayedId];
      playerStats.currentNoWolfCamps = [mainCamp];
    }
    
    // Create camp counts from currentNoWolfCamps
    const campCounts: Record<string, number> = {};
    playerStats.currentNoWolfCamps.forEach(camp => {
      campCounts[camp] = (campCounts[camp] || 0) + 1;
    });
    
    // Update longest if current is longer or equal (keep most recent in case of ties)
    if (!playerStats.longestNoWolfSeries || 
        playerStats.currentNoWolfSeries >= playerStats.longestNoWolfSeries.seriesLength) {
      playerStats.longestNoWolfSeries = {
        player: displayName,
        camp: 'Sans Loups', // Display name for NoWolf series
        seriesLength: playerStats.currentNoWolfSeries,
        startGame: playerStats.noWolfSeriesStart?.game || gameDisplayedId,
        endGame: gameDisplayedId,
        startDate: playerStats.noWolfSeriesStart?.date || date,
        endDate: date,
        campCounts: campCounts,
        isOngoing: false, // Will be updated at the end
        gameIds: [...playerStats.currentNoWolfGameIds]
      };
    }
  }
}

/**
 * Process solo role series for a player
 * @param displayName - Display name for the player (used in output)
 * @param actualRole - The actual role name (not the camp)
 */
function processSoloSeries(
  playerStats: PlayerSeriesState,
  displayName: string,
  mainCamp: 'Villageois' | 'Loup' | 'Autres',
  actualRole: string,
  gameDisplayedId: string,
  date: string
): void {
  // Solo series only tracks 'Autres' camp (not Villageois or Loup)
  if (mainCamp === 'Autres') {
    // Continue or start Solo series
    if (playerStats.currentSoloSeries > 0) {
      playerStats.currentSoloSeries++;
      playerStats.currentSoloGameIds.push(gameDisplayedId);
      playerStats.currentSoloCamps.push(actualRole); // Store actual role name
    } else {
      playerStats.currentSoloSeries = 1;
      playerStats.soloSeriesStart = { game: gameDisplayedId, date };
      playerStats.currentSoloGameIds = [gameDisplayedId];
      playerStats.currentSoloCamps = [actualRole]; // Store actual role name
    }
    
    // Create camp counts from currentSoloCamps (now contains actual role names)
    const campCounts: Record<string, number> = {};
    playerStats.currentSoloCamps.forEach(camp => {
      campCounts[camp] = (campCounts[camp] || 0) + 1;
    });
    
    // Update longest if current is longer or equal (keep most recent in case of ties)
    if (!playerStats.longestSoloSeries || 
        playerStats.currentSoloSeries >= playerStats.longestSoloSeries.seriesLength) {
      playerStats.longestSoloSeries = {
        player: displayName,
        camp: 'Rôles Solos',
        seriesLength: playerStats.currentSoloSeries,
        startGame: playerStats.soloSeriesStart?.game || gameDisplayedId,
        endGame: gameDisplayedId,
        startDate: playerStats.soloSeriesStart?.date || date,
        endDate: date,
        campCounts: campCounts,
        isOngoing: false, // Will be updated at the end
        gameIds: [...playerStats.currentSoloGameIds]
      };
    }
  } else {
    // Playing as Villageois or Loup breaks Solo series
    playerStats.currentSoloSeries = 0;
    playerStats.soloSeriesStart = null;
    playerStats.currentSoloGameIds = [];
    playerStats.currentSoloCamps = [];
  }
}

/**
 * Process win series for a player
 * @param displayName - Display name for the player (used in output)
 */
function processWinSeries(
  playerStats: PlayerSeriesState,
  displayName: string,
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
        player: displayName,
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
 * @param displayName - Display name for the player (used in output)
 */
function processLossSeries(
  playerStats: PlayerSeriesState,
  displayName: string,
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
        player: displayName,
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
  allSoloSeries: CampSeries[];
  allWinSeries: WinSeries[];
  allLossSeries: LossSeries[];
} {
  const allVillageoisSeries: CampSeries[] = [];
  const allLoupsSeries: CampSeries[] = [];
  const allNoWolfSeries: CampSeries[] = [];
  const allSoloSeries: CampSeries[] = [];
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
    if (stats.longestSoloSeries) {
      allSoloSeries.push(stats.longestSoloSeries);
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
  allSoloSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  allWinSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  allLossSeries.sort((a, b) => b.seriesLength - a.seriesLength);

  return {
    allVillageoisSeries,
    allLoupsSeries,
    allNoWolfSeries,
    allSoloSeries,
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
  averageSoloSeries: number;
  averageWinSeries: number;
  averageLossSeries: number;
  eliteVillageoisCount: number;
  eliteLoupsCount: number;
  eliteNoWolfCount: number;
  eliteSoloCount: number;
  eliteWinCount: number;
  eliteLossCount: number;
} {
  // Collect ALL players' best series lengths (including 0 for those who never had a series)
  const allVillageoisSeries: number[] = [];
  const allLoupsSeries: number[] = [];
  const allNoWolfSeries: number[] = [];
  const allSoloSeries: number[] = [];
  const allWinSeries: number[] = [];
  const allLossSeries: number[] = [];
  
  Object.values(playerCampSeries).forEach(stats => {
    // For averages, include the best series length for each player (0 if they never had one)
    allVillageoisSeries.push(stats.longestVillageoisSeries?.seriesLength || 0);
    allLoupsSeries.push(stats.longestLoupsSeries?.seriesLength || 0);
    allNoWolfSeries.push(stats.longestNoWolfSeries?.seriesLength || 0);
    allSoloSeries.push(stats.longestSoloSeries?.seriesLength || 0);
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
  
  const averageSoloSeries = totalPlayers > 0 
    ? allSoloSeries.reduce((sum, length) => sum + length, 0) / totalPlayers
    : 0;
  
  const averageWinSeries = totalPlayers > 0 
    ? allWinSeries.reduce((sum, length) => sum + length, 0) / totalPlayers
    : 0;
    
  const averageLossSeries = totalPlayers > 0 
    ? allLossSeries.reduce((sum, length) => sum + length, 0) / totalPlayers
    : 0;

  // Count elite players (with thresholds: Villageois 5+, Loups 3+, NoWolf 5+, Solo 3+, Wins 5+, Losses 5+)
  const eliteVillageoisCount = allVillageoisSeries.filter(length => length >= 5).length;
  const eliteLoupsCount = allLoupsSeries.filter(length => length >= 3).length;
  const eliteNoWolfCount = allNoWolfSeries.filter(length => length >= 5).length;
  const eliteSoloCount = allSoloSeries.filter(length => length >= 3).length;
  const eliteWinCount = allWinSeries.filter(length => length >= 5).length;
  const eliteLossCount = allLossSeries.filter(length => length >= 5).length;

  return {
    averageVillageoisSeries: Math.round(averageVillageoisSeries * 10) / 10, // Round to 1 decimal
    averageLoupsSeries: Math.round(averageLoupsSeries * 10) / 10,
    averageNoWolfSeries: Math.round(averageNoWolfSeries * 10) / 10,
    averageSoloSeries: Math.round(averageSoloSeries * 10) / 10,
    averageWinSeries: Math.round(averageWinSeries * 10) / 10,
    averageLossSeries: Math.round(averageLossSeries * 10) / 10,
    eliteVillageoisCount,
    eliteLoupsCount,
    eliteNoWolfCount,
    eliteSoloCount,
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

  // Get all unique players (returns Map of IDs to display names)
  const allPlayers = getAllPlayers(sortedGames);

  // Initialize tracking for all players (using IDs as keys)
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
      const playerId = getPlayerId(playerStat);
      // Player names are already normalized during data loading
      const displayName = playerStat.Username;
      
      // Update the player map with latest display name
      allPlayers.set(playerId, displayName);

      const playerStats = playerCampSeries[playerId];
      if (!playerStats) return; // Skip if player not initialized
      
      const finalRole = getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []);
      const mainCamp = getPlayerMainCampFromRole(finalRole);
      const playerWon = playerStat.Victorious;

      // Process camp series (pass display name for output)
      processCampSeries(playerStats, displayName, mainCamp, gameDisplayedId, date);

      // Process solo series (pass display name and actual role for output)
      processSoloSeries(playerStats, displayName, mainCamp, finalRole, gameDisplayedId, date);

      // Process win series (pass display name for output)
      processWinSeries(playerStats, displayName, playerWon, mainCamp, gameDisplayedId, date);
      
      // Process loss series (pass display name for output)
      processLossSeries(playerStats, displayName, playerWon, mainCamp, gameDisplayedId, date);
    });
  });

  // Collect and sort results
  const { 
    allVillageoisSeries,
    allLoupsSeries,
    allNoWolfSeries,
    allSoloSeries,
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

    // Check Solo series
    if (stats.longestSoloSeries && 
        stats.currentSoloSeries === stats.longestSoloSeries.seriesLength &&
        stats.currentSoloSeries > 0) {
      stats.longestSoloSeries.isOngoing = true;
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
  let activeSoloCount = 0;         // Players currently on a Solo streak
  let activeWinCount = 0;          // Players currently on a win streak
  let activeLossCount = 0;         // Players currently on a loss streak
  let ongoingVillageoisCount = 0;  // Players currently in their personal best Villageois streak
  let ongoingLoupsCount = 0;       // Players currently in their personal best Loups streak
  let ongoingNoWolfCount = 0;      // Players currently in their personal best NoWolf streak
  let ongoingSoloCount = 0;        // Players currently in their personal best Solo streak
  let ongoingWinCount = 0;         // Players currently in their personal best win streak
  let ongoingLossCount = 0;        // Players currently in their personal best loss streak

  // Collect current ongoing series for ALL players
  const currentVillageoisSeries: CampSeries[] = [];
  const currentLoupsSeries: CampSeries[] = [];
  const currentNoWolfSeries: CampSeries[] = [];
  const currentSoloSeries: CampSeries[] = [];
  const currentWinSeries: WinSeries[] = [];
  const currentLossSeries: LossSeries[] = [];

  Object.entries(playerCampSeries).forEach(([playerId, stats]) => {
    const displayName = stats.longestVillageoisSeries?.player || 
                       stats.longestLoupsSeries?.player || 
                       stats.longestNoWolfSeries?.player || 
                       stats.longestWinSeries?.player || 
                       stats.longestLossSeries?.player || 
                       playerId;

    // Count active series (any current streak > 0)
    if (stats.currentVillageoisSeries > 0) {
      activeVillageoisCount++;
      // Add to current series array
      currentVillageoisSeries.push({
        player: displayName,
        camp: 'Villageois',
        seriesLength: stats.currentVillageoisSeries,
        startGame: stats.villageoisSeriesStart?.game || '',
        endGame: stats.currentVillageoisGameIds[stats.currentVillageoisGameIds.length - 1] || '',
        startDate: stats.villageoisSeriesStart?.date || '',
        endDate: formatLycanDate(sortedGames[sortedGames.length - 1]?.EndDate || ''),
        isOngoing: true,
        gameIds: [...stats.currentVillageoisGameIds]
      });
    }
    if (stats.currentLoupsSeries > 0) {
      activeLoupsCount++;
      currentLoupsSeries.push({
        player: displayName,
        camp: 'Loups',
        seriesLength: stats.currentLoupsSeries,
        startGame: stats.loupsSeriesStart?.game || '',
        endGame: stats.currentLoupsGameIds[stats.currentLoupsGameIds.length - 1] || '',
        startDate: stats.loupsSeriesStart?.date || '',
        endDate: formatLycanDate(sortedGames[sortedGames.length - 1]?.EndDate || ''),
        isOngoing: true,
        gameIds: [...stats.currentLoupsGameIds]
      });
    }
    if (stats.currentNoWolfSeries > 0) {
      activeNoWolfCount++;
      // Create camp counts from currentNoWolfCamps
      const campCounts: Record<string, number> = {};
      stats.currentNoWolfCamps.forEach(camp => {
        campCounts[camp] = (campCounts[camp] || 0) + 1;
      });
      currentNoWolfSeries.push({
        player: displayName,
        camp: 'Sans Loups',
        seriesLength: stats.currentNoWolfSeries,
        startGame: stats.noWolfSeriesStart?.game || '',
        endGame: stats.currentNoWolfGameIds[stats.currentNoWolfGameIds.length - 1] || '',
        startDate: stats.noWolfSeriesStart?.date || '',
        endDate: formatLycanDate(sortedGames[sortedGames.length - 1]?.EndDate || ''),
        campCounts: campCounts,
        isOngoing: true,
        gameIds: [...stats.currentNoWolfGameIds]
      });
    }
    if (stats.currentSoloSeries > 0) {
      activeSoloCount++;
      // Create camp counts from currentSoloCamps
      const campCounts: Record<string, number> = {};
      stats.currentSoloCamps.forEach(camp => {
        campCounts[camp] = (campCounts[camp] || 0) + 1;
      });
      currentSoloSeries.push({
        player: displayName,
        camp: 'Rôles Solos',
        seriesLength: stats.currentSoloSeries,
        startGame: stats.soloSeriesStart?.game || '',
        endGame: stats.currentSoloGameIds[stats.currentSoloGameIds.length - 1] || '',
        startDate: stats.soloSeriesStart?.date || '',
        endDate: formatLycanDate(sortedGames[sortedGames.length - 1]?.EndDate || ''),
        campCounts: campCounts,
        isOngoing: true,
        gameIds: [...stats.currentSoloGameIds]
      });
    }
    if (stats.currentWinSeries > 0) {
      activeWinCount++;
      // Create camp counts from currentWinCamps
      const campCounts: Record<string, number> = {};
      stats.currentWinCamps.forEach(camp => {
        campCounts[camp] = (campCounts[camp] || 0) + 1;
      });
      currentWinSeries.push({
        player: displayName,
        seriesLength: stats.currentWinSeries,
        startGame: stats.winSeriesStart?.game || '',
        endGame: stats.currentWinGameIds[stats.currentWinGameIds.length - 1] || '',
        startDate: stats.winSeriesStart?.date || '',
        endDate: formatLycanDate(sortedGames[sortedGames.length - 1]?.EndDate || ''),
        campCounts: campCounts,
        isOngoing: true,
        gameIds: [...stats.currentWinGameIds]
      });
    }
    if (stats.currentLossSeries > 0) {
      activeLossCount++;
      // Create camp counts from currentLossCamps
      const campCounts: Record<string, number> = {};
      stats.currentLossCamps.forEach(camp => {
        campCounts[camp] = (campCounts[camp] || 0) + 1;
      });
      currentLossSeries.push({
        player: displayName,
        seriesLength: stats.currentLossSeries,
        startGame: stats.lossSeriesStart?.game || '',
        endGame: stats.currentLossGameIds[stats.currentLossGameIds.length - 1] || '',
        startDate: stats.lossSeriesStart?.date || '',
        endDate: formatLycanDate(sortedGames[sortedGames.length - 1]?.EndDate || ''),
        campCounts: campCounts,
        isOngoing: true,
        gameIds: [...stats.currentLossGameIds]
      });
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
    if (stats.longestSoloSeries?.isOngoing) {
      ongoingSoloCount++;
    }
    if (stats.longestWinSeries?.isOngoing) {
      ongoingWinCount++;
    }
    if (stats.longestLossSeries?.isOngoing) {
      ongoingLossCount++;
    }
  });

  // Sort current series by length (descending)
  currentVillageoisSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  currentLoupsSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  currentNoWolfSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  currentSoloSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  currentWinSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  currentLossSeries.sort((a, b) => b.seriesLength - a.seriesLength);

  return {
    allVillageoisSeries,
    allLoupsSeries,
    allNoWolfSeries,
    allSoloSeries,
    allWinSeries,
    allLossSeries,
    currentVillageoisSeries,
    currentLoupsSeries,
    currentNoWolfSeries,
    currentSoloSeries,
    currentWinSeries,
    currentLossSeries,
    totalGamesAnalyzed: sortedGames.length,
    totalPlayersCount: allPlayers.size,
    activeVillageoisCount,
    activeLoupsCount,
    activeNoWolfCount,
    activeSoloCount,
    activeWinCount,
    activeLossCount,
    ongoingVillageoisCount,
    ongoingLoupsCount,
    ongoingNoWolfCount,
    ongoingSoloCount,
    ongoingWinCount,
    ongoingLossCount,
    ...statistics
  };
}
