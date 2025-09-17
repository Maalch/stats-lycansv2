import type { GameLogEntry } from '../hooks/useCombinedRawData';

/**
 * Extract all unique camp/role names from the game data
 * @param gameData Array of GameLogEntry objects
 * @returns Set of unique camp names found in MainRoleInitial
 */
export function extractUniqueCamps(gameData: GameLogEntry[]): Set<string> {
  const camps = new Set<string>();
  
  gameData.forEach(game => {
    game.PlayerStats.forEach(playerStat => {
      if (playerStat.MainRoleInitial) {
        camps.add(playerStat.MainRoleInitial);
      }
    });
  });
  
  return camps;
}

/**
 * Get a list of all unique camps from game data as an array
 * @param gameData Array of GameLogEntry objects
 * @returns Array of unique camp names sorted alphabetically
 */
export function getAllCampsFromGameData(gameData: GameLogEntry[]): string[] {
  const camps = extractUniqueCamps(gameData);
  return Array.from(camps).sort();
}