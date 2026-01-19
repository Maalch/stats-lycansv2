import { useGameStatsBase } from './utils/baseStatsHook';
import { getWinnerCampFromGame } from '../utils/gameUtils';
import type { GameLogEntry } from './useCombinedRawData';

interface CampWinRateByDay {
  day: number;
  villageoisWins: number;
  loupsWins: number;
  soloWins: number;
  totalGames: number;
  villageoisWinRate: number;
  loupsWinRate: number;
  soloWinRate: number;
}

function computeCampWinRateByGameTime(gameData: GameLogEntry[]): CampWinRateByDay[] | null {
  if (!gameData || gameData.length === 0) return null;

  // Map to store win counts by day
  const dayMap = new Map<number, {
    villageoisWins: number;
    loupsWins: number;
    soloWins: number;
    totalGames: number;
  }>();

  // Process each game
  gameData.forEach((game: GameLogEntry) => {
      // Skip games without EndTiming
      if (!game.EndTiming) return;

      // Parse EndTiming to extract day number (format: J3, N2, M4, etc.)
      const match = game.EndTiming.match(/^[JNM](\d+)$/);
      if (!match) return;

      const dayNumber = parseInt(match[1], 10);
      if (isNaN(dayNumber)) return;

      // Initialize day entry if not exists
      if (!dayMap.has(dayNumber)) {
        dayMap.set(dayNumber, {
          villageoisWins: 0,
          loupsWins: 0,
          soloWins: 0,
          totalGames: 0
        });
      }

      const dayStats = dayMap.get(dayNumber)!;
      dayStats.totalGames++;

      // Determine winning camp using the standard utility function
      const winnerCamp = getWinnerCampFromGame(game);
      
      // Count wins by camp
      if (winnerCamp === 'Villageois') {
        dayStats.villageoisWins++;
      } else if (winnerCamp === 'Loup') {
        dayStats.loupsWins++;
      } else {
        // All other camps (Amoureux, Agent, etc.) are solo wins
        dayStats.soloWins++;
      }
    });

    // Convert to array and calculate win rates
    const result: CampWinRateByDay[] = Array.from(dayMap.entries())
      .map(([day, stats]) => ({
        day,
        villageoisWins: stats.villageoisWins,
        loupsWins: stats.loupsWins,
        soloWins: stats.soloWins,
        totalGames: stats.totalGames,
        villageoisWinRate: (stats.villageoisWins / stats.totalGames) * 100,
        loupsWinRate: (stats.loupsWins / stats.totalGames) * 100,
        soloWinRate: (stats.soloWins / stats.totalGames) * 100
      }))
      .filter(day => day.totalGames >= 5) // Only include days with at least 5 games
      .sort((a, b) => a.day - b.day);

  return result;
}

export function useCampWinRateByGameTime() {
  const { data, isLoading, error } = useGameStatsBase(computeCampWinRateByGameTime);

  return {
    data,
    isLoading,
    error
  };
}
