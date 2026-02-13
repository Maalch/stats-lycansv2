/**
 * Centralized URL and browser history management
 * All pushState/replaceState calls should go through this utility
 */

export interface UrlState {
  // Settings (from SettingsContext)
  gameTypeEnabled?: boolean;
  gameFilter?: string;
  dateRangeEnabled?: boolean;
  dateStart?: string;
  dateEnd?: string;
  mapNameEnabled?: boolean;
  mapNameFilter?: string;
  playerFilterMode?: string;
  players?: string;
  highlightedPlayer?: string;
  dataSource?: string;
  
  // Tab navigation
  tab?: string;
  subtab?: string;
  
  // Player selection view
  playerSelectionView?: string;
  
  // Death statistics view
  deathStatsView?: string;
  
  // Series view
  seriesView?: string;
  
  // Navigation view (from NavigationContext)
  view?: string; // 'gameDetails' | ''
  
  // Navigation filters (simplified - only key filters persisted)
  selectedPlayer?: string;
  selectedGame?: string;
  selectedGameIds?: string; // Comma-separated list of game IDs
  fromComponent?: string;
}

/**
 * Parse current URL search params into UrlState
 */
export function parseUrlState(): UrlState {
  const urlParams = new URLSearchParams(window.location.search);
  const state: UrlState = {};
  
  // Settings
  if (urlParams.has('gameTypeEnabled')) state.gameTypeEnabled = urlParams.get('gameTypeEnabled') === 'true';
  if (urlParams.has('gameFilter')) state.gameFilter = urlParams.get('gameFilter')!;
  if (urlParams.has('dateRangeEnabled')) state.dateRangeEnabled = urlParams.get('dateRangeEnabled') === 'true';
  if (urlParams.has('dateStart')) state.dateStart = urlParams.get('dateStart')!;
  if (urlParams.has('dateEnd')) state.dateEnd = urlParams.get('dateEnd')!;
  if (urlParams.has('mapNameEnabled')) state.mapNameEnabled = urlParams.get('mapNameEnabled') === 'true';
  if (urlParams.has('mapNameFilter')) state.mapNameFilter = urlParams.get('mapNameFilter')!;
  if (urlParams.has('playerFilterMode')) state.playerFilterMode = urlParams.get('playerFilterMode')!;
  if (urlParams.has('players')) state.players = urlParams.get('players')!;
  if (urlParams.has('highlightedPlayer')) state.highlightedPlayer = urlParams.get('highlightedPlayer')!;
  if (urlParams.has('dataSource')) state.dataSource = urlParams.get('dataSource')!;
  
  // Tab navigation
  if (urlParams.has('tab')) state.tab = urlParams.get('tab')!;
  if (urlParams.has('subtab')) state.subtab = urlParams.get('subtab')!;
  
  // Player selection view (support both parameter names for compatibility)
  if (urlParams.has('playerSelectionView')) state.playerSelectionView = urlParams.get('playerSelectionView')!;
  if (urlParams.has('selectedPlayerSelectionView')) state.playerSelectionView = urlParams.get('selectedPlayerSelectionView')!;
  
  // Death statistics view
  if (urlParams.has('deathStatsView')) state.deathStatsView = urlParams.get('deathStatsView')!;
  
  // Series view
  if (urlParams.has('seriesView')) state.seriesView = urlParams.get('seriesView')!;
  
  // Navigation view
  if (urlParams.has('view')) state.view = urlParams.get('view')!;
  
  // Navigation filters
  if (urlParams.has('selectedPlayer')) state.selectedPlayer = urlParams.get('selectedPlayer')!;
  if (urlParams.has('selectedGame')) state.selectedGame = urlParams.get('selectedGame')!;
  if (urlParams.has('selectedGameIds')) state.selectedGameIds = urlParams.get('selectedGameIds')!;
  if (urlParams.has('fromComponent')) state.fromComponent = urlParams.get('fromComponent')!;
  
  return state;
}

/**
 * Build URL search string from UrlState
 */
export function buildUrlSearch(state: Partial<UrlState>): string {
  const urlParams = new URLSearchParams();
  
  // Settings
  if (state.gameTypeEnabled) {
    urlParams.set('gameTypeEnabled', 'true');
    if (state.gameFilter && state.gameFilter !== 'all') {
      urlParams.set('gameFilter', state.gameFilter);
    }
  }
  
  if (state.dateRangeEnabled) {
    urlParams.set('dateRangeEnabled', 'true');
    if (state.dateStart) urlParams.set('dateStart', state.dateStart);
    if (state.dateEnd) urlParams.set('dateEnd', state.dateEnd);
  }
  
  if (state.mapNameEnabled) {
    urlParams.set('mapNameEnabled', 'true');
    if (state.mapNameFilter && state.mapNameFilter !== 'all') {
      urlParams.set('mapNameFilter', state.mapNameFilter);
    }
  }
  
  if (state.playerFilterMode && state.playerFilterMode !== 'none') {
    urlParams.set('playerFilterMode', state.playerFilterMode);
    if (state.players) {
      urlParams.set('players', state.players);
    }
  }
  
  if (state.highlightedPlayer) {
    urlParams.set('highlightedPlayer', state.highlightedPlayer);
  }
  
  if (state.dataSource && state.dataSource !== 'main') {
    urlParams.set('dataSource', state.dataSource);
  }
  
  // Tab navigation
  if (state.tab) {
    urlParams.set('tab', state.tab);
  }
  if (state.subtab) {
    urlParams.set('subtab', state.subtab);
  }
  
  // Player selection view
  if (state.playerSelectionView && state.playerSelectionView !== 'rankings') {
    urlParams.set('playerSelectionView', state.playerSelectionView);
  }
  
  // Death statistics view
  if (state.deathStatsView && state.deathStatsView !== 'killers') {
    urlParams.set('deathStatsView', state.deathStatsView);
  }
  
  // Series view
  if (state.seriesView && state.seriesView !== 'villageois') {
    urlParams.set('seriesView', state.seriesView);
  }
  
  // Navigation view
  if (state.view) {
    urlParams.set('view', state.view);
  }
  
  // Navigation filters
  if (state.selectedPlayer) {
    urlParams.set('selectedPlayer', encodeURIComponent(state.selectedPlayer));
  }
  if (state.selectedGame) {
    urlParams.set('selectedGame', state.selectedGame);
  }
  if (state.selectedGameIds) {
    urlParams.set('selectedGameIds', state.selectedGameIds);
  }
  if (state.fromComponent) {
    urlParams.set('fromComponent', encodeURIComponent(state.fromComponent));
  }
  
  return urlParams.toString();
}

/**
 * Update URL using pushState (creates history entry)
 * Use for navigation actions that should support browser back button
 */
export function pushUrlState(state: Partial<UrlState>) {
  const search = buildUrlSearch(state);
  const newUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  window.history.pushState({}, '', newUrl);
  
  // Dispatch custom event to notify listeners of URL change
  window.dispatchEvent(new CustomEvent('urlchange', { detail: { method: 'push', state } }));
}

/**
 * Update URL using replaceState (silent update, no history entry)
 * Use for filter changes that shouldn't create history entries
 */
export function replaceUrlState(state: Partial<UrlState>) {
  const search = buildUrlSearch(state);
  const newUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  window.history.replaceState({}, '', newUrl);
  
  // Dispatch custom event to notify listeners of URL change
  window.dispatchEvent(new CustomEvent('urlchange', { detail: { method: 'replace', state } }));
}

/**
 * Merge new state with current URL state
 */
export function mergeUrlState(newState: Partial<UrlState>, method: 'push' | 'replace' = 'replace'): void {
  const currentState = parseUrlState();
  const mergedState = { ...currentState, ...newState };
  
  if (method === 'push') {
    pushUrlState(mergedState);
  } else {
    replaceUrlState(mergedState);
  }
}
