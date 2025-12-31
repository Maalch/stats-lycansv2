/**
 * Talking time statistics computation (server-side)
 */

import { getPlayerId, getCanonicalPlayerName, calculateGameDuration } from '../../../src/utils/datasyncExport.js';

/**
 * Check if a game has talking time data
 * @param {Object} game - Game log entry
 * @returns {boolean} - True if game has talking time data
 */
function gameHasTalkingData(game) {
  return game.PlayerStats.some(
    player => 
      (player.SecondsTalkedOutsideMeeting && player.SecondsTalkedOutsideMeeting > 0) || 
      (player.SecondsTalkedDuringMeeting && player.SecondsTalkedDuringMeeting > 0)
  );
}

/**
 * Compute talking time statistics from game data
 * @param {Array} gameData - Array of game log entries
 * @returns {Object|null} - Talking time statistics
 */
export function computeTalkingTimeStats(gameData) {
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

  const playerMap = new Map();

  // Process each game with talking time data
  gamesWithData.forEach(game => {
    game.PlayerStats.forEach(player => {
      const playerId = getPlayerId(player);
      const displayName = getCanonicalPlayerName(player);

      // Calculate player-specific game duration
      const endTime = player.DeathDateIrl || game.EndDate;
      const playerGameDuration = calculateGameDuration(game.StartDate, endTime);
      
      // Skip players with invalid duration
      if (!playerGameDuration || playerGameDuration <= 0) {
        return;
      }

      if (!playerMap.has(playerId)) {
        playerMap.set(playerId, {
          playerId,
          displayName,
          gamesPlayed: 0,
          totalSecondsOutside: 0,
          totalSecondsDuring: 0,
          totalGameDurationSeconds: 0
        });
      }

      const stats = playerMap.get(playerId);
      stats.gamesPlayed++;
      stats.totalSecondsOutside += player.SecondsTalkedOutsideMeeting || 0;
      stats.totalSecondsDuring += player.SecondsTalkedDuringMeeting || 0;
      stats.totalGameDurationSeconds += playerGameDuration;
    });
  });

  // Convert to array and calculate normalized stats (per 60 minutes)
  const playerStats = Array.from(playerMap.values()).map(stats => {
    const totalSecondsAll = stats.totalSecondsOutside + stats.totalSecondsDuring;
    
    // Normalize per 60 minutes (3600 seconds)
    const normalizationFactor = stats.totalGameDurationSeconds > 0 
      ? 3600 / stats.totalGameDurationSeconds 
      : 0;

    return {
      playerId: stats.playerId,
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
