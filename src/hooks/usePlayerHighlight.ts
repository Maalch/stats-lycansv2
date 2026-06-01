import { useMemo, useRef } from 'react';
import { usePlayerSeriesFromRaw } from './usePlayerSeriesFromRaw';
import { useGameLogData } from './useCombinedRawData';
import type { AchievementsData, PlayerAchievements } from '../types/achievements';
import { computeAllHighlights, selectHighlight } from './utils/playerHighlightUtils';
import type { PlayerHighlight } from './utils/playerHighlightUtils';

/**
 * Hook that computes a single interesting highlight for a player.
 * Rotates on page reload (random selection from top candidates).
 * 
 * @param playerName - Canonical player name
 * @param achievementsData - Pre-loaded achievements data (from usePlayerAchievements)
 * @param playerAchievements - Pre-loaded player achievements (from usePlayerAchievements)
 */
export function usePlayerHighlight(
  playerName: string | null,
  achievementsData: AchievementsData | null,
  playerAchievements: PlayerAchievements | null,
): {
  highlight: PlayerHighlight | null;
  isLoading: boolean;
} {
  // Stable random seed per component mount (changes on reload)
  const randomSeed = useRef(Math.random()).current;

  const { data: seriesData, isLoading: seriesLoading } = usePlayerSeriesFromRaw();
  const { data: gameLogData, isLoading: gameLogLoading } = useGameLogData();

  const isLoading = seriesLoading || gameLogLoading;

  const highlight = useMemo(() => {
    if (!playerName || !gameLogData || isLoading) return null;

    // Get the player's last 10 game IDs
    const playerGameIds: string[] = [];
    // Games in GameStats are sorted chronologically (oldest first)
    for (let i = gameLogData.GameStats.length - 1; i >= 0; i--) {
      const game = gameLogData.GameStats[i];
      const playerInGame = game.PlayerStats.find(ps => ps.Username === playerName);
      if (playerInGame) {
        playerGameIds.push(game.Id);
        if (playerGameIds.length >= 10) break;
      }
    }

    const candidates = computeAllHighlights(
      playerName,
      seriesData,
      achievementsData,
      playerAchievements,
      gameLogData,
      playerGameIds
    );

    return selectHighlight(candidates, randomSeed);
  }, [playerName, seriesData, achievementsData, playerAchievements, gameLogData, isLoading, randomSeed]);

  return { highlight, isLoading };
}
