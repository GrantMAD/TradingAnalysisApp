'use client';

import { Minus, Calculator } from 'lucide-react';

interface TradeSetup {
  decision: 'LONG' | 'SHORT' | 'NO_TRADE';
  entry_min: number | null;
  entry_max: number | null;
  stop_loss: number | null;
  take_profit_1: number | null;
  take_profit_2: number | null;
  risk_reward: number | null;
}

interface TradeSetupSummaryProps {
  tradeSetup: TradeSetup | null;
  decision: 'LONG' | 'SHORT' | 'NO_TRADE';
  userMinimumRR?: number;
}

function fmt(n: number | null, decimals = 2): string {
  if (n == null) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function TradeSetupSummary({ tradeSetup, decision, userMinimumRR = 2.0 }: TradeSetupSummaryProps) {
  if (decision === 'NO_TRADE' || !tradeSetup) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 flex flex-col items-center justify-center text-center gap-2 min-h-[140px]">
        <Minus className="w-8 h-8 text-amber-400/60" />
        <p className="font-semibold text-amber-400">No Trade Setup</p>
        <p className="text-xs text-muted-foreground max-w-[240px]">
          The evidence is insufficient or contradictory to identify a valid trade. This is an important result.
        </p>
      </div>
    );
  }

  const { entry_min, entry_max, stop_loss, take_profit_1, take_profit_2, risk_reward } = tradeSetup;
  const rrMet = risk_reward != null && risk_reward >= userMinimumRR;

  const rows: { label: string; value: string; highlight?: string }[] = [
    {
      label: 'Entry Zone',
      value: `${fmt(entry_min)} – ${fmt(entry_max)}`,
      highlight: 'text-primary',
    },
    {
      label: 'Stop Loss',
      value: fmt(stop_loss),
      highlight: 'text-red-400',
    },
    {
      label: 'Take Profit 1',
      value: fmt(take_profit_1),
      highlight: 'text-emerald-400',
    },
  ];

  if (take_profit_2 != null) {
    rows.push({
      label: 'Take Profit 2',
      value: fmt(take_profit_2),
      highlight: 'text-emerald-300',
    });
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-card/60">
        <Calculator className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pre-calculated Trade Levels
        </span>
        <span className="ml-auto text-xs text-muted-foreground/50 italic">deterministic engine</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/40">
        {rows.map(({ label, value, highlight }) => (
          <div key={label} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className={`text-sm font-mono font-semibold tabular-nums ${highlight ?? ''}`}>{value}</span>
          </div>
        ))}

        {/* R:R */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">Risk / Reward</span>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-mono font-semibold tabular-nums ${
                rrMet ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              1 : {fmt(risk_reward)}
            </span>
            {risk_reward != null && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  rrMet
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-amber-500/15 text-amber-400'
                }`}
              >
                {rrMet ? '✓ Met' : 'Below min'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
