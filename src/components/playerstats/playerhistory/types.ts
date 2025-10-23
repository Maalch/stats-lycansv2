export type GroupByMethod = 'session' | 'month' | 'quarter' | 'year';

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
}
