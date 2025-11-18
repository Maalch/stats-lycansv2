/**
 * Pure computation functions for player game history
 */

import type { GameLogEntry } from '../useCombinedRawData';
import { formatLycanDate} from './dataUtils';
import { getWinnerCampFromGame } from '../../utils/gameUtils';
import { getPlayerCampFromRole, getPlayerFinalRole, calculateGameDuration } from '../../utils/datasyncExport';
import { getPlayerId } from '../../utils/playerIdentification';
// Note: Player names are already normalized during data loading, so we can use Username directly

export interface PlayerGame {
  gameId: string;
  date: string;
  camp: string;
  won: boolean;
  winnerCamp: string;
  playersInGame: number;
  mapName: string;
  duration: number; // Duration in seconds
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
  totalPlayTime: number; // Total play time in seconds
  games: PlayerGame[];
  campStats: Record<string, CampStats>;
  mapStats: Record<string, MapStats>;
}


/**
 * Compute player game history from GameLogEntry data
 * @param playerIdentifier - Player name or ID to find
 * @param gameData - Array of game log entries
 * @param campFilter - Optional camp filter to only include games where player was in specific camp
 */
export function computePlayerGameHistory(
  playerIdentifier: string,
  gameData: GameLogEntry[],
  campFilter?: string
): PlayerGameHistoryData | null {
  if (!playerIdentifier || playerIdentifier.trim() === '' || gameData.length === 0) {
    return null;
  }

  // Find games where the player participated
  const playerGames: PlayerGame[] = [];
  let playerDisplayName = playerIdentifier; // Will be updated to latest display name

  gameData.forEach((game) => {
    // Find the player in this game's PlayerStats by ID or username
    const playerStat = game.PlayerStats.find(
      player => getPlayerId(player) === playerIdentifier || 
                player.Username.toLowerCase() === playerIdentifier.toLowerCase()
    );

    if (playerStat) {
      // Player names are already normalized during data loading
      playerDisplayName = playerStat.Username;
      
      // For Louveteau, always use MainRoleInitial even if they transformed to Loup
      // For other roles, use the final role after transformations
      const roleForCamp = playerStat.MainRoleInitial === 'Louveteau' 
        ? playerStat.MainRoleInitial 
        : getPlayerFinalRole(playerStat.MainRoleInitial, playerStat.MainRoleChanges || []);
      
      const playerCamp = getPlayerCampFromRole(roleForCamp);

      // Apply camp filter if specified
      if (campFilter && campFilter !== 'Tous les camps' && playerCamp !== campFilter) {
        return; // Skip this game if it doesn't match the camp filter
      }

      // Get the winning camp
      const winnerCamp = getWinnerCampFromGame(game);
      
      // Player won if they are marked as Victorious
      const playerWon = playerStat.Victorious;

      // Format date consistently
      const formattedDate = formatLycanDate(new Date(game.StartDate));

      // Calculate game duration in seconds
      const gameDuration = calculateGameDuration(game.StartDate, game.EndDate) || 0;

      playerGames.push({
        gameId: game.Id,
        date: formattedDate,
        camp: playerCamp,
        won: playerWon,
        winnerCamp: winnerCamp,
        playersInGame: game.PlayerStats.length,
        mapName: game.MapName,
        duration: gameDuration
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

  // Calculate total play time
  const totalPlayTime = playerGames.reduce((sum, game) => sum + game.duration, 0);

  return {
    playerName: playerDisplayName, // Use latest display name
    totalGames: totalGames,
    totalWins: totalWins,
    winRate: winRate,
    totalPlayTime: totalPlayTime,
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
