import type { GameLogEntry } from '../useCombinedRawData';
import type { PlayerStatsData, PlayerStat, PlayerCamps } from '../../types/api';

/**
 * Compute player statistics from GameLogEntry data
 */
export function computePlayerStats(
  gameData: GameLogEntry[]
): PlayerStatsData | null {
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
              camps: {
                "Villageois": 0,
                "Loup": 0,
                "Traître": 0,
                "Idiot du Village": 0,
                "Cannibale": 0,
                "Agent": 0,
                "Espion": 0,
                "Scientifique": 0,
                "Amoureux": 0,
                "La Bête": 0,
                "Chasseur de primes": 0,
                "Vaudou": 0
              }
            };
          }

          // Increment games played
          allPlayers[player].gamesPlayed++;

          // Get player's camp from their MainRoleInitial
          const playerCamp = playerStat.MainRoleInitial;

          // Increment camp count (using type assertion for safety)
          if (playerCamp in allPlayers[player].camps) {
            allPlayers[player].camps[playerCamp as keyof PlayerCamps]++;
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
