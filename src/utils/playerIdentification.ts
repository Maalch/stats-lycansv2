/**
 * Utility functions for player identification using ID or Username
 * 
 * This module provides a consistent way to identify players across the application.
 * When a player has an ID (Steam ID), it should be used as the unique identifier.
 * When ID is null/undefined, fall back to Username for backward compatibility.
 * 
 * For display purposes, always use the Username.
 */

import type { PlayerStat } from '../hooks/useCombinedRawData';

/**
 * Get the unique identifier for a player
 * Uses ID if available, otherwise falls back to Username
 * 
 * @param player - PlayerStat object or partial player data
 * @returns The unique identifier (ID or Username)
 */
export function getPlayerId(player: { ID?: string | null; Username: string }): string {
  return player.ID || player.Username;
}

/**
 * Get the display name for a player
 * Always returns the Username
 * 
 * @param player - PlayerStat object or partial player data
 * @returns The display name (Username)
 */
export function getPlayerDisplayName(player: { Username: string }): string {
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
 * @param players - Array of PlayerStat objects
 * @returns Map of playerId -> array of PlayerStats for that player
 */
export function groupPlayersByIdentifier(players: PlayerStat[]): Map<string, PlayerStat[]> {
  const grouped = new Map<string, PlayerStat[]>();
  
  players.forEach(player => {
    const id = getPlayerId(player);
    if (!grouped.has(id)) {
      grouped.set(id, []);
    }
    grouped.get(id)!.push(player);
  });
  
  return grouped;
}

/**
 * Get all unique players from an array of PlayerStats
 * Returns one entry per unique player (by ID or Username)
 * For players with multiple usernames (same ID), the most recent username is used
 * 
 * @param players - Array of PlayerStat objects
 * @returns Array of unique players with their most recent username
 */
export function getUniquePlayers(players: PlayerStat[]): Array<{ ID: string | null; Username: string }> {
  const playerMap = new Map<string, { ID: string | null; Username: string; lastSeen: number }>();
  
  players.forEach((player, index) => {
    const id = getPlayerId(player);
    const existing = playerMap.get(id);
    
    // Keep the most recent username (assuming later index = more recent)
    if (!existing || existing.lastSeen < index) {
      playerMap.set(id, {
        ID: player.ID || null,
        Username: player.Username,
        lastSeen: index
      });
    }
  });
  
  return Array.from(playerMap.values()).map(({ ID, Username }) => ({ ID, Username }));
}

/**
 * Create a lookup map from player identifier to display name
 * Useful for quick lookups when you have an ID and need to display the username
 * 
 * @param players - Array of PlayerStat objects
 * @returns Map of playerId -> display name (most recent username)
 */
export function createPlayerDisplayNameMap(players: PlayerStat[]): Map<string, string> {
  const displayMap = new Map<string, string>();
  const uniquePlayers = getUniquePlayers(players);
  
  uniquePlayers.forEach(player => {
    const id = getPlayerId(player);
    displayMap.set(id, player.Username);
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
