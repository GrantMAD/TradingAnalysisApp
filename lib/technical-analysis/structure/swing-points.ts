import { Candle, SwingPoint } from '../types';

/**
 * Detects swing highs and lows in a series of candles.
 * 
 * @param candles Array of historical candles
 * @param lookback Number of candles required on left and right to confirm a swing (default 3)
 * @returns Array of significant swing points
 */
export function detectSwingPoints(candles: Candle[], lookback: number = 3): SwingPoint[] {
  const swings: SwingPoint[] = [];

  if (candles.length < (lookback * 2) + 1) {
    return swings;
  }

  for (let i = lookback; i < candles.length - lookback; i++) {
    let isHigh = true;
    let isLow = true;

    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;

    // Check left and right sides
    for (let j = 1; j <= lookback; j++) {
      if (candles[i - j].high >= currentHigh || candles[i + j].high >= currentHigh) {
        isHigh = false;
      }
      if (candles[i - j].low <= currentLow || candles[i + j].low <= currentLow) {
        isLow = false;
      }
    }

    if (isHigh) {
      swings.push({
        type: 'high',
        price: currentHigh,
        time: candles[i].time,
        index: i,
        strength: lookback // currently simplified, real strength could measure further confirming candles
      });
    }

    if (isLow) {
      swings.push({
        type: 'low',
        price: currentLow,
        time: candles[i].time,
        index: i,
        strength: lookback
      });
    }
  }

  return swings;
}
