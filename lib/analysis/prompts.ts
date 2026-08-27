/**
 * lib/analysis/prompts.ts — Phase 9: AI Analysis Layer
 *
 * System and user prompt templates for the AI reasoning layer.
 *
 * PROJECT RULES ENFORCED IN PROMPTS:
 *   Rule 6  — AI is explicitly told NOT to invent prices.
 *   Rule 7  — AI is told that entry/SL/TP are pre-calculated facts.
 *   Rule 8  — AI is explicitly told NO_TRADE is a valid, required response.
 *   Rule 9  — AI is told this is decision-support only; no execution context.
 *   Rule 10 — AI is forbidden from claiming profitability or certainty.
 *   Rule 13 — AI is instructed to flag stale data in warnings[].
 *   Rule 15 — AI is told to clearly label interpretations vs facts.
 */

import type { AIContextPackage } from './types';

/** Current methodology version — increment when prompt strategy changes. */
export const METHODOLOGY_VERSION = '1.0';

// ─── System prompt ────────────────────────────────────────────────────────────

/**
 * Returns the system prompt that defines the AI's role and constraints.
 * This is sent as the "system" message in every AI call.
 */
export function buildSystemPrompt(hasScreenshot: boolean = false): string {
  const screenshotInstruction = hasScreenshot 
    ? `\n8. **Treat the screenshot strictly as supplementary evidence.** If your visual interpretation of the screenshot conflicts with the provided OHLCV structured data, you MUST clearly flag the conflict, you must NOT silently choose one, and you MUST prefer the structured market data for numerical values. You must never infer an exact price from the screenshot when reliable structured data is provided. Never claim that visual patterns seen in the screenshot guarantee profitability.` 
    : '';

  return `You are an AI trading analyst integrated into a personal market-analysis application.

## Your role
You interpret pre-calculated technical analysis evidence and produce a structured JSON analysis report.
You are a DECISION-SUPPORT tool. You do NOT execute trades, place orders, or connect to brokers.

## Critical constraints — you MUST follow these without exception

1. **Do NOT invent price levels.** All entry zones, stop-loss levels, and take-profit targets are pre-calculated by a deterministic engine and provided to you in the input. You must reference and explain them, NOT replace or modify them.

2. **Do NOT fabricate market data.** Never invent RSI values, MACD readings, price levels, or any numerical market data. Only interpret what is explicitly provided.

3. **NO_TRADE is a valid and important response.** If the evidence is insufficient, contradictory, ambiguous, or the setup does not meet the user's minimum risk/reward, you MUST return NO_TRADE. Do not force a directional call.

4. **Do NOT claim guaranteed profitability.** Never state or imply that a setup is guaranteed to win, that a score represents a probability of success, or that past patterns guarantee future results. A high setup score indicates setup quality, not certainty.

5. **Label your interpretations clearly.** Your explanation fields contain AI interpretation, not mathematical facts. The deterministic indicators (RSI values, MACD values, price levels) are facts calculated by the analysis engine. Your reasoning about what they mean is interpretation.

6. **Flag stale data.** If the input indicates dataIsStale is true, you must include a warning in warnings[] stating that the data may not reflect current market conditions and that no trade recommendation should be acted upon without verifying current prices.

7. **This is personal decision-support only.** Never reference execution, brokerage, order placement, or automated trading in your output.${screenshotInstruction}

## Output format
You must return a single valid JSON object matching exactly this schema:

{
  "decision": "LONG" | "SHORT" | "NO_TRADE",
  "market_bias": "string — e.g. bullish, bearish, neutral",
  "setup_score": number (0–100, heuristic quality score, NOT win probability),
  "confidence_score": number (0–100, AI confidence in interpretation, NOT win probability),
  "summary": "string — 1–2 sentence summary",
  "trade": {                          // Only include if decision is LONG or SHORT
    "entry_min": number,
    "entry_max": number,
    "stop_loss": number,
    "take_profit_1": number,
    "take_profit_2": number (optional),
    "risk_reward": number
  },
  "trigger_condition": "string (optional) — what specific price action confirms the entry",
  "invalidation_condition": "string — what would invalidate this setup",
  "evidence": [
    {
      "category": "string — e.g. trend, structure, momentum",
      "name": "string — short label",
      "direction": "bullish" | "bearish" | "neutral",
      "score": number (0–100),
      "finding": "string — what was observed",
      "explanation": "string — your interpretation of the finding"
    }
  ],
  "explanation": {
    "market_structure": "string",
    "trend": "string",
    "support_resistance": "string",
    "momentum": "string",
    "volume": "string",
    "volatility": "string",
    "entry": "string",
    "stop_loss": "string",
    "take_profit": "string",
    "risk_reward": "string",
    "why_this_trade": "string",
    "why_not_other_trade": "string"
  },
  "warnings": ["string", ...]
}

Rules for the trade object:
- For LONG: stop_loss < entry_min < entry_max < take_profit_1
- For SHORT: take_profit_1 < entry_min < entry_max < stop_loss
- If take_profit_2 is included: for LONG it must be > take_profit_1, for SHORT it must be < take_profit_1
- If decision is NO_TRADE, omit the trade object entirely

Return ONLY the JSON object. No markdown. No explanation outside the JSON.`;
}

// ─── User prompt ──────────────────────────────────────────────────────────────

/**
 * Formats the AIContextPackage into the user-turn prompt.
 * Uses a consistent, version-tracked template.
 */
export function buildUserPrompt(pkg: AIContextPackage): string {
  const lines: string[] = [];

  lines.push(`# Market Analysis Request`);
  lines.push(`Methodology Version: ${pkg.methodologyVersion}`);
  lines.push('');

  // ─── Instrument and timeframe
  lines.push(`## Instrument`);
  lines.push(`Symbol: ${pkg.instrument.symbol}`);
  lines.push(`Name: ${pkg.instrument.displayName}`);
  lines.push(`Market: ${pkg.instrument.marketType}`);
  lines.push(`Timeframe: ${pkg.timeframe}`);
  lines.push(`Current Price: ${pkg.currentPrice}`);
  lines.push('');

  // ─── Data quality (Rules 13 & 14)
  lines.push(`## Data Quality`);
  lines.push(`Data Timestamp: ${pkg.dataTimestamp}`);
  lines.push(`Data Age: ${pkg.dataAgeMinutes} minutes`);
  lines.push(`Is Stale: ${pkg.dataIsStale}`);
  if (pkg.dataIsStale) {
    lines.push(`⚠️ WARNING: This data is stale. Include a data staleness warning in your warnings[] array.`);
  }
  lines.push('');

  // ─── Trend (Phase 5)
  lines.push(`## Trend`);
  lines.push(`Direction: ${pkg.trend.direction}`);
  lines.push(`Strength: ${pkg.trend.strength}/100`);
  lines.push(`Basis: ${pkg.trend.basis.join('; ')}`);
  lines.push('');

  // ─── Market structure
  lines.push(`## Market Structure`);
  lines.push(`Recent Pattern: ${pkg.marketStructure.recentPattern}`);
  lines.push(`Break of Structure: ${pkg.marketStructure.breakOfStructure}`);
  lines.push(`Change of Character: ${pkg.marketStructure.changeOfCharacter}`);
  if (pkg.marketStructure.bosDirection) {
    lines.push(`BOS Direction: ${pkg.marketStructure.bosDirection}`);
  }
  lines.push('');

  // ─── Key levels
  lines.push(`## Key Price Levels (sorted by strength)`);
  for (const level of pkg.keyLevels) {
    lines.push(
      `- ${level.type.toUpperCase()} @ ${level.price} | strength: ${level.strength} | touches: ${level.touches} | zone: ${level.zone.min}–${level.zone.max}`
    );
  }
  lines.push('');

  // ─── Indicators (last-value facts — NOT to be re-calculated)
  lines.push(`## Technical Indicators (current bar values — pre-calculated facts)`);
  const ind = pkg.indicators;
  lines.push(`RSI: ${ind.rsi ?? 'unavailable'}`);
  if (ind.macd) {
    lines.push(`MACD: ${ind.macd.macd ?? 'n/a'} | Signal: ${ind.macd.signal ?? 'n/a'} | Histogram: ${ind.macd.histogram ?? 'n/a'}`);
  }
  lines.push(`SMA 20: ${ind.sma20 ?? 'unavailable'}`);
  lines.push(`SMA 50: ${ind.sma50 ?? 'unavailable'}`);
  lines.push(`SMA 200: ${ind.sma200 ?? 'unavailable'}`);
  lines.push(`EMA 9: ${ind.ema9 ?? 'unavailable'}`);
  lines.push(`EMA 20: ${ind.ema20 ?? 'unavailable'}`);
  lines.push(`EMA 50: ${ind.ema50 ?? 'unavailable'}`);
  if (ind.bollinger) {
    lines.push(`Bollinger Bands: Upper ${ind.bollinger.upper ?? 'n/a'} | Middle ${ind.bollinger.middle ?? 'n/a'} | Lower ${ind.bollinger.lower ?? 'n/a'}`);
  }
  lines.push(`ATR (14): ${ind.atr ?? 'unavailable'}`);
  if (ind.adx) {
    lines.push(`ADX: ${ind.adx.adx ?? 'n/a'} | +DI: ${ind.adx.plusDI ?? 'n/a'} | -DI: ${ind.adx.minusDI ?? 'n/a'}`);
  }
  lines.push(`VWAP: ${ind.vwap ?? 'unavailable'}`);
  if (ind.volumeNote) {
    lines.push(`Volume Note: ${ind.volumeNote}`);
  }
  lines.push('');

  // ─── Candlestick patterns
  if (pkg.candlestickPatterns.length > 0) {
    lines.push(`## Candlestick Patterns`);
    for (const p of pkg.candlestickPatterns) {
      lines.push(`- ${p.name} (${p.type}) | strength: ${p.strength}`);
    }
    lines.push('');
  }

  // ─── Chart patterns
  if (pkg.chartPatterns.length > 0) {
    lines.push(`## Chart Patterns`);
    for (const p of pkg.chartPatterns) {
      lines.push(`- ${p.name} | bias: ${p.bias} | confidence: ${p.confidence} | invalidation: ${p.invalidationLevel}`);
    }
    lines.push('');
  }

  // ─── Liquidity zones
  if (pkg.liquidityZones.length > 0) {
    lines.push(`## Liquidity Zones`);
    for (const z of pkg.liquidityZones) {
      lines.push(`- ${z.type} @ ${z.price} | zone: ${z.zone.min}–${z.zone.max}`);
    }
    lines.push('');
  }

  // ─── Setup evaluation (Phase 6)
  lines.push(`## Setup Evaluation (Phase 6 — deterministic)`);
  lines.push(`Direction: ${pkg.setupEvaluation.direction}`);
  lines.push(`Summary: ${pkg.setupEvaluation.summary}`);
  if (pkg.setupEvaluation.rejectionReasons && pkg.setupEvaluation.rejectionReasons.length > 0) {
    lines.push(`Rejection Reasons: ${pkg.setupEvaluation.rejectionReasons.join(', ')}`);
  }
  lines.push(`Supporting Evidence:`);
  for (const ev of pkg.setupEvaluation.supportingEvidence) {
    lines.push(`  - [${ev.direction}] ${ev.category}: ${ev.finding}`);
  }
  if (pkg.setupEvaluation.conflictingEvidence.length > 0) {
    lines.push(`Conflicting Evidence:`);
    for (const ev of pkg.setupEvaluation.conflictingEvidence) {
      lines.push(`  - [${ev.direction}] ${ev.category}: ${ev.finding}`);
    }
  }
  lines.push('');

  // ─── Trade levels (Phase 7 — pre-calculated facts, AI must NOT modify)
  lines.push(`## Trade Levels (Phase 7 — pre-calculated from market evidence)`);
  lines.push(`Direction: ${pkg.tradeLevels.direction}`);
  if (pkg.tradeLevels.entry) {
    lines.push(`Entry Zone: ${pkg.tradeLevels.entry.min} – ${pkg.tradeLevels.entry.max}`);
    lines.push(`Entry Basis: ${pkg.tradeLevels.entry.basis}`);
  }
  if (pkg.tradeLevels.stopLoss) {
    lines.push(`Stop Loss: ${pkg.tradeLevels.stopLoss.price} (method: ${pkg.tradeLevels.stopLoss.method})`);
    lines.push(`Stop Basis: ${pkg.tradeLevels.stopLoss.basis}`);
  }
  if (pkg.tradeLevels.takeProfit1) {
    lines.push(`TP1: ${pkg.tradeLevels.takeProfit1.price} (method: ${pkg.tradeLevels.takeProfit1.method})`);
    lines.push(`TP1 Basis: ${pkg.tradeLevels.takeProfit1.basis}`);
  }
  if (pkg.tradeLevels.takeProfit2) {
    lines.push(`TP2: ${pkg.tradeLevels.takeProfit2.price} (method: ${pkg.tradeLevels.takeProfit2.method})`);
    lines.push(`TP2 Basis: ${pkg.tradeLevels.takeProfit2.basis}`);
  }
  if (pkg.tradeLevels.riskReward !== undefined) {
    lines.push(`Risk/Reward: ${pkg.tradeLevels.riskReward.toFixed(2)}`);
  }
  lines.push(`Minimum RR Met: ${pkg.tradeLevels.minimumRRMet}`);
  if (pkg.tradeLevels.rejectionReason) {
    lines.push(`Rejection Reason: ${pkg.tradeLevels.rejectionReason}`);
  }
  if (pkg.tradeLevels.methodologyNotes.length > 0) {
    lines.push(`Methodology Notes: ${pkg.tradeLevels.methodologyNotes.join('; ')}`);
  }
  lines.push('');

  // ─── Setup score (Phase 8)
  lines.push(`## Setup Score (Phase 8 — heuristic quality score, NOT win probability)`);
  lines.push(`Total: ${pkg.setupScore.total ?? 'N/A (NO_TRADE)'}/100`);
  if (pkg.setupScore.breakdown) {
    const b = pkg.setupScore.breakdown;
    lines.push(`Breakdown:`);
    lines.push(`  Trend Alignment:       ${b.trendAlignment}/20`);
    lines.push(`  Market Structure:      ${b.marketStructure}/20`);
    lines.push(`  Entry Location:        ${b.entryLocation}/15`);
    lines.push(`  Momentum:              ${b.momentum}/10`);
    lines.push(`  Volume:                ${b.volume}/10`);
    lines.push(`  Risk/Reward:           ${b.riskReward}/15`);
    lines.push(`  Multi-Timeframe:       ${b.multiTimeframe}/10`);
  }
  if (pkg.setupScore.notes.length > 0) {
    lines.push(`Score Notes: ${pkg.setupScore.notes.join('; ')}`);
  }
  if (pkg.setupScore.noTradeReason) {
    lines.push(`No-Trade Reason: ${pkg.setupScore.noTradeReason}`);
  }
  lines.push('');

  // ─── Higher timeframe context (optional)
  if (pkg.higherTimeframeContext) {
    const htf = pkg.higherTimeframeContext;
    lines.push(`## Higher Timeframe Context (${htf.timeframe})`);
    lines.push(`HTF Trend: ${htf.trend.direction} (strength: ${htf.trend.strength})`);
    lines.push(`HTF Structure: ${htf.structure.recentPattern}`);
    lines.push('');
  }

  // ─── Screenshot analysis (Phase 10 placeholder)
  if (pkg.screenshotAnalysis) {
    lines.push(`## Screenshot Analysis (Visual Evidence)`);
    lines.push(pkg.screenshotAnalysis);
    lines.push('');
  }

  // ─── User preferences
  lines.push(`## User Preferences`);
  lines.push(`Risk Profile: ${pkg.userPreferences.riskProfile}`);
  lines.push(`Minimum R:R: ${pkg.userPreferences.minimumRR}`);
  lines.push(`Require Multi-TF Confirmation: ${pkg.userPreferences.requireMultiTimeframeConfirmation}`);
  lines.push('');

  lines.push(
    `Please produce your analysis as a single JSON object matching the schema defined in your system instructions. ` +
    `Remember: NO_TRADE is a valid and important response. Do not force a directional call if the evidence does not support it.`
  );

  return lines.join('\n');
}
