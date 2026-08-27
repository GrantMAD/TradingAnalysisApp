'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Decision = 'LONG' | 'SHORT' | 'NO_TRADE';

interface DecisionBadgeProps {
  decision: Decision;
  setupScore?: number | null;
  confidenceScore?: number | null;
}

const CONFIG: Record<Decision, { label: string; icon: React.ReactNode; classes: string; glow: string }> = {
  LONG: {
    label: 'LONG',
    icon: <TrendingUp className="w-5 h-5" />,
    classes: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
    glow: 'shadow-[0_0_24px_rgba(52,211,153,0.2)]',
  },
  SHORT: {
    label: 'SHORT',
    icon: <TrendingDown className="w-5 h-5" />,
    classes: 'bg-red-500/15 border-red-500/40 text-red-400',
    glow: 'shadow-[0_0_24px_rgba(248,113,113,0.2)]',
  },
  NO_TRADE: {
    label: 'NO TRADE',
    icon: <Minus className="w-5 h-5" />,
    classes: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
    glow: 'shadow-[0_0_24px_rgba(251,191,36,0.2)]',
  },
};

export function DecisionBadge({ decision, setupScore, confidenceScore }: DecisionBadgeProps) {
  const cfg = CONFIG[decision];

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border font-bold text-lg tracking-wider ${cfg.classes} ${cfg.glow}`}
      >
        {cfg.icon}
        {cfg.label}
      </div>

      {(setupScore != null || confidenceScore != null) && (
        <div className="flex gap-4 text-sm">
          {setupScore != null && (
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Setup Score</span>
              <span className="font-semibold tabular-nums">{setupScore.toFixed(0)}<span className="text-muted-foreground text-xs">/100</span></span>
            </div>
          )}
          {confidenceScore != null && (
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Confidence</span>
              <span className="font-semibold tabular-nums">{confidenceScore.toFixed(0)}<span className="text-muted-foreground text-xs">/100</span></span>
            </div>
          )}
        </div>
      )}

      {/* Rule 10 — no claims of guaranteed profitability */}
      <p className="text-xs text-muted-foreground/70 italic">
        Scores reflect setup quality only — not probability of profit.
      </p>
    </div>
  );
}
