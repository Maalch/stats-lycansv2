export type GroupByMethod = 'session' | 'month' | 'quarter' | 'year';

export type CampFilterOption = 'all' | 'Villageois' | 'Loup' | 'solo';

export interface GroupedDataPoint {
  period: string;
  totalGames: number;
  victories: number;
  defeats: number;
  winRate: string;
  winRateNum: number;
}

export interface PlayerHistoryProps {
  selectedPlayerName: string;
  groupingMethod?: GroupByMethod;
  campFilter?: CampFilterOption;
}
