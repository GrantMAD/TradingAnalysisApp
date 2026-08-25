import { Candle } from '../types';

/**
 * Calculates Wilder's Relative Strength Index (RSI).
 * 
 * @param candles Array of historical candles
 * @param period RSI period (default 14)
 * @returns Array of RSI values aligned with candles (null where insufficient data)
 */
export function calculateRSI(candles: Candle[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);

  if (candles.length <= period) {
    return result; // Not enough data
  }

  let avgGain = 0;
  let avgLoss = 0;

  // Calculate initial average gain and loss (SMA for the first 'period' candles)
  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // Calculate the first RSI value
  if (avgLoss === 0) {
    result[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    result[period] = 100 - (100 / (1 + rs));
  }

  // Calculate smoothed RSI for the rest of the candles
  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    let gain = 0;
    let loss = 0;

    if (change > 0) {
      gain = change;
    } else {
      loss = Math.abs(change);
    }

    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = 100 - (100 / (1 + rs));
    }
  }

  return result;
}
