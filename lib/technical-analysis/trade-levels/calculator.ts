/**
 * Trade-Level Calculation Orchestrator — Phase 7
 *
 * Coordinates the sub-calculators (entry, stop, TP1, TP2, R:R) and
 * produces a single, final TradeLevels result.
 *
 * Architecture rule (Spec §37):
 *   This function is called AFTER evaluateSetup() and BEFORE the AI layer.
 *   It must NOT be called automatically inside runTechnicalAnalysis().
 *
 * Security rules (PROJECT_RULES):
 *   - Rule 7: Every level must be derived from supplied evidence.
 *   - Rule 8: Returns NO_TRADE whenever levels cannot be safely calculated.
 *   - Rule 12: Full methodology notes are assembled for the audit trail.
 *   - Rule 15: Output is deterministic fact — AI interprets, never replaces.
 *
 * Flow:
 *   1. If SetupEvaluation.direction === 'NO_TRADE' → immediate NO_TRADE passthrough
 *   2. Calculate entry zone → null → NO_TRADE (NO_VALID_ENTRY_ZONE)
 *   3. Calculate stop loss  → null → NO_TRADE (NO_VALID_STOP)
 *   4. Calculate TP1        → null → NO_TRADE (NO_VALID_TARGET)
 *   5. Calculate R:R        → below minimum → NO_TRADE (INSUFFICIENT_RR)
 *   6. Calculate TP2 (optional, does not affect NO_TRADE decision)
 *   7. Return complete TradeLevels
 */

import { SetupEvaluation } from '../setup/types';
import { TradeLevels, TradeLevelRejectionReason } from './types';
import { calculateEntry } from './entry';
import { calculateStop } from './stop-loss';
import { calculateTP1, calculateTP2 } from './take-profit';
import { calculateRiskReward } from './risk-reward';

/** Default minimum R:R if not supplied by the caller. */
const DEFAULT_MINIMUM_RR = 2.0;

/**
 * Calculates all trade levels from a completed setup evaluation.
 *
 * @param setupEvaluation  Output of evaluateSetup() — Phase 6
 * @param userMinimumRR    User's configured minimum risk/reward (default 2.0)
 * @returns TradeLevels — always returns a result, never throws
 */
export function calculateTradeLevels(
  setupEvaluation: SetupEvaluation,
  userMinimumRR: number = DEFAULT_MINIMUM_RR
): TradeLevels {
  const methodologyNotes: string[] = [];

  // ── Step 1: Passthrough if upstream setup is NO_TRADE ────────────────────
  if (setupEvaluation.direction === 'NO_TRADE') {
    const rejectionSummary = setupEvaluation.rejectionReasons?.join(', ') ?? 'unspecified reasons';
    methodologyNotes.push(`Upstream setup evaluation returned NO_TRADE: ${rejectionSummary}`);

    return noTrade('SETUP_WAS_NO_TRADE', methodologyNotes);
  }

  const direction = setupEvaluation.direction; // 'LONG' | 'SHORT'
  const taResult = setupEvaluation.taResult;
  const { levels, structure, liquidityZones } = taResult;
  const swings = structure.swings;
  const currentPrice = taResult.candles[taResult.candles.length - 1].close;

  // Current ATR (last non-null value)
  const atrArray = taResult.indicators.atr;
  const atr = lastNonNull(atrArray) ?? currentPrice * 0.005; // 0.5% fallback
  methodologyNotes.push(`ATR used for calculations: ${atr.toFixed(8)} (${atrArray[atrArray.length - 1] == null ? 'fallback — insufficient candles' : 'calculated'})`);

  // ── Step 2: Calculate entry zone ─────────────────────────────────────────
  const entry = calculateEntry(direction, currentPrice, levels, structure, swings, atr);

  if (!entry) {
    methodologyNotes.push(`Entry zone calculation failed: no valid ${direction === 'LONG' ? 'support' : 'resistance'} zone found within 1.5 × ATR of current price (${currentPrice})`);
    return noTrade('NO_VALID_ENTRY_ZONE', methodologyNotes);
  }

  methodologyNotes.push(`Entry zone: ${entry.basis}`);

  // ── Step 3: Calculate stop loss ──────────────────────────────────────────
  const stop = calculateStop(direction, entry, structure, swings, atr);

  if (!stop) {
    methodologyNotes.push(`Stop-loss calculation failed: no valid swing point or ATR-based stop could be placed safely below/above entry`);
    return noTrade('NO_VALID_STOP', methodologyNotes);
  }

  methodologyNotes.push(`Stop-loss (${stop.method}): ${stop.basis}`);

  // ── Step 4: Calculate TP1 ────────────────────────────────────────────────
  const tp1 = calculateTP1(direction, entry, stop, levels, swings, liquidityZones, userMinimumRR);

  if (!tp1) {
    methodologyNotes.push(`TP1 calculation failed: no evidence-based target found that satisfies minimum R:R of ${userMinimumRR}:1. The system will not manufacture a target.`);
    return noTrade('NO_VALID_TARGET', methodologyNotes);
  }

  methodologyNotes.push(`TP1 (${tp1.method}): ${tp1.basis}`);

  // ── Step 5: Calculate R:R ────────────────────────────────────────────────
  const rrResult = calculateRiskReward(entry, stop, tp1, userMinimumRR);

  if (!rrResult) {
    methodologyNotes.push(`R:R calculation failed: entry midpoint equals stop price (degenerate case)`);
    return noTrade('INSUFFICIENT_RR', methodologyNotes);
  }

  methodologyNotes.push(
    `R:R: ${rrResult.ratio}:1 (risk = ${rrResult.riskAmount.toFixed(8)}, reward = ${rrResult.rewardAmount.toFixed(8)}) — minimum required: ${userMinimumRR}:1 → ${rrResult.meetsMinimum ? 'MEETS MINIMUM' : 'BELOW MINIMUM'}`
  );

  if (!rrResult.meetsMinimum) {
    methodologyNotes.push(
      `R:R of ${rrResult.ratio}:1 is below the configured minimum of ${userMinimumRR}:1. Per project rules, the system will not force a trade to satisfy a ratio that the market does not support.`
    );
    return noTrade('INSUFFICIENT_RR', methodologyNotes);
  }

  // ── Step 6: Calculate TP2 (optional) ────────────────────────────────────
  const tp2 = calculateTP2(direction, entry, tp1, levels, swings, liquidityZones);

  if (tp2) {
    methodologyNotes.push(`TP2 (${tp2.method}): ${tp2.basis}`);
  } else {
    methodologyNotes.push(`TP2: no meaningful second target identified beyond TP1 — single-target setup`);
  }

  // ── Step 7: Assemble and return successful result ────────────────────────
  return {
    direction,
    entry,
    stopLoss: stop,
    takeProfit1: tp1,
    ...(tp2 && { takeProfit2: tp2 }),
    riskReward: rrResult.ratio,
    methodologyNotes,
    minimumRRMet: true,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function noTrade(
  reason: TradeLevelRejectionReason,
  notes: string[]
): TradeLevels {
  return {
    direction: 'NO_TRADE',
    methodologyNotes: notes,
    minimumRRMet: false,
    rejectionReason: reason,
  };
}

function lastNonNull(arr: (number | null)[]): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null) return arr[i];
  }
  return null;
}
