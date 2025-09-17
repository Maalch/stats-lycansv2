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
  'Loup': '#FF0000',
  'Villageois': '#0096FF',
  'Chasseur': '#1faa03ff',
  'Alchimiste': '#ff00d4ff',
};

export const playersColor: Record<string, string> = {
  "Ponce": "#0076FF",           // Bleu royal
  "Khalen": "#0012A6",          // Bleu foncé
  "Monodie": "#0076FF",         // Bleu royal
  "Kao": "#909090",             // Gris
  "Arkantors": "#FF61F4",       // Rose
  "Bytell": "#54D90F",          // Vert pomme
  "Kyria": "#6F00D9",           // Violet
  "Fukano": "#FF9500",          // Orange
  "Brybry": "#009A13",          // Vert foncé 
  "Baout": "#54D90F",           // Vert pomme
  "Lutti": "#00FFFF",           // Turquoise
  "Miraaaaaah": "#6F00D9",      // Violet
  "Tsuna": "#A65200",           // Marron
  "Noamouille": "#FF9500",      // Orange
  "Craco": "#A65200",           // Marron
  "ClydeCreator": "#FF0000",    // Rouge
  "Ketchopi": "#FFED00",        // Jaune
  "BoccA": "#909090",           // Gris
  "Koka": "#009A13",            // Vert foncé
  "Anaee": "#6F00D9",           // Violet
  "Flonflon": "#54D90F",        // Vert pomme
  "Lydiaam": "#FFED00",         // Jaune
  "Heimdalle": "#00FFFF",       // Turquoise
  "Drakony": "#909090",         // Gris
  "Tone": "#FFED00",            // Jaune
  "Mathy": "#FFED00",           // Jaune
  "Poachimpa": "#A65200",       // Marron
  "Cyldhur": "#909090",         // Gris
  "Reivil": "#FF9500",          // Orange
  "Zarcross": "#FF9500",        // Orange
  "Shaunz": "#0076FF",          // Bleu royal 
  "Aayley": "#009A13",          // Vert foncé
  "RomainJacques": "#FFED00",   // Jaune
  "DevGirl_": "#FF61F4",        // Rose
  "CHLOE": "#00FFFF",           // Turquoise
  "Yoona": "#FF61F4",           // Rose
  "Mickalow": "#009A13",        // Vert foncé
  "PeoBran": "#00FFFF",         // Turquoise
  "Tovi": "#909090",            // Gris
  "Kissiffrote": "#0076FF",     // Bleu royal 
  "Pelerine": "#909090",        // Gris
  "MaMaPaprika": "#FF9500",     // Orange
  "Xari": "#009A13",            // Vert foncé
  "Sakor": "#FF9500",           // Orange
  "HortyUnderscore": "#00FFFF", // Turquoise
  "LittleBigWhale": "#FF61F4",  // Rose
  "Gom4rt": "#FFED00",          // Jaune
  "Ultia": "#6F00D9",           // Violet
  "Onutrem": "#0076FF",         // Bleu royal
  "DFG": "#A65200",             // Marron
  "Crocodyle": "#909090",       // Gris
  "GoB": "#FF0000",             // Rouge
  "Wingo": "#6F00D9",           // Violet
  "Nahomay": "#FF61F4",         // Rose
  "Naka": "#FFED00",            // Jaune
  "Covfefe": "#6F00D9",         // Violet
  "LyeGaia": "#009A13",         // Vert foncé 
  "Maechi": "#009A13",          // Vert foncé
  "TPK": "#009A13",             // Vert foncé
  "Clem_mlrt": "#6F00D9",       // Violet
  "Bidji": "#FF9500",           // Orange
  "AfterNoune": "#FF9500",      // Orange
  "JimmyBoyyy": "#A65200",      // Marron
  "Mimosa_etoilee": "#FF0000",  // Rouge
  "Leaprima": "#FFED00",        // Jaune
  "Riri et son ptit Ricard": "#FF61F4", // Rose
  "Berlu": "#009A13",           // Vert foncé
  "Antoine": "#FF0000",         // Rouge
  "AvaMind": "#00FFFF",         // Turquoise
  "Skyyart": "#6F00D9",         // Violet
  "Pressea": "#A65200",         // Marron
  "Etoiles": "#54D90F"          // Vert pomme
};

// Mapping for French color names to hex codes 
export const frenchColorMapping: Record<string, string> = {
  "Bleu foncé": "#0012A6",      
  "Orange": "#FF9500",          
  "Turquoise": "#00FFFF",       
  "Bleu royal": "#0076FF",      
  "Rouge": "#FF0000",           
  "Jaune": "#FFED00",           
  "Vert foncé": "#009A13",      
  "Marron": "#A65200",         
  "Vert pomme": "#54D90F",     
  "Violet": "#6F00D9",         
  "Gris": "#909090",           
  "Rose": "#FF61F4"            
};

export const lycansOtherCategoryColor = '#808080ff';

  // Options pour le nombre minimum de parties
export const minGamesOptions = [3, 5, 10, 25, 50, 75, 100, 150, 200];

// Types pour les statistiques des joueurs
// Dynamic interface that adapts to the camps found in the game data
export type PlayerCamps = Record<string, number>;

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
  // Extended data for CampsChart to avoid dependency on PlayerCampPerformance
  campAverages?: CampAverage[];
  totalPlayersAnalyzed?: number;
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
export interface DurationDistribution {
  duration: number; // Duration in seconds
  count: number;
}

export interface CampDurationData {
  totalDuration: number; // Total duration in seconds
  count: number;
  average: string; // Formatted average duration
}

export interface GameDurationAnalysisResponse {
  averageDuration: string; // Formatted average duration
  maxDuration: number; // Max duration in seconds
  minDuration: number; // Min duration in seconds
  maxDurationGameId: string | null; // DisplayedId with maximum duration (e.g., "Ponce #123")
  minDurationGameId: string | null; // DisplayedId with minimum duration (e.g., "Ponce #124")
  durationDistribution: DurationDistribution[];
  durationsByWinnerCamp: Record<string, CampDurationData>;
  durationsByPlayerCount: Record<string, CampDurationData>;
  durationsByWolfRatio: Record<string, CampDurationData>;
  error?: string;
}

export interface CampAverage {
  camp: string;
  totalGames: number;
  wins: number;
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

/**
 * Get color for a camp, with fallback to generated color for unknown camps
 * @param campName - The name of the camp
 * @param fallbackColor - Optional fallback color if camp not found and random generation fails
 * @returns Color string (hex or hsl)
 */
export function getCampColor(campName: string, fallbackColor?: string): string {
  // Check if we have a predefined color
  if (lycansColorScheme[campName]) {
    return lycansColorScheme[campName];
  }
  
  // Generate a consistent color based on camp name
  const generatedColor = getRandomColor(campName);
  
  // Return generated color or fallback
  return generatedColor || fallbackColor || lycansOtherCategoryColor;
}