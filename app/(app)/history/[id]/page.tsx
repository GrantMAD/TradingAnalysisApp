import { Metadata } from "next";
import { createClient } from '../../../../lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { AnalysisPanel } from '../../../../components/analysis/AnalysisPanel';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { normalizeHistoryInstrument } from '../../../../components/history/types';

export const metadata: Metadata = {
  title: "Analysis Details - AI Trading Analyst",
};

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch analysis
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
      screenshot_path,
      ai_model,
      methodology_version,
      requested_at,
      started_at,
      completed_at,
      error_message,
      created_at,
      instrument:instruments(symbol, display_name)
    `)
    .eq('id', id)
    .single();

  if (fetchError || !analysis || analysis.user_id !== user.id) {
    notFound();
  }

  // Fetch related data concurrently
  const [
    { data: tradeSetup },
    { data: evidence },
    { data: marketSnapshot }
  ] = await Promise.all([
    supabase.from('trade_setups').select('*').eq('analysis_id', id).maybeSingle(),
    supabase.from('analysis_evidence').select('*').eq('analysis_id', id).order('score', { ascending: false }),
    supabase.from('market_snapshots').select('*').eq('analysis_id', id).maybeSingle()
  ]);

  let screenshotPreviewUrl: string | null = null;
  if (analysis.screenshot_path) {
    const { data } = await supabase.storage
      .from('chart-screenshots')
      .createSignedUrl(analysis.screenshot_path, 3600);
    screenshotPreviewUrl = data?.signedUrl || null;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/history">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analysis Details</h1>
            <p className="text-muted-foreground text-sm flex gap-2 items-center">
              <span>{normalizeHistoryInstrument(analysis.instrument)?.symbol}</span>
              <span>•</span>
              <span className="uppercase">{analysis.timeframe}</span>
            </p>
          </div>
        </div>
      </div>
      
      <div className="pt-2">
        <AnalysisPanel 
          analysis={analysis} 
          tradeSetup={tradeSetup || null} 
          evidence={evidence || []} 
          marketSnapshot={marketSnapshot || null}
          screenshotPreviewUrl={screenshotPreviewUrl} 
        />
      </div>
    </div>
  );
}
