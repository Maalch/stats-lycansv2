/**
 * Pure computation functions for player game history
 */

import type { GameLogEntry } from '../useCombinedRawData';
import { formatLycanDate} from './dataUtils';
import { getWinnerCampFromGame, getPlayerCampFromRole } from '../../utils/gameUtils';

export interface PlayerGame {
  gameId: string;
  date: string;
  camp: string;
  won: boolean;
  winnerCamp: string;
  playersInGame: number;
  mapName: string;
}

export interface CampStats {
  appearances: number;
  wins: number;
  winRate: string;
}

export interface MapStats {
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
  mapStats: Record<string, MapStats>;
}


/**
 * Compute player game history from GameLogEntry data
 */
export function computePlayerGameHistory(
  playerName: string,
  gameData: GameLogEntry[]
): PlayerGameHistoryData | null {
  if (!playerName || playerName.trim() === '' || gameData.length === 0) {
    return null;
  }

  // Find games where the player participated
  const playerGames: PlayerGame[] = [];

  gameData.forEach((game) => {
    // Find the player in this game's PlayerStats
    const playerStat = game.PlayerStats.find(
      player => player.Username.toLowerCase() === playerName.toLowerCase()
    );

    if (playerStat) {
      // Get player's camp from their MainRoleFinal (which contains the full role name)
      const playerCamp = getPlayerCampFromRole(playerStat.MainRoleFinal);
      
      // Get the winning camp
      const winnerCamp = getWinnerCampFromGame(game);
      
      // Player won if they are marked as Victorious
      const playerWon = playerStat.Victorious;

      // Format date consistently
      const formattedDate = formatLycanDate(new Date(game.StartDate));

      playerGames.push({
        gameId: game.Id,
        date: formattedDate,
        camp: playerCamp,
        won: playerWon,
        winnerCamp: winnerCamp,
        playersInGame: game.PlayerStats.length,
        mapName: game.MapName
      });
    }
  });

  // Sort games by date (most recent first)
  playerGames.sort((a, b) => {
    // Convert DD/MM/YYYY to comparable format or use direct date comparison
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

  // Calculate map distribution with grouping logic
  const mapStats: Record<string, MapStats> = {};
  playerGames.forEach(game => {
    if (!mapStats[game.mapName]) {
      mapStats[game.mapName] = {
        appearances: 0,
        wins: 0,
        winRate: "0.00"
      };
    }
    mapStats[game.mapName].appearances++;
    if (game.won) {
      mapStats[game.mapName].wins++;
    }
  });

  // Calculate win rates for each map
  Object.keys(mapStats).forEach(mapName => {
    const stats = mapStats[mapName];
    stats.winRate = stats.appearances > 0 ? (stats.wins / stats.appearances * 100).toFixed(2) : "0.00";
  });

  return {
    playerName: playerName,
    totalGames: totalGames,
    totalWins: totalWins,
    winRate: winRate,
    games: playerGames,
    campStats: campStats,
    mapStats: mapStats
  };
}

/**
 * Group maps into main categories (Village, Château) and "Autres" if >= 10 games on other maps
 */
export function getGroupedMapStats(mapStats: Record<string, MapStats>): Record<string, MapStats> {
  const groupedStats: Record<string, MapStats> = {};
  
  // Count games on "other" maps (not Village or Château)
  let otherMapsTotal = 0;
  let otherMapsWins = 0;
  
  Object.entries(mapStats).forEach(([mapName, stats]) => {
    if (mapName === 'Village' || mapName === 'Château') {
      // Keep Village and Château as separate categories
      groupedStats[mapName] = { ...stats };
    } else {
      // Group all other maps
      otherMapsTotal += stats.appearances;
      otherMapsWins += stats.wins;
    }
  });
  
  // Add "Autres" category if there are at least 10 games on other maps
  if (otherMapsTotal >= 10) {
    groupedStats['Autres'] = {
      appearances: otherMapsTotal,
      wins: otherMapsWins,
      winRate: otherMapsTotal > 0 ? (otherMapsWins / otherMapsTotal * 100).toFixed(2) : "0.00"
    };
  }
  
  return groupedStats;
}
