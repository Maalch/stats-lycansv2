import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';


export type GameFilter = 'all' | 'modded' | 'non-modded';
export type FilterMode = 'gameType' | 'dateRange' | 'mapName';
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

export interface SettingsState {
  filterMode: FilterMode;
  gameFilter: GameFilter;
  dateRange: DateRange;
  mapNameFilter: MapNameFilter;
  playerFilter: PlayerFilter;
  highlightedPlayer: string | null; // Player to highlight and always show in charts
}

interface SettingsContextType {
  settings: SettingsState;
  updateSettings: (newSettings: Partial<SettingsState>) => void;
  resetSettings: () => void;
  generateUrlWithSettings: (settingsOverride?: Partial<SettingsState>) => string;
}


const defaultSettings: SettingsState = {
  filterMode: 'gameType',
  gameFilter: 'all',
  dateRange: { start: null, end: null },
  mapNameFilter: 'all',
  playerFilter: { mode: 'none', players: [] },
  highlightedPlayer: null,
};

// Helper functions for URL parameters
function parseSettingsFromUrl(): Partial<SettingsState> {
  const urlParams = new URLSearchParams(window.location.search);
  const settings: Partial<SettingsState> = {};

  // Parse filter mode
  const filterMode = urlParams.get('filterMode') as FilterMode;
  if (filterMode && ['gameType', 'dateRange', 'mapName'].includes(filterMode)) {
    settings.filterMode = filterMode;
  }

  // Parse game filter
  const gameFilter = urlParams.get('gameFilter') as GameFilter;
  if (gameFilter && ['all', 'modded', 'non-modded'].includes(gameFilter)) {
    settings.gameFilter = gameFilter;
  }

  // Parse date range
  const dateStart = urlParams.get('dateStart');
  const dateEnd = urlParams.get('dateEnd');
  if (dateStart || dateEnd) {
    settings.dateRange = {
      start: dateStart || null,
      end: dateEnd || null,
    };
  }

  // Parse map name filter
  const mapNameFilter = urlParams.get('mapNameFilter') as MapNameFilter;
  if (mapNameFilter && ['all', 'village', 'chateau', 'others'].includes(mapNameFilter)) {
    settings.mapNameFilter = mapNameFilter;
  }

  // Parse player filter
  const playerFilterMode = urlParams.get('playerFilterMode') as PlayerFilterMode;
  const playersList = urlParams.get('players');
  
  if (playerFilterMode && ['none', 'include', 'exclude'].includes(playerFilterMode)) {
    const players = playersList ? decodeURIComponent(playersList).split(',').map(p => p.trim()).filter(p => p) : [];
    settings.playerFilter = {
      mode: playerFilterMode,
      players,
    };
  }

  // Parse highlighted player
  const highlightedPlayer = urlParams.get('highlightedPlayer');
  if (highlightedPlayer) {
    settings.highlightedPlayer = decodeURIComponent(highlightedPlayer);
  }

  return settings;
}

function updateUrlFromSettings(settings: SettingsState) {
  const urlParams = new URLSearchParams();
  
  // Only add parameters that differ from defaults
  if (settings.filterMode !== defaultSettings.filterMode) {
    urlParams.set('filterMode', settings.filterMode);
  }
  
  if (settings.gameFilter !== defaultSettings.gameFilter) {
    urlParams.set('gameFilter', settings.gameFilter);
  }
  
  if (settings.dateRange.start || settings.dateRange.end) {
    if (settings.dateRange.start) urlParams.set('dateStart', settings.dateRange.start);
    if (settings.dateRange.end) urlParams.set('dateEnd', settings.dateRange.end);
  }
  
  if (settings.mapNameFilter !== defaultSettings.mapNameFilter) {
    urlParams.set('mapNameFilter', settings.mapNameFilter);
  }
  
  if (settings.playerFilter.mode !== defaultSettings.playerFilter.mode) {
    urlParams.set('playerFilterMode', settings.playerFilter.mode);
  }
  
  if (settings.playerFilter.players.length > 0) {
    urlParams.set('players', encodeURIComponent(settings.playerFilter.players.join(',')));
  }
  
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
      // URL params found, merge with defaults
      return { ...defaultSettings, ...urlSettings };
    }
    
    // No URL params, try localStorage
    const saved = localStorage.getItem('lycans-settings');
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

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
    
    // Only add parameters that differ from defaults
    if (targetSettings.filterMode !== defaultSettings.filterMode) {
      urlParams.set('filterMode', targetSettings.filterMode);
    }
    
    if (targetSettings.gameFilter !== defaultSettings.gameFilter) {
      urlParams.set('gameFilter', targetSettings.gameFilter);
    }
    
    if (targetSettings.dateRange.start || targetSettings.dateRange.end) {
      if (targetSettings.dateRange.start) urlParams.set('dateStart', targetSettings.dateRange.start);
      if (targetSettings.dateRange.end) urlParams.set('dateEnd', targetSettings.dateRange.end);
    }
    
    if (targetSettings.mapNameFilter !== defaultSettings.mapNameFilter) {
      urlParams.set('mapNameFilter', targetSettings.mapNameFilter);
    }
    
    if (targetSettings.playerFilter.mode !== defaultSettings.playerFilter.mode) {
      urlParams.set('playerFilterMode', targetSettings.playerFilter.mode);
    }
    
    if (targetSettings.playerFilter.players.length > 0) {
      urlParams.set('players', encodeURIComponent(targetSettings.playerFilter.players.join(',')));
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