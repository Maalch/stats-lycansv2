import type { GameLogEntry } from '../useCombinedRawData';
import type { PlayerStatsData, PlayerStat, PlayerCamps } from '../../types/api';

/**
 * Filter games by map type
 */
function filterGamesByMapType(gameData: GameLogEntry[], mapType: string): GameLogEntry[] {
  if (mapType === 'Toutes les cartes') {
    return gameData;
  }
  
  return gameData.filter(game => {
    if (mapType === 'Village' || mapType === 'Château') {
      return game.MapName === mapType;
    } else if (mapType === 'Autres') {
      return game.MapName !== 'Village' && game.MapName !== 'Château';
    }
    return true;
  });
}

/**
 * Internal function to compute player statistics from filtered data
 */
function computePlayerStatsFromFilteredData(gameData: GameLogEntry[]): PlayerStatsData | null {
  if (gameData.length === 0) {
    return null;
  }

  // Initialize player statistics
  const allPlayers: Record<string, {
    gamesPlayed: number;
    gamesPlayedPercent: string;
    wins: number;
    winPercent: string;
    camps: PlayerCamps;
  }> = {};

  let totalGames = 0;

  // Process game data to collect player statistics
  gameData.forEach((gameEntry) => {
    const players = gameEntry.PlayerStats;

    if (players.length > 0) {
      totalGames++;

      players.forEach(playerStat => {
        const player = playerStat.Username.trim();
        if (player) {
          // Initialize player if not seen before
          if (!allPlayers[player]) {
            allPlayers[player] = {
              gamesPlayed: 0,
              gamesPlayedPercent: "0",
              wins: 0,
              winPercent: "0",
              camps: {} // Empty object, camps will be added dynamically
            };
          }

          // Increment games played
          allPlayers[player].gamesPlayed++;

          // Get player's camp from their MainRoleInitial
          const playerCamp = playerStat.MainRoleInitial;

          // Increment camp count - create the camp if it doesn't exist
          if (playerCamp) {
            if (!(playerCamp in allPlayers[player].camps)) {
              allPlayers[player].camps[playerCamp] = 0;
            }
            allPlayers[player].camps[playerCamp]++;
          }

          // Check if player won using the Victorious boolean
          if (playerStat.Victorious) {
            allPlayers[player].wins++;
          }
        }
      });
    }
  });

  // Calculate percentages for each player
  Object.keys(allPlayers).forEach(player => {
    const stats = allPlayers[player];
    stats.gamesPlayedPercent = (stats.gamesPlayed / totalGames * 100).toFixed(2);
    stats.winPercent = (stats.wins / stats.gamesPlayed * 100).toFixed(2);
  });

  // Convert to array format and add player name
  const playerStatsArray: PlayerStat[] = Object.keys(allPlayers).map(player => ({
    player,
    ...allPlayers[player]
  }));

  // Sort by games played (descending)
  playerStatsArray.sort((a, b) => b.gamesPlayed - a.gamesPlayed);

  return {
    totalGames,
    playerStats: playerStatsArray
  };
}

/**
 * Compute player statistics from GameLogEntry data with optional map filtering
 */
export function computePlayerStatsWithMapFilter(
  gameData: GameLogEntry[],
  mapFilter?: string
): PlayerStatsData | null {
  if (!gameData.length) {
    return null;
  }

  // Filter games by map type if specified
  const filteredGameData = mapFilter ? filterGamesByMapType(gameData, mapFilter) : gameData;
  
  if (!filteredGameData.length) {
    return null;
  }

  return computePlayerStatsFromFilteredData(filteredGameData);
}

/**
 * Compute player statistics from GameLogEntry data
 */
export function computePlayerStats(
  gameData: GameLogEntry[]
): PlayerStatsData | null {
  if (!gameData.length) {
    return null;
  }

  return computePlayerStatsFromFilteredData(gameData);
}
