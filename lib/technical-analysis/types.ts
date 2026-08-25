export interface Candle {
  time: number; // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface SwingPoint {
  type: 'high' | 'low';
  price: number;
  time: number;
  index: number;
  strength: number; // how many candles confirmed it on each side
}

export interface Level {
  price: number;
  type: 'support' | 'resistance';
  strength: number; // 1–5, based on number of touches/reactions
  touches: number;
  zone: { min: number; max: number };
}

export interface TrendResult {
  direction: 'strongly_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strongly_bearish';
  strength: number; // 0–100
  basis: string[]; // human-readable reasons
}

export interface MarketStructure {
  swings: SwingPoint[];
  recentPattern: 'HH_HL' | 'LH_LL' | 'mixed' | 'unclear';
  breakOfStructure: boolean;
  changeOfCharacter: boolean;
  bosDirection?: 'bullish' | 'bearish';
}

export interface IndicatorSnapshot {
  rsi: (number | null)[];
  macd: { macd: number | null; signal: number | null; histogram: number | null }[];
  sma20: (number | null)[];
  sma50: (number | null)[];
  sma200: (number | null)[];
  ema9: (number | null)[];
  ema20: (number | null)[];
  ema50: (number | null)[];
  bollinger: { upper: number | null; middle: number | null; lower: number | null }[];
  atr: (number | null)[];
  adx: { adx: number | null; plusDI: number | null; minusDI: number | null }[];
  vwap: (number | null)[];
}

export interface FibonacciLevels {
  retracement: Record<string, number>;
  extension: Record<string, number>;
}

export interface LiquidityZone {
  type: 'equal_highs' | 'equal_lows' | 'consolidation' | 'previous_day_high' | 'previous_day_low';
  price: number;
  zone: { min: number; max: number };
}

export interface CandlestickPattern {
  name: string;
  type: 'bullish_reversal' | 'bearish_reversal' | 'continuation' | 'indecision';
  strength: 'weak' | 'moderate' | 'strong';
  candleIndex: number;
}

export interface ChartPattern {
  name: string;
  bias: 'bullish' | 'bearish' | 'neutral';
  confidence: 'low' | 'medium' | 'high';
  keyLevels: number[];
  invalidationLevel: number;
}

export interface SetupScoreResult {
  total: number | null; // 0–100, or null if scoring is bypassed for NO_TRADE
  breakdown?: {
    trendAlignment: number;
    marketStructure: number;
    entryLocation: number;
    momentum: number;
    volume: number;
    riskReward: number;
    multiTimeframe: number;
  };
  notes: string[]; // plain-English notes per category (fed to AI as context)
  isHeuristicScore: true; // Emphasize this is NOT a probability of winning
  noTradeReason?: string; // Why the scoring was bypassed if total is null
}

export interface TAResult {
  candles: Candle[];
  indicators: IndicatorSnapshot;
  structure: MarketStructure;
  trend: TrendResult;
  levels: Level[];
  fibonacci?: FibonacciLevels;
  liquidityZones: LiquidityZone[];
  candlestickPatterns: CandlestickPattern[];
  chartPatterns: ChartPattern[];
  setupScore?: SetupScoreResult;
  dataQuality?: string;
}

export interface MultiTimeframeContext {
  timeframe: string;
  trend: TrendResult;
  keyLevels: Level[];
  structure: MarketStructure;
}

export interface UserSettings {
  // Placeholder for user settings like preferred indicator periods if needed
  [key: string]: any;
}
