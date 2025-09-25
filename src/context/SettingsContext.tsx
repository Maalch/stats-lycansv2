import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';


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
};

// Helper functions for URL parameters
function parseSettingsFromUrl(): Partial<SettingsState> {
  const urlParams = new URLSearchParams(window.location.search);
  const settings: Partial<SettingsState> = {};

  // Always use independent filters (the default now)
  settings.useIndependentFilters = true;
  
  // Parse independent filters (support both new-style and legacy URL parameters)
  const hasNewStyle = urlParams.has('gameTypeEnabled') || urlParams.has('dateRangeEnabled') || urlParams.has('mapNameEnabled');
  
  let independentFilters: IndependentFilters;
  
  if (hasNewStyle) {
    // New-style URL parameters
    independentFilters = {
      gameTypeEnabled: urlParams.get('gameTypeEnabled') === 'true',
      gameFilter: (urlParams.get('gameFilter') as GameFilter) || 'all',
      dateRangeEnabled: urlParams.get('dateRangeEnabled') === 'true',
      dateRange: {
        start: urlParams.get('dateStart') || null,
        end: urlParams.get('dateEnd') || null,
      },
      mapNameEnabled: urlParams.get('mapNameEnabled') === 'true',
      mapNameFilter: (urlParams.get('mapNameFilter') as MapNameFilter) || 'all',
      playerFilter: {
        mode: (urlParams.get('playerFilterMode') as PlayerFilterMode) || 'none',
        players: urlParams.get('players') 
          ? decodeURIComponent(urlParams.get('players')!).split(',').map(p => p.trim()).filter(p => p)
          : [],
      },
    };
  } else {
    // Legacy URL parameters - convert to independent filters for backward compatibility
    const legacyFilterMode = urlParams.get('filterMode');
    const gameFilter = (urlParams.get('gameFilter') as GameFilter) || 'all';
    const mapNameFilter = (urlParams.get('mapNameFilter') as MapNameFilter) || 'all';
    const dateStart = urlParams.get('dateStart');
    const dateEnd = urlParams.get('dateEnd');
    const playerFilterMode = (urlParams.get('playerFilterMode') as PlayerFilterMode) || 'none';
    const playersList = urlParams.get('players');
    
    independentFilters = {
      gameTypeEnabled: legacyFilterMode === 'gameType' && gameFilter !== 'all',
      gameFilter: gameFilter,
      dateRangeEnabled: legacyFilterMode === 'dateRange' && (!!dateStart || !!dateEnd),
      dateRange: {
        start: dateStart || null,
        end: dateEnd || null,
      },
      mapNameEnabled: legacyFilterMode === 'mapName' && mapNameFilter !== 'all',
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
  const highlightedPlayer = urlParams.get('highlightedPlayer');
  if (highlightedPlayer) {
    settings.highlightedPlayer = decodeURIComponent(highlightedPlayer);
  }

  return settings;
}

function updateUrlFromSettings(settings: SettingsState) {
  const urlParams = new URLSearchParams();
  
  // Always use independent filters format
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
  
  // Highlighted player
  if (settings.highlightedPlayer && settings.highlightedPlayer !== defaultSettings.highlightedPlayer) {
    urlParams.set('highlightedPlayer', encodeURIComponent(settings.highlightedPlayer));
  }
  
  // Update URL without triggering page reload
  const newUrl = urlParams.toString() ? `${window.location.pathname}?${urlParams.toString()}` : window.location.pathname;
  window.history.replaceState({}, '', newUrl);
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
    const urlParams = new URLSearchParams();
    
    // Always use independent filters format
    if (targetSettings.independentFilters) {
      const filters = targetSettings.independentFilters;
      
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
    
    if (targetSettings.highlightedPlayer && targetSettings.highlightedPlayer !== defaultSettings.highlightedPlayer) {
      urlParams.set('highlightedPlayer', encodeURIComponent(targetSettings.highlightedPlayer));
    }
    
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    return urlParams.toString() ? `${baseUrl}?${urlParams.toString()}` : baseUrl;
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