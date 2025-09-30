export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: 'good' | 'bad';
  category: 'general' | 'performance' | 'series' | 'kills' | 'history';
  rank?: number; // Position in the top 10 (1-10)
  value?: number; // The actual value (games, win rate, etc.)
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