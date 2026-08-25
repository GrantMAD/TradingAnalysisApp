/**
 * Risk/Reward Calculator — Phase 7
 *
 * Calculates the risk/reward ratio from pre-calculated trade levels.
 * This is a pure mathematical function with no market-data dependencies.
 *
 *   entry_mid = (entry.min + entry.max) / 2
 *   risk      = |entry_mid - stop_loss|
 *   reward    = |take_profit_1 - entry_mid|
 *   R:R       = reward / risk
 *
 * Returns null if stop or TP1 is unavailable, or if risk is zero
 * (degenerate case: stop equals entry mid).
 */

import { EntryZone, StopLevel, TargetLevel } from './types';

export interface RiskRewardResult {
  /** The calculated risk/reward ratio (e.g. 2.5 means 2.5:1). */
  ratio: number;
  /** Entry midpoint used in the calculation. */
  entryMid: number;
  /** Risk in price units (entry_mid to stop). */
  riskAmount: number;
  /** Reward in price units (entry_mid to TP1). */
  rewardAmount: number;
  /** True when ratio >= minimumRR. */
  meetsMinimum: boolean;
}

/**
 * Calculates the risk/reward ratio.
 *
 * @param entry      Entry zone
 * @param stop       Stop-loss level
 * @param tp1        Primary take-profit target
 * @param minimumRR  Minimum acceptable R:R ratio (from user settings, default 2.0)
 * @returns RiskRewardResult or null if calculation is not possible
 */
export function calculateRiskReward(
  entry: EntryZone,
  stop: StopLevel,
  tp1: TargetLevel,
  minimumRR: number = 2.0
): RiskRewardResult | null {
  const entryMid = (entry.min + entry.max) / 2;

  const riskAmount = Math.abs(entryMid - stop.price);
  const rewardAmount = Math.abs(tp1.price - entryMid);

  // Guard: degenerate case where stop equals entry mid
  if (riskAmount === 0) {
    return null;
  }

  const ratio = rewardAmount / riskAmount;

  return {
    ratio: Math.round(ratio * 100) / 100, // 2 decimal places
    entryMid,
    riskAmount,
    rewardAmount,
    meetsMinimum: ratio >= minimumRR,
  };
}
