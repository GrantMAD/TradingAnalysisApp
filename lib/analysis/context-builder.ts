/**
 * lib/analysis/context-builder.ts — Phase 9: AI Analysis Layer
 *
 * Assembles the AIContextPackage from Phase 5–8 outputs.
 * This is the only place where full indicator arrays are reduced
 * to last-value snapshots before being sent to the AI.
 *
 * PROJECT RULES:
 *   Rule 6  — Prices are pre-calculated facts passed TO the AI, not invented by it.
 *   Rule 7  — TradeLevels from Phase 7 are the authoritative source.
 *   Rule 9  — No broker execution data is included anywhere.
 *   Rule 13 — Staleness is explicitly flagged.
 *   Rule 14 — Data timestamp and data age are included.
 *   Rule 15 — Indicator values (facts) are separated from AI interpretation fields.
 */

import type { TAResult, MultiTimeframeContext } from '../technical-analysis/types';
import type { SetupEvaluation } from '../technical-analysis/setup/types';
import type { TradeLevels } from '../technical-analysis/trade-levels/types';
import type { SetupScoreResult } from '../technical-analysis/types';
import type { DataQuality, Timeframe } from '../market-data/types';
import type {
  AIContextPackage,
  AIContextInstrument,
  AIIndicatorSnapshot,
  AIUserPreferences,
} from './types';

/** Maximum number of key levels included in the AI context. */
const MAX_KEY_LEVELS = 6;

/** Maximum number of liquidity zones included. */
const MAX_LIQUIDITY_ZONES = 4;

/** Maximum number of candlestick patterns included. */
const MAX_CANDLESTICK_PATTERNS = 5;

/** Maximum number of chart patterns included. */
const MAX_CHART_PATTERNS = 3;

/** Staleness threshold in minutes — analyses older than this warn the AI. */
export const STALENESS_THRESHOLD_MINUTES = 30;

/** Staleness threshold in minutes — analyses older than this are rejected. */
export const CRITICAL_STALENESS_THRESHOLD_MINUTES = 10080; // Increased to 1 week for development/testing

export interface BuildContextParams {
  instrument: AIContextInstrument;
  timeframe: Timeframe;
  taResult: TAResult;
  setupEvaluation: SetupEvaluation;
  tradeLevels: TradeLevels;
  setupScore: SetupScoreResult;
  dataQuality: DataQuality;
  userPreferences: AIUserPreferences;
  higherTimeframeContext?: MultiTimeframeContext;
  screenshotAnalysis?: string;
  methodologyVersion?: string;
}

/**
 * Builds the structured context package to be passed to the AI.
 *
 * Returns the package along with derived staleness metadata
 * so the pipeline can decide whether to abort or warn before calling the AI.
 */
export function buildAIContextPackage(params: BuildContextParams): {
  package: AIContextPackage;
  dataAgeMinutes: number;
  isStale: boolean;
  isCriticallyStale: boolean;
} {
  const {
    instrument,
    timeframe,
    taResult,
    setupEvaluation,
    tradeLevels,
    setupScore,
    dataQuality,
    userPreferences,
    higherTimeframeContext,
    screenshotAnalysis,
    methodologyVersion = '1.0',
  } = params;

  // ─── Calculate data age ────────────────────────────────────────────────────
  const now = Date.now();
  const dataAsOfMs = new Date(dataQuality.dataAsOf).getTime();
  const dataAgeMinutes = Math.floor((now - dataAsOfMs) / 60_000);
  const isStale = dataAgeMinutes >= STALENESS_THRESHOLD_MINUTES || dataQuality.isStale;
  const isCriticallyStale = dataAgeMinutes >= CRITICAL_STALENESS_THRESHOLD_MINUTES;

  // ─── Extract last-value indicator snapshot ─────────────────────────────────
  const ind = taResult.indicators;
  const last = <T>(arr: (T | null)[]): T | null =>
    arr.length > 0 ? arr[arr.length - 1] : null;

  const lastMacd = last(ind.macd);
  const lastBollinger = last(ind.bollinger);
  const lastAdx = last(ind.adx);

  const indicators: AIIndicatorSnapshot = {
    rsi: last(ind.rsi),
    macd: lastMacd
      ? { macd: lastMacd.macd, signal: lastMacd.signal, histogram: lastMacd.histogram }
      : null,
    sma20: last(ind.sma20),
    sma50: last(ind.sma50),
    sma200: last(ind.sma200),
    ema9: last(ind.ema9),
    ema20: last(ind.ema20),
    ema50: last(ind.ema50),
    bollinger: lastBollinger
      ? { upper: lastBollinger.upper, middle: lastBollinger.middle, lower: lastBollinger.lower }
      : null,
    atr: last(ind.atr),
    adx: lastAdx
      ? { adx: lastAdx.adx, plusDI: lastAdx.plusDI, minusDI: lastAdx.minusDI }
      : null,
    vwap: last(ind.vwap),
    // Flag when volume data may be unreliable (Forex tick volume)
    ...(taResult.dataQuality
      ? { volumeNote: taResult.dataQuality }
      : {}),
  };

  // ─── Select top key levels by strength ────────────────────────────────────
  const keyLevels = [...taResult.levels]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, MAX_KEY_LEVELS);

  // ─── Build the package ─────────────────────────────────────────────────────
  const pkg: AIContextPackage = {
    instrument,
    timeframe,
    currentPrice:
      taResult.candles.length > 0
        ? taResult.candles[taResult.candles.length - 1].close
        : 0,

    dataTimestamp: dataQuality.dataAsOf,
    dataIsStale: isStale,
    dataAgeMinutes,

    trend: taResult.trend,
    marketStructure: {
      recentPattern: taResult.structure.recentPattern,
      breakOfStructure: taResult.structure.breakOfStructure,
      changeOfCharacter: taResult.structure.changeOfCharacter,
      bosDirection: taResult.structure.bosDirection,
    },
    keyLevels,
    candlestickPatterns: taResult.candlestickPatterns.slice(0, MAX_CANDLESTICK_PATTERNS),
    chartPatterns: taResult.chartPatterns.slice(0, MAX_CHART_PATTERNS),
    liquidityZones: taResult.liquidityZones.slice(0, MAX_LIQUIDITY_ZONES),

    indicators,

    setupEvaluation: {
      direction: setupEvaluation.direction,
      supportingEvidence: setupEvaluation.supportingEvidence,
      conflictingEvidence: setupEvaluation.conflictingEvidence,
      rejectionReasons: setupEvaluation.rejectionReasons,
      summary: setupEvaluation.summary,
    },

    // The AI receives these as pre-calculated facts. Rules 6 & 7.
    tradeLevels,

    setupScore,

    userPreferences,

    higherTimeframeContext,
    screenshotAnalysis,
    methodologyVersion,
  };

  return { package: pkg, dataAgeMinutes, isStale, isCriticallyStale };
}
