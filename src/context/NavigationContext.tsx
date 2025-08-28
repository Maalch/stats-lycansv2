import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface NavigationFilters {
  selectedPlayer?: string;
  selectedGame?: number;
  selectedCamp?: string;
  selectedVictoryType?: string;
  selectedDate?: string; // For filtering by specific date (DD/MM/YYYY) or period (MM/YYYY)
  fromComponent?: string; // Track which component triggered the navigation
}

interface NavigationContextType {
  currentView: string;
  navigationFilters: NavigationFilters;
  navigateToGameDetails: (filters?: NavigationFilters) => void;
  navigateBack: () => void;
  clearNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<string>('');
  const [navigationFilters, setNavigationFilters] = useState<NavigationFilters>({});

  const navigateToGameDetails = (filters: NavigationFilters = {}) => {
    setNavigationFilters(filters);
    setCurrentView('gameDetails');
  };

  const navigateBack = () => {
    setCurrentView('');
    setNavigationFilters({});
  };

  const clearNavigation = () => {
    setCurrentView('');
    setNavigationFilters({});
  };

  return (
    <NavigationContext.Provider value={{
      currentView,
      navigationFilters,
      navigateToGameDetails,
      navigateBack,
      clearNavigation
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
