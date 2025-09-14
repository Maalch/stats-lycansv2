/**
 * Pure computation functions for player game history
 */

import type { GameLogEntry, RawRoleData } from '../useCombinedRawData';
import { 
  splitAndTrim, 
  buildGamePlayerCampMap, 
  getPlayerCamp, 
  formatLycanDate,
  didCampWin
} from './dataUtils';

export interface PlayerGame {
  gameId: string;
  date: string;
  camp: string;
  won: boolean;
  winnerCamp: string;
  playersInGame: number;
}

export interface CampStats {
  appearances: number;
  wins: number;
  winRate: string;
}

export interface PlayerGameHistoryData {
  playerName: string;
  totalGames: number;
  totalWins: number;
  winRate: string;
  games: PlayerGame[];
  campStats: Record<string, CampStats>;
}

/**
 * Helper function to determine if a player won the game with Agent camp logic
 */
function didPlayerWinWithAgentLogic(
  playerName: string, 
  playerCamp: string,
  winnerCamp: string,
  winnerList: string | null | undefined
): boolean {
  // Special case for Agent camp: only winners in the list actually won
  if (playerCamp === "Agent" && winnerCamp === "Agent") {
    if (winnerList && winnerList.trim() !== "") {
      const winners = splitAndTrim(winnerList);
      return winners.some(winner => winner.toLowerCase() === playerName.toLowerCase());
    }
    return false;
  }
  
  // For other camps, use the didCampWin utility which handles Traître-Loups alliance
  return didCampWin(playerCamp, winnerCamp);
}

/**
 * Compute player game history from raw data
 */
export function computePlayerGameHistory(
  playerName: string,
  gameData: RawGameData[],
  roleData: RawRoleData[]
): PlayerGameHistoryData | null {
  if (!playerName || playerName.trim() === '' || gameData.length === 0 || roleData.length === 0) {
    return null;
  }

  // Build game-player-camp mapping once for efficient lookups
  const gamePlayerCampMap = buildGamePlayerCampMap(roleData);

  // Find games where the player participated
  const playerGames: PlayerGame[] = [];

  gameData.forEach(gameRow => {
    const gameId = gameRow.Game?.toString();
    const date = gameRow.Date;
    const playerList = gameRow["Liste des joueurs"];
    const winnerCamp = gameRow["Camp victorieux"];
    const winnerList = gameRow["Liste des gagnants"];

    if (gameId && playerList && date && winnerList) {
      // Check if player is in the game
      const players = splitAndTrim(playerList.toString());
      const playerInGame = players.some(p => p.toLowerCase() === playerName.toLowerCase());

      if (playerInGame) {
        // Determine player's camp
        const playerCamp = getPlayerCamp(gamePlayerCampMap, gameId, playerName);

        // Determine win/loss status with Agent camp logic
        const playerWon = didPlayerWinWithAgentLogic(
          playerName, 
          playerCamp, 
          winnerCamp, 
          winnerList?.toString()
        );

        // Format date consistently
        const formattedDate = formatLycanDate(date);

        playerGames.push({
          gameId: gameId,
          date: formattedDate,
          camp: playerCamp,
          won: playerWon,
          winnerCamp: winnerCamp?.toString() || '',
          playersInGame: players.length
        });
      }
    }
  });

  // Sort games by date (most recent first)
  playerGames.sort((a, b) => {
    // Convert DD/MM/YYYY to comparable format
    const parseDate = (dateStr: string): Date => {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
      return new Date(dateStr);
    };

    return parseDate(b.date).getTime() - parseDate(a.date).getTime();
  });

  // Calculate summary statistics
  const totalGames = playerGames.length;
  const totalWins = playerGames.filter(game => game.won).length;
  const winRate = totalGames > 0 ? (totalWins / totalGames * 100).toFixed(2) : "0.00";

  // Calculate camp distribution
  const campStats: Record<string, CampStats> = {};
  playerGames.forEach(game => {
    if (!campStats[game.camp]) {
      campStats[game.camp] = {
        appearances: 0,
        wins: 0,
        winRate: "0.00"
      };
    }
    campStats[game.camp].appearances++;
    if (game.won) {
      campStats[game.camp].wins++;
    }
  });

  // Calculate win rates for each camp
  Object.keys(campStats).forEach(camp => {
    const stats = campStats[camp];
    stats.winRate = stats.appearances > 0 ? (stats.wins / stats.appearances * 100).toFixed(2) : "0.00";
  });

  return {
    playerName: playerName,
    totalGames: totalGames,
    totalWins: totalWins,
    winRate: winRate,
    games: playerGames,
    campStats: campStats
  };
}
