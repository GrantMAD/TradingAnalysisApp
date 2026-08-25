import { SwingPoint, FibonacciLevels } from '../types';

/**
 * Calculates Fibonacci retracement and extension levels based on recent swing points.
 * 
 * @param swings Array of swing points
 * @returns FibonacciLevels or null if not applicable
 */
export function calculateFibonacci(swings: SwingPoint[]): FibonacciLevels | null {
  if (swings.length < 2) {
    return null;
  }

  // Get the two most recent swings
  const lastSwing = swings[swings.length - 1];
  const prevSwing = swings[swings.length - 2];

  if (lastSwing.type === prevSwing.type) {
    // We need a high to low or low to high
    return null;
  }

  const startPrice = prevSwing.price;
  const endPrice = lastSwing.price;
  const diff = endPrice - startPrice;

  // Retracement levels: 0.236, 0.382, 0.5, 0.618, 0.786
  // Extention levels: 1.272, 1.618
  
  const retracementRatios = [0.236, 0.382, 0.5, 0.618, 0.786];
  const extensionRatios = [1.272, 1.618];

  const retracement: Record<string, number> = {};
  const extension: Record<string, number> = {};

  retracementRatios.forEach(ratio => {
    // If diff is positive (bullish swing), retracement goes down from endPrice
    retracement[ratio.toString()] = endPrice - (diff * ratio);
  });

  extensionRatios.forEach(ratio => {
    // Extensions go beyond the endPrice in the direction of the swing
    // e.g. bullish swing extends upwards, bearish swing extends downwards
    // Wait, typical extension is usually measured beyond the start or end?
    // Often it's endPrice + (diff * (ratio - 1)) if extending in the direction of the trend
    extension[ratio.toString()] = endPrice + (diff * (ratio - 1));
  });

  return { retracement, extension };
}
