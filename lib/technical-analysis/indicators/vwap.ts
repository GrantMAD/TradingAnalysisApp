import { Candle } from '../types';

export interface VWAPResult {
  values: (number | null)[];
  reason?: string;
}

/**
 * Calculates Volume Weighted Average Price (VWAP).
 * VWAP is typically reset each trading session, but since we receive a linear array of candles,
 * we will assume the array is a continuous session or we'll reset on day changes if timeframe is intraday.
 * For simplicity in this implementation, we'll assume a continuous calculation or reset on day boundary.
 * 
 * @param candles Array of historical candles
 * @returns Array of VWAP values aligned with candles and a potential reason if volume is missing
 */
export function calculateVWAP(candles: Candle[]): VWAPResult {
  const result: (number | null)[] = new Array(candles.length).fill(null);

  if (candles.length === 0) {
    return { values: result };
  }

  // Check if volume data exists
  const hasVolume = candles.some(c => c.volume !== undefined && c.volume !== null);
  
  if (!hasVolume) {
    return {
      values: result,
      reason: 'No volume data available for VWAP calculation. (Forex may only have tick-volume)'
    };
  }

  let cumulativePriceVolume = 0;
  let cumulativeVolume = 0;
  let currentDay = new Date(candles[0].time * 1000).getUTCDate();

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    
    // Check for day boundary to reset VWAP (assuming intraday timeframe)
    const candleDay = new Date(candle.time * 1000).getUTCDate();
    if (candleDay !== currentDay) {
      cumulativePriceVolume = 0;
      cumulativeVolume = 0;
      currentDay = candleDay;
    }

    const volume = candle.volume || 0;
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;

    cumulativePriceVolume += typicalPrice * volume;
    cumulativeVolume += volume;

    if (cumulativeVolume > 0) {
      result[i] = cumulativePriceVolume / cumulativeVolume;
    } else {
      result[i] = null;
    }
  }

  return { values: result };
}
