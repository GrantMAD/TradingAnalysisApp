import { Metadata } from "next";
import { createClient } from '../../../../lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { AnalysisPanel } from '../../../../components/analysis/AnalysisPanel';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { SupabaseClient } from '@supabase/supabase-js';
import { normalizeHistoryInstrument } from '../../../../components/history/types';

export const metadata: Metadata = {
  title: "Compare Analyses - AI Trading Analyst",
};

async function getAnalysisData(supabase: SupabaseClient, id: string, userId: string) {
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

  if (fetchError || !analysis || analysis.user_id !== userId) {
    return null;
  }

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

  return {
    analysis,
    tradeSetup: tradeSetup || null,
    evidence: evidence || [],
    marketSnapshot: marketSnapshot || null,
    screenshotPreviewUrl
  };
}

export default async function HistoryComparePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const id1 = params.id1 as string;
  const id2 = params.id2 as string;

  if (!id1 || !id2) {
    redirect('/history');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [data1, data2] = await Promise.all([
    getAnalysisData(supabase, id1, user.id),
    getAnalysisData(supabase, id2, user.id)
  ]);

  if (!data1 || !data2) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-[1600px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/history">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Compare Analyses</h1>
            <p className="text-muted-foreground text-sm">
              Side-by-side comparison
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
        {/* Left Side */}
        <div className="space-y-4">
          <div className="sticky top-0 z-10 glass p-3 rounded-lg border border-border/50 text-center font-medium bg-background/95 backdrop-blur">
            <div className="text-sm text-muted-foreground">Analysis 1</div>
            <div className="text-lg">{normalizeHistoryInstrument(data1.analysis.instrument)?.symbol} • {data1.analysis.timeframe.toUpperCase()}</div>
          </div>
          <AnalysisPanel 
            analysis={data1.analysis} 
            tradeSetup={data1.tradeSetup} 
            evidence={data1.evidence} 
            marketSnapshot={data1.marketSnapshot}
            screenshotPreviewUrl={data1.screenshotPreviewUrl} 
          />
        </div>

        {/* Right Side */}
        <div className="space-y-4">
          <div className="sticky top-0 z-10 glass p-3 rounded-lg border border-border/50 text-center font-medium bg-background/95 backdrop-blur">
            <div className="text-sm text-muted-foreground">Analysis 2</div>
            <div className="text-lg">{normalizeHistoryInstrument(data2.analysis.instrument)?.symbol} • {data2.analysis.timeframe.toUpperCase()}</div>
          </div>
          <AnalysisPanel 
            analysis={data2.analysis} 
            tradeSetup={data2.tradeSetup} 
            evidence={data2.evidence} 
            marketSnapshot={data2.marketSnapshot}
            screenshotPreviewUrl={data2.screenshotPreviewUrl} 
          />
        </div>
      </div>
    </div>
  );
}
