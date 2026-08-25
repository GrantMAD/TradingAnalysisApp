import { TAResult } from '../types';
import { SetupDirection, SetupEvaluation, SetupEvidence, SetupRejectionReason } from './types';

/**
 * Deterministically evaluates technical analysis results to detect LONG, SHORT, or NO_TRADE setups.
 * This engine does NOT force a trade. Mixed evidence returns NO_TRADE.
 */
export function evaluateSetup(taResult: TAResult): SetupEvaluation {
  const currentPrice = taResult.candles[taResult.candles.length - 1].close;
  
  const supportingEvidence: SetupEvidence[] = [];
  const conflictingEvidence: SetupEvidence[] = [];
  const rejectionReasons: SetupRejectionReason[] = [];

  // 1. Analyze Trend
  const isTrendBullish = taResult.trend.direction.includes('bullish');
  const isTrendBearish = taResult.trend.direction.includes('bearish');
  
  if (isTrendBullish) {
    supportingEvidence.push({ category: 'trend', finding: 'Trend is ' + taResult.trend.direction, direction: 'bullish' });
  } else if (isTrendBearish) {
    supportingEvidence.push({ category: 'trend', finding: 'Trend is ' + taResult.trend.direction, direction: 'bearish' });
  } else {
    supportingEvidence.push({ category: 'trend', finding: 'Trend is neutral', direction: 'neutral' });
  }

  // 2. Analyze Market Structure
  const struct = taResult.structure;
  let isStructBullish = false;
  let isStructBearish = false;

  if (struct.recentPattern === 'HH_HL' || (struct.breakOfStructure && struct.bosDirection === 'bullish')) {
    isStructBullish = true;
    supportingEvidence.push({ category: 'structure', finding: 'Bullish market structure detected', direction: 'bullish' });
  } else if (struct.recentPattern === 'LH_LL' || (struct.breakOfStructure && struct.bosDirection === 'bearish')) {
    isStructBearish = true;
    supportingEvidence.push({ category: 'structure', finding: 'Bearish market structure detected', direction: 'bearish' });
  } else {
    supportingEvidence.push({ category: 'structure', finding: 'Market structure is mixed or unclear', direction: 'neutral' });
    rejectionReasons.push('UNCLEAR_STRUCTURE');
  }

  // Check for contradiction between Trend and Structure
  if ((isTrendBullish && isStructBearish) || (isTrendBearish && isStructBullish)) {
    rejectionReasons.push('CONTRADICTORY_EVIDENCE');
    conflictingEvidence.push({ category: 'conflict', finding: 'Trend and Market Structure are in opposite directions', direction: 'neutral' });
  }

  // 3. Analyze Support/Resistance (Levels)
  // Find closest support and resistance
  const supports = taResult.levels.filter(l => l.type === 'support').sort((a, b) => b.price - a.price);
  const resistances = taResult.levels.filter(l => l.type === 'resistance').sort((a, b) => a.price - b.price);
  
  const closestSupport = supports.length > 0 ? supports[0].price : null;
  const closestResistance = resistances.length > 0 ? resistances[0].price : null;

  // Use ATR to define "proximity"
  const atrArray = taResult.indicators.atr;
  const currentAtr = (atrArray.length > 0 && atrArray[atrArray.length - 1] !== null) ? atrArray[atrArray.length - 1]! : (currentPrice * 0.005);
  
  const nearThreshold = currentAtr * 0.5;
  const trappedThreshold = currentAtr * 2; // If distance between S and R is less than 2 ATR, price is trapped

  let nearSupport = false;
  let nearResistance = false;

  if (closestSupport && (currentPrice - closestSupport) <= nearThreshold) {
    nearSupport = true;
    supportingEvidence.push({ category: 'levels', finding: 'Price is near structural support', direction: 'bullish' });
  }
  
  if (closestResistance && (closestResistance - currentPrice) <= nearThreshold) {
    nearResistance = true;
    supportingEvidence.push({ category: 'levels', finding: 'Price is near structural resistance', direction: 'bearish' });
  }

  // Check if trapped
  if (closestSupport && closestResistance && (closestResistance - closestSupport) < trappedThreshold) {
    rejectionReasons.push('TRAPPED_IN_RANGE');
    conflictingEvidence.push({ category: 'levels', finding: 'Price is trapped between nearby support and resistance', direction: 'neutral' });
  }

  // 4. Momentum Confirmation (MACD/RSI)
  const rsi = taResult.indicators.rsi;
  const currentRsi = (rsi.length > 0) ? rsi[rsi.length - 1] : null;
  let hasBullishMomentum = false;
  let hasBearishMomentum = false;

  if (currentRsi !== null) {
    if (currentRsi > 50 && currentRsi < 70) {
      hasBullishMomentum = true;
      supportingEvidence.push({ category: 'momentum', finding: 'RSI indicates bullish momentum without being overbought', direction: 'bullish' });
    } else if (currentRsi < 50 && currentRsi > 30) {
      hasBearishMomentum = true;
      supportingEvidence.push({ category: 'momentum', finding: 'RSI indicates bearish momentum without being oversold', direction: 'bearish' });
    }
  } else {
    rejectionReasons.push('MISSING_CONFIRMATION');
  }

  // Final Decision Logic
  let direction: SetupDirection = 'NO_TRADE';
  let summary = 'No trade conditions met.';

  if (rejectionReasons.length > 0) {
    direction = 'NO_TRADE';
    summary = 'Setup rejected due to conflicting or unclear evidence.';
  } else if (isTrendBullish && isStructBullish) {
    // Bullish setup check
    if (nearResistance) {
      rejectionReasons.push('TOO_CLOSE_TO_RESISTANCE');
      direction = 'NO_TRADE';
      summary = 'Bullish structure present, but price is immediately at resistance.';
    } else if (hasBullishMomentum || nearSupport) {
      direction = 'LONG';
      summary = 'High probability LONG setup: Bullish trend and structure with supporting momentum/location.';
    } else {
      rejectionReasons.push('MISSING_CONFIRMATION');
      direction = 'NO_TRADE';
      summary = 'Bullish structure present, but lacking entry trigger (no momentum or pullback to support).';
    }
  } else if (isTrendBearish && isStructBearish) {
    // Bearish setup check
    if (nearSupport) {
      rejectionReasons.push('TOO_CLOSE_TO_SUPPORT');
      direction = 'NO_TRADE';
      summary = 'Bearish structure present, but price is immediately at support.';
    } else if (hasBearishMomentum || nearResistance) {
      direction = 'SHORT';
      summary = 'High probability SHORT setup: Bearish trend and structure with supporting momentum/location.';
    } else {
      rejectionReasons.push('MISSING_CONFIRMATION');
      direction = 'NO_TRADE';
      summary = 'Bearish structure present, but lacking entry trigger (no momentum or pullback to resistance).';
    }
  } else {
    rejectionReasons.push('NO_CLEAR_SETUP');
    direction = 'NO_TRADE';
    summary = 'Market is lacking a clear directional setup.';
  }

  // Move misaligned evidence to conflicting array
  const finalSupporting: SetupEvidence[] = [];
  const requiredDirection = direction === 'LONG' ? 'bullish' : (direction === 'SHORT' ? 'bearish' : null);

  for (const ev of supportingEvidence) {
    if (requiredDirection && ev.direction !== requiredDirection && ev.direction !== 'neutral') {
      conflictingEvidence.push(ev);
    } else {
      finalSupporting.push(ev);
    }
  }

  return {
    direction,
    supportingEvidence: finalSupporting,
    conflictingEvidence,
    ...(rejectionReasons.length > 0 && { rejectionReasons }),
    summary,
    taResult
  };
}
