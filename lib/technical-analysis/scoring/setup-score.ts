import { TrendResult, MarketStructure, Level, IndicatorSnapshot, SetupScoreResult } from '../types';

/**
 * Calculates a weighted setup quality heuristic (0-100).
 * Note: This is a setup quality heuristic, NOT a probability of winning.
 * 
 * @param proposedDirection 'long' or 'short'
 * @param currentPrice Current market price
 * @param trend Overall TrendResult
 * @param structure MarketStructure
 * @param levels S/R levels
 * @param indicators IndicatorSnapshot
 * @param hasVolumeData Boolean indicating if valid volume data is present
 * @param estimatedRR Estimated Risk/Reward ratio (calculated externally or assumed 2.0 for baseline)
 * @param htfTrend Higher timeframe trend (optional)
 * @returns SetupScoreResult
 */
export function calculateSetupScore(
  proposedDirection: 'long' | 'short',
  currentPrice: number,
  trend: TrendResult,
  structure: MarketStructure,
  levels: Level[],
  indicators: IndicatorSnapshot,
  hasVolumeData: boolean,
  estimatedRR: number = 2.0,
  htfTrend?: TrendResult
): SetupScoreResult {
  let total = 0;
  const breakdown = {
    trendAlignment: 0,
    marketStructure: 0,
    entryLocation: 0,
    momentum: 0,
    volume: 0,
    riskReward: 0,
    multiTimeframe: 0
  };
  const notes: string[] = [];

  const isLong = proposedDirection === 'long';

  // 1. Trend alignment (Max 20)
  if (isLong && trend.direction === 'strongly_bullish') { breakdown.trendAlignment = 20; notes.push('Strongly aligned with bullish trend.'); }
  else if (isLong && trend.direction === 'bullish') { breakdown.trendAlignment = 15; notes.push('Aligned with bullish trend.'); }
  else if (!isLong && trend.direction === 'strongly_bearish') { breakdown.trendAlignment = 20; notes.push('Strongly aligned with bearish trend.'); }
  else if (!isLong && trend.direction === 'bearish') { breakdown.trendAlignment = 15; notes.push('Aligned with bearish trend.'); }
  else if (trend.direction === 'neutral') { breakdown.trendAlignment = 10; notes.push('Trend is neutral.'); }
  else { breakdown.trendAlignment = 0; notes.push('Trading against the trend.'); }

  // 2. Market structure (Max 20)
  if (isLong && structure.recentPattern === 'HH_HL') { breakdown.marketStructure = 20; notes.push('Bullish market structure confirmed.'); }
  else if (!isLong && structure.recentPattern === 'LH_LL') { breakdown.marketStructure = 20; notes.push('Bearish market structure confirmed.'); }
  else if (structure.recentPattern === 'mixed') { breakdown.marketStructure = 10; notes.push('Market structure is mixed.'); }
  else { breakdown.marketStructure = 0; notes.push('Unclear or opposing market structure.'); }

  // 3. Entry location (Max 15) - closeness to nearest support (if long) or resistance (if short)
  const relevantLevels = levels.filter(l => isLong ? l.type === 'support' : l.type === 'resistance');
  let closestDist = Infinity;
  for (const l of relevantLevels) {
    const dist = Math.abs(currentPrice - l.price) / currentPrice; // percentage distance
    if (dist < closestDist) closestDist = dist;
  }

  if (closestDist < 0.005) { breakdown.entryLocation = 15; notes.push('Price is at a high-quality zone.'); }
  else if (closestDist < 0.015) { breakdown.entryLocation = 10; notes.push('Price is near a key zone.'); }
  else { breakdown.entryLocation = 5; notes.push('Price is far from structural zones.'); }

  // 4. Momentum (Max 10) - MACD & RSI
  let momentumScore = 0;
  const lastIndex = indicators.rsi.length - 1;
  const rsi = indicators.rsi[lastIndex];
  const macdPoint = indicators.macd[lastIndex];
  
  if (rsi !== null && macdPoint.histogram !== null) {
    if (isLong) {
      if (rsi > 50 && macdPoint.histogram > 0) momentumScore = 10;
      else if (rsi > 50 || macdPoint.histogram > 0) momentumScore = 5;
    } else {
      if (rsi < 50 && macdPoint.histogram < 0) momentumScore = 10;
      else if (rsi < 50 || macdPoint.histogram < 0) momentumScore = 5;
    }
  } else {
    momentumScore = 5; // neutral if missing
  }
  breakdown.momentum = momentumScore;
  if (momentumScore === 10) notes.push('Momentum confirms direction.');
  else if (momentumScore === 0) notes.push('Momentum opposes direction.');
  else notes.push('Momentum is mixed/neutral.');

  // 5. Volume (Max 10)
  if (!hasVolumeData) {
    breakdown.volume = 5;
    notes.push('No volume data (neutral).');
  } else {
    // Basic heuristic: assuming volume confirms if we proceed, or if we had a trend confirming volume profile.
    breakdown.volume = 10; 
    notes.push('Volume data assumed confirming for this heuristic step.');
  }

  // 6. Risk/Reward (Max 15)
  if (estimatedRR >= 3) { breakdown.riskReward = 15; notes.push(`R:R is excellent (${estimatedRR}).`); }
  else if (estimatedRR >= 2) { breakdown.riskReward = 10; notes.push(`R:R is good (${estimatedRR}).`); }
  else if (estimatedRR >= 1.5) { breakdown.riskReward = 5; notes.push(`R:R is acceptable (${estimatedRR}).`); }
  else { breakdown.riskReward = 0; notes.push(`R:R is poor (${estimatedRR}).`); }

  // 7. Multi-TF alignment (Max 10)
  if (!htfTrend) {
    breakdown.multiTimeframe = 5;
    notes.push('No HTF context provided (neutral).');
  } else {
    if (isLong && htfTrend.direction.includes('bullish')) { breakdown.multiTimeframe = 10; notes.push('HTF confirms bullish direction.'); }
    else if (!isLong && htfTrend.direction.includes('bearish')) { breakdown.multiTimeframe = 10; notes.push('HTF confirms bearish direction.'); }
    else if (htfTrend.direction === 'neutral') { breakdown.multiTimeframe = 5; notes.push('HTF is neutral.'); }
    else { breakdown.multiTimeframe = 0; notes.push('HTF opposes direction.'); }
  }

  total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return { total, breakdown, notes };
}
