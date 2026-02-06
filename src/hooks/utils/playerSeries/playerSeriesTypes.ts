/**
 * Type definitions for player series tracking system
 */

export interface CampSeries {
  player: string;
  camp: 'Villageois' | 'Loups' | 'Sans Loups' | 'Rôles Solos';
  seriesLength: number;
  startGame: string;    // Global chronological game number (e.g., "123")
  endGame: string;      // Global chronological game number (e.g., "127")
  startDate: string;
  endDate: string;
  campCounts?: Record<string, number>; // Count of times each camp was played (optional, mainly for NoWolf series)
  isOngoing: boolean; // True if the series is still active (player hasn't played since)
  gameIds: string[]; // List of global chronological game numbers (e.g., ["123", "124", "125"])
}

export interface WinSeries {
  player: string;
  seriesLength: number;
  startGame: string;    // Global chronological game number (e.g., "123")
  endGame: string;      // Global chronological game number (e.g., "127")
  startDate: string;
  endDate: string;
  campCounts: Record<string, number>; // Count of times each camp was played
  isOngoing: boolean; // True if the series is still active (player hasn't played since)
  gameIds: string[]; // List of global chronological game numbers (e.g., ["123", "124", "125"])
}

export interface LossSeries {
  player: string;
  seriesLength: number;
  startGame: string;    // Global chronological game number (e.g., "123")
  endGame: string;      // Global chronological game number (e.g., "127")
  startDate: string;
  endDate: string;
  campCounts: Record<string, number>; // Count of times each camp was played
  isOngoing: boolean; // True if the series is still active (player hasn't played since)
  gameIds: string[]; // List of global chronological game numbers (e.g., ["123", "124", "125"])
}

export interface DeathSeries {
  player: string;
  seriesLength: number;
  startGame: string;    // Global chronological game number (e.g., "123")
  endGame: string;      // Global chronological game number (e.g., "127")
  startDate: string;
  endDate: string;
  campCounts: Record<string, number>; // Count of times each camp was played when dying
  isOngoing: boolean; // True if the series is still active (player hasn't played since)
  gameIds: string[]; // List of global chronological game numbers (e.g., ["123", "124", "125"])
}

export interface SurvivalSeries {
  player: string;
  seriesLength: number;
  startGame: string;    // Global chronological game number (e.g., "123")
  endGame: string;      // Global chronological game number (e.g., "127")
  startDate: string;
  endDate: string;
  campCounts: Record<string, number>; // Count of times each camp was played while surviving
  isOngoing: boolean; // True if the series is still active (player hasn't played since)
  gameIds: string[]; // List of global chronological game numbers (e.g., ["123", "124", "125"])
}

export interface PlayerSeriesData {
  // Full datasets for all players with series data
  allVillageoisSeries: CampSeries[];
  allLoupsSeries: CampSeries[];
  allNoWolfSeries: CampSeries[];
  allSoloSeries: CampSeries[];
  allWinSeries: WinSeries[];
  allLossSeries: LossSeries[];
  allDeathSeries: DeathSeries[];
  allSurvivalSeries: SurvivalSeries[];
  // Current ongoing series for ALL players (not just their best)
  currentVillageoisSeries: CampSeries[];
  currentLoupsSeries: CampSeries[];
  currentNoWolfSeries: CampSeries[];
  currentSoloSeries: CampSeries[];
  currentWinSeries: WinSeries[];
  currentLossSeries: LossSeries[];
  currentDeathSeries: DeathSeries[];
  currentSurvivalSeries: SurvivalSeries[];
  totalGamesAnalyzed: number;
  // Statistics for all players
  averageVillageoisSeries: number;
  averageLoupsSeries: number;
  averageNoWolfSeries: number;
  averageSoloSeries: number;
  averageWinSeries: number;
  averageLossSeries: number;
  averageDeathSeries: number;
  averageSurvivalSeries: number;
  eliteVillageoisCount: number; // Players with 5+ Villageois series
  eliteLoupsCount: number; // Players with 3+ Loups series
  eliteNoWolfCount: number; // Players with 5+ NoWolf series
  eliteSoloCount: number; // Players with 3+ Solo series
  eliteWinCount: number; // Players with 5+ win series
  eliteLossCount: number; // Players with 5+ loss series
  eliteDeathCount: number; // Players with 5+ death series
  eliteSurvivalCount: number; // Players with 5+ survival series
  totalPlayersCount: number;
  // Active series counts (all players currently on a streak, not just top 20)
  activeVillageoisCount: number; // Players currently on a Villageois streak
  activeLoupsCount: number; // Players currently on a Loups streak
  activeNoWolfCount: number; // Players currently on a NoWolf streak
  activeSoloCount: number; // Players currently on a Solo streak
  activeWinCount: number; // Players currently on a win streak
  activeLossCount: number; // Players currently on a loss streak
  activeDeathCount: number; // Players currently on a death streak
  activeSurvivalCount: number; // Players currently on a survival streak
  // Record ongoing counts (players currently in their personal best streak)
  ongoingVillageoisCount: number;
  ongoingLoupsCount: number;
  ongoingNoWolfCount: number;
  ongoingSoloCount: number;
  ongoingWinCount: number;
  ongoingLossCount: number;
  ongoingDeathCount: number;
  ongoingSurvivalCount: number;
}

export interface PlayerSeriesState {
  currentVillageoisSeries: number;
  currentLoupsSeries: number;
  currentNoWolfSeries: number;
  currentSoloSeries: number;
  longestVillageoisSeries: CampSeries | null;
  longestLoupsSeries: CampSeries | null;
  longestNoWolfSeries: CampSeries | null;
  longestSoloSeries: CampSeries | null;
  currentWinSeries: number;
  longestWinSeries: WinSeries | null;
  currentWinCamps: string[];
  currentLossSeries: number;
  longestLossSeries: LossSeries | null;
  currentLossCamps: string[];
  currentDeathSeries: number;
  longestDeathSeries: DeathSeries | null;
  currentDeathCamps: string[];
  currentSurvivalSeries: number;
  longestSurvivalSeries: SurvivalSeries | null;
  currentSurvivalCamps: string[];
  currentNoWolfCamps: string[]; // Track camps during NoWolf series
  currentSoloCamps: string[]; // Track camps during Solo series
  lastCamp: 'Villageois' | 'Loup' | 'Autres' | null;
  lastWon: boolean;
  lastDied: boolean;
  villageoisSeriesStart: { game: string; date: string } | null;
  loupsSeriesStart: { game: string; date: string } | null;
  noWolfSeriesStart: { game: string; date: string } | null;
  soloSeriesStart: { game: string; date: string } | null;
  winSeriesStart: { game: string; date: string } | null;
  lossSeriesStart: { game: string; date: string } | null;
  deathSeriesStart: { game: string; date: string } | null;
  survivalSeriesStart: { game: string; date: string } | null;
  // Track game IDs for current series - now DisplayedIds
  currentVillageoisGameIds: string[];
  currentLoupsGameIds: string[];
  currentNoWolfGameIds: string[];
  currentSoloGameIds: string[];
  currentWinGameIds: string[];
  currentLossGameIds: string[];
  currentDeathGameIds: string[];
  currentSurvivalGameIds: string[];
}
