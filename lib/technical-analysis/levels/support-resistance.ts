import { Level, SwingPoint, Candle } from '../types';

/**
 * Identifies high-quality Support and Resistance zones.
 * 
 * @param swings Array of swing points
 * @param currentPrice Current market price
 * @param atr Current ATR value used for merging nearby levels
 * @returns Array of max 8 Level objects
 */
export function identifySupportResistance(
  swings: SwingPoint[],
  currentPrice: number,
  atr: number
): Level[] {
  if (swings.length === 0 || !atr) {
    return [];
  }

  const threshold = atr * 0.3;
  const rawLevels = swings.map(s => s.price);

  // Group nearby levels
  const clusters: { prices: number[], avg: number }[] = [];

  for (const price of rawLevels) {
    let added = false;
    for (const cluster of clusters) {
      if (Math.abs(cluster.avg - price) <= threshold) {
        cluster.prices.push(price);
        // Update average
        cluster.avg = cluster.prices.reduce((a, b) => a + b, 0) / cluster.prices.length;
        added = true;
        break;
      }
    }
    
    if (!added) {
      clusters.push({ prices: [price], avg: price });
    }
  }

  const levels: Level[] = clusters.map(cluster => {
    const minPrice = Math.min(...cluster.prices);
    const maxPrice = Math.max(...cluster.prices);
    
    // Expand single-touch zones slightly using ATR for a basic zone
    const zoneMin = cluster.prices.length > 1 ? minPrice : minPrice - (atr * 0.1);
    const zoneMax = cluster.prices.length > 1 ? maxPrice : maxPrice + (atr * 0.1);

    return {
      price: cluster.avg,
      type: cluster.avg > currentPrice ? 'resistance' : 'support',
      strength: Math.min(5, cluster.prices.length), // Cap strength at 5
      touches: cluster.prices.length,
      zone: { min: zoneMin, max: zoneMax }
    };
  });

  // Sort by strength (descending) and take top 8
  levels.sort((a, b) => b.strength - a.strength);
  const topLevels = levels.slice(0, 8);

  // Re-sort top levels by price
  return topLevels.sort((a, b) => b.price - a.price);
}
