import { useGameStatsBase } from './utils/baseStatsHook';
import type { GameLogEntry } from './useCombinedRawData';
import { getPlayerId, getCanonicalPlayerName } from '../utils/playerIdentification';

export interface PlayerColorRankingEntry {
  playerName: string;
  gamesPlayed: number;
  wins: number;
  winRate: number;
}

export interface PlayerColorRankingData {
  colors: string[];
  byColor: Map<string, PlayerColorRankingEntry[]>;
}

function computePlayerColorRanking(gameData: GameLogEntry[]): PlayerColorRankingData {
  // Map: playerId -> { name, colorStats: Map<color, {games, wins}> }
  const playerMap = new Map<string, {
    name: string;
    colorStats: Map<string, { games: number; wins: number }>;
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
          colorStats: new Map()
        });
      }

      const entry = playerMap.get(id)!;
      if (!entry.colorStats.has(color)) {
        entry.colorStats.set(color, { games: 0, wins: 0 });
      }
      const cs = entry.colorStats.get(color)!;
      cs.games++;
      if (player.Victorious) {
        cs.wins++;
      }
    });
  });

  const colors = Array.from(allColors).sort();

  const byColor = new Map<string, PlayerColorRankingEntry[]>();

  for (const color of colors) {
    const entries: PlayerColorRankingEntry[] = [];
    for (const [, data] of playerMap) {
      const cs = data.colorStats.get(color);
      if (cs && cs.games > 0) {
        entries.push({
          playerName: data.name,
          gamesPlayed: cs.games,
          wins: cs.wins,
          winRate: (cs.wins / cs.games) * 100
        });
      }
    }
    byColor.set(color, entries);
  }

  return { colors, byColor };
}

export function usePlayerColorRankingFromRaw() {
  return useGameStatsBase(
    (gameData) => computePlayerColorRanking(gameData)
  );
}
