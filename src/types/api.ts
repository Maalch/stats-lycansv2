// Camp Win Statistics Types
export interface CampStat {
  camp: string;
  wins: number;
  winRate: string;
}

export interface CampWinStatsResponse {
  totalGames: number;
  campStats: CampStat[];
  error?: string;
}

// Harvest Statistics Types
export interface HarvestDistribution {
  "0-25%": number;
  "26-50%": number;
  "51-75%": number;
  "76-100%": number;
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