/**
 * lib/analysis/types.ts — Phase 9: AI Analysis Layer
 *
 * Shared TypeScript types for the AI interpretation layer.
 *
 * PROJECT RULES:
 *   Rule 1  — AI_API_KEY is server-side only; never referenced here.
 *   Rule 6  — AIContextPackage carries pre-calculated prices; AI never invents them.
 *   Rule 9  — No broker execution fields exist anywhere in this type system.
 *   Rule 12 — Raw AI response is retained separately before validation.
 *   Rule 15 — Explanation fields are clearly labelled as AI interpretation.
 */

import type { Timeframe, MarketType } from '../market-data/types';
import type {
  TrendResult,
  MarketStructure,
  Level,
  LiquidityZone,
  CandlestickPattern,
  ChartPattern,
  SetupScoreResult,
  MultiTimeframeContext,
} from '../technical-analysis/types';
import type { SetupEvaluation } from '../technical-analysis/setup/types';
import type { TradeLevels } from '../technical-analysis/trade-levels/types';

// ─── Instrument summary passed into the AI context ──────────────────────────

export interface AIContextInstrument {
  symbol: string;
  displayName: string;
  marketType: MarketType;
}

// ─── Indicator snapshot (last-value only) passed to AI ──────────────────────
// Full arrays are NOT sent — the AI must not re-calculate indicators.

export interface AIIndicatorSnapshot {
  rsi: number | null;
  macd: { macd: number | null; signal: number | null; histogram: number | null } | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema9: number | null;
  ema20: number | null;
  ema50: number | null;
  bollinger: { upper: number | null; middle: number | null; lower: number | null } | null;
  atr: number | null;
  adx: { adx: number | null; plusDI: number | null; minusDI: number | null } | null;
  vwap: number | null;
  /** Present when volume data is unreliable (e.g. Forex tick volume). Rule 14. */
  volumeNote?: string;
}

// ─── User preferences subset passed to AI ───────────────────────────────────

export interface AIUserPreferences {
  riskProfile: 'conservative' | 'balanced' | 'aggressive';
  minimumRR: number;
  requireMultiTimeframeConfirmation: boolean;
  enabledComponents: string[];
}

// ─── The complete structured package sent to the AI ─────────────────────────
// This object is assembled server-side and never leaves the server.

export interface AIContextPackage {
  instrument: AIContextInstrument;
  timeframe: Timeframe;
  currentPrice: number;

  /** ISO timestamp of when the market data was captured. Rule 14. */
  dataTimestamp: string;
  /** True if the data exceeds the freshness threshold. Rule 13. */
  dataIsStale: boolean;
  /** How old the most recent candle is in minutes. Rule 14. */
  dataAgeMinutes: number;

  /** From Phase 5. */
  trend: TrendResult;
  marketStructure: {
    recentPattern: MarketStructure['recentPattern'];
    breakOfStructure: boolean;
    changeOfCharacter: boolean;
    bosDirection?: 'bullish' | 'bearish';
  };
  /** Top levels by strength — not the full list. */
  keyLevels: Level[];
  candlestickPatterns: CandlestickPattern[];
  chartPatterns: ChartPattern[];
  liquidityZones: LiquidityZone[];

  /** Current-bar indicator values only. */
  indicators: AIIndicatorSnapshot;

  /** From Phase 6. */
  setupEvaluation: {
    direction: SetupEvaluation['direction'];
    supportingEvidence: SetupEvaluation['supportingEvidence'];
    conflictingEvidence: SetupEvaluation['conflictingEvidence'];
    rejectionReasons?: SetupEvaluation['rejectionReasons'];
    summary: string;
  };

  /**
   * From Phase 7.
   * The AI must interpret these levels, NOT replace or invent new ones.
   * Rules 6 & 7.
   */
  tradeLevels: TradeLevels;

  /** From Phase 8. */
  setupScore: SetupScoreResult;

  userPreferences: AIUserPreferences;

  /** Optional — populated in Phase 10 (screenshot analysis). */
  screenshotAnalysis?: string;

  /** Optional higher-timeframe context from Phase 5 multi-TF pass. */
  higherTimeframeContext?: MultiTimeframeContext;

  /** Methodology version recorded for auditability. Rule 12. */
  methodologyVersion: string;
}

// ─── AI Output types (after Zod validation) ─────────────────────────────────

/** One evidence item produced by the AI. Maps to the analysis_evidence DB table. */
export interface AIEvidenceItem {
  category: string;
  name: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  score: number;
  finding: string;
  /** AI interpretation — clearly labelled as such. Rule 15. */
  explanation: string;
}

/**
 * The AI's explanation broken into named sections.
 * All fields are AI interpretation, not mathematical facts. Rule 15.
 */
export interface AIExplanation {
  market_structure: string;
  trend: string;
  support_resistance: string;
  momentum: string;
  volume: string;
  volatility: string;
  entry: string;
  stop_loss: string;
  take_profit: string;
  risk_reward: string;
  why_this_trade: string;
  why_not_other_trade: string;
}

/** Trade levels as returned by the AI (references Phase 7 calculations). */
export interface AITrade {
  entry_min: number;
  entry_max: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2?: number;
  risk_reward: number;
}

/** The fully validated and typed AI response. */
export interface AIAnalysisResult {
  decision: 'LONG' | 'SHORT' | 'NO_TRADE';
  market_bias: string;
  /** AI holistic setup score (0–100). Heuristic — not a win probability. Rule 10. */
  setup_score: number;
  /** AI confidence in its interpretation (0–100). Not a win probability. Rule 10. */
  confidence_score: number;
  summary: string;
  /** Only present when decision is LONG or SHORT. */
  trade?: AITrade;
  trigger_condition?: string;
  /** Conditions that would invalidate the setup. */
  invalidation_condition: string;
  evidence: AIEvidenceItem[];
  /** All explanation strings are AI interpretation. Rule 15. */
  explanation: AIExplanation;
  /** Data quality issues, methodology limitations, or market caveats. Rules 13/14. */
  warnings: string[];
}

// ─── Pipeline result ─────────────────────────────────────────────────────────

export interface AnalysisPipelineParams {
  userId: string;
  instrumentId: string;
  /** Provider symbol (e.g. 'BTC/USD'). */
  symbol: string;
  displayName: string;
  marketType: MarketType;
  timeframe: Timeframe;
  userPreferences: AIUserPreferences;
  screenshotPath?: string;
}

export interface AnalysisPipelineResult {
  analysisId: string;
  status: 'completed' | 'failed';
  error?: string;
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export class AICallError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'AICallError';
  }
}

export class AIValidationError extends Error {
  constructor(
    message: string,
    public readonly zodErrors?: unknown,
  ) {
    super(message);
    this.name = 'AIValidationError';
  }
}

export class StaleDataError extends Error {
  constructor(
    message: string,
    public readonly dataAgeMinutes: number,
  ) {
    super(message);
    this.name = 'StaleDataError';
  }
}
