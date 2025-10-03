export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: 'good' | 'bad';
  category: 'general' | 'performance' | 'series' | 'kills' | 'history' | 'comparison';
  rank?: number; // Position in the ranking (1, 2, 3, ...)
  value?: number; // The actual value (games, win rate, etc.)
  totalRanked?: number; // Total number of players ranked in this category
  redirectTo?: {
    tab: string;
    subTab?: string;
    chartSection?: string;
  };
}

export interface PlayerAchievements {
  playerId: string;
  allGamesAchievements: Achievement[];
  moddedOnlyAchievements: Achievement[];
}