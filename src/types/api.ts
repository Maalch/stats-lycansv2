// Custom color palette for camps
export const lycansColorScheme: Record<string, string> = {
  'Villageois': '#4CAF50',
  'Loups': '#ff1100ff',
  'Amoureux': '#E91E63',
  'Idiot du Village': '#fbff00ff',
  'Cannibale': '#795548',
  'La Bête': '#a00000ff',
  'Espion': '#2196F3',
  'Vaudou': '#673AB7',
  'Chasseur de primes': '#FFC107',
  'Chasseur': '#187e04ff',
  'Alchimiste': '#ff00d4ff',
  'Traître': '#aa5f0aff',
};

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

// Role Survival Statistics Types
export interface RoleStats {
  role: string;
  appearances: number;
  survived: number;
  survivalRate: string;
  avgLifespan: string;
  totalLifespan: number;
}

export interface RoleSurvivalStatsResponse {
  roleStats: RoleStats[];
  campStats: RoleStats[];
  secondaryRoleStats: RoleStats[];
  thirdRoleStats: RoleStats[];
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

  // Helper to generate a pastel random color
export function getRandomColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 60%, 70%)`;
}