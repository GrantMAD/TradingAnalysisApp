import { createMarketDataProvider } from './provider';
import { MarketDataProvider, CandleRequest, Candle, MarketPrice, Instrument, MarketDataResponse, Timeframe } from './types';
import { MarketDataError } from './errors';
import { createAdminClient } from '../supabase/server';

const CACHE_TTL_MS: Record<Timeframe, number> = {
  '1m': 30 * 1000,
  '5m': 60 * 1000,
  '15m': 2 * 60 * 1000,
  '1h': 5 * 60 * 1000,
  '4h': 15 * 60 * 1000,
  '1d': 30 * 60 * 1000,
};

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MarketDataService {
  private provider: MarketDataProvider;
  private candlesCache = new Map<string, CacheEntry<MarketDataResponse<Candle[]>>>();
  private priceCache = new Map<string, CacheEntry<MarketDataResponse<MarketPrice>>>();
  private instrumentsCache: CacheEntry<Instrument[]> | null = null;

  constructor() {
    this.provider = createMarketDataProvider();
  }

  async getCandles(request: CandleRequest): Promise<MarketDataResponse<Candle[]>> {
    const cacheKey = `${request.symbol}-${request.timeframe}-${request.limit}-${request.start || ''}-${request.end || ''}`;
    
    const cached = this.candlesCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    try {
      const startTime = Date.now();
      const response = await this.provider.getCandles(request);
      const latency = Date.now() - startTime;
      console.log(`[MarketDataService] getCandles(${request.symbol}, ${request.timeframe}) from ${this.provider.name} - ${latency}ms`);
      
      this.candlesCache.set(cacheKey, {
        data: response,
        expiresAt: Date.now() + CACHE_TTL_MS[request.timeframe]
      });
      return response;
    } catch (error) {
       console.error(`[MarketDataService] getCandles error:`, error);
       throw error;
    }
  }

  async getLatestPrice(symbol: string): Promise<MarketDataResponse<MarketPrice>> {
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    try {
      const startTime = Date.now();
      const response = await this.provider.getLatestPrice(symbol);
      const latency = Date.now() - startTime;
      console.log(`[MarketDataService] getLatestPrice(${symbol}) from ${this.provider.name} - ${latency}ms`);
      
      this.priceCache.set(symbol, {
        data: response,
        expiresAt: Date.now() + 15 * 1000 // 15 seconds cache for price
      });
      return response;
    } catch (error) {
       console.error(`[MarketDataService] getLatestPrice error:`, error);
       throw error;
    }
  }

  async getInstruments(type?: string): Promise<Instrument[]> {
    if (this.instrumentsCache && Date.now() < this.instrumentsCache.expiresAt) {
       const data = this.instrumentsCache.data;
       return type ? data.filter(i => i.type === type) : data;
    }

    const supabase = await createAdminClient();
    
    const { data, error } = await supabase
      .from('instruments')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error(`[MarketDataService] getInstruments error:`, error);
      throw new MarketDataError('NETWORK_ERROR', 'Failed to fetch instruments from database', error);
    }

    const instruments = data as Instrument[];
    this.instrumentsCache = {
      data: instruments,
      expiresAt: Date.now() + 60 * 60 * 1000 // 1 hour cache
    };

    return type ? instruments.filter(i => i.type === type) : instruments;
  }
}

// Singleton instance
export const marketDataService = new MarketDataService();
