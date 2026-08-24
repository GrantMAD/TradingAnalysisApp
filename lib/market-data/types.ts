export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
export type MarketType = 'crypto' | 'forex';

export interface Candle {
  timestamp: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface MarketPrice {
  symbol: string;
  price: number;
  timestamp: number;
  provider: string;
}

export interface Instrument {
  id?: string;
  symbol: string;
  name: string;
  type: MarketType;
  is_active: boolean;
  base_currency?: string;
  quote_currency?: string;
  description?: string;
}

export interface CandleRequest {
  symbol: string;
  timeframe: Timeframe;
  limit: number;
  start?: number; // Unix timestamp
  end?: number; // Unix timestamp
}

export interface DataQuality {
  provider: string;
  symbol: string;
  requestedAt: string; // ISO string
  dataAsOf: string; // ISO string
  latestCandleAt?: string; // ISO string
  isStale: boolean;
  stalenessReason?: string;
}

export interface MarketDataResponse<T> {
  data: T;
  quality: DataQuality;
}

export interface MarketDataProvider {
  readonly name: string;
  getCandles(request: CandleRequest): Promise<MarketDataResponse<Candle[]>>;
  getLatestPrice(symbol: string): Promise<MarketDataResponse<MarketPrice>>;
  getSupportedInstruments(): Promise<Instrument[]>;
}
