/**
 * Centralized utility for managing data file paths based on data source
 */

export type DataSource = 'main' | 'discord';

/**
 * Get the base data directory path for the given data source
 * @param dataSource - The data source ('main' or 'discord')
 * @returns The base path to the data directory
 */
export function getDataPath(dataSource: DataSource): string {
  return dataSource === 'discord' ? 'data/discord/' : 'data/';
}

/**
 * Get the full URL path for a specific data file
 * @param dataSource - The data source ('main' or 'discord')
 * @param filename - The name of the data file (e.g., 'gameLog.json')
 * @returns The complete URL path to fetch the file
 */
export function getDataFileUrl(dataSource: DataSource, filename: string): string {
  const basePath = getDataPath(dataSource);
  const url = `${import.meta.env.BASE_URL}${basePath}${filename}`;
  return url;
}

/**
 * Common data file names used across the application
 */
export const DATA_FILES = {
  GAME_LOG: 'gameLog.json',
  JOUEURS: 'joueurs.json',
  PLAYER_RANKINGS: 'playerRankings.json',
  RAW_BR_DATA: 'rawBRData.json',
  INDEX: 'index.json',
  GAME_LOG_LEGACY: 'gameLog-Legacy.json',
} as const;

/**
 * Helper to fetch a data file with proper error handling
 * @param dataSource - The data source ('main' or 'discord')
 * @param filename - The name of the data file
 * @param options - Optional fetch options
 * @returns Promise that resolves to the parsed JSON data
 */
export async function fetchDataFile<T = unknown>(
  dataSource: DataSource,
  filename: string,
  options?: RequestInit
): Promise<T> {
  const url = getDataFileUrl(dataSource, filename);
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${filename} from ${getDataPath(dataSource)} (HTTP ${response.status}): ${url}`);
    }
    
    // Check if response is actually JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error(`Expected JSON but got ${contentType} from ${url}. Response preview:`, text.substring(0, 200));
      throw new Error(`Expected JSON but got ${contentType || 'unknown content type'} from ${url}`);
    }
    
    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error fetching ${filename} from ${url}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Helper to safely fetch a data file that might not exist (e.g., BR data for Discord)
 * Returns null if the file doesn't exist or fails to load
 * @param dataSource - The data source ('main' or 'discord')
 * @param filename - The name of the data file
 * @param options - Optional fetch options
 * @returns Promise that resolves to the parsed JSON data or null
 */
export async function fetchOptionalDataFile<T = unknown>(
  dataSource: DataSource,
  filename: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const url = getDataFileUrl(dataSource, filename);
    const response = await fetch(url, options);
    
    if (!response.ok) {
     return null;
    }
    
    // Check if response is actually JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null;
    }
    
    return response.json() as Promise<T>;
  } catch (error) {
    return null;
    return null;
  }
}
