import { useMemo } from 'react';
import { useFilteredGameLogData } from './useCombinedRawData';
import type { Clip } from './useCombinedRawData';
import { filterClipsByPlayer, getRandomClip } from '../utils/clipUtils';

export interface ClipWithGameContext extends Clip {
  gameId: string;
  gameDate: string;
  gameNumber: number;
}

/**
 * Hook to get all clips across all filtered games, enriched with game context
 */
export function useAllClips(): {
  clips: ClipWithGameContext[];
  isLoading: boolean;
  error: string | null;
} {
  const { data: gameData, isLoading, error } = useFilteredGameLogData();

  const clips = useMemo(() => {
    if (!gameData) return [];
    
    // Collect all clips from all games, attaching game context to each
    const allClips: ClipWithGameContext[] = [];
    gameData.forEach(game => {
      if (game.Clips && Array.isArray(game.Clips)) {
        game.Clips.forEach(clip => {
          allClips.push({
            ...clip,
            gameId: game.DisplayedId || game.Id,
            gameDate: game.StartDate,
            gameNumber: parseInt(game.DisplayedId || game.Id, 10)
          });
        });
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
  clips: ClipWithGameContext[];
  isLoading: boolean;
  error: string | null;
} {
  const { clips: allClips, isLoading, error } = useAllClips();

  const playerClips = useMemo(() => {
    if (!playerName) return [];
    return filterClipsByPlayer(allClips, playerName) as ClipWithGameContext[];
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
