/**
 * Loot achievements processor - handles loot collection rate rankings
 */

import { findPlayerRank, createAchievement } from '../helpers.js';
import { getPlayerId } from '../../../src/utils/datasyncExport.js';
import { calculateGameDuration } from '../../../src/utils/datasyncExport.js';
import { getPlayerMainCampFromRole } from '../../../src/utils/datasyncExport.js';

/**
 * Check if a game has loot data
 */
function gameHasLootData(game) {
  return game.PlayerStats.some(
    player => player.TotalCollectedLoot !== undefined && player.TotalCollectedLoot !== null
  );
}

/**
 * Compute loot statistics for all players
 * @param {Array} gameData - Array of game log entries
 * @returns {Array} - Array of player loot stats with { playerId, gamesPlayed, totalLoot, totalGameDurationSeconds, lootPer60Min }
 */
function computeLootStats(gameData) {
  if (!gameData || gameData.length === 0) {
    return [];
  }

  // Filter games that have loot data
  const gamesWithData = gameData.filter(gameHasLootData);

  if (gamesWithData.length === 0) {
    return [];
  }

  const playerMap = new Map();

  // Process each game with loot data
  gamesWithData.forEach(game => {
    game.PlayerStats.forEach(player => {
      const playerId = getPlayerId(player);

      // Skip players without loot data
      if (player.TotalCollectedLoot === undefined || player.TotalCollectedLoot === null) {
        return;
      }

      // Calculate player-specific game duration
      // If player died, use their death time; otherwise use game end time
      const endTime = player.DeathDateIrl || game.EndDate;
      const playerGameDuration = calculateGameDuration(game.StartDate, endTime);
      
      // Skip players with invalid duration
      if (!playerGameDuration || playerGameDuration <= 0) {
        return;
      }

      if (!playerMap.has(playerId)) {
        playerMap.set(playerId, {
          playerId,
          gamesPlayed: 0,
          totalLoot: 0,
          totalGameDurationSeconds: 0
        });
      }

      const stats = playerMap.get(playerId);
      stats.gamesPlayed++;
      stats.totalLoot += player.TotalCollectedLoot;
      stats.totalGameDurationSeconds += playerGameDuration;
    });
  });

  // Convert to array and calculate normalized rate
  const playerStats = Array.from(playerMap.values()).map(stats => {
    // Normalize per 60 minutes (3600 seconds)
    // Formula: (totalLoot / totalGameDuration) * 3600
    const normalizationFactor = stats.totalGameDurationSeconds > 0 
      ? 3600 / stats.totalGameDurationSeconds 
      : 0;

    return {
      player: stats.playerId,  // Use 'player' field for consistency with findPlayerRank
      playerId: stats.playerId,
      gamesPlayed: stats.gamesPlayed,
      totalLoot: stats.totalLoot,
      totalGameDurationSeconds: stats.totalGameDurationSeconds,
      lootPer60Min: stats.totalLoot * normalizationFactor
    };
  });

  return playerStats;
}

/**
 * Process loot collection achievements for a player
 * @param {Array} gameData - Array of game log entries
 * @param {string} playerId - Steam ID or unique identifier of the player
 * @param {string} suffix - Suffix for achievement titles (e.g., ' (Parties Moddées)')
 * @returns {Array} - Array of achievements
 */
export function processLootAchievements(gameData, playerId, suffix) {
  const achievements = [];

  if (!gameData || gameData.length === 0) return achievements;

  // Compute loot statistics for all players
  const lootStats = computeLootStats(gameData);

  if (lootStats.length === 0) return achievements;

  // Loot rate ranking (min. 25 games)
  const eligiblePlayers = lootStats.filter(p => p.gamesPlayed >= 25);
  
  if (eligiblePlayers.length === 0) {
    return achievements;
  }
  
  const byLootRate = [...eligiblePlayers].sort((a, b) => b.lootPer60Min - a.lootPer60Min);
  const lootRateRank = findPlayerRank(byLootRate, playerId, p => p.lootPer60Min);
  
  if (lootRateRank) {
    achievements.push(createAchievement(
      `loot-rate-25-${suffix ? 'modded' : 'all'}`,
      `💎 Rang ${lootRateRank.rank} Taux de Récolte${suffix}`,
      `${lootRateRank.rank}${lootRateRank.rank === 1 ? 'er' : 'ème'} meilleur taux de récolte: ${lootRateRank.value.toFixed(1)} par 60 min (min. 25 parties)`,
      'good',
      lootRateRank.rank,
      lootRateRank.value,
      byLootRate.length,
      {
        tab: 'rankings',
        subtab: 'lootStats',
        view: 'normalized',
        minGames: 25
      }
      , 'loot'
    ));
  }

  return achievements;
}
