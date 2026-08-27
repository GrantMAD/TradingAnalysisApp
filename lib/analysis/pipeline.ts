/**
 * lib/analysis/pipeline.ts — Phase 9: AI Analysis Layer
 *
 * Orchestrates the full end-to-end analysis pipeline.
 * This is the single entry point that connects Phases 3–9 together.
 *
 * Pipeline steps:
 *   1.  Create analyses record (status: pending)
 *   2.  Update status to running
 *   3.  Fetch market data (Phase 3)
 *   4.  Validate data freshness (Rules 13/14)
 *   5.  Upsert candles to DB
 *   6.  Insert market_snapshots record
 *   7.  runTechnicalAnalysis() — Phase 5
 *   8.  evaluateSetup()        — Phase 6
 *   9.  calculateTradeLevels() — Phase 7
 *   10. calculateSetupScore()  — Phase 8
 *   11. Insert indicator_snapshots record
 *   12. buildAIContextPackage()
 *   13. Build prompts
 *   14. callAI() — server-side, API key never leaves server (Rule 1)
 *   15. Store raw AI response (Rule 12)
 *   16. validateAIResponse() (Rule 5)
 *   17. Persist validated result or mark failed
 *
 * PROJECT RULES:
 *   Rule 1  — AI_API_KEY is used only inside callAI(), which is server-side.
 *   Rule 3  — All DB writes go through the service client (RLS still applies).
 *   Rule 5  — AI output is validated before any DB write of results.
 *   Rule 6  — Prices come from Phase 3/7, never from the AI.
 *   Rule 8  — NO_TRADE is handled as a valid completed state.
 *   Rule 9  — No broker execution. This pipeline produces an analysis record only.
 *   Rule 12 — Raw AI response stored before validation.
 *   Rule 13 — Stale data aborts or warns.
 *   Rule 14 — Data timestamps recorded on market_snapshots.
 */

import { createAdminClient } from '../supabase/server';
import { createMarketDataProvider } from '../market-data/provider';
import {
  runTechnicalAnalysis,
  evaluateSetup,
  calculateTradeLevels,
  calculateSetupScore,
} from '../technical-analysis';
import type { Candle as TACandle } from '../technical-analysis/types';
import type { Candle as MDCandle } from '../market-data/types';
import { buildAIContextPackage, CRITICAL_STALENESS_THRESHOLD_MINUTES } from './context-builder';
import { buildSystemPrompt, buildUserPrompt, METHODOLOGY_VERSION } from './prompts';
import { callAI } from './ai-client';
import { validateAIResponse } from './validator';
import type { AnalysisPipelineParams, AnalysisPipelineResult, AIAnalysisResult } from './types';

/** Convert market-data Candle to TA-engine Candle (field rename: timestamp → time). */
function toTACandle(c: MDCandle): TACandle {
  return {
    time: c.timestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  };
}

/**
 * Runs the full analysis pipeline for one user/instrument/timeframe combination.
 *
 * Returns the analysisId so the caller can poll or retrieve the result.
 * All errors are caught internally — the analysis record is marked 'failed'
 * with an error_message rather than throwing to the HTTP layer.
 */
export async function runAnalysisPipeline(
  params: AnalysisPipelineParams,
): Promise<AnalysisPipelineResult> {
  const supabase = await createAdminClient();

  // ─── Step 1: Create pending analyses record ────────────────────────────────
  const { data: analysisRow, error: insertError } = await supabase
    .from('analyses')
    .insert({
      user_id: params.userId,
      instrument_id: params.instrumentId,
      timeframe: params.timeframe,
      status: 'pending',
      methodology_version: METHODOLOGY_VERSION,
    })
    .select('id')
    .single();

  if (insertError || !analysisRow) {
    return {
      analysisId: '',
      status: 'failed',
      error: `Failed to create analysis record: ${insertError?.message}`,
    };
  }

  const analysisId = analysisRow.id as string;

  // Helper: mark the analysis as failed and return early.
  const fail = async (errorMessage: string): Promise<AnalysisPipelineResult> => {
    await supabase
      .from('analyses')
      .update({ status: 'failed', error_message: errorMessage })
      .eq('id', analysisId);
    return { analysisId, status: 'failed', error: errorMessage };
  };

  // ─── Step 2: Mark as running ───────────────────────────────────────────────
  await supabase
    .from('analyses')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', analysisId);

  try {
    // ─── Step 3: Fetch market data ─────────────────────────────────────────
    const provider = createMarketDataProvider();
    const candleResponse = await provider.getCandles({
      symbol: params.symbol,
      timeframe: params.timeframe,
      limit: 300,
    });

    const mdCandles = candleResponse.data;
    const quality = candleResponse.quality;

    if (!mdCandles || mdCandles.length < 50) {
      return fail(`Insufficient candle data: only ${mdCandles?.length ?? 0} candles returned.`);
    }

    // ─── Step 4: Validate data freshness (Rules 13 & 14) ──────────────────
    const dataAgeMinutes = Math.floor(
      (Date.now() - new Date(quality.dataAsOf).getTime()) / 60_000,
    );

    if (dataAgeMinutes >= CRITICAL_STALENESS_THRESHOLD_MINUTES) {
      return fail(
        `Market data is critically stale (${dataAgeMinutes} minutes old). ` +
          `Analysis aborted to prevent acting on outdated information.`,
      );
    }

    // ─── Step 5: Upsert candles to DB ─────────────────────────────────────
    const candleRows = mdCandles.map((c) => ({
      instrument_id: params.instrumentId,
      timeframe: params.timeframe,
      candle_time: new Date(c.timestamp * 1000).toISOString(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume ?? null,
      provider: quality.provider,
    }));

    // Upsert — ignore conflicts (same candle from same provider already stored).
    await supabase.from('candles').upsert(candleRows, {
      onConflict: 'instrument_id,timeframe,candle_time,provider',
      ignoreDuplicates: true,
    });

    // ─── Step 6: Insert market_snapshots record ────────────────────────────
    const latestCandle = mdCandles[mdCandles.length - 1];
    await supabase.from('market_snapshots').insert({
      analysis_id: analysisId,
      provider: quality.provider,
      provider_symbol: params.symbol,
      captured_at: new Date().toISOString(),
      data_as_of: quality.dataAsOf,
      current_price: latestCandle.close,
      data_is_stale: quality.isStale || dataAgeMinutes >= 30,
      raw_metadata: { dataAgeMinutes, candleCount: mdCandles.length },
    });

    // ─── Step 7: Technical Analysis (Phase 5) ─────────────────────────────
    const taCandles = mdCandles.map(toTACandle);

    const taResult = await runTechnicalAnalysis({
      candles: taCandles,
      timeframe: params.timeframe,
      currentPrice: latestCandle.close,
      userSettings: {},
    });

    // ─── Step 8: Setup Detection (Phase 6) ────────────────────────────────
    const setupEvaluation = evaluateSetup(taResult);

    // ─── Step 9: Trade Levels (Phase 7) ───────────────────────────────────
    const tradeLevels = calculateTradeLevels(setupEvaluation, params.userPreferences.minimumRR);

    // ─── Step 10: Scoring (Phase 8) ───────────────────────────────────────
    const setupScore = calculateSetupScore(setupEvaluation, tradeLevels);

    // ─── Step 11: Insert indicator_snapshots record ────────────────────────
    const ind = taResult.indicators;
    const last = <T>(arr: (T | null)[]): T | null =>
      arr.length > 0 ? arr[arr.length - 1] : null;

    const lastMacd = last(ind.macd);
    const lastBollinger = last(ind.bollinger);
    const lastAdx = last(ind.adx);

    await supabase.from('indicator_snapshots').insert({
      analysis_id: analysisId,
      timeframe: params.timeframe,
      rsi: last(ind.rsi),
      macd: lastMacd?.macd ?? null,
      macd_signal: lastMacd?.signal ?? null,
      macd_histogram: lastMacd?.histogram ?? null,
      sma_20: last(ind.sma20),
      sma_50: last(ind.sma50),
      sma_200: last(ind.sma200),
      ema_9: last(ind.ema9),
      ema_20: last(ind.ema20),
      ema_50: last(ind.ema50),
      bollinger_upper: lastBollinger?.upper ?? null,
      bollinger_middle: lastBollinger?.middle ?? null,
      bollinger_lower: lastBollinger?.lower ?? null,
      atr: last(ind.atr),
      adx: lastAdx?.adx ?? null,
      volume: latestCandle.volume ?? null,
    });

    // ─── Step 12: Build AI context package ────────────────────────────────
    const { package: contextPkg, isCriticallyStale } = buildAIContextPackage({
      instrument: {
        symbol: params.symbol,
        displayName: params.displayName,
        marketType: params.marketType,
      },
      timeframe: params.timeframe,
      taResult,
      setupEvaluation,
      tradeLevels,
      setupScore,
      dataQuality: quality,
      userPreferences: params.userPreferences,
      methodologyVersion: METHODOLOGY_VERSION,
    });

    // Double-check critical staleness after context build
    if (isCriticallyStale) {
      return fail(`Data became critically stale during analysis. Aborting.`);
    }

    // ─── Step 13: Build prompts ────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(!!params.screenshotPath);
    const userPrompt = buildUserPrompt(contextPkg);

    // ─── Fetch Screenshot if provided ─────────────────────────────────────
    let screenshotData: { base64: string; mimeType: string } | undefined = undefined;
    if (params.screenshotPath) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('chart-screenshots')
        .download(params.screenshotPath);
        
      if (!downloadError && fileData) {
        const buffer = await fileData.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        screenshotData = {
          base64,
          mimeType: fileData.type || 'image/jpeg'
        };
      } else {
        console.warn(`Failed to download screenshot: ${downloadError?.message}`);
      }
    }

    // ─── Step 14: Call AI (Rule 1 — API key server-side only) ─────────────
    const { rawText, modelUsed } = await callAI(systemPrompt, userPrompt, screenshotData);

    // ─── Step 15: Store raw AI response (Rule 12 — audit trail) ───────────
    await supabase
      .from('analyses')
      .update({ raw_ai_response: rawText, ai_model: modelUsed })
      .eq('id', analysisId);

    // ─── Step 16: Validate AI response (Rule 5) ───────────────────────────
    const validation = validateAIResponse(rawText);

    if (!validation.success) {
      return fail(`AI response validation failed: ${validation.error}`);
    }

    const ai: AIAnalysisResult = validation.data;

    // ─── Step 17: Persist validated results ───────────────────────────────

    // 17a. Update the main analyses record
    await supabase
      .from('analyses')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        decision: ai.decision,
        market_bias: ai.market_bias,
        setup_score: ai.setup_score,
        confidence_score: ai.confidence_score,
        risk_reward: ai.trade?.risk_reward ?? null,
        summary: ai.summary,
        detailed_explanation: JSON.stringify(ai.explanation),
        invalidation_conditions: ai.invalidation_condition,
      })
      .eq('id', analysisId);

    // 17b. Insert trade_setups record (only for LONG / SHORT)
    if (ai.decision !== 'NO_TRADE' && ai.trade) {
      await supabase.from('trade_setups').insert({
        analysis_id: analysisId,
        decision: ai.decision,
        entry_min: ai.trade.entry_min,
        entry_max: ai.trade.entry_max,
        stop_loss: ai.trade.stop_loss,
        take_profit_1: ai.trade.take_profit_1,
        take_profit_2: ai.trade.take_profit_2 ?? null,
        risk_reward: ai.trade.risk_reward,
        setup_score: ai.setup_score,
        confidence_score: ai.confidence_score,
        trigger_condition: ai.trigger_condition ?? null,
        invalidation_condition: ai.invalidation_condition,
      });
    }

    // 17c. Insert analysis_evidence records
    if (ai.evidence.length > 0) {
      const evidenceRows = ai.evidence.map((ev) => ({
        analysis_id: analysisId,
        category: ev.category,
        name: ev.name,
        direction: ev.direction,
        score: ev.score,
        finding: ev.finding,
        explanation: ev.explanation,
        supporting_data: {},
      }));
      await supabase.from('analysis_evidence').insert(evidenceRows);
    }

    return { analysisId, status: 'completed' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(`Unexpected pipeline error: ${message}`);
  }
}
