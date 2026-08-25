import { Candle } from '../types';
import { calculateSMA } from './moving-averages';

export interface BollingerBandsPoint {
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

/**
 * Calculates Bollinger Bands.
 * 
 * @param candles Array of historical candles
 * @param period SMA period (default 20)
 * @param stdDev Multiplier for standard deviation (default 2)
 * @returns Array of Bollinger Bands values aligned with candles
 */
export function calculateBollingerBands(
  candles: Candle[],
  period: number = 20,
  stdDev: number = 2
): BollingerBandsPoint[] {
  const result: BollingerBandsPoint[] = Array.from({ length: candles.length }, () => ({
    upper: null,
    middle: null,
    lower: null
  }));

  if (candles.length < period) {
    return result;
  }

  const sma = calculateSMA(candles, period);

  for (let i = period - 1; i < candles.length; i++) {
    const middle = sma[i] as number;
    
    // Calculate standard deviation over the period
    let sumOfSquaredDeviations = 0;
    for (let j = 0; j < period; j++) {
      const price = candles[i - j].close;
      sumOfSquaredDeviations += Math.pow(price - middle, 2);
    }
    
    const standardDeviation = Math.sqrt(sumOfSquaredDeviations / period);
    
    result[i] = {
      middle,
      upper: middle + (standardDeviation * stdDev),
      lower: middle - (standardDeviation * stdDev)
    };
  }

  return result;
}
