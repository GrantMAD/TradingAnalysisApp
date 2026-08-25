import { Candle, CandlestickPattern } from '../types';

/**
 * Detects common candlestick patterns in the recent data.
 * 
 * @param candles Array of historical candles
 * @returns Array of CandlestickPatterns detected on the most recent candles
 */
export function detectCandlestickPatterns(candles: Candle[]): CandlestickPattern[] {
  const patterns: CandlestickPattern[] = [];
  const n = candles.length;

  if (n < 3) {
    return patterns;
  }

  const c1 = candles[n - 1];
  const c2 = candles[n - 2];
  const c3 = candles[n - 3];

  const body1 = Math.abs(c1.close - c1.open);
  const range1 = c1.high - c1.low;
  const isBullish1 = c1.close > c1.open;
  const isBearish1 = c1.close < c1.open;

  const body2 = Math.abs(c2.close - c2.open);
  const isBullish2 = c2.close > c2.open;
  const isBearish2 = c2.close < c2.open;

  // 1. Doji
  if (body1 <= range1 * 0.1) {
    patterns.push({
      name: 'Doji',
      type: 'indecision',
      strength: 'moderate',
      candleIndex: n - 1
    });
  }

  // 2. Engulfing
  if (isBullish1 && isBearish2 && c1.close > c2.open && c1.open < c2.close) {
    patterns.push({
      name: 'Bullish Engulfing',
      type: 'bullish_reversal',
      strength: 'strong',
      candleIndex: n - 1
    });
  } else if (isBearish1 && isBullish2 && c1.close < c2.open && c1.open > c2.close) {
    patterns.push({
      name: 'Bearish Engulfing',
      type: 'bearish_reversal',
      strength: 'strong',
      candleIndex: n - 1
    });
  }

  // 3. Pin Bar / Hammer / Shooting Star
  const upperWick1 = c1.high - Math.max(c1.open, c1.close);
  const lowerWick1 = Math.min(c1.open, c1.close) - c1.low;

  if (lowerWick1 >= body1 * 2 && upperWick1 <= body1 * 0.5) {
    patterns.push({
      name: 'Hammer / Bullish Pin Bar',
      type: 'bullish_reversal',
      strength: 'strong',
      candleIndex: n - 1
    });
  } else if (upperWick1 >= body1 * 2 && lowerWick1 <= body1 * 0.5) {
    patterns.push({
      name: 'Shooting Star / Bearish Pin Bar',
      type: 'bearish_reversal',
      strength: 'strong',
      candleIndex: n - 1
    });
  }

  // 4. Inside Bar
  if (c1.high <= c2.high && c1.low >= c2.low) {
    patterns.push({
      name: 'Inside Bar',
      type: 'indecision', // can be continuation or reversal, indecision is safest
      strength: 'moderate',
      candleIndex: n - 1
    });
  }

  // 5. Morning / Evening Star
  if (n >= 3) {
    const isBearish3 = c3.close < c3.open;
    const isBullish3 = c3.close > c3.open;
    const body3 = Math.abs(c3.close - c3.open);

    // Morning Star: Big Bear -> small body (gap down ideally, but we'll stick to basic) -> Big Bull
    if (isBearish3 && body3 > range1 && body2 < (c2.high - c2.low) * 0.3 && isBullish1 && c1.close > (c3.open + c3.close) / 2) {
      patterns.push({
        name: 'Morning Star',
        type: 'bullish_reversal',
        strength: 'strong',
        candleIndex: n - 1
      });
    }

    // Evening Star: Big Bull -> small body -> Big Bear
    if (isBullish3 && body3 > range1 && body2 < (c2.high - c2.low) * 0.3 && isBearish1 && c1.close < (c3.open + c3.close) / 2) {
      patterns.push({
        name: 'Evening Star',
        type: 'bearish_reversal',
        strength: 'strong',
        candleIndex: n - 1
      });
    }
  }

  return patterns;
}
