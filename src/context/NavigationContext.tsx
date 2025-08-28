import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface NavigationFilters {
  selectedPlayer?: string;
  selectedGame?: number;
  selectedCamp?: string;
  selectedVictoryType?: string;
  selectedDate?: string; // For filtering by specific date (DD/MM/YYYY) or period (MM/YYYY)
  fromComponent?: string; // Track which component triggered the navigation
  _smallCamps?: string[]; // List of small camps for "Autres" category
  selectedPlayerPair?: string[]; // For filtering by specific player pair (e.g., ["Player1", "Player2"])
  selectedPairRole?: 'wolves' | 'lovers'; // Role the pair played together
  campFilterMode?: 'wins-only' | 'all-assignments'; // How to filter by camp: only wins or all assignments
  selectedHarvestRange?: string; // For filtering by harvest percentage range (e.g., "0-25%", "26-50%", etc.)
  selectedGameDuration?: number; // For filtering by specific number of days (e.g., 3, 4, 5)
}

export interface NavigationState {
  // PlayerGameHistoryChart state
  selectedPlayerName?: string;
  groupingMethod?: 'session' | 'month';
  // PlayerPairingStatsChart state
  selectedPairingTab?: 'wolves' | 'lovers';
  // PlayerCampPerformanceChart state
  selectedCampPerformanceView?: 'player-performance' | 'top-performers';
  selectedCampPerformanceCamp?: string;
  selectedCampPerformanceMinGames?: number;
}

interface NavigationContextType {
  currentView: string;
  navigationFilters: NavigationFilters;
  navigationState: NavigationState;
  navigateToGameDetails: (filters?: NavigationFilters) => void;
  navigateBack: () => void;
  clearNavigation: () => void;
  updateNavigationState: (state: Partial<NavigationState>) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<string>('');
  const [navigationFilters, setNavigationFilters] = useState<NavigationFilters>({});
  const [navigationState, setNavigationState] = useState<NavigationState>({});

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
    setNavigationState({});
  };

  const updateNavigationState = (state: Partial<NavigationState>) => {
    setNavigationState(prev => ({ ...prev, ...state }));
  };

  return (
    <NavigationContext.Provider value={{
      currentView,
      navigationFilters,
      navigationState,
      navigateToGameDetails,
      navigateBack,
      clearNavigation,
      updateNavigationState
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
