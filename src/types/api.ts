// Custom color palette for camps
export const lycansColorScheme: Record<string, string> = {
  'Idiot du Village': '#00FF00',
  'Cannibale': '#00FF80',
  'Agent': '#800080',
  'Espion': '#BF40BF',
  'Scientifique': '#8080FF',
  'La Bête': '#808080',
  'Chasseur de primes': '#800080',
  'Vaudou': '#A626FF',
  'Traître': '#FF8000',
  'Amoureux': '#FF80FF',
  'Loups': '#FF0000',
  'Villageois': '#0096FF',
  'Chasseur': '#1faa03ff',
  'Alchimiste': '#ff00d4ff',
};

export const playersColor: Record<string, string> = {
  "Ponce": "#2e2eff",
  "Khalen": "#0000ff",
  "Monodie": "#0000ff",
  "Fukano": "#ffb900",
  "Tone": "#ffff00",
  "RomainJacques": "#ffff00",
  "Ketchopl": "#ffff00",
  "Arkantors": "#00ff00",
  "Flonflon": "#00ff00",
  "Anaee": "#a000ff",
  "Pelerine": "#969696ff",
  "DevGirl_": "#ff00ff",
  "Bytell": "#00ff00",
  "Tsuna": "#a52a2ac9",
  "Poachimpa": "#a52a2ac9",
  "Lutti": "#00ffff",
  "Kao": "#969696ff",
  "CHLOE": "#00ffff",
  "MaMaPaprika": "#ff9000",
  "Reivil": "#ff9000",
  "Noamouille": "#ff9000",
  "Zarcross": "#ff9000",
  "Craco": "#ff00ff",
  "Mathy": "#ff00ff",
  "ClydeCreator": "#ff0000",
  "Kyria": "#a000ff",
  "Tovi": "#969696ff",
  "BoccA": "#969696ff",
  "Cyldhur": "#969696ff",
  "PeoBran": "#00ffff",
  "Miraaaaaah": "#ffff00",
  "Brybry": "#00ff00",
  "Heimdalle": "#00ffff"
};

  // Options pour le nombre minimum de parties
export const minGamesOptions = [5, 10, 25, 50, 75, 100, 150, 200];

// Types pour les statistiques des joueurs
export interface PlayerCamps {
  Villageois: number;
  Loups: number;
  Traître: number;
  "Idiot du Village": number;
  Cannibale: number;
  Agent: number;
  Espion: number;
  Scientifique: number;
  Amoureux: number;
  "La Bête": number;
  "Chasseur de primes": number;
  Vaudou: number;
}

// Camp Win Statistics Types
export interface CampStat {
  camp: string;
  wins: number;
  winRate: string;
}

export interface SoloCamp {
  soloRole: string;
  appearances: number;
}

export interface CampWinStatsResponse {
  totalGames: number;
  campStats: CampStat[];
  soloCamps: SoloCamp[];
  error?: string;
}

// Harvest Statistics Types
export interface HarvestDistribution {
  "0-25%": number;
  "26-50%": number;
  "51-75%": number;
  "76-99%": number;
  "100%": number;
}

export interface CampHarvestData {
  totalPercent: number;
  count: number;
  average: string;
}

export interface HarvestStatsResponse {
  averageHarvest: number;
  averageHarvestPercent: string;
  gamesWithHarvest: number;
  harvestDistribution: HarvestDistribution;
  harvestByWinner: Record<string, CampHarvestData>;
  error?: string;
}

// Game Duration Analysis Types
export interface DayDistribution {
  days: number;
  count: number;
}

export interface CampDaysData {
  totalDays: number;
  count: number;
  average: string;
}

export interface GameDurationAnalysisResponse {
  averageDays: string;
  maxDays: number;
  minDays: number;
  dayDistribution: DayDistribution[];
  daysByWinnerCamp: Record<string, CampDaysData>;
  daysByPlayerCount: Record<string, CampDaysData>;
  daysByWolfRatio: Record<string, CampDaysData>;
  error?: string;
}

export interface CampAverage {
  camp: string;
  totalGames: number;
  winRate: string;
}

export interface PlayerCampPerformance {
  camp: string;
  games: number;
  wins: number;
  winRate: string;
  campAvgWinRate: string;
  performance: string;
}

export interface PlayerPerformance {
  player: string;
  totalGames: number;
  campPerformance: PlayerCampPerformance[];
}

export interface PlayerCampPerformanceResponse {
  campAverages: CampAverage[];
  playerPerformance: PlayerPerformance[];
  minGamesRequired: number;
}

export interface PlayerPairStat {
  pair: string;
  appearances: number;
  wins: number;
  winRate: string;
  players: string[];
}

export interface PlayerPairingStatsData {
  wolfPairs: {
    totalGames: number;
    pairs: PlayerPairStat[];
  };
  loverPairs: {
    totalGames: number;
    pairs: PlayerPairStat[];
  };
}

export interface PlayerStat {
  player: string;
  gamesPlayed: number;
  gamesPlayedPercent: string;
  wins: number;
  winPercent: string;
  camps: PlayerCamps;
}

export interface PlayerStatsData {
  totalGames: number;
  playerStats: PlayerStat[];
}

  // Helper to generate a pastel random color
export function getRandomColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 60%, 70%)`;
}