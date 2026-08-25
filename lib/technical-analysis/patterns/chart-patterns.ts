import { SwingPoint, Level, ChartPattern } from '../types';

/**
 * Detects common chart patterns based on swing points and levels.
 * 
 * @param swings Array of swing points
 * @param levels Array of detected support/resistance levels
 * @returns Array of ChartPatterns
 */
export function detectChartPatterns(swings: SwingPoint[], levels: Level[]): ChartPattern[] {
  const patterns: ChartPattern[] = [];
  
  if (swings.length < 5) {
    return patterns;
  }

  // Filter highs and lows
  const highs = swings.filter(s => s.type === 'high');
  const lows = swings.filter(s => s.type === 'low');

  // Double Top
  if (highs.length >= 2 && lows.length >= 1) {
    const h1 = highs[highs.length - 2];
    const h2 = highs[highs.length - 1];
    const l1 = lows[lows.length - 1]; // Low between them

    if (h2.time > h1.time && l1.time > h1.time && l1.time < h2.time) {
      // Check if highs are approximately equal
      const priceDiff = Math.abs(h1.price - h2.price);
      const avgPrice = (h1.price + h2.price) / 2;
      
      if (priceDiff < avgPrice * 0.005) { // 0.5% tolerance
        patterns.push({
          name: 'Double Top',
          bias: 'bearish',
          confidence: 'medium',
          keyLevels: [avgPrice, l1.price],
          invalidationLevel: avgPrice * 1.01 // 1% above top
        });
      }
    }
  }

  // Double Bottom
  if (lows.length >= 2 && highs.length >= 1) {
    const l1 = lows[lows.length - 2];
    const l2 = lows[lows.length - 1];
    const h1 = highs[highs.length - 1]; // High between them

    if (l2.time > l1.time && h1.time > l1.time && h1.time < l2.time) {
      const priceDiff = Math.abs(l1.price - l2.price);
      const avgPrice = (l1.price + l2.price) / 2;
      
      if (priceDiff < avgPrice * 0.005) { // 0.5% tolerance
        patterns.push({
          name: 'Double Bottom',
          bias: 'bullish',
          confidence: 'medium',
          keyLevels: [avgPrice, h1.price],
          invalidationLevel: avgPrice * 0.99 // 1% below bottom
        });
      }
    }
  }

  // Head and Shoulders (Simplified)
  if (highs.length >= 3 && lows.length >= 2) {
    const ls = highs[highs.length - 3]; // Left shoulder
    const h = highs[highs.length - 2];  // Head
    const rs = highs[highs.length - 1]; // Right shoulder

    const l1 = lows[lows.length - 2];
    const l2 = lows[lows.length - 1];

    if (h.price > ls.price && h.price > rs.price) {
      const shouldersDiff = Math.abs(ls.price - rs.price);
      if (shouldersDiff < ls.price * 0.01) { // Shoulders roughly equal
        patterns.push({
          name: 'Head and Shoulders',
          bias: 'bearish',
          confidence: 'medium',
          keyLevels: [h.price, l1.price, l2.price], // Head and neckline points
          invalidationLevel: h.price
        });
      }
    }
  }

  return patterns;
}
