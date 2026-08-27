'use client';

import { TrendingUp, TrendingDown, Minus, FlaskConical, Sparkles } from 'lucide-react';

interface EvidenceItem {
  category: string;
  name: string;
  direction: string;
  score: number | null;
  finding: string;
  explanation: string | null;
}

interface EvidenceCardProps {
  item: EvidenceItem;
}

const directionConfig = {
  bullish: {
    icon: <TrendingUp className="w-4 h-4" />,
    classes: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    label: 'Bullish',
  },
  bearish: {
    icon: <TrendingDown className="w-4 h-4" />,
    classes: 'text-red-400 bg-red-500/10 border-red-500/20',
    label: 'Bearish',
  },
  neutral: {
    icon: <Minus className="w-4 h-4" />,
    classes: 'text-muted-foreground bg-muted/40 border-border/40',
    label: 'Neutral',
  },
};

export function EvidenceCard({ item }: EvidenceCardProps) {
  const dir = directionConfig[item.direction as keyof typeof directionConfig] ?? directionConfig.neutral;
  const score = item.score != null ? Math.round(item.score) : null;

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden transition-all hover:border-border">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-card/60">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${dir.classes}`}>
          {dir.icon}
          {dir.label}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">{item.category}</span>
          <p className="text-sm font-semibold truncate leading-tight">{item.name}</p>
        </div>
        {score != null && (
          <div className="shrink-0 text-right">
            <span className="text-lg font-bold tabular-nums">{score}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        )}
      </div>

      {/* Finding — deterministic fact */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start gap-2">
          <FlaskConical className="w-3.5 h-3.5 text-primary/70 mt-0.5 shrink-0" />
          <div>
            <span className="text-xs font-semibold text-primary/70 uppercase tracking-wide">Finding</span>
            <p className="text-sm text-foreground mt-0.5">{item.finding}</p>
          </div>
        </div>
      </div>

      {/* AI Explanation — clearly labelled as interpretation (Rule 15) */}
      {item.explanation && (
        <div className="px-4 pb-3">
          <div className="flex items-start gap-2 bg-primary/5 rounded-lg p-2.5 border border-primary/10">
            <Sparkles className="w-3.5 h-3.5 text-primary/50 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-primary/50 uppercase tracking-wide">AI Interpretation</span>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.explanation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
