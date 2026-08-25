/**
 * Take-Profit Calculator — Phase 7
 *
 * Identifies realistic, evidence-based take-profit targets.
 * The system must NEVER manufacture a target simply to satisfy a
 * minimum R:R ratio — targets must be grounded in real market structure.
 * (Spec §18, PROJECT_RULES Rules 7, 8)
 *
 * TP1 priority (LONG):
 *   1. Nearest structural resistance above entry
 *   2. Previous swing high above entry
 *   3. Nearest liquidity zone above entry (equal highs, prev-day high, etc.)
 *   → null if no evidence-based target exists
 *
 * TP2 is optional — only set when a meaningful second level exists beyond TP1.
 *
 * SHORT mirrors LONG using support / swing lows / liquidity lows.
 */

import { Level, LiquidityZone, SwingPoint } from '../types';
import { EntryZone, StopLevel, TargetLevel } from './types';

/**
 * Calculates TP1 for the given direction.
 *
 * @param direction  'LONG' | 'SHORT'
 * @param entry      Entry zone
 * @param stop       Stop-loss level (used for minimum R:R filtering)
 * @param levels     S/R levels from the TA engine
 * @param swings     Raw swing points
 * @param liquidityZones  Identified liquidity areas
 * @param minimumRR  Minimum required risk/reward (from user settings)
 * @returns TargetLevel or null
 */
export function calculateTP1(
  direction: 'LONG' | 'SHORT',
  entry: EntryZone,
  stop: StopLevel,
  levels: Level[],
  swings: SwingPoint[],
  liquidityZones: LiquidityZone[],
  minimumRR: number
): TargetLevel | null {
  if (direction === 'LONG') {
    return calculateLongTP1(entry, stop, levels, swings, liquidityZones, minimumRR);
  } else {
    return calculateShortTP1(entry, stop, levels, swings, liquidityZones, minimumRR);
  }
}

/**
 * Calculates TP2 for the given direction.
 * TP2 is always optional — returns null if no meaningful second level exists.
 *
 * @param direction  'LONG' | 'SHORT'
 * @param entry      Entry zone
 * @param tp1        The first take-profit target (TP2 must be beyond TP1)
 * @param levels     S/R levels
 * @param swings     Raw swing points
 * @param liquidityZones  Liquidity areas
 * @returns TargetLevel or null
 */
export function calculateTP2(
  direction: 'LONG' | 'SHORT',
  entry: EntryZone,
  tp1: TargetLevel,
  levels: Level[],
  swings: SwingPoint[],
  liquidityZones: LiquidityZone[]
): TargetLevel | null {
  if (direction === 'LONG') {
    return calculateLongTP2(entry, tp1, levels, swings, liquidityZones);
  } else {
    return calculateShortTP2(entry, tp1, levels, swings, liquidityZones);
  }
}

// ---------------------------------------------------------------------------
// LONG TP1
// ---------------------------------------------------------------------------

function calculateLongTP1(
  entry: EntryZone,
  stop: StopLevel,
  levels: Level[],
  swings: SwingPoint[],
  liquidityZones: LiquidityZone[],
  minimumRR: number
): TargetLevel | null {
  const entryMid = (entry.min + entry.max) / 2;
  const risk = entryMid - stop.price;
  const minTarget = entryMid + risk * minimumRR; // minimum price needed to satisfy R:R

  const candidates: TargetLevel[] = [];

  // ── Source 1: Structural resistance levels above entry ───────────────────
  const resistanceLevels = levels
    .filter(l => l.type === 'resistance' && l.price > entryMid)
    .sort((a, b) => a.price - b.price); // nearest first

  for (const level of resistanceLevels) {
    candidates.push({
      price: roundToSignificant(level.price, entryMid),
      method: 'structural_resistance',
      basis: `Structural resistance at ${formatPrice(level.price, entryMid)} (${level.touches} touches, strength ${level.strength}/5)`,
    });
  }

  // ── Source 2: Previous swing highs above entry ────────────────────────────
  const swingHighs = swings
    .filter(s => s.type === 'high' && s.price > entryMid)
    .sort((a, b) => a.price - b.price); // nearest first

  for (const swing of swingHighs) {
    // Avoid duplicating a level already added from S/R (within 0.3% price)
    const alreadyCovered = candidates.some(c => Math.abs(c.price - swing.price) / swing.price < 0.003);
    if (!alreadyCovered) {
      candidates.push({
        price: roundToSignificant(swing.price, entryMid),
        method: 'previous_high',
        basis: `Previous swing high at ${formatPrice(swing.price, entryMid)}`,
      });
    }
  }

  // ── Source 3: Liquidity zones above entry ─────────────────────────────────
  const liqTargets = liquidityZones
    .filter(lz =>
      (lz.type === 'equal_highs' || lz.type === 'previous_day_high') &&
      lz.price > entryMid
    )
    .sort((a, b) => a.price - b.price);

  for (const lz of liqTargets) {
    const alreadyCovered = candidates.some(c => Math.abs(c.price - lz.price) / lz.price < 0.003);
    if (!alreadyCovered) {
      candidates.push({
        price: roundToSignificant(lz.price, entryMid),
        method: 'liquidity_zone',
        basis: `Liquidity area (${lz.type.replace(/_/g, ' ')}) at ${formatPrice(lz.price, entryMid)}`,
      });
    }
  }

  // ── Select the nearest candidate that satisfies minimum R:R ───────────────
  const sorted = candidates.sort((a, b) => a.price - b.price);
  const valid = sorted.filter(c => c.price >= minTarget);

  if (valid.length > 0) {
    return valid[0]; // nearest level that meets minimum R:R
  }

  // There are candidates but none satisfies minimum R:R
  if (sorted.length > 0) {
    // Return null — the caller will set minimumRRMet = false → NO_TRADE
    return null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// SHORT TP1
// ---------------------------------------------------------------------------

function calculateShortTP1(
  entry: EntryZone,
  stop: StopLevel,
  levels: Level[],
  swings: SwingPoint[],
  liquidityZones: LiquidityZone[],
  minimumRR: number
): TargetLevel | null {
  const entryMid = (entry.min + entry.max) / 2;
  const risk = stop.price - entryMid;
  const minTarget = entryMid - risk * minimumRR; // maximum price (below entry) needed

  const candidates: TargetLevel[] = [];

  // ── Source 1: Structural support levels below entry ───────────────────────
  const supportLevels = levels
    .filter(l => l.type === 'support' && l.price < entryMid)
    .sort((a, b) => b.price - a.price); // nearest first (highest below entry)

  for (const level of supportLevels) {
    candidates.push({
      price: roundToSignificant(level.price, entryMid),
      method: 'structural_support',
      basis: `Structural support at ${formatPrice(level.price, entryMid)} (${level.touches} touches, strength ${level.strength}/5)`,
    });
  }

  // ── Source 2: Previous swing lows below entry ─────────────────────────────
  const swingLows = swings
    .filter(s => s.type === 'low' && s.price < entryMid)
    .sort((a, b) => b.price - a.price); // nearest first

  for (const swing of swingLows) {
    const alreadyCovered = candidates.some(c => Math.abs(c.price - swing.price) / swing.price < 0.003);
    if (!alreadyCovered) {
      candidates.push({
        price: roundToSignificant(swing.price, entryMid),
        method: 'previous_low',
        basis: `Previous swing low at ${formatPrice(swing.price, entryMid)}`,
      });
    }
  }

  // ── Source 3: Liquidity zones below entry ─────────────────────────────────
  const liqTargets = liquidityZones
    .filter(lz =>
      (lz.type === 'equal_lows' || lz.type === 'previous_day_low') &&
      lz.price < entryMid
    )
    .sort((a, b) => b.price - a.price); // nearest first

  for (const lz of liqTargets) {
    const alreadyCovered = candidates.some(c => Math.abs(c.price - lz.price) / lz.price < 0.003);
    if (!alreadyCovered) {
      candidates.push({
        price: roundToSignificant(lz.price, entryMid),
        method: 'liquidity_zone',
        basis: `Liquidity area (${lz.type.replace(/_/g, ' ')}) at ${formatPrice(lz.price, entryMid)}`,
      });
    }
  }

  // ── Select the nearest candidate that satisfies minimum R:R ───────────────
  const sorted = candidates.sort((a, b) => b.price - a.price); // nearest below entry first
  const valid = sorted.filter(c => c.price <= minTarget);

  if (valid.length > 0) {
    return valid[0];
  }

  return null;
}

// ---------------------------------------------------------------------------
// LONG TP2
// ---------------------------------------------------------------------------

function calculateLongTP2(
  entry: EntryZone,
  tp1: TargetLevel,
  levels: Level[],
  swings: SwingPoint[],
  liquidityZones: LiquidityZone[]
): TargetLevel | null {
  const candidates: TargetLevel[] = [];

  // Levels / swings / liq zones strictly above TP1
  const resistanceLevels = levels
    .filter(l => l.type === 'resistance' && l.price > tp1.price)
    .sort((a, b) => a.price - b.price);

  for (const level of resistanceLevels) {
    candidates.push({
      price: roundToSignificant(level.price, entry.min),
      method: 'structural_resistance',
      basis: `Second structural resistance at ${formatPrice(level.price, entry.min)} (${level.touches} touches)`,
    });
  }

  const swingHighs = swings
    .filter(s => s.type === 'high' && s.price > tp1.price)
    .sort((a, b) => a.price - b.price);

  for (const swing of swingHighs) {
    const alreadyCovered = candidates.some(c => Math.abs(c.price - swing.price) / swing.price < 0.003);
    if (!alreadyCovered) {
      candidates.push({
        price: roundToSignificant(swing.price, entry.min),
        method: 'previous_high',
        basis: `Previous swing high at ${formatPrice(swing.price, entry.min)} (beyond TP1)`,
      });
    }
  }

  const liqTargets = liquidityZones
    .filter(lz =>
      (lz.type === 'equal_highs' || lz.type === 'previous_day_high') &&
      lz.price > tp1.price
    )
    .sort((a, b) => a.price - b.price);

  for (const lz of liqTargets) {
    const alreadyCovered = candidates.some(c => Math.abs(c.price - lz.price) / lz.price < 0.003);
    if (!alreadyCovered) {
      candidates.push({
        price: roundToSignificant(lz.price, entry.min),
        method: 'liquidity_zone',
        basis: `Liquidity zone (${lz.type.replace(/_/g, ' ')}) at ${formatPrice(lz.price, entry.min)} (beyond TP1)`,
      });
    }
  }

  if (candidates.length === 0) return null;

  // Return the nearest target beyond TP1
  candidates.sort((a, b) => a.price - b.price);
  return candidates[0];
}

// ---------------------------------------------------------------------------
// SHORT TP2
// ---------------------------------------------------------------------------

function calculateShortTP2(
  entry: EntryZone,
  tp1: TargetLevel,
  levels: Level[],
  swings: SwingPoint[],
  liquidityZones: LiquidityZone[]
): TargetLevel | null {
  const candidates: TargetLevel[] = [];

  const supportLevels = levels
    .filter(l => l.type === 'support' && l.price < tp1.price)
    .sort((a, b) => b.price - a.price);

  for (const level of supportLevels) {
    candidates.push({
      price: roundToSignificant(level.price, entry.max),
      method: 'structural_support',
      basis: `Second structural support at ${formatPrice(level.price, entry.max)} (${level.touches} touches)`,
    });
  }

  const swingLows = swings
    .filter(s => s.type === 'low' && s.price < tp1.price)
    .sort((a, b) => b.price - a.price);

  for (const swing of swingLows) {
    const alreadyCovered = candidates.some(c => Math.abs(c.price - swing.price) / swing.price < 0.003);
    if (!alreadyCovered) {
      candidates.push({
        price: roundToSignificant(swing.price, entry.max),
        method: 'previous_low',
        basis: `Previous swing low at ${formatPrice(swing.price, entry.max)} (beyond TP1)`,
      });
    }
  }

  const liqTargets = liquidityZones
    .filter(lz =>
      (lz.type === 'equal_lows' || lz.type === 'previous_day_low') &&
      lz.price < tp1.price
    )
    .sort((a, b) => b.price - a.price);

  for (const lz of liqTargets) {
    const alreadyCovered = candidates.some(c => Math.abs(c.price - lz.price) / lz.price < 0.003);
    if (!alreadyCovered) {
      candidates.push({
        price: roundToSignificant(lz.price, entry.max),
        method: 'liquidity_zone',
        basis: `Liquidity zone (${lz.type.replace(/_/g, ' ')}) at ${formatPrice(lz.price, entry.max)} (beyond TP1)`,
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.price - a.price);
  return candidates[0];
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
