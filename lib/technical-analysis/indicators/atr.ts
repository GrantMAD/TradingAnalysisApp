import { Candle } from '../types';

/**
 * Calculates Wilder's Average True Range (ATR).
 * 
 * @param candles Array of historical candles
 * @param period ATR period (default 14)
 * @returns Array of ATR values aligned with candles
 */
export function calculateATR(candles: Candle[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);

  if (candles.length <= period) {
    return result;
  }

  const trueRanges: number[] = new Array(candles.length).fill(0);

  // First candle TR is just high - low because there's no previous close
  trueRanges[0] = candles[0].high - candles[0].low;

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);

    trueRanges[i] = Math.max(tr1, tr2, tr3);
  }

  // Initial ATR is the SMA of the first 'period' True Ranges
  let trSum = 0;
  // Note: we can start from index 1 because index 0 is not a full TR, but usually it's included.
  // Standard implementation includes the first day's high-low as its TR.
  for (let i = 1; i <= period; i++) {
    trSum += trueRanges[i];
  }
  
  let atr = trSum / period;
  result[period] = atr;

  // Wilder's smoothing for subsequent ATR values
  for (let i = period + 1; i < candles.length; i++) {
    atr = ((atr * (period - 1)) + trueRanges[i]) / period;
    result[i] = atr;
  }

  return result;
}
