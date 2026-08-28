import { Metadata } from "next";
import { createClient } from '../../../lib/supabase/server';
import { HistoryList } from '../../../components/history/HistoryList';
import { HistoryFilters } from '../../../components/history/HistoryFilters';
import { redirect } from 'next/navigation';
import { normalizeHistoryInstrument, type HistoryAnalysis } from '../../../components/history/types';

export const metadata: Metadata = {
  title: "History - AI Trading Analyst",
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Await searchParams before accessing properties
  const params = await searchParams;

  // Pagination
  const pageStr = params.page as string;
  const page = pageStr ? parseInt(pageStr, 10) : 1;
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('analyses')
    .select(`
      id,
      timeframe,
      status,
      decision,
      setup_score,
      confidence_score,
      created_at,
      instrument:instruments(symbol, display_name)
    `, { count: 'exact' })
    .eq('user_id', user.id);

  // Filters
  if (params.decision && params.decision !== 'ALL') {
    query = query.eq('decision', params.decision as string);
  }
  if (params.timeframe && params.timeframe !== 'ALL') {
    query = query.eq('timeframe', params.timeframe as string);
  }

  // Sort
  if (params.sort === 'oldest') {
    query = query.order('created_at', { ascending: true });
  } else if (params.sort === 'score_high') {
    query = query.order('setup_score', { ascending: false });
  } else if (params.sort === 'score_low') {
    query = query.order('setup_score', { ascending: true });
  } else {
    // Default newest
    query = query.order('created_at', { ascending: false });
  }

  const { data: analyses, count, error } = await query.range(from, to);

  if (error) {
    console.error('Error fetching history:', error);
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent">Analysis History</h1>
          <p className="text-muted-foreground mt-1">Review, filter, and compare past trade setups.</p>
        </div>
      </div>
      
      <div className="glass p-6 rounded-2xl border border-border/50 shadow-sm relative overflow-hidden">
        {/* Subtle decorative gradient background for the panel */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <HistoryFilters />
      </div>
      
      <HistoryList
        initialAnalyses={((analyses ?? []).map((analysis) => ({
          ...analysis,
          instrument: normalizeHistoryInstrument(analysis.instrument),
        })) as unknown) as HistoryAnalysis[]}
        totalCount={count || 0}
        currentPage={page}
      />
    </div>
  );
}
