import type { GameLogEntry } from '../useCombinedRawData';
import type { PlayerStatsData, PlayerStat, PlayerCamps } from '../../types/api';
import { getPlayerFinalRole } from '../../utils/datasyncExport';
import { getPlayerId } from '../../utils/playerIdentification';
// Note: Player names are already normalized during data loading, so we can use Username directly

/**
 * Compute player statistics from GameLogEntry data
 * Uses ID-based grouping to merge stats for players with username changes
 */
export function computePlayerStats(
  gameData: GameLogEntry[]
): PlayerStatsData | null {
  if (gameData.length === 0) {
    return null;
  }

  // Initialize player statistics using ID as key (or Username if no ID)
  const allPlayers: Record<string, {
    gamesPlayed: number;
    gamesPlayedPercent: string;
    wins: number;
    winPercent: string;
    camps: PlayerCamps;
    displayName: string; // Most recent username
  }> = {};

  let totalGames = 0;

  // Process game data to collect player statistics
  gameData.forEach((gameEntry) => {
    const players = gameEntry.PlayerStats;

    if (players.length > 0) {
      totalGames++;

      players.forEach(playerStat => {
        // Use ID for grouping, fallback to Username for legacy data
        const playerId = getPlayerId(playerStat);
        // Player names are already normalized during data loading
        const displayName = playerStat.Username;
        
        if (playerId) {
          // Initialize player if not seen before
          if (!allPlayers[playerId]) {
            allPlayers[playerId] = {
              gamesPlayed: 0,
              gamesPlayedPercent: "0",
              wins: 0,
              winPercent: "0",
              camps: {}, // Empty object, camps will be added dynamically
              displayName: displayName
            };
          }

          // Update display name to most recent
          allPlayers[playerId].displayName = displayName;

          // Increment games played
          allPlayers[playerId].gamesPlayed++;

          // Get player's camp from their final role
          const playerCamp = getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []);

          // Increment camp count - create the camp if it doesn't exist
          if (playerCamp) {
            if (!(playerCamp in allPlayers[playerId].camps)) {
              allPlayers[playerId].camps[playerCamp] = 0;
            }
            allPlayers[playerId].camps[playerCamp]++;
          }

          // Check if player won using the Victorious boolean
          if (playerStat.Victorious) {
            allPlayers[playerId].wins++;
          }
        }
      });
    }
  });

  // Calculate percentages for each player
  Object.keys(allPlayers).forEach(playerId => {
    const stats = allPlayers[playerId];
    stats.gamesPlayedPercent = (stats.gamesPlayed / totalGames * 100).toFixed(2);
    stats.winPercent = (stats.wins / stats.gamesPlayed * 100).toFixed(2);
  });

  // Convert to array format and add player name (displayName for UI)
  const playerStatsArray: PlayerStat[] = Object.keys(allPlayers).map(playerId => ({
    player: allPlayers[playerId].displayName, // Use displayName for UI
    gamesPlayed: allPlayers[playerId].gamesPlayed,
    gamesPlayedPercent: allPlayers[playerId].gamesPlayedPercent,
    wins: allPlayers[playerId].wins,
    winPercent: allPlayers[playerId].winPercent,
    camps: allPlayers[playerId].camps
  }));

  // Sort by games played (descending)
  playerStatsArray.sort((a, b) => b.gamesPlayed - a.gamesPlayed);

  return {
    totalGames,
    playerStats: playerStatsArray
  };
}
