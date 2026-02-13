export interface Ranking {
  id: string;
  title: string;
  description: string;
  type: 'good' | 'bad' | 'neutral';
  category: 'general' | 'performance' | 'series' | 'kills' | 'history' | 'comparison' | 'map' | 'voting' | 'loot';
  rank?: number; // Position in the ranking (1, 2, 3, ...)
  value?: number; // The actual value (games, win rate, etc.)
  totalRanked?: number; // Total number of players ranked in this category
  redirectTo?: {
    tab: string;
    subTab?: string;
    chartSection?: string;
    mapFilter?: string; // For map-specific rankings
  };
}

export interface PlayerRankings {
  playerId: string;
  allGamesRankings: Ranking[];
  moddedOnlyRankings: Ranking[];
}