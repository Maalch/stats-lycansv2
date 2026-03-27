import type { GameLogEntry } from '../useCombinedRawData';
import { getPlayerId, getCanonicalPlayerName } from '../../utils/playerIdentification';

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
  // Total number of games (used for avgPlayersPerGame calculation)
  const totalGamesCount = gameData.length;

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
    // avgPlayersPerGame now uses total games count, not just games where color appears
    const avgPlayersPerGame = totalGamesCount > 0 
      ? stats.totalPlayerInstances / totalGamesCount 
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

export interface PlayerColorCell {
  playerName: string;
  color: string;
  count: number;
}

export interface PlayerColorMatrix {
  players: { id: string; name: string; totalGames: number }[];
  colors: string[];
  cells: PlayerColorCell[];
  maxCount: number;
}

const TOP_N_PER_COLOR = 15;

export function computePlayerColorMatrix(gameData: GameLogEntry[]): PlayerColorMatrix {
  // Map: playerId -> { name, totalGames, colorCounts: Map<color, count> }
  const playerMap = new Map<string, {
    name: string;
    totalGames: number;
    colorCounts: Map<string, number>;
  }>();

  const allColors = new Set<string>();

  gameData.forEach(game => {
    game.PlayerStats.forEach(player => {
      const color = player.Color;
      if (!color) return;

      allColors.add(color);
      const id = getPlayerId(player);

      if (!playerMap.has(id)) {
        playerMap.set(id, {
          name: getCanonicalPlayerName(player),
          totalGames: 0,
          colorCounts: new Map()
        });
      }

      const entry = playerMap.get(id)!;
      entry.totalGames++;
      entry.colorCounts.set(color, (entry.colorCounts.get(color) || 0) + 1);
    });
  });

  // For each color, find top N players → collect union of visible players
  const visiblePlayerIds = new Set<string>();

  const sortedColors = Array.from(allColors).sort();

  for (const color of sortedColors) {
    const playersWithColor = Array.from(playerMap.entries())
      .filter(([, data]) => (data.colorCounts.get(color) || 0) > 0)
      .sort(([, a], [, b]) => (b.colorCounts.get(color) || 0) - (a.colorCounts.get(color) || 0))
      .slice(0, TOP_N_PER_COLOR);

    for (const [id] of playersWithColor) {
      visiblePlayerIds.add(id);
    }
  }

  // Build sorted player list (by total games desc)
  const players = Array.from(visiblePlayerIds)
    .map(id => {
      const data = playerMap.get(id)!;
      return { id, name: data.name, totalGames: data.totalGames };
    })
    .sort((a, b) => b.totalGames - a.totalGames);

  // Build cells and find max count
  let maxCount = 0;
  const cells: PlayerColorCell[] = [];

  for (const player of players) {
    const data = playerMap.get(player.id)!;
    for (const color of sortedColors) {
      const count = data.colorCounts.get(color) || 0;
      if (count > 0) {
        cells.push({ playerName: player.name, color, count });
        if (count > maxCount) maxCount = count;
      }
    }
  }

  return { players, colors: sortedColors, cells, maxCount };
}
