/**
 * Trade-Level Calculation Types — Phase 7
 *
 * All price levels produced by the trade-level engine must be
 * derived from supplied market evidence (PROJECT_RULES Rule 7).
 * Every level carries a human-readable `basis` string that records
 * which evidence drove the calculation. This satisfies the audit
 * trail requirement in PROJECT_RULES Rule 12.
 *
 * The AI layer (Phase 9) receives these as pre-calculated facts and
 * must interpret but NOT modify them (PROJECT_RULES Rule 15).
 */

/** Which method was used to place the stop loss. */
export type StopMethod = 'structure' | 'atr' | 'swing';

/** Which method was used to identify a take-profit target. */
export type TargetMethod =
  | 'structural_resistance'
  | 'structural_support'
  | 'previous_high'
  | 'previous_low'
  | 'liquidity_zone'
  | 'risk_reward_projection';

/**
 * A price zone within which the trade should be entered.
 * Both min and max are derived from real market structure — never fabricated.
 */
export interface EntryZone {
  /** Lower bound of the entry zone. */
  min: number;
  /** Upper bound of the entry zone. */
  max: number;
  /**
   * Plain-English explanation of why this entry zone was selected.
   * Examples:
   *   "Retest zone of broken resistance at 112,850 (zone: 112,800–112,900)"
   *   "High-quality support cluster at 1.0820 (2 touches)"
   */
  basis: string;
}

/**
 * A calculated stop-loss level with its derivation method and rationale.
 */
export interface StopLevel {
  /** Stop-loss price. */
  price: number;
  /** The method used to determine this stop. */
  method: StopMethod;
  /**
   * Plain-English rationale.
   * Examples:
   *   "Structure-based: most recent swing low at 112,420 minus 0.25 ATR buffer (25 pts)"
   *   "ATR-based fallback: entry.min - 1.5 × ATR (no clear structural low within range)"
   */
  basis: string;
}

/**
 * A single take-profit target with its derivation method and rationale.
 */
export interface TargetLevel {
  /** Take-profit price. */
  price: number;
  /** The method used to identify this target. */
  method: TargetMethod;
  /**
   * Plain-English rationale.
   * Examples:
   *   "Previous swing high at 113,400"
   *   "Equal-highs liquidity zone at 1.0950"
   */
  basis: string;
}

/**
 * The reason Phase 7 returned NO_TRADE when the upstream setup
 * was directional but levels could not be safely calculated.
 */
export type TradeLevelRejectionReason =
  | 'NO_VALID_ENTRY_ZONE'
  | 'NO_VALID_STOP'
  | 'NO_VALID_TARGET'
  | 'INSUFFICIENT_RR'
  | 'SETUP_WAS_NO_TRADE';

/**
 * The complete output of the trade-level calculation engine.
 *
 * When `direction === 'NO_TRADE'`, the optional fields will be absent.
 * When `direction === 'LONG' | 'SHORT'`, all of entry, stopLoss,
 * takeProfit1, and riskReward will be present (takeProfit2 is optional).
 */
export interface TradeLevels {
  /** The trade direction, carried through from the setup evaluation. */
  direction: 'LONG' | 'SHORT' | 'NO_TRADE';

  /** Entry zone (only for LONG / SHORT). */
  entry?: EntryZone;

  /** Stop-loss level (only for LONG / SHORT). */
  stopLoss?: StopLevel;

  /** Primary take-profit target (only for LONG / SHORT). */
  takeProfit1?: TargetLevel;

  /**
   * Secondary take-profit target.
   * Optional — only set when a meaningful second level exists beyond TP1.
   */
  takeProfit2?: TargetLevel;

  /**
   * Risk/reward ratio computed as:
   *   reward = |tp1 - entry_mid|
   *   risk   = |entry_mid - stop|
   *   R:R    = reward / risk
   */
  riskReward?: number;

  /**
   * Plain-English notes from each sub-calculator.
   * Assembled into the AI context package so the AI can reference them
   * when explaining its reasoning (Phase 9).
   */
  methodologyNotes: string[];

  /** True when the calculated R:R meets the user's configured minimum. */
  minimumRRMet: boolean;

  /**
   * Set when direction === 'NO_TRADE' to explain exactly why levels
   * could not be produced despite an upstream LONG/SHORT signal,
   * or to confirm that the upstream setup was itself NO_TRADE.
   */
  rejectionReason?: TradeLevelRejectionReason;
}
