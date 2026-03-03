/**
 * Main orchestrator for player series tracking
 * This file coordinates the computation across modular components
 */

import { getPlayerFinalRole, getPlayerMainCampFromRole } from '../../utils/datasyncExport';
import { getPlayerId } from '../../utils/playerIdentification';
import type { GameLogEntry } from '../useCombinedRawData';

// Import types
import type { 
  CampSeries, 
  WinSeries, 
  LossSeries, 
  DeathSeries, 
  SurvivalSeries, 
  DeathT1Series,
  PlayerSeriesData 
} from './playerSeries/playerSeriesTypes';

// Import helper functions
import { getAllPlayers, initializePlayerSeries } from './playerSeries/playerSeriesHelpers';

// Import processing functions
import {
  processCampSeries,
  processSoloSeries,
  processWinSeries,
  processLossSeries,
  processDeathSeries,
  processSurvivalSeries,
  processDeathT1Series
} from './playerSeries/playerSeriesProcessors';

// Import statistics functions
import { collectSeriesResults, calculatePlayerStatistics } from './playerSeries/playerSeriesStats';

// Re-export types for backward compatibility
export type { 
  CampSeries, 
  WinSeries, 
  LossSeries, 
  DeathSeries, 
  SurvivalSeries, 
  DeathT1Series,
  PlayerSeriesData 
} from './playerSeries/playerSeriesTypes';

/**
 * Compute player series statistics from raw data
 */
export function computePlayerSeries(
  gameData: GameLogEntry[]
): PlayerSeriesData | null {
  if (gameData.length === 0) {
    return null;
  }

  // Sort games by ID to ensure chronological order
  const sortedGames = [...gameData].sort((a, b) => parseInt(a.DisplayedId) - parseInt(b.DisplayedId));

  // Get all unique players (returns Map of IDs to display names)
  const allPlayers = getAllPlayers(sortedGames);

  // Initialize tracking for all players (using IDs as keys)
  const playerCampSeries = initializePlayerSeries(allPlayers);

  // Process each game chronologically
  sortedGames.forEach(game => {
    const gameDisplayedId = game.DisplayedId;
    const date = new Date(game.StartDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });

    game.PlayerStats.forEach(playerStat => {
      const playerId = getPlayerId(playerStat);
      const displayName = playerStat.Username;
      
      // Update the player map with latest display name
      allPlayers.set(playerId, displayName);

      const playerStats = playerCampSeries[playerId];
      if (!playerStats) return;
      
      const finalRole = getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []);
      const mainCamp = getPlayerMainCampFromRole(finalRole, playerStat.Power);
      const playerWon = playerStat.Victorious;
      const playerDied = playerStat.DeathTiming !== null;
      const deathTiming = playerStat.DeathTiming;

      // Process all series types
      processCampSeries(playerStats, displayName, mainCamp, gameDisplayedId, date);
      processSoloSeries(playerStats, displayName, mainCamp, finalRole, gameDisplayedId, date);
      processWinSeries(playerStats, displayName, playerWon, mainCamp, gameDisplayedId, date);
      processLossSeries(playerStats, displayName, playerWon, mainCamp, gameDisplayedId, date);
      processDeathSeries(playerStats, displayName, playerDied, mainCamp, gameDisplayedId, date);
      processSurvivalSeries(playerStats, displayName, playerDied, mainCamp, gameDisplayedId, date);
      processDeathT1Series(playerStats, displayName, deathTiming, mainCamp, gameDisplayedId, date);

      // Update last states
      playerStats.lastDied = playerDied;
    });
  });

  // Collect and sort results
  const seriesResults = collectSeriesResults(playerCampSeries);

  // Mark ongoing series
  Object.values(playerCampSeries).forEach(stats => {
    if (stats.longestVillageoisSeries && 
        stats.currentVillageoisSeries === stats.longestVillageoisSeries.seriesLength &&
        stats.currentVillageoisSeries > 0) {
      stats.longestVillageoisSeries.isOngoing = true;
    }
    if (stats.longestLoupsSeries && 
        stats.currentLoupsSeries === stats.longestLoupsSeries.seriesLength &&
        stats.currentLoupsSeries > 0) {
      stats.longestLoupsSeries.isOngoing = true;
    }
    if (stats.longestNoWolfSeries && 
        stats.currentNoWolfSeries === stats.longestNoWolfSeries.seriesLength &&
        stats.currentNoWolfSeries > 0) {
      stats.longestNoWolfSeries.isOngoing = true;
    }
    if (stats.longestSoloSeries && 
        stats.currentSoloSeries === stats.longestSoloSeries.seriesLength &&
        stats.currentSoloSeries > 0) {
      stats.longestSoloSeries.isOngoing = true;
    }
    if (stats.longestWinSeries && 
        stats.currentWinSeries === stats.longestWinSeries.seriesLength &&
        stats.currentWinSeries > 0) {
      stats.longestWinSeries.isOngoing = true;
    }
    if (stats.longestLossSeries && 
        stats.currentLossSeries === stats.longestLossSeries.seriesLength &&
        stats.currentLossSeries > 0) {
      stats.longestLossSeries.isOngoing = true;
    }
    if (stats.longestDeathSeries && 
        stats.currentDeathSeries === stats.longestDeathSeries.seriesLength &&
        stats.currentDeathSeries > 0) {
      stats.longestDeathSeries.isOngoing = true;
    }
    if (stats.longestSurvivalSeries && 
        stats.currentSurvivalSeries === stats.longestSurvivalSeries.seriesLength &&
        stats.currentSurvivalSeries > 0) {
      stats.longestSurvivalSeries.isOngoing = true;
    }
    if (stats.longestDeathT1Series && 
        stats.currentDeathT1Series === stats.longestDeathT1Series.seriesLength &&
        stats.currentDeathT1Series > 0) {
      stats.longestDeathT1Series.isOngoing = true;
    }
  });

  // Calculate statistics
  const statistics = calculatePlayerStatistics(playerCampSeries, allPlayers.size);

  // Collect current series and count stats
  const {
    currentSeries,
    activeCounts,
    ongoingCounts
  } = collectCurrentSeriesAndCounts(playerCampSeries, sortedGames);

  return {
    ...seriesResults,
    ...currentSeries,
    totalGamesAnalyzed: sortedGames.length,
    totalPlayersCount: allPlayers.size,
    ...activeCounts,
    ...ongoingCounts,
    ...statistics
  };
}

/**
 * Collect current series and count active/ongoing statistics
 */
function collectCurrentSeriesAndCounts(
  playerCampSeries: Record<string, any>,
  sortedGames: GameLogEntry[]
) {
  let activeVillageoisCount = 0;
  let activeLoupsCount = 0;
  let activeNoWolfCount = 0;
  let activeSoloCount = 0;
  let activeWinCount = 0;
  let activeLossCount = 0;
  let activeDeathCount = 0;
  let activeSurvivalCount = 0;
  let activeDeathT1Count = 0;
  let ongoingVillageoisCount = 0;
  let ongoingLoupsCount = 0;
  let ongoingNoWolfCount = 0;
  let ongoingSoloCount = 0;
  let ongoingWinCount = 0;
  let ongoingLossCount = 0;
  let ongoingDeathCount = 0;
  let ongoingSurvivalCount = 0;
  let ongoingDeathT1Count = 0;

  const currentVillageoisSeries: CampSeries[] = [];
  const currentLoupsSeries: CampSeries[] = [];
  const currentNoWolfSeries: CampSeries[] = [];
  const currentSoloSeries: CampSeries[] = [];
  const currentWinSeries: WinSeries[] = [];
  const currentLossSeries: LossSeries[] = [];
  const currentDeathSeries: DeathSeries[] = [];
  const currentSurvivalSeries: SurvivalSeries[] = [];
  const currentDeathT1Series: DeathT1Series[] = [];

  // Build a lookup from DisplayedId → formatted StartDate (matching the format used by processors)
  const gameDateByDisplayedId = new Map<string, string>();
  sortedGames.forEach(game => {
    gameDateByDisplayedId.set(
      game.DisplayedId,
      new Date(game.StartDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    );
  });

  Object.entries(playerCampSeries).forEach(([playerId, stats]) => {
    const displayName = stats.longestVillageoisSeries?.player || 
                       stats.longestLoupsSeries?.player || 
                       stats.longestNoWolfSeries?.player || 
                       stats.longestWinSeries?.player || 
                       stats.longestLossSeries?.player || 
                       playerId;

    // Helper to create camp counts
    const createCampCounts = (camps: string[]) => {
      const counts: Record<string, number> = {};
      camps.forEach(camp => {
        counts[camp] = (counts[camp] || 0) + 1;
      });
      return counts;
    };

    // Villageois series
    if (stats.currentVillageoisSeries > 0) {
      activeVillageoisCount++;
      currentVillageoisSeries.push({
        player: displayName,
        camp: 'Villageois',
        seriesLength: stats.currentVillageoisSeries,
        startGame: stats.villageoisSeriesStart?.game || '',
        endGame: stats.currentVillageoisGameIds[stats.currentVillageoisGameIds.length - 1] || '',
        startDate: stats.villageoisSeriesStart?.date || '',
        endDate: gameDateByDisplayedId.get(stats.currentVillageoisGameIds[stats.currentVillageoisGameIds.length - 1] || '') || '',
        isOngoing: true,
        gameIds: [...stats.currentVillageoisGameIds]
      });
    }

    // Loups series
    if (stats.currentLoupsSeries > 0) {
      activeLoupsCount++;
      currentLoupsSeries.push({
        player: displayName,
        camp: 'Loups',
        seriesLength: stats.currentLoupsSeries,
        startGame: stats.loupsSeriesStart?.game || '',
        endGame: stats.currentLoupsGameIds[stats.currentLoupsGameIds.length - 1] || '',
        startDate: stats.loupsSeriesStart?.date || '',
        endDate: gameDateByDisplayedId.get(stats.currentLoupsGameIds[stats.currentLoupsGameIds.length - 1] || '') || '',
        isOngoing: true,
        gameIds: [...stats.currentLoupsGameIds]
      });
    }

    // NoWolf series
    if (stats.currentNoWolfSeries > 0) {
      activeNoWolfCount++;
      currentNoWolfSeries.push({
        player: displayName,
        camp: 'Sans Loups',
        seriesLength: stats.currentNoWolfSeries,
        startGame: stats.noWolfSeriesStart?.game || '',
        endGame: stats.currentNoWolfGameIds[stats.currentNoWolfGameIds.length - 1] || '',
        startDate: stats.noWolfSeriesStart?.date || '',
        endDate: gameDateByDisplayedId.get(stats.currentNoWolfGameIds[stats.currentNoWolfGameIds.length - 1] || '') || '',
        campCounts: createCampCounts(stats.currentNoWolfCamps),
        isOngoing: true,
        gameIds: [...stats.currentNoWolfGameIds]
      });
    }

    // Solo series
    if (stats.currentSoloSeries > 0) {
      activeSoloCount++;
      currentSoloSeries.push({
        player: displayName,
        camp: 'Rôles Solos',
        seriesLength: stats.currentSoloSeries,
        startGame: stats.soloSeriesStart?.game || '',
        endGame: stats.currentSoloGameIds[stats.currentSoloGameIds.length - 1] || '',
        startDate: stats.soloSeriesStart?.date || '',
        endDate: gameDateByDisplayedId.get(stats.currentSoloGameIds[stats.currentSoloGameIds.length - 1] || '') || '',
        campCounts: createCampCounts(stats.currentSoloCamps),
        isOngoing: true,
        gameIds: [...stats.currentSoloGameIds]
      });
    }

    // Win series
    if (stats.currentWinSeries > 0) {
      activeWinCount++;
      currentWinSeries.push({
        player: displayName,
        seriesLength: stats.currentWinSeries,
        startGame: stats.winSeriesStart?.game || '',
        endGame: stats.currentWinGameIds[stats.currentWinGameIds.length - 1] || '',
        startDate: stats.winSeriesStart?.date || '',
        endDate: gameDateByDisplayedId.get(stats.currentWinGameIds[stats.currentWinGameIds.length - 1] || '') || '',
        campCounts: createCampCounts(stats.currentWinCamps),
        isOngoing: true,
        gameIds: [...stats.currentWinGameIds]
      });
    }

    // Loss series
    if (stats.currentLossSeries > 0) {
      activeLossCount++;
      currentLossSeries.push({
        player: displayName,
        seriesLength: stats.currentLossSeries,
        startGame: stats.lossSeriesStart?.game || '',
        endGame: stats.currentLossGameIds[stats.currentLossGameIds.length - 1] || '',
        startDate: stats.lossSeriesStart?.date || '',
        endDate: gameDateByDisplayedId.get(stats.currentLossGameIds[stats.currentLossGameIds.length - 1] || '') || '',
        campCounts: createCampCounts(stats.currentLossCamps),
        isOngoing: true,
        gameIds: [...stats.currentLossGameIds]
      });
    }

    // Death series
    if (stats.currentDeathSeries > 0) {
      activeDeathCount++;
      currentDeathSeries.push({
        player: displayName,
        seriesLength: stats.currentDeathSeries,
        startGame: stats.deathSeriesStart?.game || '',
        endGame: stats.currentDeathGameIds[stats.currentDeathGameIds.length - 1] || '',
        startDate: stats.deathSeriesStart?.date || '',
        endDate: gameDateByDisplayedId.get(stats.currentDeathGameIds[stats.currentDeathGameIds.length - 1] || '') || '',
        campCounts: createCampCounts(stats.currentDeathCamps),
        isOngoing: true,
        gameIds: [...stats.currentDeathGameIds]
      });
    }

    // Survival series
    if (stats.currentSurvivalSeries > 0) {
      activeSurvivalCount++;
      currentSurvivalSeries.push({
        player: displayName,
        seriesLength: stats.currentSurvivalSeries,
        startGame: stats.survivalSeriesStart?.game || '',
        endGame: stats.currentSurvivalGameIds[stats.currentSurvivalGameIds.length - 1] || '',
        startDate: stats.survivalSeriesStart?.date || '',
        endDate: gameDateByDisplayedId.get(stats.currentSurvivalGameIds[stats.currentSurvivalGameIds.length - 1] || '') || '',
        campCounts: createCampCounts(stats.currentSurvivalCamps),
        isOngoing: true,
        gameIds: [...stats.currentSurvivalGameIds]
      });
    }

    // DeathT1 series
    if (stats.currentDeathT1Series > 0) {
      activeDeathT1Count++;
      currentDeathT1Series.push({
        player: displayName,
        seriesLength: stats.currentDeathT1Series,
        startGame: stats.deathT1SeriesStart?.game || '',
        endGame: stats.currentDeathT1GameIds[stats.currentDeathT1GameIds.length - 1] || '',
        startDate: stats.deathT1SeriesStart?.date || '',
        endDate: gameDateByDisplayedId.get(stats.currentDeathT1GameIds[stats.currentDeathT1GameIds.length - 1] || '') || '',
        campCounts: createCampCounts(stats.currentDeathT1Camps),
        isOngoing: true,
        gameIds: [...stats.currentDeathT1GameIds]
      });
    }

    // Count ongoing record series
    if (stats.longestVillageoisSeries?.isOngoing) ongoingVillageoisCount++;
    if (stats.longestLoupsSeries?.isOngoing) ongoingLoupsCount++;
    if (stats.longestNoWolfSeries?.isOngoing) ongoingNoWolfCount++;
    if (stats.longestSoloSeries?.isOngoing) ongoingSoloCount++;
    if (stats.longestWinSeries?.isOngoing) ongoingWinCount++;
    if (stats.longestLossSeries?.isOngoing) ongoingLossCount++;
    if (stats.longestDeathSeries?.isOngoing) ongoingDeathCount++;
    if (stats.longestSurvivalSeries?.isOngoing) ongoingSurvivalCount++;
    if (stats.longestDeathT1Series?.isOngoing) ongoingDeathT1Count++;
  });

  // Sort current series by length
  currentVillageoisSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  currentLoupsSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  currentNoWolfSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  currentSoloSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  currentWinSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  currentLossSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  currentDeathSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  currentSurvivalSeries.sort((a, b) => b.seriesLength - a.seriesLength);
  currentDeathT1Series.sort((a, b) => b.seriesLength - a.seriesLength);

  return {
    currentSeries: {
      currentVillageoisSeries,
      currentLoupsSeries,
      currentNoWolfSeries,
      currentSoloSeries,
      currentWinSeries,
      currentLossSeries,
      currentDeathSeries,
      currentSurvivalSeries,
      currentDeathT1Series
    },
    activeCounts: {
      activeVillageoisCount,
      activeLoupsCount,
      activeNoWolfCount,
      activeSoloCount,
      activeWinCount,
      activeLossCount,
      activeDeathCount,
      activeSurvivalCount,
      activeDeathT1Count
    },
    ongoingCounts: {
      ongoingVillageoisCount,
      ongoingLoupsCount,
      ongoingNoWolfCount,
      ongoingSoloCount,
      ongoingWinCount,
      ongoingLossCount,
      ongoingDeathCount,
      ongoingSurvivalCount,
      ongoingDeathT1Count
    }
  };
}
