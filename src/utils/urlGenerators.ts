import type { SettingsState } from '../context/SettingsContext';

/**
 * Utility functions for generating URLs with settings parameters
 */

const defaultSettings: SettingsState = {
  gameFilter: 'all',
  dataSource: 'main',
  dateRange: { start: null, end: null },
  mapNameFilter: 'all',
  playerFilter: { mode: 'none', players: [] },
  highlightedPlayer: null,
  useIndependentFilters: true,
  independentFilters: {
    gameTypeEnabled: false,
    gameFilter: 'all',
    dateRangeEnabled: false,
    dateRange: { start: null, end: null },
    mapNameEnabled: false,
    mapNameFilter: 'all',
    playerFilter: { mode: 'none', players: [] },
  },
};

/**
 * Generate a URL with the specified settings
 * @param baseUrl The base URL (e.g., 'https://maalch.github.io/stats-lycansv2/')
 * @param settings The settings to encode in the URL
 * @returns The complete URL with parameters
 */
export function generateUrlWithSettings(baseUrl: string, settings: Partial<SettingsState>): string {
  const urlParams = new URLSearchParams();
  
  // Use independent filters format only
  if (settings.independentFilters) {
    const filters = settings.independentFilters;
    
    // Only add parameters for enabled filters or non-default values
    if (filters.gameTypeEnabled) {
      urlParams.set('gameTypeEnabled', 'true');
      if (filters.gameFilter !== 'all') {
        urlParams.set('gameFilter', filters.gameFilter);
      }
    }
    
    if (filters.dateRangeEnabled) {
      urlParams.set('dateRangeEnabled', 'true');
      if (filters.dateRange.start) urlParams.set('dateStart', filters.dateRange.start);
      if (filters.dateRange.end) urlParams.set('dateEnd', filters.dateRange.end);
    }
    
    if (filters.mapNameEnabled) {
      urlParams.set('mapNameEnabled', 'true');
      if (filters.mapNameFilter !== 'all') {
        urlParams.set('mapNameFilter', filters.mapNameFilter);
      }
    }
    
    if (filters.playerFilter.mode !== 'none') {
      urlParams.set('playerFilterMode', filters.playerFilter.mode);
      if (filters.playerFilter.players.length > 0) {
        urlParams.set('players', encodeURIComponent(filters.playerFilter.players.join(',')));
      }
    }
  }
  
  if (settings.highlightedPlayer && settings.highlightedPlayer !== defaultSettings.highlightedPlayer) {
    urlParams.set('highlightedPlayer', encodeURIComponent(settings.highlightedPlayer));
  }
  
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return urlParams.toString() ? `${cleanBaseUrl}?${urlParams.toString()}` : cleanBaseUrl;
}

/**
 * Quick helper functions for common filter scenarios
 */

export const UrlGenerators = {
  /**
   * Generate URL for filtering by specific players (include mode)
   */
  forPlayers: (baseUrl: string, players: string[]) => 
    generateUrlWithSettings(baseUrl, {
      playerFilter: { mode: 'include', players }
    }),

  /**
   * Generate URL for excluding specific players
   */
  excludingPlayers: (baseUrl: string, players: string[]) => 
    generateUrlWithSettings(baseUrl, {
      playerFilter: { mode: 'exclude', players }
    }),

  /**
   * Generate URL for modded games only
   */
  moddedGames: (baseUrl: string) => 
    generateUrlWithSettings(baseUrl, {
      independentFilters: {
        gameTypeEnabled: true,
        gameFilter: 'modded',
        dateRangeEnabled: false,
        dateRange: { start: null, end: null },
        mapNameEnabled: false,
        mapNameFilter: 'all',
        playerFilter: { mode: 'none', players: [] },
      }
    }),

  /**
   * Generate URL for non-modded games only
   */
  nonModdedGames: (baseUrl: string) => 
    generateUrlWithSettings(baseUrl, {
      independentFilters: {
        gameTypeEnabled: true,
        gameFilter: 'non-modded',
        dateRangeEnabled: false,
        dateRange: { start: null, end: null },
        mapNameEnabled: false,
        mapNameFilter: 'all',
        playerFilter: { mode: 'none', players: [] },
      }
    }),

  /**
   * Generate URL for date range filtering
   */
  dateRange: (baseUrl: string, startDate: string, endDate?: string) => 
    generateUrlWithSettings(baseUrl, {
      independentFilters: {
        gameTypeEnabled: false,
        gameFilter: 'all',
        dateRangeEnabled: true,
        dateRange: { start: startDate, end: endDate || null },
        mapNameEnabled: false,
        mapNameFilter: 'all',
        playerFilter: { mode: 'none', players: [] },
      }
    }),

  /**
   * Generate URL for Village map only
   */
  villageMap: (baseUrl: string) => 
    generateUrlWithSettings(baseUrl, {
      independentFilters: {
        gameTypeEnabled: false,
        gameFilter: 'all',
        dateRangeEnabled: false,
        dateRange: { start: null, end: null },
        mapNameEnabled: true,
        mapNameFilter: 'village',
        playerFilter: { mode: 'none', players: [] },
      }
    }),

  /**
   * Generate URL for Château map only
   */
  chateauMap: (baseUrl: string) => 
    generateUrlWithSettings(baseUrl, {
      independentFilters: {
        gameTypeEnabled: false,
        gameFilter: 'all',
        dateRangeEnabled: false,
        dateRange: { start: null, end: null },
        mapNameEnabled: true,
        mapNameFilter: 'chateau',
        playerFilter: { mode: 'none', players: [] },
      }
    }),

  /**
   * Generate URL for other maps (Ashfang Woods, Donjon, etc.)
   */
  otherMaps: (baseUrl: string) => 
    generateUrlWithSettings(baseUrl, {
      independentFilters: {
        gameTypeEnabled: false,
        gameFilter: 'all',
        dateRangeEnabled: false,
        dateRange: { start: null, end: null },
        mapNameEnabled: true,
        mapNameFilter: 'others',
        playerFilter: { mode: 'none', players: [] },
      }
    }),

  /**
   * Generate URL for modded games with specific players
   */
  moddedGamesWithPlayers: (baseUrl: string, players: string[]) => 
    generateUrlWithSettings(baseUrl, {
      independentFilters: {
        gameTypeEnabled: true,
        gameFilter: 'modded',
        dateRangeEnabled: false,
        dateRange: { start: null, end: null },
        mapNameEnabled: false,
        mapNameFilter: 'all',
        playerFilter: { mode: 'include', players },
      }
    }),

  /**
   * Generate URL with highlighted player
   */
  withHighlightedPlayer: (baseUrl: string, playerName: string) => 
    generateUrlWithSettings(baseUrl, {
      highlightedPlayer: playerName
    }),

  /**
   * Generate URL for specific players with one highlighted
   */
  playersWithHighlight: (baseUrl: string, players: string[], highlightedPlayer: string) => 
    generateUrlWithSettings(baseUrl, {
      playerFilter: { mode: 'include', players },
      highlightedPlayer: highlightedPlayer
    }),

  /**
   * Generate URL for modded games with highlighted player
   */
  moddedGamesWithHighlight: (baseUrl: string, highlightedPlayer: string) => 
    generateUrlWithSettings(baseUrl, {
      independentFilters: {
        gameTypeEnabled: true,
        gameFilter: 'modded',
        dateRangeEnabled: false,
        dateRange: { start: null, end: null },
        mapNameEnabled: false,
        mapNameFilter: 'all',
        playerFilter: { mode: 'none', players: [] },
      },
      highlightedPlayer: highlightedPlayer
    }),

  /**
   * Generate URL for Village map with specific players
   */
  villageMapWithPlayers: (baseUrl: string, players: string[]) => 
    generateUrlWithSettings(baseUrl, {
      independentFilters: {
        gameTypeEnabled: false,
        gameFilter: 'all',
        dateRangeEnabled: false,
        dateRange: { start: null, end: null },
        mapNameEnabled: true,
        mapNameFilter: 'village',
        playerFilter: { mode: 'include', players },
      }
    }),

  /**
   * Generate URL for Château map with specific players
   */
  chateauMapWithPlayers: (baseUrl: string, players: string[]) => 
    generateUrlWithSettings(baseUrl, {
      independentFilters: {
        gameTypeEnabled: false,
        gameFilter: 'all',
        dateRangeEnabled: false,
        dateRange: { start: null, end: null },
        mapNameEnabled: true,
        mapNameFilter: 'chateau',
        playerFilter: { mode: 'include', players },
      }
    }),

  /**
   * Generate URL for specific map with highlighted player
   */
  mapWithHighlight: (baseUrl: string, mapName: 'village' | 'chateau' | 'others', highlightedPlayer: string) => 
    generateUrlWithSettings(baseUrl, {
      independentFilters: {
        gameTypeEnabled: false,
        gameFilter: 'all',
        dateRangeEnabled: false,
        dateRange: { start: null, end: null },
        mapNameEnabled: true,
        mapNameFilter: mapName,
        playerFilter: { mode: 'none', players: [] },
      },
      highlightedPlayer: highlightedPlayer
    }),
};

