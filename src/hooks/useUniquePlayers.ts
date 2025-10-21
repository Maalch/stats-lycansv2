/**
 * Hook to get all unique players with their aggregated statistics
 * Uses ID as the primary identifier, falls back to Username when ID is null
 */

import { useMemo } from 'react';
import { useFilteredGameLogData } from './useCombinedRawData';
import type { PlayerStat } from './useCombinedRawData';
import { groupPlayersByIdentifier } from '../utils/playerIdentification';

export interface UniquePlayer {
  id: string;                    // Unique identifier (ID or Username)
  displayName: string;           // Most recent username
  steamId: string | null;        // Steam ID if available
  gamesPlayed: number;           // Total games played
  alternateUsernames: string[];  // All usernames used by this player (if ID-based merging occurred)
}

/**
 * Get all unique players from the filtered game data
 * Players with the same ID but different usernames are merged together
 * The most recent username is used as the display name
 */
export function useUniquePlayers(): {
  players: UniquePlayer[];
  isLoading: boolean;
  error: string | null;
} {
  const { data: gameData, isLoading, error } = useFilteredGameLogData();

  const players = useMemo(() => {
    if (!gameData) return [];

    // Collect all player stats from all games
    const allPlayerStats: PlayerStat[] = [];
    gameData.forEach(game => {
      allPlayerStats.push(...game.PlayerStats);
    });

    // Group by unique identifier (ID or Username)
    const playerGroups = groupPlayersByIdentifier(allPlayerStats);

    // Build unique player list
    const uniquePlayers: UniquePlayer[] = [];

    playerGroups.forEach((stats, playerId) => {
      // Collect all unique usernames for this player
      const usernames = new Set(stats.map(s => s.Username));
      const usernameArray = Array.from(usernames);

      // Use the most recent username (last occurrence) as display name
      const mostRecentUsername = stats[stats.length - 1].Username;

      // Determine if this player has a Steam ID
      const steamId = stats.find(s => s.ID)?.ID || null;

      uniquePlayers.push({
        id: playerId,
        displayName: mostRecentUsername,
        steamId: steamId,
        gamesPlayed: stats.length,
        alternateUsernames: usernameArray.length > 1 ? usernameArray : []
      });
    });

    // Sort by display name for consistency
    return uniquePlayers.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [gameData]);

  return { players, isLoading, error };
}

/**
 * Get player names for autocomplete/selection components
 * Returns an array of display names sorted alphabetically
 */
export function usePlayerNames(): {
  playerNames: string[];
  isLoading: boolean;
  error: string | null;
} {
  const { players, isLoading, error } = useUniquePlayers();

  const playerNames = useMemo(() => {
    return players.map(p => p.displayName);
  }, [players]);

  return { playerNames, isLoading, error };
}

/**
 * Find a player by their display name or Steam ID
 */
export function useFindPlayer(searchTerm: string | null): UniquePlayer | null {
  const { players } = useUniquePlayers();

  return useMemo(() => {
    if (!searchTerm || !players.length) return null;

    const searchLower = searchTerm.toLowerCase();

    // Try exact match on display name first
    const exactMatch = players.find(p => p.displayName.toLowerCase() === searchLower);
    if (exactMatch) return exactMatch;

    // Try Steam ID match
    const idMatch = players.find(p => p.steamId === searchTerm);
    if (idMatch) return idMatch;

    // Try alternate usernames
    const alternateMatch = players.find(p => 
      p.alternateUsernames.some(name => name.toLowerCase() === searchLower)
    );
    if (alternateMatch) return alternateMatch;

    return null;
  }, [searchTerm, players]);
}
