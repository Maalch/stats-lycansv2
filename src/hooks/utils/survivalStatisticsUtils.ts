import type { GameLogEntry } from '../useCombinedRawData';
import { getPlayerCampFromRole } from '../../utils/datasyncExport';

/**
 * Parse death timing string to extract day number
 * @param deathTiming - Death timing string like "J3", "N2", "M1"
 * @returns Day number or null if parsing fails
 */
function parseDeathTimingDay(deathTiming: string | null): number | null {
  if (!deathTiming || deathTiming.trim() === '') {
    return null;
  }

  const trimmed = deathTiming.trim();
  const dayNumberStr = trimmed.slice(1);
  const dayNumber = parseInt(dayNumberStr, 10);

  if (isNaN(dayNumber) || dayNumber < 1) {
    return null;
  }

  return dayNumber;
}

/**
 * Player survival statistics for a specific day
 */
export interface PlayerSurvivalStats {
  playerName: string;
  totalGames: number; // Total games played by this player
  survivalsByDay: Record<number, number>; // Day number -> number of times survived to that day
  survivalRatesByDay: Record<number, number>; // Day number -> survival rate percentage for that day
  gamesPlayedByDay: Record<number, number>; // Day number -> number of games that reached that day
}

/**
 * Comprehensive survival statistics
 */
export interface SurvivalStatistics {
  totalGames: number;
  totalPlayersAnalyzed: number;
  playerSurvivalStats: PlayerSurvivalStats[];
  dayStats: Array<{
    dayNumber: number;
    totalGamesReachingDay: number;
    totalPlayersOnDay: number;
    averageSurvivalRate: number;
  }>;
}

/**
 * Calculate survival statistics by day for all players
 */
export function computeSurvivalStatistics(gameData: GameLogEntry[], campFilter?: string): SurvivalStatistics | null {
  if (gameData.length === 0) {
    return null;
  }

  // Filter games to only include those with complete death information
  const filteredGameData = gameData.filter(game => 
    !game.LegacyData || game.LegacyData.deathInformationFilled === true
  );

  if (filteredGameData.length === 0) {
    return null;
  }

  // Track player survival data
  const playerSurvivalMap: Record<string, PlayerSurvivalStats> = {};
  
  // Track overall day statistics
  const dayStatsMap: Record<number, {
    gamesReachingDay: number;
    playersOnDay: number;
    survivorsOnDay: number;
  }> = {};

  filteredGameData.forEach(game => {
    // Determine the maximum day reached in this game (from EndTiming)
    let maxDayInGame = 1; // Default to day 1
    if (game.EndTiming) {
      const gameEndDay = parseDeathTimingDay(game.EndTiming);
      if (gameEndDay) {
        maxDayInGame = gameEndDay;
      }
    }

    // Process each player in the game
    game.PlayerStats.forEach(player => {
      // Apply camp filter if specified
      if (campFilter && campFilter !== 'Tous les camps') {
        const playerCamp = getPlayerCampFromRole(player.MainRoleInitial, {
          regroupLovers: true,
          regroupVillagers: true,
          regroupWolfSubRoles: false
        });
        
        if (playerCamp !== campFilter) {
          return; // Skip this player if not in selected camp
        }
      }

      const playerName = player.Username;
      
      // Initialize player stats if not exists
      if (!playerSurvivalMap[playerName]) {
        playerSurvivalMap[playerName] = {
          playerName,
          totalGames: 0,
          survivalsByDay: {},
          survivalRatesByDay: {},
          gamesPlayedByDay: {}
        };
      }

      const playerStats = playerSurvivalMap[playerName];
      playerStats.totalGames++;

      // Determine the day this player died (or survived)
      let playerDeathDay: number | null = null;
      if (player.DeathTiming) {
        playerDeathDay = parseDeathTimingDay(player.DeathTiming);
      }

      // For each day from 1 to maxDayInGame, check if player survived
      for (let day = 1; day <= maxDayInGame; day++) {
        // Initialize day tracking
        if (!playerStats.gamesPlayedByDay[day]) {
          playerStats.gamesPlayedByDay[day] = 0;
          playerStats.survivalsByDay[day] = 0;
        }
        
        if (!dayStatsMap[day]) {
          dayStatsMap[day] = {
            gamesReachingDay: 0,
            playersOnDay: 0,
            survivorsOnDay: 0
          };
        }

        // This player participated in a game that reached this day
        playerStats.gamesPlayedByDay[day]++;
        dayStatsMap[day].playersOnDay++;

        // Check if player survived to this day
        // Player survived if they either:
        // 1. Never died (playerDeathDay is null)
        // 2. Died on a day AFTER this day (playerDeathDay > day)
        const survivedToDay = !playerDeathDay || playerDeathDay > day;
        
        if (survivedToDay) {
          playerStats.survivalsByDay[day]++;
          dayStatsMap[day].survivorsOnDay++;
        }
      }

      // Track games reaching each day (only count once per game)
      for (let day = 1; day <= maxDayInGame; day++) {
        // We need to be careful not to double-count games
        // We'll count this in the day stats processing below
      }
    });

    // Count games reaching each day (once per game)
    for (let day = 1; day <= maxDayInGame; day++) {
      if (!dayStatsMap[day]) {
        dayStatsMap[day] = {
          gamesReachingDay: 0,
          playersOnDay: 0,
          survivorsOnDay: 0
        };
      }
      dayStatsMap[day].gamesReachingDay++;
    }
  });

  // Calculate survival rates for each player
  Object.values(playerSurvivalMap).forEach(playerStats => {
    Object.keys(playerStats.gamesPlayedByDay).forEach(dayStr => {
      const day = parseInt(dayStr);
      const gamesPlayedOnDay = playerStats.gamesPlayedByDay[day];
      const survivalsOnDay = playerStats.survivalsByDay[day];
      
      if (gamesPlayedOnDay > 0) {
        playerStats.survivalRatesByDay[day] = (survivalsOnDay / gamesPlayedOnDay) * 100;
      } else {
        playerStats.survivalRatesByDay[day] = 0;
      }
    });
  });

  // Convert to arrays and calculate overall day statistics
  const playerSurvivalStats = Object.values(playerSurvivalMap)
    .filter(player => player.totalGames > 0)
    .sort((a, b) => b.totalGames - a.totalGames);

  const dayStats = Object.entries(dayStatsMap)
    .map(([dayStr, stats]) => ({
      dayNumber: parseInt(dayStr),
      totalGamesReachingDay: stats.gamesReachingDay,
      totalPlayersOnDay: stats.playersOnDay,
      averageSurvivalRate: stats.playersOnDay > 0 ? (stats.survivorsOnDay / stats.playersOnDay) * 100 : 0
    }))
    .sort((a, b) => a.dayNumber - b.dayNumber);

  return {
    totalGames: filteredGameData.length,
    totalPlayersAnalyzed: playerSurvivalStats.length,
    playerSurvivalStats,
    dayStats
  };
}

/**
 * Get players with highest survival rate for a specific day
 * @param survivalStats - Survival statistics data
 * @param dayNumber - Day number to analyze
 * @param minGames - Minimum number of games required
 * @returns Array of players sorted by survival rate (highest first)
 */
export function getTopSurvivorsForDay(
  survivalStats: SurvivalStatistics,
  dayNumber: number,
  minGames: number = 10
): Array<{
  playerName: string;
  survivalRate: number;
  gamesPlayed: number;
  timesReachedDay: number;
  timesSurvivedDay: number;
}> {
  return survivalStats.playerSurvivalStats
    .filter(player => (player.gamesPlayedByDay[dayNumber] || 0) >= minGames)
    .map(player => ({
      playerName: player.playerName,
      survivalRate: player.survivalRatesByDay[dayNumber] || 0,
      gamesPlayed: player.totalGames,
      timesReachedDay: player.gamesPlayedByDay[dayNumber] || 0,
      timesSurvivedDay: player.survivalsByDay[dayNumber] || 0
    }))
    .sort((a, b) => b.survivalRate - a.survivalRate)
    .slice(0, 15);
}

/**
 * Get players with lowest survival rate for a specific day
 * @param survivalStats - Survival statistics data
 * @param dayNumber - Day number to analyze
 * @param minGames - Minimum number of games required
 * @returns Array of players sorted by survival rate (lowest first)
 */
export function getWorstSurvivorsForDay(
  survivalStats: SurvivalStatistics,
  dayNumber: number,
  minGames: number = 10
): Array<{
  playerName: string;
  survivalRate: number;
  gamesPlayed: number;
  timesReachedDay: number;
  timesSurvivedDay: number;
}> {
  return survivalStats.playerSurvivalStats
    .filter(player => (player.gamesPlayedByDay[dayNumber] || 0) >= minGames)
    .map(player => ({
      playerName: player.playerName,
      survivalRate: player.survivalRatesByDay[dayNumber] || 0,
      gamesPlayed: player.totalGames,
      timesReachedDay: player.gamesPlayedByDay[dayNumber] || 0,
      timesSurvivedDay: player.survivalsByDay[dayNumber] || 0
    }))
    .sort((a, b) => a.survivalRate - b.survivalRate)
    .slice(0, 15);
}