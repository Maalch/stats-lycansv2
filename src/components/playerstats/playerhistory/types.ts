export type GroupByMethod = 'session' | 'month';

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
