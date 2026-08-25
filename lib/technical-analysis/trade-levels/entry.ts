/**
 * Entry Zone Calculator — Phase 7
 *
 * Calculates a precise, evidence-based entry zone for a LONG or SHORT setup.
 * All output prices must trace back to real market structure — never fabricated.
 * (PROJECT_RULES Rules 6, 7, 12)
 *
 * Priority order (LONG):
 *   1. Retest of a bullish Break-of-Structure level
 *   2. Nearest high-quality support zone
 *   3. Nearest support cluster (single-touch)
 *   → null if no valid zone found within 1.5 × ATR of current price
 *
 * SHORT mirrors LONG using resistance levels.
 */

import { Level, MarketStructure, SwingPoint } from '../types';
import { EntryZone } from './types';

/** Maximum distance from current price to entry zone (expressed as ATR multiplier). */
const MAX_ENTRY_DISTANCE_ATR = 1.5;

/**
 * Calculates an entry zone for the given direction.
 *
 * @param direction  'LONG' | 'SHORT'
 * @param currentPrice  Current market price (last close)
 * @param levels  S/R levels from the TA engine
 * @param structure  Market structure (used to detect BoS levels)
 * @param swings  Raw swing points
 * @param atr  Current ATR value
 * @returns EntryZone if a valid zone is found, or null (→ caller returns NO_TRADE)
 */
export function calculateEntry(
  direction: 'LONG' | 'SHORT',
  currentPrice: number,
  levels: Level[],
  structure: MarketStructure,
  swings: SwingPoint[],
  atr: number
): EntryZone | null {
  const maxDistance = atr * MAX_ENTRY_DISTANCE_ATR;
  const notes: string[] = [];

  if (direction === 'LONG') {
    return calculateLongEntry(currentPrice, levels, structure, swings, atr, maxDistance, notes);
  } else {
    return calculateShortEntry(currentPrice, levels, structure, swings, atr, maxDistance);
  }
}

// ---------------------------------------------------------------------------
// LONG entry
// ---------------------------------------------------------------------------

function calculateLongEntry(
  currentPrice: number,
  levels: Level[],
  structure: MarketStructure,
  swings: SwingPoint[],
  atr: number,
  maxDistance: number,
  notes: string[]
): EntryZone | null {
  const halfAtr = atr * 0.5;

  // ── Priority 1: Retest of a bullish Break-of-Structure level ──────────────
  // A bullish BoS means price broke above a previous swing high. That broken
  // high now acts as support. Look for the most recent swing high below
  // current price that aligns with the BoS.
  if (structure.breakOfStructure && structure.bosDirection === 'bullish') {
    // Find the most recent swing high below current price
    const bosHighs = swings
      .filter(s => s.type === 'high' && s.price < currentPrice)
      .sort((a, b) => b.index - a.index); // most recent first

    if (bosHighs.length > 0) {
      const bosLevel = bosHighs[0];
      const distanceToBoS = currentPrice - bosLevel.price;

      if (distanceToBoS <= maxDistance) {
        const zoneMin = bosLevel.price - halfAtr * 0.5;
        const zoneMax = bosLevel.price + halfAtr * 0.5;

        return {
          min: roundToSignificant(zoneMin, currentPrice),
          max: roundToSignificant(zoneMax, currentPrice),
          basis: `Bullish BoS retest: broken resistance at ${formatPrice(bosLevel.price, currentPrice)} now acting as support (zone: ${formatPrice(zoneMin, currentPrice)}–${formatPrice(zoneMax, currentPrice)})`,
        };
      }
      notes.push(`BoS level at ${formatPrice(bosHighs[0].price, currentPrice)} is ${formatPrice(currentPrice - bosHighs[0].price, currentPrice)} away (> ${MAX_ENTRY_DISTANCE_ATR} ATR) — skipped`);
    }
  }

  // ── Priority 2: Nearest high-quality support zone (multi-touch) ──────────
  const qualitySupports = levels
    .filter(l => l.type === 'support' && l.touches >= 2 && (currentPrice - l.price) <= maxDistance)
    .sort((a, b) => b.price - a.price); // closest below current price first

  if (qualitySupports.length > 0) {
    const best = qualitySupports[0];
    return {
      min: roundToSignificant(best.zone.min, currentPrice),
      max: roundToSignificant(best.zone.max, currentPrice),
      basis: `High-quality support zone at ${formatPrice(best.price, currentPrice)} (${best.touches} touches, strength ${best.strength}/5) — zone: ${formatPrice(best.zone.min, currentPrice)}–${formatPrice(best.zone.max, currentPrice)}`,
    };
  }

  // ── Priority 3: Nearest support cluster (single-touch) ───────────────────
  const anySupport = levels
    .filter(l => l.type === 'support' && (currentPrice - l.price) <= maxDistance)
    .sort((a, b) => b.price - a.price);

  if (anySupport.length > 0) {
    const best = anySupport[0];
    return {
      min: roundToSignificant(best.zone.min, currentPrice),
      max: roundToSignificant(best.zone.max, currentPrice),
      basis: `Support level at ${formatPrice(best.price, currentPrice)} (${best.touches} touch) — zone: ${formatPrice(best.zone.min, currentPrice)}–${formatPrice(best.zone.max, currentPrice)}`,
    };
  }

  // ── No valid entry zone found ─────────────────────────────────────────────
  return null;
}

// ---------------------------------------------------------------------------
// SHORT entry
// ---------------------------------------------------------------------------

function calculateShortEntry(
  currentPrice: number,
  levels: Level[],
  structure: MarketStructure,
  swings: SwingPoint[],
  atr: number,
  maxDistance: number
): EntryZone | null {
  const halfAtr = atr * 0.5;

  // ── Priority 1: Retest of a bearish Break-of-Structure level ─────────────
  if (structure.breakOfStructure && structure.bosDirection === 'bearish') {
    // Find the most recent swing low above current price
    const bosLows = swings
      .filter(s => s.type === 'low' && s.price > currentPrice)
      .sort((a, b) => b.index - a.index); // most recent first

    if (bosLows.length > 0) {
      const bosLevel = bosLows[0];
      const distanceToBoS = bosLevel.price - currentPrice;

      if (distanceToBoS <= maxDistance) {
        const zoneMin = bosLevel.price - halfAtr * 0.5;
        const zoneMax = bosLevel.price + halfAtr * 0.5;

        return {
          min: roundToSignificant(zoneMin, currentPrice),
          max: roundToSignificant(zoneMax, currentPrice),
          basis: `Bearish BoS retest: broken support at ${formatPrice(bosLevel.price, currentPrice)} now acting as resistance (zone: ${formatPrice(zoneMin, currentPrice)}–${formatPrice(zoneMax, currentPrice)})`,
        };
      }
    }
  }

  // ── Priority 2: Nearest high-quality resistance zone (multi-touch) ────────
  const qualityResistances = levels
    .filter(l => l.type === 'resistance' && l.touches >= 2 && (l.price - currentPrice) <= maxDistance)
    .sort((a, b) => a.price - b.price); // closest above current price first

  if (qualityResistances.length > 0) {
    const best = qualityResistances[0];
    return {
      min: roundToSignificant(best.zone.min, currentPrice),
      max: roundToSignificant(best.zone.max, currentPrice),
      basis: `High-quality resistance zone at ${formatPrice(best.price, currentPrice)} (${best.touches} touches, strength ${best.strength}/5) — zone: ${formatPrice(best.zone.min, currentPrice)}–${formatPrice(best.zone.max, currentPrice)}`,
    };
  }

  // ── Priority 3: Nearest resistance cluster (single-touch) ────────────────
  const anyResistance = levels
    .filter(l => l.type === 'resistance' && (l.price - currentPrice) <= maxDistance)
    .sort((a, b) => a.price - b.price);

  if (anyResistance.length > 0) {
    const best = anyResistance[0];
    return {
      min: roundToSignificant(best.zone.min, currentPrice),
      max: roundToSignificant(best.zone.max, currentPrice),
      basis: `Resistance level at ${formatPrice(best.price, currentPrice)} (${best.touches} touch) — zone: ${formatPrice(best.zone.min, currentPrice)}–${formatPrice(best.zone.max, currentPrice)}`,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Round to a sensible number of decimal places based on the magnitude
 * of the price (handles both crypto micro-prices and large crypto prices).
 */
function roundToSignificant(value: number, referencePrice: number): number {
  if (referencePrice >= 10000) return Math.round(value * 10) / 10;      // BTC range: 1 dp
  if (referencePrice >= 1000)  return Math.round(value * 100) / 100;    // ETH range: 2 dp
  if (referencePrice >= 1)     return Math.round(value * 10000) / 10000; // Forex: 4 dp
  return Math.round(value * 100000) / 100000;                            // Micro-prices: 5 dp
}

function formatPrice(price: number, referencePrice: number): string {
  return roundToSignificant(price, referencePrice).toLocaleString('en-US', { maximumFractionDigits: 8 });
}
