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
  "Ponce": "#0076FF",           // Bleu clair
  "Khalen": "#0012A6",          // Bleu foncé
  "Monodie": "#0076FF",         // Bleu clair
  "Kao": "#909090",             // Gris
  "Arkantors": "#FF61F4",       // Rose
  "Bytell": "#54D90F",          // Vert clair
  "Kyria": "#6F00D9",           // Violet
  "Fukano": "#FF9500",          // Orange
  "Brybry": "#009A13",          // Vert foncé
  "Baout": "#FF61F4",           // Rose
  "Lutti": "#00FFFF",           // Cyan
  "Miraaaaaah": "#6F00D9",      // Violet
  "Tsuna": "#A65200",           // Marron
  "Noamouille": "#FF9500",      // Orange
  "Craco": "#FF61F4",           // Rose
  "ClydeCreator": "#FF0000",    // Rouge
  "Ketchopi": "#FFED00",        // Jaune
  "BoccA": "#A65200",           // Marron
  "Koka": "#FFED00",            // Jaune
  "Anaee": "#A65200",           // Marron
  "Flonflon": "#54D90F",        // Vert clair
  "Lydiaam": "#FFED00",         // Jaune
  "Heimdalle": "#00FFFF",       // Cyan
  "Drakony": "#A65200",         // Marron
  "Tone": "#FFED00",            // Jaune
  "Mathy": "#FFED00",           // Jaune
  "Poachimpa": "#A65200",       // Marron
  "Cyldhur": "#909090",         // Gris
  "Reivil": "#FF9500",          // Orange
  "Zarcross": "#FF9500",        // Orange
  "Shaunz": "#0012A6",          // Bleu foncé
  "Aayley": "#009A13",          // Vert foncé
  "RomainJacques": "#FFED00",   // Jaune
  "DevGirl_": "#FF61F4",        // Rose
  "CHLOE": "#00FFFF",           // Cyan
  "Yoona": "#FF0000",           // Rouge
  "Mickalow": "#009A13",        // Vert foncé
  "PeoBran": "#00FFFF",         // Cyan
  "Tovi": "#909090",            // Gris
  "Kissiffrote": "#FF0000",     // Rouge
  "Pelerine": "#909090",        // Gris
  "MaMaPaprika": "#FF9500",     // Orange
  "Xari": "#009A13",            // Vert foncé
  "Sakor": "#FFED00",           // Jaune
  "HortyUnderscore": "#00FFFF", // Cyan
  "LittleBigWhale": "#FF61F4",  // Rose
  "Gom4rt": "#FF9500",          // Orange
  "Ultia": "#6F00D9",           // Violet
  "Onutrem": "#0076FF",         // Bleu clair
  "DFG": "#A65200",             // Marron
  "Crocodyle": "#909090",       // Gris
  "GoB": "#FF0000",             // Rouge
  "Wingo": "#FF9500",           // Orange
  "Nahomay": "#00FFFF",         // Cyan
  "Naka": "#FFED00",            // Jaune
  "Covfefe": "#6F00D9",         // Violet
  "LyeGaia": "#FF9500",         // Orange
  "Maechi": "#009A13",          // Vert foncé
  "TPK": "#00FFFF",             // Cyan
  "Clem_mlrt": "#00FFFF",       // Cyan
  "Bidji": "#FF61F4",           // Rose
  "AfterNoune": "#FF9500",      // Orange
  "JimmyBoyyy": "#A65200",      // Marron
  "Mimosa_etoilee": "#FF0000",  // Rouge
  "Leaprima": "#FFED00",        // Jaune
  "Riri et son ptit Ricard": "#A65200", // Marron
  "Berlu": "#009A13",           // Vert foncé
  "Antoine": "#FF0000",         // Rouge
  "AvaMind": "#00FFFF",         // Cyan
  "Skyyart": "#6F00D9",         // Violet
  "Pressea": "#A65200",         // Marron
  "Etoiles": "#54D90F"          // Vert clair
};

export const lycansOtherCategoryColor = '#9c9c9cff';

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