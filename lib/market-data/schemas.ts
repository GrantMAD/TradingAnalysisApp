import { z } from 'zod';

export const CandleQuerySchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  timeframe: z.enum(['1m', '5m', '15m', '1h', '4h', '1d']),
  limit: z.coerce.number().int().min(1).max(5000).default(100),
  start: z.coerce.number().optional(),
  end: z.coerce.number().optional(),
});

export const TwelveDataTimeSeriesItemSchema = z.object({
  datetime: z.string(),
  open: z.string(),
  high: z.string(),
  low: z.string(),
  close: z.string(),
  volume: z.string().optional(),
});

export const TwelveDataTimeSeriesResponseSchema = z.object({
  meta: z.object({
    symbol: z.string(),
    interval: z.string(),
    currency: z.string().optional(),
    exchange_timezone: z.string().optional(),
    exchange: z.string().optional(),
    mic_code: z.string().optional(),
    type: z.string().optional(),
  }).optional(),
  values: z.array(TwelveDataTimeSeriesItemSchema).optional(),
  status: z.string(),
  code: z.number().optional(),
  message: z.string().optional(),
});

export const TwelveDataPriceResponseSchema = z.object({
  price: z.string().optional(),
  status: z.string().optional(),
  code: z.number().optional(),
  message: z.string().optional(),
});

export const CandleSchema = z.object({
  timestamp: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().optional(),
});

export const DataQualitySchema = z.object({
  provider: z.string(),
  symbol: z.string(),
  requestedAt: z.string(),
  dataAsOf: z.string(),
  latestCandleAt: z.string().optional(),
  isStale: z.boolean(),
  stalenessReason: z.string().optional(),
});

export const MarketDataResponseSchema = z.object({
  data: z.any(), // Can be refined later based on usage if needed
  quality: DataQualitySchema,
});
