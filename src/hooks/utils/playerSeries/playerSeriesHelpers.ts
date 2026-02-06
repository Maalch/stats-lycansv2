/**
 * Helper functions for player series tracking
 */

import { getPlayerId } from '../../../utils/playerIdentification';
import type { GameLogEntry } from '../../useCombinedRawData';
import type { PlayerSeriesState } from './playerSeriesTypes';

// Note: Player names are already normalized during data loading, so we can use Username directly

/**
 * Get all unique players from game data (by ID)
 * Returns a Map of player IDs to their latest display names
 */
export function getAllPlayers(gameData: GameLogEntry[]): Map<string, string> {
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
export function initializePlayerSeries(playerMap: Map<string, string>): Record<string, PlayerSeriesState> {
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
      currentDeathSeries: 0,
      longestDeathSeries: null,
      currentDeathCamps: [],
      currentSurvivalSeries: 0,
      longestSurvivalSeries: null,
      currentSurvivalCamps: [],
      currentNoWolfCamps: [],
      currentSoloCamps: [],
      lastCamp: null,
      lastWon: false,
      lastDied: false,
      villageoisSeriesStart: null,
      loupsSeriesStart: null,
      noWolfSeriesStart: null,
      soloSeriesStart: null,
      winSeriesStart: null,
      lossSeriesStart: null,
      deathSeriesStart: null,
      survivalSeriesStart: null,
      currentVillageoisGameIds: [],
      currentLoupsGameIds: [],
      currentNoWolfGameIds: [],
      currentSoloGameIds: [],
      currentWinGameIds: [],
      currentLossGameIds: [],
      currentDeathGameIds: [],
      currentSurvivalGameIds: []
    };
  });
  
  return playerCampSeries;
}
