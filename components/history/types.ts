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

export interface HistoryInstrument {
  symbol: string;
  display_name: string;
}

export function normalizeHistoryInstrument(input: unknown): HistoryInstrument | null {
  const candidate = Array.isArray(input) ? input[0] : input;
  if (!candidate || typeof candidate !== 'object') return null;

  const instrument = candidate as Record<string, unknown>;
  if (typeof instrument.symbol !== 'string' || typeof instrument.display_name !== 'string') {
    return null;
  }

  return {
    symbol: instrument.symbol,
    display_name: instrument.display_name,
  };
}
