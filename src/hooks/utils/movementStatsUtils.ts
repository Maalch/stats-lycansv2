import type { GameLogEntry } from '../useCombinedRawData';
import { getPlayerId, getCanonicalPlayerName } from '../../utils/playerIdentification';
import { getPlayerMainCampFromRole } from '../../utils/datasyncExport';

export type CampFilter = 'all' | 'villageois' | 'loup' | 'autres';

export interface PlayerMovementStats {
  player: string;
  gamesPlayed: number;
  totalImmobileStanding: number;
  totalImmobileCrouched: number;
  totalWalkingStanding: number;
  totalWalkingCrouched: number;
  totalRunning: number;
  totalMovementTime: number;         // Sum of all movement categories
  runningPer60Min: number;           // Seconds running per 60 min alive
  immobileStandingPer60Min: number;  // Seconds immobile standing per 60 min alive
  immobileCrouchedPer60Min: number;  // Seconds immobile crouched per 60 min alive
  walkingStandingPer60Min: number;   // Seconds walking standing per 60 min alive
  walkingCrouchedPer60Min: number;   // Seconds walking crouched per 60 min alive
  runningPercentage: number;         // % of total time spent running
  immobilePercentage: number;        // % of total time spent immobile standing only
  walkingPercentage: number;         // % of total time spent walking (standing + crouched)
  walkingStandingPercentage: number; // % of total time spent walking standing only
  crouchedPercentage: number;        // % of total time spent crouched (walking + immobile)
}

export interface MovementStatsData {
  playerStats: PlayerMovementStats[];
  totalGames: number;
  gamesWithMovementData: number;
}

/**
 * Check if a game has movement data
 */
function gameHasMovementData(game: GameLogEntry): boolean {
  return game.PlayerStats.some(
    player => player.SecondsSpentRunning !== undefined && player.SecondsSpentRunning !== null
  );
}

/**
 * Compute per-player movement statistics from game log data
 * 
 * @param gameData - Array of game log entries
 * @param campFilter - Filter by camp: 'all', 'villageois', 'loup', or 'autres'
 */
export function computeMovementStats(gameData: GameLogEntry[], campFilter: CampFilter = 'all'): MovementStatsData | null {
  if (!gameData || gameData.length === 0) {
    return null;
  }

  const gamesWithData = gameData.filter(gameHasMovementData);

  if (gamesWithData.length === 0) {
    return {
      playerStats: [],
      totalGames: gameData.length,
      gamesWithMovementData: 0
    };
  }

  const playerMap = new Map<string, {
    displayName: string;
    gamesPlayed: number;
    totalImmobileStanding: number;
    totalImmobileCrouched: number;
    totalWalkingStanding: number;
    totalWalkingCrouched: number;
    totalRunning: number;
  }>();

  gamesWithData.forEach(game => {
    game.PlayerStats.forEach(player => {
      // Skip players without movement data
      if (player.SecondsSpentRunning === undefined || player.SecondsSpentRunning === null) {
        return;
      }

      // Apply camp filter
      if (campFilter !== 'all') {
        const playerCamp = getPlayerMainCampFromRole(player.MainRoleInitial, player.Power);
        const campFilterMap: Record<CampFilter, string> = {
          'all': '',
          'villageois': 'Villageois',
          'loup': 'Loup',
          'autres': 'Autres'
        };
        
        if (playerCamp !== campFilterMap[campFilter]) {
          return;
        }
      }

      const playerId = getPlayerId(player);
      const displayName = getCanonicalPlayerName(player);

      if (!playerMap.has(playerId)) {
        playerMap.set(playerId, {
          displayName,
          gamesPlayed: 0,
          totalImmobileStanding: 0,
          totalImmobileCrouched: 0,
          totalWalkingStanding: 0,
          totalWalkingCrouched: 0,
          totalRunning: 0
        });
      }

      const stats = playerMap.get(playerId)!;
      stats.gamesPlayed++;
      stats.totalImmobileStanding += player.SecondsSpentImmobileStanding || 0;
      stats.totalImmobileCrouched += player.SecondsSpentImmobileCrouched || 0;
      stats.totalWalkingStanding += player.SecondsSpentWalkingStanding || 0;
      stats.totalWalkingCrouched += player.SecondsSpentWalkingCrouched || 0;
      stats.totalRunning += player.SecondsSpentRunning || 0;
    });
  });

  const playerStats: PlayerMovementStats[] = Array.from(playerMap.entries()).map(([_, stats]) => {
    const totalMovementTime = stats.totalImmobileStanding + stats.totalImmobileCrouched +
      stats.totalWalkingStanding + stats.totalWalkingCrouched + stats.totalRunning;

    const walkingTotal = stats.totalWalkingStanding + stats.totalWalkingCrouched;
    const crouchedTotal = stats.totalWalkingCrouched + stats.totalImmobileCrouched;

    return {
      player: stats.displayName,
      gamesPlayed: stats.gamesPlayed,
      totalImmobileStanding: stats.totalImmobileStanding,
      totalImmobileCrouched: stats.totalImmobileCrouched,
      totalWalkingStanding: stats.totalWalkingStanding,
      totalWalkingCrouched: stats.totalWalkingCrouched,
      totalRunning: stats.totalRunning,
      totalMovementTime,
      runningPer60Min: totalMovementTime > 0 ? (stats.totalRunning / totalMovementTime) * 3600 : 0,
      immobileStandingPer60Min: totalMovementTime > 0 ? (stats.totalImmobileStanding / totalMovementTime) * 3600 : 0,
      immobileCrouchedPer60Min: totalMovementTime > 0 ? (stats.totalImmobileCrouched / totalMovementTime) * 3600 : 0,
      walkingStandingPer60Min: totalMovementTime > 0 ? (stats.totalWalkingStanding / totalMovementTime) * 3600 : 0,
      walkingCrouchedPer60Min: totalMovementTime > 0 ? (stats.totalWalkingCrouched / totalMovementTime) * 3600 : 0,
      runningPercentage: totalMovementTime > 0 ? (stats.totalRunning / totalMovementTime) * 100 : 0,
      immobilePercentage: totalMovementTime > 0 ? (stats.totalImmobileStanding / totalMovementTime) * 100 : 0,
      walkingPercentage: totalMovementTime > 0 ? (walkingTotal / totalMovementTime) * 100 : 0,
      walkingStandingPercentage: totalMovementTime > 0 ? (stats.totalWalkingStanding / totalMovementTime) * 100 : 0,
      crouchedPercentage: totalMovementTime > 0 ? (crouchedTotal / totalMovementTime) * 100 : 0,
    };
  });

  return {
    playerStats,
    totalGames: gameData.length,
    gamesWithMovementData: gamesWithData.length
  };
}
