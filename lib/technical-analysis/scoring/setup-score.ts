import { TrendResult, MarketStructure, Level, IndicatorSnapshot, SetupScoreResult } from '../types';
import { SetupEvaluation } from '../setup/types';
import { TradeLevels } from '../trade-levels/types';

/**
 * Calculates a weighted setup quality heuristic (0-100).
 * Note: This is a setup quality heuristic, NOT a probability of winning.
 * 
 * @param setup SetupEvaluation from Phase 6
 * @param tradeLevels TradeLevels from Phase 7
 * @param htfTrend Higher timeframe trend (optional)
 * @returns SetupScoreResult
 */
export function calculateSetupScore(
  setup: SetupEvaluation,
  tradeLevels: TradeLevels,
  htfTrend?: TrendResult
): SetupScoreResult {
  if (tradeLevels.direction === 'NO_TRADE' || setup.direction === 'NO_TRADE') {
    return {
      total: null,
      isHeuristicScore: true,
      notes: ['Scoring bypassed: Trade direction is NO_TRADE.'],
      noTradeReason: tradeLevels.rejectionReason || 'SETUP_WAS_NO_TRADE'
    };
  }

  const isLong = setup.direction === 'LONG';
  const ta = setup.taResult;
  const trend = ta.trend;
  const structure = ta.structure;
  const indicators = ta.indicators;
  
  const currentPrice = ta.candles.length > 0 ? ta.candles[ta.candles.length - 1].close : 0;
  const hasVolumeData = ta.candles.length > 0 && ta.candles[ta.candles.length - 1].volume !== undefined;

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

  // 3. Entry location (Max 15)
  let closestDist = Infinity;
  if (tradeLevels.entry) {
    const distMin = Math.abs(currentPrice - tradeLevels.entry.min) / currentPrice;
    const distMax = Math.abs(currentPrice - tradeLevels.entry.max) / currentPrice;
    closestDist = Math.min(distMin, distMax);
    
    if (currentPrice >= tradeLevels.entry.min && currentPrice <= tradeLevels.entry.max) {
      closestDist = 0;
    }
  }

  if (closestDist < 0.005) { breakdown.entryLocation = 15; notes.push('Price is at a high-quality entry zone.'); }
  else if (closestDist < 0.015) { breakdown.entryLocation = 10; notes.push('Price is near the entry zone.'); }
  else { breakdown.entryLocation = 5; notes.push('Price is far from the entry zone.'); }

  // 4. Momentum (Max 10)
  let momentumScore = 0;
  const lastIndex = indicators.rsi.length - 1;
  const rsi = lastIndex >= 0 ? indicators.rsi[lastIndex] : null;
  const macdPoint = lastIndex >= 0 ? indicators.macd[lastIndex] : null;
  
  if (rsi !== null && macdPoint && macdPoint.histogram !== null) {
    if (isLong) {
      if (rsi > 50 && macdPoint.histogram > 0) momentumScore = 10;
      else if (rsi > 50 || macdPoint.histogram > 0) momentumScore = 5;
    } else {
      if (rsi < 50 && macdPoint.histogram < 0) momentumScore = 10;
      else if (rsi < 50 || macdPoint.histogram < 0) momentumScore = 5;
    }
  } else {
    momentumScore = 5;
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
    breakdown.volume = 10; 
    notes.push('Volume data assumed confirming for this heuristic step.');
  }

  // 6. Risk/Reward (Max 15)
  const rr = tradeLevels.riskReward || 0;
  if (rr >= 3) { breakdown.riskReward = 15; notes.push(`R:R is excellent (${rr.toFixed(2)}).`); }
  else if (rr >= 2) { breakdown.riskReward = 10; notes.push(`R:R is good (${rr.toFixed(2)}).`); }
  else if (rr >= 1.5) { breakdown.riskReward = 5; notes.push(`R:R is acceptable (${rr.toFixed(2)}).`); }
  else { breakdown.riskReward = 0; notes.push(`R:R is poor (${rr.toFixed(2)}).`); }

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

  return { 
    total, 
    breakdown, 
    notes,
    isHeuristicScore: true
  };
}
