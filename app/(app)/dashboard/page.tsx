import { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { TrendingUp, TrendingDown, Minus, BarChart2, Clock, ArrowRight, Activity, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your AI Trading Analyst overview — recent analyses, watchlist, and quick stats.',
};

type Decision = 'LONG' | 'SHORT' | 'NO_TRADE';

function DecisionPill({ decision }: { decision: Decision }) {
  const map: Record<Decision, { label: string; classes: string; Icon: React.ElementType }> = {
    LONG:     { label: 'LONG',     classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', Icon: TrendingUp  },
    SHORT:    { label: 'SHORT',    classes: 'bg-red-500/15 text-red-400 border-red-500/25',             Icon: TrendingDown },
    NO_TRADE: { label: 'NO TRADE', classes: 'bg-amber-500/15 text-amber-400 border-amber-500/25',       Icon: Minus       },
  };
  const cfg = map[decision] ?? map.NO_TRADE;
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${cfg.classes}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // ── Profile ──────────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user?.id ?? '')
    .single();

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Trader';

  // ── Recent analyses ───────────────────────────────────────────────────────
  const { data: recentAnalyses } = await supabase
    .from('analyses')
    .select(`
      id,
      timeframe,
      decision,
      setup_score,
      created_at,
      instrument:instruments(symbol, display_name, market_type)
    `)
    .eq('user_id', user?.id ?? '')
    .in('status', ['completed'])
    .order('created_at', { ascending: false })
    .limit(5);

  // ── Quick stats ───────────────────────────────────────────────────────────
  const { count: totalCount } = await supabase
    .from('analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user?.id ?? '');

  // ── Watchlist ─────────────────────────────────────────────────────────────
  const { data: watchlistItems } = await supabase
    .from('watchlist_items')
    .select(`
      id,
      instrument:instruments(symbol, display_name, market_type)
    `)
    .in(
      'watchlist_id',
      (
        await supabase
          .from('watchlists')
          .select('id')
          .eq('user_id', user?.id ?? '')
      ).data?.map((w) => w.id) ?? [],
    )
    .limit(10);

  const lastAnalysis = recentAnalyses?.[0];
  const lastInstrument = lastAnalysis?.instrument as unknown as { symbol: string; display_name: string; market_type: string } | null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Welcome header ─────────────────────────────────────────────────── */}
      <div className="glass-strong rounded-2xl p-6 border border-primary/15 bg-primary/3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground font-medium">Welcome back,</p>
            <h1 className="text-2xl font-bold tracking-tight mt-0.5">{displayName}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <Link href="/analyze">
            <Button id="new-analysis-cta-btn" size="lg" className="gap-2 shadow-[0_0_20px_rgba(0,212,255,0.2)] hover:shadow-[0_0_28px_rgba(0,212,255,0.3)] transition-all">
              <Zap className="w-4 h-4" />
              Run New Analysis
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Quick stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Analyses</p>
            <p className="text-2xl font-bold tabular-nums">{totalCount ?? 0}</p>
          </div>
        </div>

        <div className="glass rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last Instrument</p>
            <p className="text-lg font-bold">{lastInstrument?.symbol ?? '—'}</p>
          </div>
        </div>

        <div className="glass rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last Analysis</p>
            <p className="text-lg font-bold">
              {lastAnalysis ? timeAgo(lastAnalysis.created_at) : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── Recent analyses ───────────────────────────────────────────────── */}
        <div className="md:col-span-2 glass rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <h2 className="font-semibold">Recent Analyses</h2>
            <Link href="/history" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              View all →
            </Link>
          </div>

          {!recentAnalyses || recentAnalyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <Activity className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No analyses yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Run your first analysis from the Analyze page.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {recentAnalyses.map((a) => {
                const inst = a.instrument as unknown as { symbol: string; display_name: string } | null;
                return (
                  <Link
                    key={a.id}
                    id={`recent-analysis-${a.id}`}
                    href={`/analyze?symbol=${inst?.symbol ?? ''}&timeframe=${a.timeframe}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/30 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{inst?.symbol ?? '—'}</span>
                        <span className="text-xs text-muted-foreground uppercase">{a.timeframe}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(a.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {a.decision && <DecisionPill decision={a.decision as Decision} />}
                      {a.setup_score != null && (
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {Math.round(a.setup_score)}/100
                        </span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Watchlist ─────────────────────────────────────────────────────── */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <h2 className="font-semibold">Watchlist</h2>
          </div>

          {!watchlistItems || watchlistItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <p className="text-xs text-muted-foreground">No watchlist items yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {watchlistItems.map((item) => {
                const inst = item.instrument as unknown as { symbol: string; display_name: string; market_type: string } | null;
                return (
                  <Link
                    key={item.id}
                    id={`watchlist-item-${item.id}`}
                    href={`/analyze?symbol=${inst?.symbol ?? ''}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-accent/30 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-semibold">{inst?.symbol ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{inst?.display_name ?? ''}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
