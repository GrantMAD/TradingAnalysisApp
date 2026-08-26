import { Candle, MarketStructure, IndicatorSnapshot, TrendResult, MultiTimeframeContext } from '../types';

/**
 * Evaluates the overall trend based on market structure, moving averages, and optional higher timeframe context.
 * 
 * @param candles Array of historical candles
 * @param structure MarketStructure object
 * @param indicators IndicatorSnapshot (needs EMA 20, 50, 200)
 * @param htfContext Optional higher timeframe context
 * @returns TrendResult
 */
export function evaluateTrend(
  candles: Candle[],
  structure: MarketStructure,
  indicators: IndicatorSnapshot,
  httfContext?: MultiTimeframeContext
): TrendResult {
  if (candles.length === 0) {
    return { direction: 'neutral', strength: 0, basis: ['Insufficient data'] };
  }

  const lastCandle = candles[candles.length - 1];
  const basis: string[] = [];
  let score = 0; // -100 to +100

  // 1. Structure Analysis (Weight: 40)
  if (structure.recentPattern === 'HH_HL') {
    score += 40;
    basis.push('Market structure is making Higher Highs and Higher Lows (Bullish).');
  } else if (structure.recentPattern === 'LH_LL') {
    score -= 40;
    basis.push('Market structure is making Lower Highs and Lower Lows (Bearish).');
  } else {
    basis.push('Market structure is currently mixed or unclear.');
  }

  // 2. Moving Average Alignment (Weight: 40)
  const lastIndex = candles.length - 1;
  const ema20 = indicators.ema20[lastIndex];
  const ema50 = indicators.ema50[lastIndex];
  const sma200 = indicators.sma200[lastIndex]; // using SMA200 as per common practice, or EMA200

  let maScore = 0;

  if (ema20 !== null && ema50 !== null) {
    if (ema20 > ema50) {
      maScore += 20;
      basis.push('Short-term momentum is bullish (EMA 20 > EMA 50).');
    } else {
      maScore -= 20;
      basis.push('Short-term momentum is bearish (EMA 20 < EMA 50).');
    }
  }

  if (sma200 !== null) {
    if (lastCandle.close > sma200) {
      maScore += 20;
      basis.push('Long-term trend is bullish (Price > SMA 200).');
    } else {
      maScore -= 20;
      basis.push('Long-term trend is bearish (Price < SMA 200).');
    }
  }

  score += maScore;

  // 3. Higher Timeframe Context (Weight: 20)
  if (httfContext) {
    if (httfContext.trend.direction.includes('bullish')) {
      score += 20;
      basis.push(`Higher timeframe (${httfContext.timeframe}) trend is bullish.`);
    } else if (httfContext.trend.direction.includes('bearish')) {
      score -= 20;
      basis.push(`Higher timeframe (${httfContext.timeframe}) trend is bearish.`);
    } else {
      basis.push(`Higher timeframe (${httfContext.timeframe}) trend is neutral.`);
    }
  }

  // Determine final direction and strength
  let direction: TrendResult['direction'] = 'neutral';
  const strength = Math.min(100, Math.abs(score)); // Normalize to 0-100

  if (score >= 60) {
    direction = 'strongly_bullish';
  } else if (score >= 20) {
    direction = 'bullish';
  } else if (score <= -60) {
    direction = 'strongly_bearish';
  } else if (score <= -20) {
    direction = 'bearish';
  } else {
    direction = 'neutral';
  }

  return { direction, strength, basis };
}
