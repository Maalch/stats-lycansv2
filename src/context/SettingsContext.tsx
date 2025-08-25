import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';


export type GameFilter = 'all' | 'modded' | 'non-modded';
export type FilterMode = 'gameType' | 'dateRange';

export interface DateRange {
  start: string | null; // ISO date string (YYYY-MM-DD) or null
  end: string | null;
}

export interface SettingsState {
  filterMode: FilterMode;
  gameFilter: GameFilter;
  dateRange: DateRange;
}

interface SettingsContextType {
  settings: SettingsState;
  updateSettings: (newSettings: Partial<SettingsState>) => void;
  resetSettings: () => void;
}


const defaultSettings: SettingsState = {
  filterMode: 'gameType',
  gameFilter: 'all',
  dateRange: { start: null, end: null },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(() => {
    // Load settings from localStorage if available
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

  const updateSettings = (newSettings: Partial<SettingsState>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('lycans-settings', JSON.stringify(updated));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.setItem('lycans-settings', JSON.stringify(defaultSettings));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
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