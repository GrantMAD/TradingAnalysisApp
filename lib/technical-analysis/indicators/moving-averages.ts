import { Candle } from '../types';

/**
 * Calculates Simple Moving Average (SMA).
 * 
 * @param candles Array of historical candles
 * @param period SMA period
 * @returns Array of SMA values aligned with candles
 */
export function calculateSMA(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);

  if (candles.length < period) {
    return result;
  }

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  
  result[period - 1] = sum / period;

  for (let i = period; i < candles.length; i++) {
    sum = sum - candles[i - period].close + candles[i].close;
    result[i] = sum / period;
  }

  return result;
}

/**
 * Calculates Exponential Moving Average (EMA).
 * 
 * @param candles Array of historical candles
 * @param period EMA period
 * @returns Array of EMA values aligned with candles
 */
export function calculateEMA(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);

  if (candles.length < period) {
    return result;
  }

  // Initial EMA is a simple moving average
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  
  const initialSMA = sum / period;
  result[period - 1] = initialSMA;

  const multiplier = 2 / (period + 1);

  for (let i = period; i < candles.length; i++) {
    const prevEma = result[i - 1] as number;
    result[i] = (candles[i].close - prevEma) * multiplier + prevEma;
  }

  return result;
}
