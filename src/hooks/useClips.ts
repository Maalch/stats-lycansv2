import { useMemo } from 'react';
import { useFilteredGameLogData } from './useCombinedRawData';
import type { Clip } from './useCombinedRawData';
import { filterClipsByPlayer, getRandomClip } from '../utils/clipUtils';

/**
 * Hook to get all clips across all filtered games
 */
export function useAllClips(): {
  clips: Clip[];
  isLoading: boolean;
  error: string | null;
} {
  const { data: gameData, isLoading, error } = useFilteredGameLogData();

  const clips = useMemo(() => {
    if (!gameData) return [];
    
    // Collect all clips from all games
    const allClips: Clip[] = [];
    gameData.forEach(game => {
      if (game.Clips && Array.isArray(game.Clips)) {
        allClips.push(...game.Clips);
      }
    });
    
    return allClips;
  }, [gameData]);

  return { clips, isLoading, error };
}

/**
 * Hook to get clips for a specific player
 */
export function usePlayerClips(playerName: string | null): {
  clips: Clip[];
  isLoading: boolean;
  error: string | null;
} {
  const { clips: allClips, isLoading, error } = useAllClips();

  const playerClips = useMemo(() => {
    if (!playerName) return [];
    return filterClipsByPlayer(allClips, playerName);
  }, [allClips, playerName]);

  return { clips: playerClips, isLoading, error };
}

/**
 * Hook to get a random clip for a player
 */
export function useRandomPlayerClip(playerName: string | null): {
  getRandomClip: () => Clip | null;
  isLoading: boolean;
  error: string | null;
} {
  const { clips: playerClips, isLoading, error } = usePlayerClips(playerName);

  const getRandomClipFn = () => {
    return getRandomClip(playerClips);
  };

  return { getRandomClip: getRandomClipFn, isLoading, error };
}

/**
 * Hook to get clips for a specific game
 */
export function useGameClips(gameId: string | null): {
  clips: Clip[];
  isLoading: boolean;
  error: string | null;
} {
  const { data: gameData, isLoading, error } = useFilteredGameLogData();

  const gameClips = useMemo(() => {
    if (!gameId || !gameData) return [];
    
    const game = gameData.find(g => g.Id === gameId || g.DisplayedId === gameId);
    if (!game || !game.Clips) return [];
    
    return game.Clips;
  }, [gameData, gameId]);

  return { clips: gameClips, isLoading, error };
}
