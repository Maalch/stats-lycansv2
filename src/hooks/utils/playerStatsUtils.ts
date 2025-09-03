import type { RawGameData, RawRoleData } from '../useCombinedRawData';
import { splitAndTrim, didPlayerWin, buildGamePlayerCampMap, getPlayerCamp } from './dataUtils';
import type { PlayerStatsData, PlayerStat, PlayerCamps } from '../../types/api';

/**
 * Compute player statistics from raw game and role data
 */
export function computePlayerStats(
  gameData: RawGameData[],
  roleData: RawRoleData[]
): PlayerStatsData | null {
  if (gameData.length === 0 || roleData.length === 0) {
    return null;
  }

  // Build game-player-camp mapping from role data using shared utility
  const gamePlayerCampMap = buildGamePlayerCampMap(roleData);

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
  gameData.forEach(gameRow => {
    const gameId = gameRow["Game"]?.toString();
    const playerList = gameRow["Liste des joueurs"];
    const winnerList = gameRow["Liste des gagnants"];

    if (gameId && playerList) {
      totalGames++;
      const players = splitAndTrim(playerList.toString());

      players.forEach(playerName => {
        const player = playerName.trim();
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
                "Loups": 0,
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

          // Determine player's camp in this game using shared utility
          const playerCamp = getPlayerCamp(gamePlayerCampMap, gameId, player);

          // Increment camp count
          allPlayers[player].camps[playerCamp as keyof PlayerCamps]++;

          // Check if player won using shared utility
          const playerWon = didPlayerWin(player, winnerList?.toString());
          if (playerWon) {
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
