/**
 * Series processing functions for player statistics
 */

import type { PlayerSeriesState } from './playerSeriesTypes';

/**
 * Process camp series for a player
 * @param displayName - Display name for the player (used in output)
 */
export function processCampSeries(
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
export function processSoloSeries(
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
export function processWinSeries(
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
export function processLossSeries(
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
 * Process death series for a player
 * @param displayName - Display name for the player (used in output)
 */
export function processDeathSeries(
  playerStats: PlayerSeriesState,
  displayName: string,
  playerDied: boolean,
  actualCamp: string,
  gameDisplayedId: string,
  date: string
): void {
  if (playerDied) {
    if (playerStats.currentDeathSeries === 0) {
      playerStats.deathSeriesStart = { game: gameDisplayedId, date };
      playerStats.currentDeathGameIds = [];
    }
    playerStats.currentDeathSeries++;
    playerStats.currentDeathCamps.push(actualCamp);
    playerStats.currentDeathGameIds.push(gameDisplayedId);

    if (
      !playerStats.longestDeathSeries ||
      playerStats.currentDeathSeries > playerStats.longestDeathSeries.seriesLength
    ) {
      const campCounts: Record<string, number> = {};
      playerStats.currentDeathCamps.forEach(camp => {
        campCounts[camp] = (campCounts[camp] || 0) + 1;
      });

      playerStats.longestDeathSeries = {
        player: displayName,
        seriesLength: playerStats.currentDeathSeries,
        startGame: playerStats.deathSeriesStart!.game,
        endGame: gameDisplayedId,
        startDate: playerStats.deathSeriesStart!.date,
        endDate: date,
        campCounts,
        isOngoing: false,
        gameIds: [...playerStats.currentDeathGameIds]
      };
    }
  } else {
    playerStats.currentDeathSeries = 0;
    playerStats.currentDeathCamps = [];
    playerStats.deathSeriesStart = null;
    playerStats.currentDeathGameIds = [];
  }
}

/**
 * Process survival series for a player
 * @param displayName - Display name for the player (used in output)
 */
export function processSurvivalSeries(
  playerStats: PlayerSeriesState,
  displayName: string,
  playerDied: boolean,
  actualCamp: string,
  gameDisplayedId: string,
  date: string
): void {
  if (!playerDied) {
    if (playerStats.currentSurvivalSeries === 0) {
      playerStats.survivalSeriesStart = { game: gameDisplayedId, date };
      playerStats.currentSurvivalGameIds = [];
    }
    playerStats.currentSurvivalSeries++;
    playerStats.currentSurvivalCamps.push(actualCamp);
    playerStats.currentSurvivalGameIds.push(gameDisplayedId);

    if (
      !playerStats.longestSurvivalSeries ||
      playerStats.currentSurvivalSeries > playerStats.longestSurvivalSeries.seriesLength
    ) {
      const campCounts: Record<string, number> = {};
      playerStats.currentSurvivalCamps.forEach(camp => {
        campCounts[camp] = (campCounts[camp] || 0) + 1;
      });

      playerStats.longestSurvivalSeries = {
        player: displayName,
        seriesLength: playerStats.currentSurvivalSeries,
        startGame: playerStats.survivalSeriesStart!.game,
        endGame: gameDisplayedId,
        startDate: playerStats.survivalSeriesStart!.date,
        endDate: date,
        campCounts,
        isOngoing: false,
        gameIds: [...playerStats.currentSurvivalGameIds]
      };
    }
  } else {
    playerStats.currentSurvivalSeries = 0;
    playerStats.currentSurvivalCamps = [];
    playerStats.survivalSeriesStart = null;
    playerStats.currentSurvivalGameIds = [];
  }
}
