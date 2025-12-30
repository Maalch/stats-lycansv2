import type { GameLogEntry } from '../useCombinedRawData';
import { getPlayerId, getCanonicalPlayerName } from '../../utils/playerIdentification';
import { calculateGameDuration } from '../../utils/datasyncExport';

export interface PlayerLootStats {
  player: string;
  gamesPlayed: number;
  totalLoot: number;
  averageLoot: number;
  totalGameDurationSeconds: number; // Total game time for normalization
  lootPer60Min: number; // Normalized loot collection rate per 60 minutes
}

export interface LootStatsData {
  playerStats: PlayerLootStats[];
  totalGames: number;
  gamesWithLootData: number; // Games that have loot data
}

/**
 * Check if a game has loot data
 * Games without this feature will have undefined/missing TotalCollectedLoot
 */
function gameHasLootData(game: GameLogEntry): boolean {
  // Check if at least one player has loot data defined
  return game.PlayerStats.some(
    player => player.TotalCollectedLoot !== undefined && player.TotalCollectedLoot !== null
  );
}

/**
 * Compute per-player loot statistics from game log data
 * Excludes games without loot data (created before feature implementation)
 */
export function computeLootStats(gameData: GameLogEntry[]): LootStatsData | null {
  if (!gameData || gameData.length === 0) {
    return null;
  }

  // Filter games that have loot data
  const gamesWithData = gameData.filter(gameHasLootData);

  if (gamesWithData.length === 0) {
    return {
      playerStats: [],
      totalGames: gameData.length,
      gamesWithLootData: 0
    };
  }

  const playerMap = new Map<string, {
    displayName: string;
    gamesPlayed: number;
    totalLoot: number;
    totalGameDurationSeconds: number;
  }>();

  // Process each game with loot data
  gamesWithData.forEach(game => {
    game.PlayerStats.forEach(player => {
      const playerId = getPlayerId(player);
      const displayName = getCanonicalPlayerName(player);

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
          displayName,
          gamesPlayed: 0,
          totalLoot: 0,
          totalGameDurationSeconds: 0
        });
      }

      const stats = playerMap.get(playerId)!;
      stats.gamesPlayed++;
      stats.totalLoot += player.TotalCollectedLoot;
      stats.totalGameDurationSeconds += playerGameDuration;
    });
  });

  // Convert to array and calculate average and normalized rate
  const playerStats: PlayerLootStats[] = Array.from(playerMap.entries()).map(([_, stats]) => {
    // Normalize per 60 minutes (3600 seconds)
    // Formula: (totalLoot / totalGameDuration) * 3600
    const normalizationFactor = stats.totalGameDurationSeconds > 0 
      ? 3600 / stats.totalGameDurationSeconds 
      : 0;

    return {
      player: stats.displayName,
      gamesPlayed: stats.gamesPlayed,
      totalLoot: stats.totalLoot,
      averageLoot: stats.gamesPlayed > 0 ? stats.totalLoot / stats.gamesPlayed : 0,
      totalGameDurationSeconds: stats.totalGameDurationSeconds,
      lootPer60Min: stats.totalLoot * normalizationFactor
    };
  });

  return {
    playerStats,
    totalGames: gameData.length,
    gamesWithLootData: gamesWithData.length
  };
}
