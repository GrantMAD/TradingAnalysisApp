/**
 * Stop-Loss Calculator — Phase 7
 *
 * Calculates the most appropriate stop-loss price using the best available
 * evidence. Three methods are tried in priority order; the chosen method
 * and full rationale are recorded in the returned StopLevel.
 *
 * Priority (LONG):
 *   1. Structure-based — below most recent significant swing low + ATR buffer
 *   2. Swing-based     — raw swing low price when structure analysis is unclear
 *   3. ATR-based       — entry.min - 1.5 × ATR (fallback, clearly labelled)
 *
 * SHORT mirrors LONG using swing highs / resistance.
 *
 * Hard rules (PROJECT_RULES Rules 7, 8):
 *   - Stop must ALWAYS be on the correct side of the entry.
 *   - Returns null if a safe stop cannot be placed → caller returns NO_TRADE.
 */

import { MarketStructure, SwingPoint } from '../types';
import { EntryZone, StopLevel } from './types';

/** ATR buffer added beyond the swing point to absorb wicks. */
const STRUCTURE_BUFFER_ATR = 0.25;

/** ATR multiplier used for the ATR-based fallback stop. */
const ATR_FALLBACK_MULTIPLIER = 1.5;

/** Maximum distance allowed for a structural stop (prevents absurdly wide stops). */
const MAX_STOP_DISTANCE_ATR = 4;

/**
 * Calculates a stop-loss level for the given direction.
 *
 * @param direction  'LONG' | 'SHORT'
 * @param entry      The calculated entry zone
 * @param structure  Market structure result from the TA engine
 * @param swings     Raw swing points
 * @param atr        Current ATR value
 * @returns StopLevel if a valid stop can be placed, or null (→ NO_TRADE)
 */
export function calculateStop(
  direction: 'LONG' | 'SHORT',
  entry: EntryZone,
  structure: MarketStructure,
  swings: SwingPoint[],
  atr: number
): StopLevel | null {
  if (direction === 'LONG') {
    return calculateLongStop(entry, structure, swings, atr);
  } else {
    return calculateShortStop(entry, structure, swings, atr);
  }
}

// ---------------------------------------------------------------------------
// LONG stop
// ---------------------------------------------------------------------------

function calculateLongStop(
  entry: EntryZone,
  structure: MarketStructure,
  swings: SwingPoint[],
  atr: number
): StopLevel | null {
  const buffer = atr * STRUCTURE_BUFFER_ATR;
  const maxStopDistance = atr * MAX_STOP_DISTANCE_ATR;

  // ── Method 1: Structure-based — most recent swing low below entry.min ─────
  // Only use swing lows that are part of higher-timeframe structural significance.
  const structuralLows = structure.swings
    .filter(s => s.type === 'low' && s.price < entry.min)
    .sort((a, b) => b.index - a.index); // most recent first

  if (structuralLows.length > 0) {
    const swingLow = structuralLows[0];
    const stopPrice = swingLow.price - buffer;
    const distance = entry.min - stopPrice;

    if (distance > 0 && distance <= maxStopDistance) {
      return {
        price: roundToSignificant(stopPrice, entry.min),
        method: 'structure',
        basis: `Structure-based: swing low at ${formatPrice(swingLow.price, entry.min)} minus ${STRUCTURE_BUFFER_ATR} ATR buffer (${formatPrice(buffer, entry.min)}) = ${formatPrice(stopPrice, entry.min)}`,
      };
    }
    // Swing low exists but stop would be too wide — fall through to next method
  }

  // ── Method 2: Swing-based — raw swing low (when structure is unclear) ─────
  const rawLows = swings
    .filter(s => s.type === 'low' && s.price < entry.min)
    .sort((a, b) => b.index - a.index);

  if (rawLows.length > 0) {
    const swingLow = rawLows[0];
    const stopPrice = swingLow.price - buffer;
    const distance = entry.min - stopPrice;

    if (distance > 0 && distance <= maxStopDistance) {
      return {
        price: roundToSignificant(stopPrice, entry.min),
        method: 'swing',
        basis: `Swing-based: most recent swing low at ${formatPrice(swingLow.price, entry.min)} minus ${STRUCTURE_BUFFER_ATR} ATR buffer (${formatPrice(buffer, entry.min)}) = ${formatPrice(stopPrice, entry.min)}`,
      };
    }
  }

  // ── Method 3: ATR-based fallback ──────────────────────────────────────────
  const stopPrice = entry.min - (atr * ATR_FALLBACK_MULTIPLIER);

  if (stopPrice < entry.min) {
    return {
      price: roundToSignificant(stopPrice, entry.min),
      method: 'atr',
      basis: `ATR-based fallback: entry min (${formatPrice(entry.min, entry.min)}) - ${ATR_FALLBACK_MULTIPLIER} × ATR (${formatPrice(atr, entry.min)}) = ${formatPrice(stopPrice, entry.min)}. No clear structural low was available within ${MAX_STOP_DISTANCE_ATR} ATR.`,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// SHORT stop
// ---------------------------------------------------------------------------

function calculateShortStop(
  entry: EntryZone,
  structure: MarketStructure,
  swings: SwingPoint[],
  atr: number
): StopLevel | null {
  const buffer = atr * STRUCTURE_BUFFER_ATR;
  const maxStopDistance = atr * MAX_STOP_DISTANCE_ATR;

  // ── Method 1: Structure-based — most recent swing high above entry.max ────
  const structuralHighs = structure.swings
    .filter(s => s.type === 'high' && s.price > entry.max)
    .sort((a, b) => b.index - a.index);

  if (structuralHighs.length > 0) {
    const swingHigh = structuralHighs[0];
    const stopPrice = swingHigh.price + buffer;
    const distance = stopPrice - entry.max;

    if (distance > 0 && distance <= maxStopDistance) {
      return {
        price: roundToSignificant(stopPrice, entry.max),
        method: 'structure',
        basis: `Structure-based: swing high at ${formatPrice(swingHigh.price, entry.max)} plus ${STRUCTURE_BUFFER_ATR} ATR buffer (${formatPrice(buffer, entry.max)}) = ${formatPrice(stopPrice, entry.max)}`,
      };
    }
  }

  // ── Method 2: Swing-based ─────────────────────────────────────────────────
  const rawHighs = swings
    .filter(s => s.type === 'high' && s.price > entry.max)
    .sort((a, b) => b.index - a.index);

  if (rawHighs.length > 0) {
    const swingHigh = rawHighs[0];
    const stopPrice = swingHigh.price + buffer;
    const distance = stopPrice - entry.max;

    if (distance > 0 && distance <= maxStopDistance) {
      return {
        price: roundToSignificant(stopPrice, entry.max),
        method: 'swing',
        basis: `Swing-based: most recent swing high at ${formatPrice(swingHigh.price, entry.max)} plus ${STRUCTURE_BUFFER_ATR} ATR buffer (${formatPrice(buffer, entry.max)}) = ${formatPrice(stopPrice, entry.max)}`,
      };
    }
  }

  // ── Method 3: ATR-based fallback ──────────────────────────────────────────
  const stopPrice = entry.max + (atr * ATR_FALLBACK_MULTIPLIER);

  if (stopPrice > entry.max) {
    return {
      price: roundToSignificant(stopPrice, entry.max),
      method: 'atr',
      basis: `ATR-based fallback: entry max (${formatPrice(entry.max, entry.max)}) + ${ATR_FALLBACK_MULTIPLIER} × ATR (${formatPrice(atr, entry.max)}) = ${formatPrice(stopPrice, entry.max)}. No clear structural high was available within ${MAX_STOP_DISTANCE_ATR} ATR.`,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roundToSignificant(value: number, referencePrice: number): number {
  if (referencePrice >= 10000) return Math.round(value * 10) / 10;
  if (referencePrice >= 1000)  return Math.round(value * 100) / 100;
  if (referencePrice >= 1)     return Math.round(value * 10000) / 10000;
  return Math.round(value * 100000) / 100000;
}

function formatPrice(price: number, referencePrice: number): string {
  return roundToSignificant(price, referencePrice).toLocaleString('en-US', { maximumFractionDigits: 8 });
}
