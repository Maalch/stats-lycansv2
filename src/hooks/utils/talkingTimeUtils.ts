import type { GameLogEntry } from '../useCombinedRawData';
import { getPlayerId, getCanonicalPlayerName } from '../../utils/playerIdentification';
import { calculateGameDuration } from '../../utils/datasyncExport';

export interface PlayerTalkingTimeStats {
  player: string;
  gamesPlayed: number;
  totalSecondsOutside: number;
  totalSecondsDuring: number;
  totalSecondsAll: number;
  totalGameDurationSeconds: number; // Total game time for normalization
  // Normalized per 60 minutes (3600 seconds)
  secondsOutsidePer60Min: number;
  secondsDuringPer60Min: number;
  secondsAllPer60Min: number;
}

export interface TalkingTimeData {
  playerStats: PlayerTalkingTimeStats[];
  totalGames: number;
  gamesWithTalkingData: number; // Games that have talking time data
}

/**
 * Check if a game has talking time data
 * Games without this feature will have 0 for all players
 */
function gameHasTalkingData(game: GameLogEntry): boolean {
  // Check if at least one player has non-zero talking time
  return game.PlayerStats.some(
    player => 
      player.SecondsTalkedOutsideMeeting > 0 || 
      player.SecondsTalkedDuringMeeting > 0
  );
}

/**
 * Compute per-player talking time statistics from game log data
 * Excludes games without talking time data (created before feature implementation)
 * Normalizes talking time per 60 minutes of gameplay
 */
export function computeTalkingTimeStats(gameData: GameLogEntry[]): TalkingTimeData | null {
  if (!gameData || gameData.length === 0) {
    return null;
  }

  // Filter games that have talking time data
  const gamesWithData = gameData.filter(gameHasTalkingData);

  if (gamesWithData.length === 0) {
    return {
      playerStats: [],
      totalGames: gameData.length,
      gamesWithTalkingData: 0
    };
  }

  const playerMap = new Map<string, {
    displayName: string;
    gamesPlayed: number;
    totalSecondsOutside: number;
    totalSecondsDuring: number;
    totalGameDurationSeconds: number;
  }>();

  // Process each game with talking time data
  gamesWithData.forEach(game => {
    const gameDuration = calculateGameDuration(game.StartDate, game.EndDate);
    
    // Skip games without valid duration
    if (!gameDuration || gameDuration <= 0) {
      return;
    }

    game.PlayerStats.forEach(player => {
      const playerId = getPlayerId(player);
      const displayName = getCanonicalPlayerName(player);

      if (!playerMap.has(playerId)) {
        playerMap.set(playerId, {
          displayName,
          gamesPlayed: 0,
          totalSecondsOutside: 0,
          totalSecondsDuring: 0,
          totalGameDurationSeconds: 0
        });
      }

      const stats = playerMap.get(playerId)!;
      stats.gamesPlayed++;
      stats.totalSecondsOutside += player.SecondsTalkedOutsideMeeting || 0;
      stats.totalSecondsDuring += player.SecondsTalkedDuringMeeting || 0;
      stats.totalGameDurationSeconds += gameDuration;
    });
  });

  // Convert to array and calculate normalized stats (per 60 minutes)
  const playerStats: PlayerTalkingTimeStats[] = Array.from(playerMap.entries()).map(([_, stats]) => {
    const totalSecondsAll = stats.totalSecondsOutside + stats.totalSecondsDuring;
    
    // Normalize per 60 minutes (3600 seconds)
    // Formula: (totalTalkingTime / totalGameDuration) * 3600
    const normalizationFactor = stats.totalGameDurationSeconds > 0 
      ? 3600 / stats.totalGameDurationSeconds 
      : 0;

    return {
      player: stats.displayName,
      gamesPlayed: stats.gamesPlayed,
      totalSecondsOutside: stats.totalSecondsOutside,
      totalSecondsDuring: stats.totalSecondsDuring,
      totalSecondsAll,
      totalGameDurationSeconds: stats.totalGameDurationSeconds,
      secondsOutsidePer60Min: stats.totalSecondsOutside * normalizationFactor,
      secondsDuringPer60Min: stats.totalSecondsDuring * normalizationFactor,
      secondsAllPer60Min: totalSecondsAll * normalizationFactor
    };
  });

  return {
    playerStats,
    totalGames: gameData.length,
    gamesWithTalkingData: gamesWithData.length
  };
}
