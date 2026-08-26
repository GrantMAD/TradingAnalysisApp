import { Candle, SwingPoint, LiquidityZone } from '../types';

/**
 * Identifies liquidity pool areas where stop hunts and reversals are more likely.
 * 
 * @param candles Array of historical candles
 * @param swings Array of swing points
 * @param atr Current ATR value to determine the size of equal highs/lows deviation
 * @returns Array of LiquidityZones
 */
export function identifyLiquidityZones(
  candles: Candle[],
  swings: SwingPoint[],
  atr: number
): LiquidityZone[] {
  const zones: LiquidityZone[] = [];
  
  if (candles.length < 2 || swings.length < 2) {
    return zones;
  }

  const threshold = atr * 0.15; // Strict threshold for "equal"

  // 1. Equal Highs / Equal Lows (Stop clusters)
  const highs = swings.filter(s => s.type === 'high');
  const lows = swings.filter(s => s.type === 'low');

  // Check for equal highs
  for (let i = 0; i < highs.length; i++) {
    for (let j = i + 1; j < highs.length; j++) {
      if (Math.abs(highs[i].price - highs[j].price) <= threshold) {
        const avg = (highs[i].price + highs[j].price) / 2;
        zones.push({
          type: 'equal_highs',
          price: avg,
          zone: { min: avg - threshold, max: avg + threshold }
        });
      }
    }
  }

  // Check for equal lows
  for (let i = 0; i < lows.length; i++) {
    for (let j = i + 1; j < lows.length; j++) {
      if (Math.abs(lows[i].price - lows[j].price) <= threshold) {
        const avg = (lows[i].price + lows[j].price) / 2;
        zones.push({
          type: 'equal_lows',
          price: avg,
          zone: { min: avg - threshold, max: avg + threshold }
        });
      }
    }
  }

  // 2. Previous Day High / Low
  // Find the previous day boundaries
  const lastCandle = candles[candles.length - 1];
  const currentDay = new Date(lastCandle.time * 1000).getUTCDate();
  
  const prevDayCandles: Candle[] = [];
  let foundPrevDay = false;
  let prevDay = -1;

  for (let i = candles.length - 1; i >= 0; i--) {
    const d = new Date(candles[i].time * 1000).getUTCDate();
    if (d !== currentDay) {
      if (!foundPrevDay) {
        foundPrevDay = true;
        prevDay = d;
      }
      if (d === prevDay) {
        prevDayCandles.push(candles[i]);
      } else {
        break; // Moved to the day before previous day
      }
    }
  }

  if (prevDayCandles.length > 0) {
    let prevDayHigh = -Infinity;
    let prevDayLow = Infinity;

    for (const c of prevDayCandles) {
      if (c.high > prevDayHigh) prevDayHigh = c.high;
      if (c.low < prevDayLow) prevDayLow = c.low;
    }

    zones.push({
      type: 'previous_day_high',
      price: prevDayHigh,
      zone: { min: prevDayHigh - threshold, max: prevDayHigh + threshold }
    });

    zones.push({
      type: 'previous_day_low',
      price: prevDayLow,
      zone: { min: prevDayLow - threshold, max: prevDayLow + threshold }
    });
  }

  // 3. Consolidation zones (basic check for tight ranges in recent N candles)
  const lookback = Math.min(20, candles.length);
  const recentCandles = candles.slice(-lookback);
  
  let maxHigh = -Infinity;
  let minLow = Infinity;
  for (const c of recentCandles) {
    if (c.high > maxHigh) maxHigh = c.high;
    if (c.low < minLow) minLow = c.low;
  }

  const range = maxHigh - minLow;
  if (range < atr * 1.5) { // If the range over 20 candles is very small compared to ATR
    const mid = (maxHigh + minLow) / 2;
    zones.push({
      type: 'consolidation',
      price: mid,
      zone: { min: minLow, max: maxHigh }
    });
  }

  // Remove exact duplicates if any
  const uniqueZones: LiquidityZone[] = [];
  const seen = new Set();
  
  for (const z of zones) {
    const key = `${z.type}_${z.price.toFixed(5)}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueZones.push(z);
    }
  }

  return uniqueZones;
}
