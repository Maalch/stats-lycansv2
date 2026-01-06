import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface PlayerPairFilter {
  selectedPlayerPair: string[]; // Array of exactly 2 players (e.g., ["Player1", "Player2"])
  selectedPairRole: 'wolves' | 'lovers'; // Role the pair played together
}

export interface MultiPlayerFilter {
  selectedPlayers: string[]; // For filtering games where all these players participated (comparison scenarios)
  playersFilterMode: 'all-common-games' | 'opposing-camps' | 'same-camp'; // Mode for multi-player filtering
  winnerPlayer?: string; // For head-to-head scenarios, specify which player should be the winner
}

export interface CampFilter {
  selectedCamp: string; // The camp to filter by
  campFilterMode: 'wins-only' | 'all-assignments'; // How to filter by camp: only wins or all assignments
  _smallCamps?: string[]; // List of small camps for "Autres" category
  excludeWolfSubRoles?: boolean; // When true, excludes wolf sub roles from main camp filtering (example: "Loups sans Traître/Louveteau")
  excludeVillagers?: boolean; // When true, excludes villager sub roles from main camp filtering (example: "Villageois sans Chasseur/Alchimiste")
}

export interface NavigationFilters {
  selectedPlayer?: string;
  selectedPlayerWinMode?: 'wins-only' | 'all-assignments'; // How to filter by selected player: only wins or all assignments
  selectedGame?: string; // Changed from number to string to support DisplayedId format (e.g., "Ponce #123")
  selectedVictoryType?: string;
  selectedDate?: string; // For filtering by specific date (DD/MM/YYYY) or period (MM/YYYY)
  fromComponent?: string; // Track which component triggered the navigation
  selectedHarvestRange?: string; // For filtering by harvest percentage range (e.g., "0-25%", "26-50%", etc.)
  selectedGameDuration?: number; // For filtering by specific number of days (e.g., 3, 4, 5)
  selectedGameIds?: string[]; // Changed from number[] to string[] to support DisplayedId format
  selectedMapName?: string; // For filtering by map name (e.g., "Village", "Château", "Autres")
  selectedPower?: string; // For filtering by specific power (e.g., "Voyant", "Sorcière", "Aucun pouvoir")
  selectedSecondaryRole?: string; // For filtering by secondary role (e.g., "Cupidon", "Amoureux")
  
  // Grouped filters - all properties in each group must be provided together
  campFilter?: CampFilter;
  playerPairFilter?: PlayerPairFilter;
  multiPlayerFilter?: MultiPlayerFilter;
}

export interface CampPerformanceState {
  selectedCampPerformanceCamp: string;
  selectedCampPerformanceMinGames: number;
  viewMode: 'performance' | 'playPercentage';
}

export interface PlayerComparisonState {
  selectedPlayer1: string;
  selectedPlayer2: string;
  showDetailedStats: boolean;
}

export interface PlayersGeneralState {
  minGamesForWinRate: number;
  winRateOrder: 'best' | 'worst';
  focusChart?: 'participation' | 'winRate'; // Which chart to focus on when navigating
}

export interface DeathStatisticsState {
  selectedCamp: string;
  victimCampFilter?: string;
  minGamesForAverage: number;
  selectedView?: 'killers' | 'deaths' | 'hunter' | 'survival'; // Which view is currently displayed
  focusChart?: 'totalKills' | 'averageKills' | 'totalDeaths' | 'survivalRate'; // Which chart to focus on when navigating
}

export interface VotingStatsState {
  selectedCategory: 'overview' | 'behavior';
  selectedView: 'behavior' | 'accuracy' | 'targets' | 'voteRate' | 'skipRate' | 'abstentionRate';
}

export interface PlayerHistoryMapState {
  selectedCamp: string;
}

export interface PlayerHistoryRolesState {
  chartMode: 'appearances' | 'winRate';
}

export interface RolesStatsState {
  chartMode: 'appearances' | 'winRate';
}

export interface TalkingTimeState {
  minGames: number;
  displayMode: 'total' | 'outside' | 'during';
  focusChart?: string; // For future expansion if needed
}

export interface LootStatsState {
  minGames: number;
  campFilter?: string; // 'all', 'villageois', 'loup', or 'autres'
  view?: string; // 'normalized' or 'total'
}

export interface DeathLocationState {
  selectedCamp: string;
  selectedDeathTypes?: string[]; // Array of selected death type codes for multi-select filtering
}

export interface NavigationState {
  // PlayerGameHistoryChart state
  selectedPlayerName?: string;
  groupingMethod?: 'session' | 'month';
  selectedViewType?: 'performance' | 'camp' | 'map' | 'kills';
  // PlayerPairingStatsChart state
  selectedPairingTab?: 'wolves' | 'lovers';
  // DeathStatisticsChart state
  deathStatsSelectedCamp?: string;
  // PlayerSeriesChart state
  selectedSeriesType?: 'villageois' | 'loup' | 'nowolf' | 'solo' | 'wins' | 'losses';
  seriesViewMode?: 'best' | 'ongoing';
  // PlayerSelectionPage state
  selectedPlayerSelectionView?: 'achievements' | 'evolution' | 'camps' | 'maps' | 'kills' | 'roles' | 'deathmap' | 'talkingtime';
  
  // Grouped state - all properties in each group must be provided together
  campPerformanceState?: CampPerformanceState;
  playerComparisonState?: PlayerComparisonState;
  playersGeneralState?: PlayersGeneralState;
  deathStatisticsState?: DeathStatisticsState;
  votingStatsState?: VotingStatsState;
  playerHistoryMapState?: PlayerHistoryMapState;
  playerHistoryRolesState?: PlayerHistoryRolesState;
  rolesStatsState?: RolesStatsState;
  talkingTimeState?: TalkingTimeState;
  lootStatsState?: LootStatsState;
  deathLocationState?: DeathLocationState;
}

interface NavigationContextType {
  currentView: string;
  navigationFilters: NavigationFilters;
  navigationState: NavigationState;
  navigateToGameDetails: (filters?: NavigationFilters) => void;
  navigateBack: () => void;
  clearNavigation: () => void;
  updateNavigationState: (state: Partial<NavigationState>) => void;
  // Tab navigation
  requestedTab?: { mainTab: string; subTab?: string };
  navigateToTab: (mainTab: string, subTab?: string) => void;
  clearTabNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<string>('');
  const [navigationFilters, setNavigationFilters] = useState<NavigationFilters>({});
  const [navigationState, setNavigationState] = useState<NavigationState>({});
  const [requestedTab, setRequestedTab] = useState<{ mainTab: string; subTab?: string } | undefined>();

  const navigateToGameDetails = useCallback((filters: NavigationFilters = {}) => {
    setNavigationFilters(filters);
    setCurrentView('gameDetails');
  }, []);

  const navigateBack = useCallback(() => {
    setCurrentView('');
    setNavigationFilters({});
  }, []);

  const clearNavigation = useCallback(() => {
    setCurrentView('');
    setNavigationFilters({});
    setNavigationState({});
  }, []);

  const updateNavigationState = useCallback((state: Partial<NavigationState>) => {
    setNavigationState(prev => ({ ...prev, ...state }));
  }, []);

  const navigateToTab = useCallback((mainTab: string, subTab?: string) => {
    setRequestedTab({ mainTab, subTab });
  }, []);

  const clearTabNavigation = useCallback(() => {
    setRequestedTab(undefined);
  }, []);

  return (
    <NavigationContext.Provider value={{
      currentView,
      navigationFilters,
      navigationState,
      navigateToGameDetails,
      navigateBack,
      clearNavigation,
      updateNavigationState,
      requestedTab,
      navigateToTab,
      clearTabNavigation
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
