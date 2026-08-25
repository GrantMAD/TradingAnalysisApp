import { Candle, SwingPoint, MarketStructure } from '../types';

/**
 * Analyzes market structure to determine recent pattern, BOS, and CHoCH.
 * 
 * @param swings Array of identified swing points
 * @param candles Array of historical candles
 * @returns MarketStructure object
 */
export function analyseMarketStructure(swings: SwingPoint[], candles: Candle[]): MarketStructure {
  const result: MarketStructure = {
    swings,
    recentPattern: 'unclear',
    breakOfStructure: false,
    changeOfCharacter: false
  };

  if (swings.length < 4) {
    return result;
  }

  // Filter highs and lows
  const highs = swings.filter(s => s.type === 'high');
  const lows = swings.filter(s => s.type === 'low');

  if (highs.length >= 2 && lows.length >= 2) {
    const lastHigh = highs[highs.length - 1];
    const prevHigh = highs[highs.length - 2];
    const lastLow = lows[lows.length - 1];
    const prevLow = lows[lows.length - 2];

    const isHH = lastHigh.price > prevHigh.price;
    const isLH = lastHigh.price < prevHigh.price;
    const isHL = lastLow.price > prevLow.price;
    const isLL = lastLow.price < prevLow.price;

    if (isHH && isHL) {
      result.recentPattern = 'HH_HL';
    } else if (isLH && isLL) {
      result.recentPattern = 'LH_LL';
    } else {
      result.recentPattern = 'mixed';
    }

    // Determine BOS (Break of Structure) and CHoCH (Change of Character)
    // BOS: continuation of trend (e.g. HH_HL trend breaks previous High)
    // CHoCH: first reversal of trend (e.g. HH_HL trend breaks previous Low)
    
    // Simplistic check for the last few candles vs the last established swing
    const lastCandle = candles[candles.length - 1];
    
    // For a bullish structure (HH_HL), if price breaks last high -> BOS bullish. If it breaks last low -> CHoCH bearish.
    if (result.recentPattern === 'HH_HL') {
      if (lastCandle.close > lastHigh.price) {
        result.breakOfStructure = true;
        result.bosDirection = 'bullish';
      } else if (lastCandle.close < lastLow.price) {
        result.changeOfCharacter = true;
      }
    } 
    // For a bearish structure (LH_LL), if price breaks last low -> BOS bearish. If it breaks last high -> CHoCH bullish.
    else if (result.recentPattern === 'LH_LL') {
      if (lastCandle.close < lastLow.price) {
        result.breakOfStructure = true;
        result.bosDirection = 'bearish';
      } else if (lastCandle.close > lastHigh.price) {
        result.changeOfCharacter = true;
      }
    }
  }

  return result;
}
