import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { replaceUrlState, parseUrlState, buildUrlSearch, type UrlState } from '../utils/urlManager';


export type GameFilter = 'all' | 'modded' | 'non-modded';
export type PlayerFilterMode = 'none' | 'include' | 'exclude';
export type MapNameFilter = 'all' | 'village' | 'chateau' | 'others';

export interface DateRange {
  start: string | null; // ISO date string (YYYY-MM-DD) or null
  end: string | null;
}

export interface PlayerFilter {
  mode: PlayerFilterMode;
  players: string[]; // Array of player names
}

// New interface for independent filters
export interface IndependentFilters {
  gameTypeEnabled: boolean;
  gameFilter: GameFilter;
  dateRangeEnabled: boolean;
  dateRange: DateRange;
  mapNameEnabled: boolean;
  mapNameFilter: MapNameFilter;
  playerFilter: PlayerFilter;
}

export interface SettingsState {
  // Legacy fields (kept for URL parameter backward compatibility)
  gameFilter: GameFilter;
  dateRange: DateRange;
  mapNameFilter: MapNameFilter;
  playerFilter: PlayerFilter;
  highlightedPlayer: string | null; // Player to highlight and always show in charts
  
  // Independent filters system (now the default)
  useIndependentFilters: boolean;
  independentFilters: IndependentFilters;
  
  // Data source selection (main team vs Discord team)
  dataSource: 'main' | 'discord';
  
  // Tab navigation (for URL persistence)
  tab: string | null;
  subtab: string | null;
  
  // PlayerSelection view type (for URL persistence)
  selectedPlayerSelectionView?: 'rankings' | 'titles' | 'achievements' | 'evolution' | 'camps' | 'kills' | 'roles' | 'actions' | 'roleactions' | 'deathmap' | 'talkingtime';
}

interface SettingsContextType {
  settings: SettingsState;
  updateSettings: (newSettings: Partial<SettingsState>) => void;
  resetSettings: () => void;
  generateUrlWithSettings: (settingsOverride?: Partial<SettingsState>) => string;
}


const defaultSettings: SettingsState = {
  gameFilter: 'all',
  dateRange: { start: null, end: null },
  mapNameFilter: 'all',
  playerFilter: { mode: 'none', players: [] },
  highlightedPlayer: null,
  // Independent filters system (now default)
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
  dataSource: 'main',
  tab: null,
  subtab: null,
  selectedPlayerSelectionView: undefined,
};

// Helper function to convert UrlState to SettingsState
function urlStateToSettings(urlState: UrlState): Partial<SettingsState> {
  const settings: Partial<SettingsState> = {};

  // Always use independent filters (the default now)
  settings.useIndependentFilters = true;
  
  // Parse independent filters
  const hasNewStyle = urlState.gameTypeEnabled !== undefined || urlState.dateRangeEnabled !== undefined || urlState.mapNameEnabled !== undefined;
  
  let independentFilters: IndependentFilters;
  
  if (hasNewStyle) {
    // New-style URL parameters
    independentFilters = {
      gameTypeEnabled: urlState.gameTypeEnabled || false,
      gameFilter: (urlState.gameFilter as GameFilter) || 'all',
      dateRangeEnabled: urlState.dateRangeEnabled || false,
      dateRange: {
        start: urlState.dateStart || null,
        end: urlState.dateEnd || null,
      },
      mapNameEnabled: urlState.mapNameEnabled || false,
      mapNameFilter: (urlState.mapNameFilter as MapNameFilter) || 'all',
      playerFilter: {
        mode: (urlState.playerFilterMode as PlayerFilterMode) || 'none',
        players: urlState.players 
          ? decodeURIComponent(urlState.players).split(',').map(p => p.trim()).filter(p => p)
          : [],
      },
    };
  } else {
    // Legacy URL parameters - convert to independent filters for backward compatibility
    const gameFilter = (urlState.gameFilter as GameFilter) || 'all';
    const mapNameFilter = (urlState.mapNameFilter as MapNameFilter) || 'all';
    const dateStart = urlState.dateStart;
    const dateEnd = urlState.dateEnd;
    const playerFilterMode = (urlState.playerFilterMode as PlayerFilterMode) || 'none';
    const playersList = urlState.players;
    
    independentFilters = {
      gameTypeEnabled: gameFilter !== 'all',
      gameFilter: gameFilter,
      dateRangeEnabled: !!dateStart || !!dateEnd,
      dateRange: {
        start: dateStart || null,
        end: dateEnd || null,
      },
      mapNameEnabled: mapNameFilter !== 'all',
      mapNameFilter: mapNameFilter,
      playerFilter: {
        mode: playerFilterMode,
        players: playersList ? decodeURIComponent(playersList).split(',').map(p => p.trim()).filter(p => p) : [],
      },
    };
    
    // Set legacy values for backward compatibility
    if (gameFilter !== 'all') settings.gameFilter = gameFilter;
    if (mapNameFilter !== 'all') settings.mapNameFilter = mapNameFilter;
    if (dateStart || dateEnd) {
      settings.dateRange = { start: dateStart || null, end: dateEnd || null };
    }
    if (playerFilterMode !== 'none') {
      settings.playerFilter = {
        mode: playerFilterMode,
        players: playersList ? decodeURIComponent(playersList).split(',').map(p => p.trim()).filter(p => p) : [],
      };
    }
  }
  
  settings.independentFilters = independentFilters;

  // Parse highlighted player
  if (urlState.highlightedPlayer) {
    settings.highlightedPlayer = decodeURIComponent(urlState.highlightedPlayer);
  }
  
  // Parse data source
  if (urlState.dataSource === 'discord') {
    settings.dataSource = 'discord';
  } else if (urlState.dataSource) {
    settings.dataSource = 'main';
  }
  
  // Parse tab and subtab
  if (urlState.tab) {
    settings.tab = urlState.tab;
  }
  if (urlState.subtab) {
    settings.subtab = urlState.subtab;
  }
  
  // Parse selectedPlayerSelectionView
  if (urlState.playerSelectionView && ['rankings', 'titles', 'achievements', 'evolution', 'camps', 'kills', 'roles', 'deathmap', 'talkingtime', 'actions', 'roleactions'].includes(urlState.playerSelectionView)) {
    settings.selectedPlayerSelectionView = urlState.playerSelectionView as 'rankings' | 'titles' | 'achievements' | 'evolution' | 'camps' | 'kills' | 'roles' | 'deathmap' | 'talkingtime' | 'actions' | 'roleactions';
  }

  return settings;
}

// Helper function to parse settings from current URL
function parseSettingsFromUrl(): Partial<SettingsState> {
  const urlState = parseUrlState();
  return urlStateToSettings(urlState);
}

function updateUrlFromSettings(settings: SettingsState) {
  const urlState: Partial<UrlState> = {};
  
  // Always use independent filters format
  if (settings.independentFilters) {
    const filters = settings.independentFilters;
    
    // Only add parameters for enabled filters or non-default values
    if (filters.gameTypeEnabled) {
      urlState.gameTypeEnabled = true;
      if (filters.gameFilter !== 'all') {
        urlState.gameFilter = filters.gameFilter;
      }
    }
    
    if (filters.dateRangeEnabled) {
      urlState.dateRangeEnabled = true;
      if (filters.dateRange.start) urlState.dateStart = filters.dateRange.start;
      if (filters.dateRange.end) urlState.dateEnd = filters.dateRange.end;
    }
    
    if (filters.mapNameEnabled) {
      urlState.mapNameEnabled = true;
      if (filters.mapNameFilter !== 'all') {
        urlState.mapNameFilter = filters.mapNameFilter;
      }
    }
    
    if (filters.playerFilter.mode !== 'none') {
      urlState.playerFilterMode = filters.playerFilter.mode;
      if (filters.playerFilter.players.length > 0) {
        urlState.players = encodeURIComponent(filters.playerFilter.players.join(','));
      }
    }
  }
  
  // Highlighted player
  if (settings.highlightedPlayer && settings.highlightedPlayer !== defaultSettings.highlightedPlayer) {
    urlState.highlightedPlayer = encodeURIComponent(settings.highlightedPlayer);
  }
  
  // Data source
  if (settings.dataSource && settings.dataSource !== defaultSettings.dataSource) {
    urlState.dataSource = settings.dataSource;
  }
  
  // Tab and subtab
  if (settings.tab) {
    urlState.tab = settings.tab;
  }
  if (settings.subtab) {
    urlState.subtab = settings.subtab;
  }
  
  // PlayerSelection view type (automatically add tab if not set)
  if (settings.selectedPlayerSelectionView && settings.selectedPlayerSelectionView !== 'rankings') {
    // Ensure tab parameter is present when playerSelectionView is set
    if (!settings.tab) {
      urlState.tab = 'playerSelection';
    }
    urlState.playerSelectionView = settings.selectedPlayerSelectionView;
  }
  
  // Update URL without triggering page reload (replaceState for silent update)
  replaceUrlState(urlState);
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(() => {
    // Priority: URL params > localStorage > defaults
    const urlSettings = parseSettingsFromUrl();
    
    if (Object.keys(urlSettings).length > 0) {
      // URL params found, merge with defaults and force useIndependentFilters
      return { ...defaultSettings, ...urlSettings, useIndependentFilters: true };
    }
    
    // No URL params, try localStorage
    const saved = localStorage.getItem('lycans-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultSettings, ...parsed, useIndependentFilters: true };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  // Ensure useIndependentFilters is always true
  useEffect(() => {
    if (!settings.useIndependentFilters) {
      setSettings(prev => ({ ...prev, useIndependentFilters: true }));
    }
  }, [settings.useIndependentFilters]);

  // Listen for URL changes (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const urlSettings = parseSettingsFromUrl();
      if (Object.keys(urlSettings).length > 0) {
        setSettings({ ...defaultSettings, ...urlSettings });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const updateSettings = (newSettings: Partial<SettingsState>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('lycans-settings', JSON.stringify(updated));
    updateUrlFromSettings(updated);
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.setItem('lycans-settings', JSON.stringify(defaultSettings));
    updateUrlFromSettings(defaultSettings);
  };

  const generateUrlWithSettings = (settingsOverride?: Partial<SettingsState>): string => {
    const targetSettings = { ...settings, ...settingsOverride };
    const urlState: Partial<UrlState> = {};
    
    // Always use independent filters format
    if (targetSettings.independentFilters) {
      const filters = targetSettings.independentFilters;
      
      if (filters.gameTypeEnabled) {
        urlState.gameTypeEnabled = true;
        if (filters.gameFilter !== 'all') {
          urlState.gameFilter = filters.gameFilter;
        }
      }
      
      if (filters.dateRangeEnabled) {
        urlState.dateRangeEnabled = true;
        if (filters.dateRange.start) urlState.dateStart = filters.dateRange.start;
        if (filters.dateRange.end) urlState.dateEnd = filters.dateRange.end;
      }
      
      if (filters.mapNameEnabled) {
        urlState.mapNameEnabled = true;
        if (filters.mapNameFilter !== 'all') {
          urlState.mapNameFilter = filters.mapNameFilter;
        }
      }
      
      if (filters.playerFilter.mode !== 'none') {
        urlState.playerFilterMode = filters.playerFilter.mode;
        if (filters.playerFilter.players.length > 0) {
          urlState.players = encodeURIComponent(filters.playerFilter.players.join(','));
        }
      }
    }
    
    if (targetSettings.highlightedPlayer && targetSettings.highlightedPlayer !== defaultSettings.highlightedPlayer) {
      urlState.highlightedPlayer = encodeURIComponent(targetSettings.highlightedPlayer);
    }
    
    // Tab and subtab
    if (targetSettings.tab) {
      urlState.tab = targetSettings.tab;
    }
    if (targetSettings.subtab) {
      urlState.subtab = targetSettings.subtab;
    }
    
    // PlayerSelection view type (automatically add tab if not set)
    if (targetSettings.selectedPlayerSelectionView && targetSettings.selectedPlayerSelectionView !== 'rankings') {
      // Ensure tab parameter is present when playerSelectionView is set
      if (!targetSettings.tab) {
        urlState.tab = 'playerSelection';
      }
      urlState.playerSelectionView = targetSettings.selectedPlayerSelectionView;
    }
    
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const search = buildUrlSearch(urlState);
    return search ? `${baseUrl}?${search}` : baseUrl;
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, generateUrlWithSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}