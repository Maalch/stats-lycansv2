/**
 * Utility functions for player identification and display name resolution
 * 
 * This module provides a consistent way to identify players and resolve their canonical display names.
 * 
 * PLAYER IDENTIFICATION:
 * - All players have unique Steam IDs (from PlayerStat.ID)
 * - Steam ID is used as the unique identifier
 * 
 * DISPLAY NAME RESOLUTION:
 * - Canonical names come from joueurs.json (matched by Steam ID)
 * - All names are normalized during data loading
 * 
 * IMPORTANT: Always use getCanonicalPlayerName() for display purposes to ensure
 * consistent names across the application, regardless of how usernames appear in gameLog.json
 */

import type { PlayerStat } from '../hooks/useCombinedRawData';
import type { JoueursData } from '../types/joueurs';

// Global cache for joueurs data - will be set by the initialization function
let joueursDataCache: JoueursData | null = null;

/**
 * Initialize the player identification system with joueurs data
 * This should be called once when the app loads or when data source changes
 * 
 * @param joueursData - The joueurs data containing Steam IDs and canonical names
 */
export function initializePlayerIdentification(joueursData: JoueursData | null) {
  joueursDataCache = joueursData;
}

/**
 * Get the cached joueurs data
 * Used internally by other functions
 */
export function getJoueursDataCache(): JoueursData | null {
  return joueursDataCache;
}

/**
 * Get the unique identifier for a player
 * Uses Steam ID if available, otherwise falls back to Username
 * 
 * @param player - PlayerStat object or partial player data
 * @returns The unique identifier (Steam ID or Username)
 */
export function getPlayerId(player: { ID?: string | null; Username: string }): string {
  return player.ID || player.Username;
}

/**
 * Get the canonical display name for a player
 * 
 * Looks up the player's canonical name from joueurs.json using their Steam ID.
 * Since all players now have Steam IDs, this always returns the canonical name.
 * 
 * @param player - PlayerStat object or partial player data
 * @param joueursData - Optional joueurs data (uses cache if not provided)
 * @returns The canonical display name
 */
export function getCanonicalPlayerName(
  player: { ID?: string | null; Username: string },
  joueursData?: JoueursData | null
): string {
  const data = joueursData || joueursDataCache;
  
  // Look up canonical name from joueurs.json using Steam ID
  if (player.ID && data?.Players) {
    const joueurEntry = data.Players.find(p => p.SteamID === player.ID);
    if (joueurEntry) {
      return joueurEntry.Joueur;
    }
  }
  
  // Fallback to username (shouldn't happen if all players have Steam IDs)
  return player.Username;
}

/**
 * Get the raw display name for a player (from game data)
 * This returns the Username as it appears in gameLog.json, without any normalization
 * Use this only when you need the original username for debugging purposes
 * 
 * For display to users, use getCanonicalPlayerName() instead
 * 
 * @param player - PlayerStat object or partial player data
 * @returns The raw username from game data
 */
export function getRawPlayerName(player: { Username: string }): string {
  return player.Username;
}

/**
 * Check if two players are the same based on their identifier
 * 
 * @param player1 - First player
 * @param player2 - Second player
 * @returns true if they are the same player
 */
export function isSamePlayer(
  player1: { ID?: string | null; Username: string },
  player2: { ID?: string | null; Username: string }
): boolean {
  return getPlayerId(player1) === getPlayerId(player2);
}

/**
 * Group PlayerStats by their unique identifier
 * This is useful when you need to aggregate data for the same player across different games
 * 
 * Returns a map with canonical display names for easy access
 * 
 * @param players - Array of PlayerStat objects
 * @param joueursData - Optional joueurs data (uses cache if not provided)
 * @returns Map of playerId -> { canonicalName, stats: PlayerStat[] }
 */
export function groupPlayersByIdentifier(
  players: PlayerStat[],
  joueursData?: JoueursData | null
): Map<string, { canonicalName: string; stats: PlayerStat[] }> {
  const grouped = new Map<string, { canonicalName: string; stats: PlayerStat[] }>();
  
  players.forEach(player => {
    const id = getPlayerId(player);
    if (!grouped.has(id)) {
      grouped.set(id, {
        canonicalName: getCanonicalPlayerName(player, joueursData),
        stats: []
      });
    }
    grouped.get(id)!.stats.push(player);
  });
  
  return grouped;
}

/**
 * Get all unique players from an array of PlayerStats
 * Returns one entry per unique player with their canonical name
 * 
 * @param players - Array of PlayerStat objects
 * @param joueursData - Optional joueurs data (uses cache if not provided)
 * @returns Array of unique players with ID and canonical name
 */
export function getUniquePlayers(
  players: PlayerStat[],
  joueursData?: JoueursData | null
): Array<{ ID: string | null; canonicalName: string }> {
  const playerMap = new Map<string, { ID: string | null; canonicalName: string; lastSeen: number }>();
  
  players.forEach((player, index) => {
    const id = getPlayerId(player);
    const existing = playerMap.get(id);
    
    // Keep the most recent entry (assuming later index = more recent)
    if (!existing || existing.lastSeen < index) {
      playerMap.set(id, {
        ID: player.ID || null,
        canonicalName: getCanonicalPlayerName(player, joueursData),
        lastSeen: index
      });
    }
  });
  
  return Array.from(playerMap.values()).map(({ ID, canonicalName }) => ({ ID, canonicalName }));
}

/**
 * Create a lookup map from player identifier to canonical display name
 * Useful for quick lookups when you have an ID and need to display the username
 * 
 * @param players - Array of PlayerStat objects
 * @param joueursData - Optional joueurs data (uses cache if not provided)
 * @returns Map of playerId -> canonical display name
 */
export function createPlayerDisplayNameMap(
  players: PlayerStat[],
  joueursData?: JoueursData | null
): Map<string, string> {
  const displayMap = new Map<string, string>();
  const uniquePlayers = getUniquePlayers(players, joueursData);
  
  uniquePlayers.forEach(player => {
    const id = player.ID || player.canonicalName; // Use canonicalName as fallback ID for legacy data
    displayMap.set(id, player.canonicalName);
  });
  
  return displayMap;
}

/**
 * Filter an array to only include entries for a specific player
 * 
 * @param items - Array of items with player information
 * @param targetPlayer - The player to filter for
 * @returns Filtered array containing only items for the target player
 */
export function filterByPlayer<T extends { ID?: string | null; Username: string }>(
  items: T[],
  targetPlayer: { ID?: string | null; Username: string }
): T[] {
  const targetId = getPlayerId(targetPlayer);
  return items.filter(item => getPlayerId(item) === targetId);
}

/**
 * Count unique players in an array
 * 
 * @param players - Array of player data
 * @returns Number of unique players
 */
export function countUniquePlayers(players: Array<{ ID?: string | null; Username: string }>): number {
  const uniqueIds = new Set(players.map(getPlayerId));
  return uniqueIds.size;
}

/**
 * Find a player in joueurs.json by Steam ID or username
 * 
 * @param player - Player to look up
 * @param joueursData - Optional joueurs data (uses cache if not provided)
 * @returns The player entry from joueurs.json or null if not found
 */
export function findPlayerInJoueurs(
  player: { ID?: string | null; Username: string },
  joueursData?: JoueursData | null
) {
  const data = joueursData || joueursDataCache;
  if (!data?.Players) return null;
  
  // Try Steam ID first (preferred)
  if (player.ID) {
    const byId = data.Players.find(p => p.SteamID === player.ID);
    if (byId) return byId;
  }
  
  // Fall back to canonical name matching
  const canonicalName = getCanonicalPlayerName(player, data);
  return data.Players.find(p => p.Joueur === canonicalName) || null;
}

/**
 * Get all canonical player names that should be displayed in the application
 * This combines players from joueurs.json with any additional players from game data
 * 
 * @param gamePlayers - Players from game data
 * @param joueursData - Optional joueurs data (uses cache if not provided)
 * @returns Sorted array of unique canonical player names
 */
export function getAllCanonicalPlayerNames(
  gamePlayers: PlayerStat[],
  joueursData?: JoueursData | null
): string[] {
  const uniquePlayers = getUniquePlayers(gamePlayers, joueursData);
  const names = new Set(uniquePlayers.map(p => p.canonicalName));
  return Array.from(names).sort();
}

