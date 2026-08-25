import { Candle } from '../types';
import { calculateEMA } from './moving-averages';

export interface MACDPoint {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

/**
 * Calculates Moving Average Convergence Divergence (MACD).
 * 
 * @param candles Array of historical candles
 * @param fast Fast EMA period (default 12)
 * @param slow Slow EMA period (default 26)
 * @param signal Signal EMA period (default 9)
 * @returns Array of MACD values aligned with candles
 */
export function calculateMACD(
  candles: Candle[],
  fast: number = 12,
  slow: number = 26,
  signal: number = 9
): MACDPoint[] {
  const result: MACDPoint[] = Array.from({ length: candles.length }, () => ({
    macd: null,
    signal: null,
    histogram: null
  }));

  if (candles.length < slow) {
    return result;
  }

  const fastEma = calculateEMA(candles, fast);
  const slowEma = calculateEMA(candles, slow);

  const macdLine: (number | null)[] = new Array(candles.length).fill(null);
  
  for (let i = slow - 1; i < candles.length; i++) {
    if (fastEma[i] !== null && slowEma[i] !== null) {
      macdLine[i] = (fastEma[i] as number) - (slowEma[i] as number);
      result[i].macd = macdLine[i];
    }
  }

  // Calculate Signal line which is EMA of MACD line
  // The first Signal line value is an SMA of the first 'signal' MACD values
  let macdStartIndex = slow - 1;
  if (macdStartIndex + signal > candles.length) {
      return result;
  }

  let sum = 0;
  for (let i = 0; i < signal; i++) {
    sum += macdLine[macdStartIndex + i] as number;
  }
  
  let signalEma = sum / signal;
  let signalIndex = macdStartIndex + signal - 1;
  
  result[signalIndex].signal = signalEma;
  result[signalIndex].histogram = (result[signalIndex].macd as number) - signalEma;

  const multiplier = 2 / (signal + 1);

  for (let i = signalIndex + 1; i < candles.length; i++) {
    const prevSignal = result[i - 1].signal as number;
    const currentMacd = macdLine[i] as number;
    
    signalEma = (currentMacd - prevSignal) * multiplier + prevSignal;
    
    result[i].signal = signalEma;
    result[i].histogram = currentMacd - signalEma;
  }

  return result;
}
