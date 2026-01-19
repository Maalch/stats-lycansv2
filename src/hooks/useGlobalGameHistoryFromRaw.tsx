import { useGameStatsBase } from './utils/baseStatsHook';
import type { GameLogEntry } from './useCombinedRawData';
import { formatLycanDate } from './utils/dataUtils';
import { getWinnerCampFromGame } from '../utils/gameUtils';
import { calculateGameDuration } from '../utils/datasyncExport';

// Game summary for global history
export interface GlobalGameSummary {
  gameId: string;
  date: string;
  mapName: string;
  playerCount: number;
  winnerCamp: string;
  duration: number; // Duration in seconds
  modded: boolean;
}

// Camp victory stats per period
export interface CampPeriodStats {
  camp: string;
  wins: number;
  winRate: number;
}

// Grouped data point for charts
export interface GlobalPeriodData {
  period: string;
  totalGames: number;
  averagePlayers: number;
  averageDuration: number; // in minutes
  campStats: CampPeriodStats[];
  // Individual camp win rates for easy charting
  villageoisWinRate: number;
  loupWinRate: number;
  soloWinRate: number;
}

// Full global game history data
export interface GlobalGameHistoryData {
  totalGames: number;
  games: GlobalGameSummary[];
  periodData: GlobalPeriodData[];
}

/**
 * Compute global game history from GameLogEntry data
 */
function computeGlobalGameHistory(gameData: GameLogEntry[]): GlobalGameHistoryData | null {
  if (!gameData || gameData.length === 0) {
    return null;
  }

  // Build game summaries
  const games: GlobalGameSummary[] = gameData.map(game => {
    const winnerCamp = getWinnerCampFromGame(game);
    const duration = calculateGameDuration(game.StartDate, game.EndDate) || 0;
    const formattedDate = formatLycanDate(new Date(game.StartDate));

    return {
      gameId: game.Id,
      date: formattedDate,
      mapName: game.MapName,
      playerCount: game.PlayerStats.length,
      winnerCamp,
      duration,
      modded: game.Modded
    };
  });

  // Sort games by date (most recent first)
  games.sort((a, b) => {
    const parseDate = (dateStr: string): Date => {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
      return new Date(dateStr);
    };
    return parseDate(b.date).getTime() - parseDate(a.date).getTime();
  });

  return {
    totalGames: games.length,
    games,
    periodData: [] // Will be computed in the component based on grouping method
  };
}

/**
 * Hook pour calculer l'historique global des parties à partir des données brutes filtrées.
 */
export function useGlobalGameHistoryFromRaw() {
  const { data: globalGameHistory, isLoading, error } = useGameStatsBase(computeGlobalGameHistory);

  return {
    data: globalGameHistory,
    isLoading,
    error
  };
}
