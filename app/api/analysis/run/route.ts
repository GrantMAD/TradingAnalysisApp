/**
 * app/api/analysis/run/route.ts — Phase 9: AI Analysis Layer
 *
 * POST /api/analysis/run
 *
 * Triggers the full analysis pipeline for a given instrument and timeframe.
 * Returns { analysisId } immediately. The result can then be retrieved via
 * GET /api/analysis/[id].
 *
 * PROJECT RULES:
 *   Rule 1  — AI_API_KEY is never exposed. The pipeline handles it server-side.
 *   Rule 2  — Only publishable Supabase key is used for auth; admin key used
 *             inside the pipeline for DB writes.
 *   Rule 3  — Auth check before any DB access.
 *   Rule 9  — This endpoint produces an analysis record only. No execution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { runAnalysisPipeline } from '../../../../lib/analysis/pipeline';
import { DEFAULT_USER_SETTINGS, parseUserSettings } from '../../../../lib/user-settings';
import { z } from 'zod';

const VALID_TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;
const VALID_RISK_PROFILES = ['conservative', 'balanced', 'aggressive'] as const;

const RunAnalysisBodySchema = z.object({
  instrumentId: z.string().uuid('instrumentId must be a valid UUID'),
  symbol: z.string().min(1, 'symbol is required'),
  displayName: z.string().min(1, 'displayName is required'),
  marketType: z.enum(['crypto', 'forex']),
  timeframe: z.enum(VALID_TIMEFRAMES),
  screenshotPath: z.string().optional(),
  userPreferences: z
    .object({
      riskProfile: z.enum(VALID_RISK_PROFILES).default('balanced'),
      minimumRR: z.number().positive().default(2.0),
      requireMultiTimeframeConfirmation: z.boolean().default(true),
      enabledComponents: z.array(z.string()).default([]),
    })
    .default({
      riskProfile: 'balanced',
      minimumRR: 2.0,
      requireMultiTimeframeConfirmation: true,
      enabledComponents: [],
    }),
});

export async function POST(request: NextRequest) {
  // ─── Auth check ───────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ─── Parse and validate request body ─────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const parsed = RunAnalysisBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request parameters', details: parsed.error.format() },
      { status: 400 },
    );
  }

  const { instrumentId, symbol, displayName, marketType, timeframe, screenshotPath } =
    parsed.data;

  const { data: savedSettings, error: settingsError } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (settingsError) {
    return NextResponse.json({ error: 'Could not load your analysis settings.' }, { status: 500 });
  }

  const settings = parseUserSettings(savedSettings) ?? DEFAULT_USER_SETTINGS;

  if (screenshotPath && !settings.screenshot_analysis_enabled) {
    return NextResponse.json(
      { error: 'Screenshot analysis is disabled in your settings.' },
      { status: 400 },
    );
  }

  const userPreferences = {
    riskProfile: settings.risk_profile,
    minimumRR: settings.minimum_risk_reward,
    requireMultiTimeframeConfirmation: settings.require_multi_timeframe_confirmation,
    enabledComponents: [
      settings.enable_market_structure && 'market_structure',
      settings.enable_support_resistance && 'support_resistance',
      settings.enable_momentum && 'momentum',
      settings.enable_volume && 'volume',
      settings.enable_price_action && 'price_action',
      settings.enable_chart_patterns && 'chart_patterns',
      settings.enable_liquidity_analysis && 'liquidity',
      settings.enable_fibonacci && 'fibonacci',
    ].filter((component): component is string => Boolean(component)),
  };

  // ─── Run pipeline ─────────────────────────────────────────────────────────
  const result = await runAnalysisPipeline({
    userId: user.id,
    instrumentId,
    symbol,
    displayName,
    marketType,
    timeframe,
    userPreferences,
    screenshotPath,
  });

  if (result.status === 'failed') {
    // Return the analysisId even on failure — the client can poll to see the
    // error_message stored on the record. Status 422 indicates the pipeline
    // ran but could not produce a valid result (e.g. stale data, AI failure).
    return NextResponse.json(
      { analysisId: result.analysisId || null, error: result.error },
      { status: 422 },
    );
  }

  return NextResponse.json({ analysisId: result.analysisId }, { status: 200 });
}
