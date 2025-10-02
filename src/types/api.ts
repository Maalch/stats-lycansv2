import { getThemeAdjustedColor, useThemeAdjustedColors } from '../utils/themeColors';

// Custom color palette for camps
const lycansColorScheme: Record<string, string> = {
  'Idiot du Village': '#00FF00',
  'Cannibale': '#00FF80',
  'Agent': '#800080',
  'Espion': '#BF40BF',
  'Scientifique': '#8080FF',
  'La Bête': '#808080',
  'Chasseur de primes': '#800080',
  'Vaudou': '#A626FF',
  'Zombie': '#A626FF',
  'Traître': '#FF8000',
  'Amoureux': '#FF80FF',
  'Loup': '#FF0000',
  'Villageois': '#0096FF',
  'Chasseur': '#fbff00',
  'Alchimiste': '#ff00d4',
};

// Mapping for French color names to hex codes 
const frenchColorMapping: Record<string, string> = {
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

const playerFrenchColorNames: Record<string, keyof typeof frenchColorMapping> = {
  "Ponce": "Bleu royal",
  "Khalen": "Bleu foncé",
  "Monodie": "Bleu royal",
  "Kao": "Gris",
  "Arkantors": "Rose",
  "Bytell": "Vert pomme",
  "Kyria": "Violet",
  "Fukano": "Orange",
  "Brybry": "Vert foncé",
  "Baout": "Vert pomme",
  "Lutti": "Turquoise",
  "Miraaaaaah": "Violet",
  "Tsuna": "Marron",
  "Noamouille": "Orange",
  "Craco": "Marron",
  "ClydeCreator": "Rouge",
  "Ketchopi": "Jaune",
  "BoccA": "Gris",
  "Koka": "Vert foncé",
  "Anaee": "Violet",
  "Flonflon": "Vert pomme",
  "Lydiaam": "Jaune",
  "Heimdalle": "Turquoise",
  "Drakony": "Gris",
  "Tone": "Jaune",
  "Mathy": "Jaune",
  "Poachimpa": "Marron",
  "Cyldhur": "Gris",
  "Reivil": "Orange",
  "Zarcross": "Orange",
  "Shaunz": "Bleu royal",
  "Aayley": "Vert foncé",
  "RomainJacques": "Jaune",
  "DevGirl_": "Rose",
  "CHLOE": "Turquoise",
  "Yoona": "Rose",
  "Mickalow": "Vert foncé",
  "PeoBran": "Turquoise",
  "Tovi": "Gris",
  "Kissiffrote": "Bleu royal",
  "Pelerine": "Gris",
  "MaMaPaprika": "Orange",
  "Xari": "Vert foncé",
  "Sakor": "Orange",
  "HortyUnderscore": "Turquoise",
  "LittleBigWhale": "Rose",
  "Gom4rt": "Jaune",
  "Ultia": "Violet",
  "Onutrem": "Bleu royal",
  "DFG": "Marron",
  "Crocodyle": "Gris",
  "GoB": "Rouge",
  "Wingo": "Violet",
  "Nahomay": "Rose",
  "Naka": "Jaune",
  "Covfefe": "Violet",
  "LyeGaia": "Vert foncé",
  "Maechi": "Vert foncé",
  "TPK": "Vert foncé",
  "Clem_mlrt": "Violet",
  "Bidji": "Orange",
  "AfterNoune": "Orange",
  "JimmyBoyyy": "Marron",
  "Mimosa_etoilee": "Rouge",
  "Leaprima": "Jaune",
  "Riri et son ptit Ricard": "Rose",
  "Berlu": "Vert foncé",
  "Antoine": "Rouge",
  "AvaMind": "Turquoise",
  "Skyyart": "Violet",
  "Pressea": "Marron",
  "Etoiles": "Vert pomme",
  "Areliann": "Jaune",
  "SpicY": "Rose"
};



const playersColor: Record<string, string> = Object.fromEntries(
  Object.entries(playerFrenchColorNames).map(([player, colorName]) => [
    player,
    frenchColorMapping[colorName]
  ])
);


  // Options pour le nombre minimum de parties
export const minGamesOptions = [3, 5, 10, 20, 25, 50, 75, 100, 150, 200];

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
  maxDurationGameId: string | null; // DisplayedId with maximum duration 
  minDurationGameId: string | null; // DisplayedId with minimum duration 
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
    return getThemeAdjustedColor(lycansColorScheme[campName]);
  }
  
  // Generate a consistent color based on camp name
  const generatedColor = getRandomColor(campName);
  
  // Return generated color or fallback
  return generatedColor || fallbackColor || lycansOtherCategoryColor;
}

/**
 * React hook to get theme-adjusted lycans color scheme that updates on theme change
 * @returns Reactive color scheme object with theme-appropriate colors
 */
export function useThemeAdjustedLycansColorScheme(): Record<string, string> {
  return useThemeAdjustedColors(lycansColorScheme);
}

/**
 * React hook to get theme-adjusted French color mapping that updates on theme change
 * @returns Reactive color mapping with theme-appropriate colors
 */
export function useThemeAdjustedFrenchColorMapping(): Record<string, string> {
  return useThemeAdjustedColors(frenchColorMapping);
}

/**
 * React hook to get theme-adjusted players color that updates on theme change
 * @returns Reactive players color mapping with theme-appropriate colors
 */
export function useThemeAdjustedPlayersColor(): Record<string, string> {
  return useThemeAdjustedColors(playersColor);
}