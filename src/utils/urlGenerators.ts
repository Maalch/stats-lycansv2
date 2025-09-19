import type { SettingsState } from '../context/SettingsContext';

/**
 * Utility functions for generating URLs with settings parameters
 */

const defaultSettings: SettingsState = {
  filterMode: 'gameType',
  gameFilter: 'all',
  dateRange: { start: null, end: null },
  playerFilter: { mode: 'none', players: [] },
  highlightedPlayer: null,
};

/**
 * Generate a URL with the specified settings
 * @param baseUrl The base URL (e.g., 'https://maalch.github.io/stats-lycansv2/')
 * @param settings The settings to encode in the URL
 * @returns The complete URL with parameters
 */
export function generateUrlWithSettings(baseUrl: string, settings: Partial<SettingsState>): string {
  const urlParams = new URLSearchParams();
  
  // Only add parameters that differ from defaults
  if (settings.filterMode && settings.filterMode !== defaultSettings.filterMode) {
    urlParams.set('filterMode', settings.filterMode);
  }
  
  if (settings.gameFilter && settings.gameFilter !== defaultSettings.gameFilter) {
    urlParams.set('gameFilter', settings.gameFilter);
  }
  
  if (settings.dateRange) {
    if (settings.dateRange.start) urlParams.set('dateStart', settings.dateRange.start);
    if (settings.dateRange.end) urlParams.set('dateEnd', settings.dateRange.end);
  }
  
  if (settings.playerFilter) {
    if (settings.playerFilter.mode !== defaultSettings.playerFilter.mode) {
      urlParams.set('playerFilterMode', settings.playerFilter.mode);
    }
    
    if (settings.playerFilter.players && settings.playerFilter.players.length > 0) {
      urlParams.set('players', encodeURIComponent(settings.playerFilter.players.join(',')));
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
      filterMode: 'gameType',
      gameFilter: 'modded'
    }),

  /**
   * Generate URL for non-modded games only
   */
  nonModdedGames: (baseUrl: string) => 
    generateUrlWithSettings(baseUrl, {
      filterMode: 'gameType',
      gameFilter: 'non-modded'
    }),

  /**
   * Generate URL for date range filtering
   */
  dateRange: (baseUrl: string, startDate: string, endDate?: string) => 
    generateUrlWithSettings(baseUrl, {
      filterMode: 'dateRange',
      dateRange: { start: startDate, end: endDate || null }
    }),

  /**
   * Generate URL for modded games with specific players
   */
  moddedGamesWithPlayers: (baseUrl: string, players: string[]) => 
    generateUrlWithSettings(baseUrl, {
      filterMode: 'gameType',
      gameFilter: 'modded',
      playerFilter: { mode: 'include', players }
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
      filterMode: 'gameType',
      gameFilter: 'modded',
      highlightedPlayer: highlightedPlayer
    }),
};

/**
 * Example usage:
 * 
 * // Basic player filtering
 * const url1 = UrlGenerators.forPlayers('https://maalch.github.io/stats-lycansv2/', ['Ponce', 'AmberAerin']);
 * 
 * // Modded games only
 * const url2 = UrlGenerators.moddedGames('https://maalch.github.io/stats-lycansv2/');
 * 
 * // Highlight specific player
 * const url3 = UrlGenerators.withHighlightedPlayer('https://maalch.github.io/stats-lycansv2/', 'Ponce');
 * 
 * // Player filtering with highlighted player
 * const url4 = UrlGenerators.playersWithHighlight('https://maalch.github.io/stats-lycansv2/', ['Ponce', 'AmberAerin'], 'Ponce');
 * 
 * // Custom complex filtering
 * const url5 = generateUrlWithSettings('https://maalch.github.io/stats-lycansv2/', {
 *   filterMode: 'gameType',
 *   gameFilter: 'modded',
 *   playerFilter: { mode: 'include', players: ['Ponce', 'Flippy'] },
 *   highlightedPlayer: 'Ponce'
 * });
 */
