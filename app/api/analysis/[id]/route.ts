/**
 * app/api/analysis/[id]/route.ts — Phase 9: AI Analysis Layer
 *
 * GET /api/analysis/[id]
 *
 * Retrieves a completed (or failed/running/pending) analysis record by ID,
 * including its associated trade_setups and analysis_evidence rows.
 *
 * PROJECT RULES:
 *   Rule 2  — Uses publishable Supabase key. RLS enforces ownership.
 *   Rule 3  — RLS ensures users can only access their own analyses.
 *   Rule 4  — User ownership verified both by RLS and explicit check.
 *   Rule 9  — Read-only endpoint. No execution. No broker data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ─── Auth check ───────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: analysisId } = await params;

  if (!analysisId) {
    return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 });
  }

  // ─── Fetch analysis record ─────────────────────────────────────────────────
  // RLS on the analyses table enforces user_id = auth.uid().
  // We also verify the user_id explicitly as a defence-in-depth measure (Rule 4).
  const { data: analysis, error: fetchError } = await supabase
    .from('analyses')
    .select(`
      id,
      user_id,
      instrument_id,
      timeframe,
      status,
      decision,
      market_bias,
      setup_score,
      confidence_score,
      risk_reward,
      summary,
      detailed_explanation,
      invalidation_conditions,
      ai_model,
      methodology_version,
      requested_at,
      started_at,
      completed_at,
      error_message,
      created_at
    `)
    .eq('id', analysisId)
    .single();

  if (fetchError || !analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  // Defence-in-depth ownership check (Rule 4)
  if (analysis.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ─── Fetch related trade setup ─────────────────────────────────────────────
  const { data: tradeSetup } = await supabase
    .from('trade_setups')
    .select('*')
    .eq('analysis_id', analysisId)
    .maybeSingle();

  // ─── Fetch evidence items ──────────────────────────────────────────────────
  const { data: evidence } = await supabase
    .from('analysis_evidence')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('score', { ascending: false });

  // ─── Fetch market snapshot ─────────────────────────────────────────────────
  const { data: marketSnapshot } = await supabase
    .from('market_snapshots')
    .select('*')
    .eq('analysis_id', analysisId)
    .maybeSingle();

  return NextResponse.json({
    analysis,
    tradeSetup: tradeSetup ?? null,
    evidence: evidence ?? [],
    marketSnapshot: marketSnapshot ?? null,
  });
}
