import type { GameLogEntry } from '../useCombinedRawData';

export interface ColorStats {
  color: string;
  totalGames: number;
  totalPlayers: number;
  totalWins: number;
  winRate: number;
  avgPlayersPerGame: number;
}

/**
 * Compute color statistics from game log data
 * Returns statistics for each player color including win rate and average usage per game
 */
export function computeColorStats(gameData: GameLogEntry[]): ColorStats[] {
  // Map to track statistics per color
  const colorMap = new Map<string, {
    gamesWithColor: Set<string>;
    totalPlayerInstances: number;
    totalWins: number;
  }>();

  // Process each game
  gameData.forEach(game => {
    // Track colors used in this game for counting games per color
    const colorsInThisGame = new Set<string>();

    game.PlayerStats.forEach(player => {
      const color = player.Color;
      
      // Skip if no color information
      if (!color) return;

      // Initialize color entry if it doesn't exist
      if (!colorMap.has(color)) {
        colorMap.set(color, {
          gamesWithColor: new Set(),
          totalPlayerInstances: 0,
          totalWins: 0
        });
      }

      const colorStats = colorMap.get(color)!;
      
      // Add this game to the set of games where this color appears
      colorsInThisGame.add(color);
      
      // Count total player instances with this color
      colorStats.totalPlayerInstances++;
      
      // Count wins
      if (player.Victorious) {
        colorStats.totalWins++;
      }
    });

    // Update games count for all colors that appeared in this game
    colorsInThisGame.forEach(color => {
      colorMap.get(color)!.gamesWithColor.add(game.Id);
    });
  });

  // Convert map to array and calculate final statistics
  const colorStats: ColorStats[] = Array.from(colorMap.entries()).map(([color, stats]) => {
    const totalGames = stats.gamesWithColor.size;
    const winRate = stats.totalPlayerInstances > 0 
      ? (stats.totalWins / stats.totalPlayerInstances) * 100 
      : 0;
    const avgPlayersPerGame = totalGames > 0 
      ? stats.totalPlayerInstances / totalGames 
      : 0;

    return {
      color,
      totalGames,
      totalPlayers: stats.totalPlayerInstances,
      totalWins: stats.totalWins,
      winRate,
      avgPlayersPerGame
    };
  });

  // Sort by win rate descending
  return colorStats.sort((a, b) => b.winRate - a.winRate);
}
