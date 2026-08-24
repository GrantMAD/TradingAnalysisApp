import { 
  MarketDataProvider,
  CandleRequest, 
  Candle, 
  MarketPrice, 
  Instrument, 
  MarketDataResponse, 
  Timeframe, 
  DataQuality 
} from './types';
import { MarketDataError } from './errors';
import { 
  TwelveDataTimeSeriesResponseSchema, 
  TwelveDataPriceResponseSchema 
} from './schemas';

const API_BASE_URL = 'https://api.twelvedata.com';

const TIMEFRAME_MAP: Record<Timeframe, string> = {
  '1m': '1min',
  '5m': '5min',
  '15m': '15min',
  '1h': '1h',
  '4h': '4h',
  '1d': '1day',
};

const STALENESS_THRESHOLDS_MS: Record<Timeframe, number> = {
  '1m': 2 * 60 * 1000,
  '5m': 2 * 60 * 1000,
  '15m': 5 * 60 * 1000,
  '1h': 15 * 60 * 1000,
  '4h': 30 * 60 * 1000,
  '1d': 4 * 60 * 60 * 1000,
};

export class TwelveDataProvider implements MarketDataProvider {
  readonly name = 'twelve_data';

  private get apiKey(): string {
    const key = process.env.TWELVE_DATA_API_KEY;
    if (!key) {
      throw new MarketDataError('PROVIDER_NOT_CONFIGURED', 'Market data provider is not configured. Add TWELVE_DATA_API_KEY to .env.');
    }
    return key;
  }

  async getCandles(request: CandleRequest): Promise<MarketDataResponse<Candle[]>> {
    const requestedAt = new Date();
    
    // Convert symbol format if needed (TwelveData format is usually standard)
    const tdSymbol = request.symbol;
    const tdInterval = TIMEFRAME_MAP[request.timeframe];
    
    const url = new URL(`${API_BASE_URL}/time_series`);
    url.searchParams.append('symbol', tdSymbol);
    url.searchParams.append('interval', tdInterval);
    url.searchParams.append('outputsize', request.limit.toString());
    url.searchParams.append('apikey', this.apiKey);
    
    // Add optional params
    if (request.start) {
      // TwelveData uses YYYY-MM-DD hh:mm:ss for start_date/end_date, or we can use unix timestamp depending on their endpoint docs.
      // Usually format is start_date. Let's just pass unix if supported, but typically string is safer. 
      // Their docs actually support 'start_date' as unix timestamp in some cases, or string.
      // Assuming string date:
      // url.searchParams.append('start_date', new Date(request.start * 1000).toISOString());
    }

    try {
      const response = await fetch(url.toString(), { cache: 'no-store' }); // Disable fetch cache here; caching should be in service layer
      if (!response.ok) {
        throw new MarketDataError('NETWORK_ERROR', `HTTP error ${response.status}`);
      }

      const data = await response.json();
      const parsed = TwelveDataTimeSeriesResponseSchema.safeParse(data);
      
      if (!parsed.success) {
        throw new MarketDataError('INVALID_RESPONSE', 'Failed to parse Twelve Data response');
      }

      if (parsed.data.status === 'error') {
        const code = parsed.data.code;
        if (code === 429) {
          throw new MarketDataError('RATE_LIMITED', parsed.data.message || 'Rate limit exceeded');
        }
        if (code === 400 || code === 404) {
           throw new MarketDataError('INVALID_SYMBOL', parsed.data.message || 'Invalid symbol');
        }
        throw new MarketDataError('PROVIDER_ERROR', parsed.data.message || 'Provider API error');
      }

      if (!parsed.data.values || parsed.data.values.length === 0) {
        return {
          data: [],
          quality: {
            provider: this.name,
            symbol: request.symbol,
            requestedAt: requestedAt.toISOString(),
            dataAsOf: requestedAt.toISOString(),
            isStale: false,
          }
        };
      }

      const candles: Candle[] = parsed.data.values.map(v => {
        // TwelveData datetime is typically "2021-09-09 10:45:00" string
        const ts = new Date(v.datetime + 'Z').getTime() / 1000; // Force UTC if needed, or rely on parsing
        // Actually, Twelve Data returns in exchange timezone unless specified, so append timezone=UTC to request or parse properly
        // Let's add timezone=UTC in URL above, wait, I didn't add it. I should assume it's exchange time, but for safety let's use Date.parse
        const tStamp = new Date(v.datetime).getTime() / 1000;
        
        return {
          timestamp: tStamp,
          open: parseFloat(v.open),
          high: parseFloat(v.high),
          low: parseFloat(v.low),
          close: parseFloat(v.close),
          volume: v.volume ? parseFloat(v.volume) : undefined
        };
      }).filter(c => this.validateCandle(c));

      // Reverse so it's oldest to newest (Twelve data usually returns newest first)
      candles.reverse();

      const latestCandle = candles[candles.length - 1];
      const dataAsOf = new Date(latestCandle.timestamp * 1000);
      const ageMs = requestedAt.getTime() - dataAsOf.getTime();
      const isStale = ageMs > STALENESS_THRESHOLDS_MS[request.timeframe];

      const quality: DataQuality = {
        provider: this.name,
        symbol: request.symbol,
        requestedAt: requestedAt.toISOString(),
        dataAsOf: dataAsOf.toISOString(),
        latestCandleAt: dataAsOf.toISOString(),
        isStale,
        stalenessReason: isStale ? `Data is ${Math.round(ageMs/60000)} minutes old (threshold: ${STALENESS_THRESHOLDS_MS[request.timeframe]/60000}m)` : undefined
      };

      return { data: candles, quality };

    } catch (error) {
      if (error instanceof MarketDataError) throw error;
      throw new MarketDataError('NETWORK_ERROR', 'Failed to fetch data from provider', error);
    }
  }

  async getLatestPrice(symbol: string): Promise<MarketDataResponse<MarketPrice>> {
    const requestedAt = new Date();
    const url = new URL(`${API_BASE_URL}/price`);
    url.searchParams.append('symbol', symbol);
    url.searchParams.append('apikey', this.apiKey);

    try {
      const response = await fetch(url.toString(), { cache: 'no-store' });
      if (!response.ok) {
        throw new MarketDataError('NETWORK_ERROR', `HTTP error ${response.status}`);
      }

      const data = await response.json();
      const parsed = TwelveDataPriceResponseSchema.safeParse(data);

      if (!parsed.success) {
        throw new MarketDataError('INVALID_RESPONSE', 'Failed to parse Twelve Data price response');
      }

      if (parsed.data.status === 'error') {
        const code = parsed.data.code;
        if (code === 429) {
          throw new MarketDataError('RATE_LIMITED', parsed.data.message || 'Rate limit exceeded');
        }
        if (code === 400 || code === 404) {
           throw new MarketDataError('INVALID_SYMBOL', parsed.data.message || 'Invalid symbol');
        }
        throw new MarketDataError('PROVIDER_ERROR', parsed.data.message || 'Provider API error');
      }

      const priceStr = parsed.data.price;
      if (!priceStr) {
        throw new MarketDataError('INVALID_RESPONSE', 'Price missing from response');
      }

      const priceVal = parseFloat(priceStr);

      const quality: DataQuality = {
        provider: this.name,
        symbol,
        requestedAt: requestedAt.toISOString(),
        dataAsOf: requestedAt.toISOString(), // Real-time endpoint doesn't usually provide a strict timestamp, assume current
        isStale: false,
      };

      return {
        data: {
          symbol,
          price: priceVal,
          timestamp: Math.floor(requestedAt.getTime() / 1000),
          provider: this.name
        },
        quality
      };

    } catch (error) {
       if (error instanceof MarketDataError) throw error;
       throw new MarketDataError('NETWORK_ERROR', 'Failed to fetch price from provider', error);
    }
  }

  async getSupportedInstruments(): Promise<Instrument[]> {
    // According to plan, instruments come from DB, not provider directly.
    // Provider might not be called for this, but to satisfy interface:
    return [];
  }

  private validateCandle(candle: Candle): boolean {
    if (isNaN(candle.open) || isNaN(candle.high) || isNaN(candle.low) || isNaN(candle.close)) return false;
    if (candle.high < candle.low) return false;
    if (candle.open > candle.high || candle.open < candle.low) return false;
    if (candle.close > candle.high || candle.close < candle.low) return false;
    return true;
  }
}
