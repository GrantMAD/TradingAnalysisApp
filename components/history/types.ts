export interface HistoryAnalysis {
  id: string;
  timeframe: string;
  status: string;
  decision: 'LONG' | 'SHORT' | 'NO_TRADE' | null;
  setup_score: number | null;
  confidence_score: number | null;
  created_at: string;
  instrument: {
    symbol: string;
    display_name: string;
  } | null;
}
