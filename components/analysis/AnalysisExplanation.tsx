'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';

interface ExplanationData {
  market_structure?: string;
  trend?: string;
  support_resistance?: string;
  momentum?: string;
  volume?: string;
  volatility?: string;
  entry?: string;
  stop_loss?: string;
  take_profit?: string;
  risk_reward?: string;
  why_this_trade?: string;
  why_not_other_trade?: string;
}

interface AnalysisExplanationProps {
  explanation: ExplanationData | null;
  invalidationConditions: string | null;
  warnings: string[];
}

const SECTIONS: { key: keyof ExplanationData; label: string }[] = [
  { key: 'market_structure', label: 'Market Structure' },
  { key: 'trend', label: 'Trend' },
  { key: 'support_resistance', label: 'Support & Resistance' },
  { key: 'momentum', label: 'Momentum' },
  { key: 'volume', label: 'Volume' },
  { key: 'volatility', label: 'Volatility' },
  { key: 'entry', label: 'Entry Reasoning' },
  { key: 'stop_loss', label: 'Stop Reasoning' },
  { key: 'take_profit', label: 'Target Reasoning' },
  { key: 'risk_reward', label: 'Risk / Reward' },
  { key: 'why_this_trade', label: 'Why This Trade?' },
  { key: 'why_not_other_trade', label: 'Why Not the Other Direction?' },
];

function Section({
  label,
  content,
  defaultOpen = false,
}: {
  label: string;
  content: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border/40 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/40 transition-colors"
      >
        <span className="text-sm font-semibold">{label}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1">
          <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
        </div>
      )}
    </div>
  );
}

export function AnalysisExplanation({
  explanation,
  invalidationConditions,
  warnings,
}: AnalysisExplanationProps) {
  let parsed: ExplanationData | null = null;

  if (explanation) {
    if (typeof explanation === 'string') {
      try { parsed = JSON.parse(explanation); } catch { parsed = null; }
    } else {
      parsed = explanation;
    }
  }

  const hasWarnings = warnings.length > 0;

  return (
    <div className="space-y-2">
      {/* Warnings — always expanded if present */}
      {hasWarnings && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4" />
            Warnings
          </div>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-300/80 flex items-start gap-2">
                <span className="mt-0.5">•</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Invalidation */}
      {invalidationConditions && (
        <Section label="Invalidation Conditions" content={invalidationConditions} defaultOpen />
      )}

      {/* Explanation sections */}
      {parsed &&
        SECTIONS.map(({ key, label }) => {
          const content = parsed![key];
          if (!content) return null;
          return <Section key={key} label={label} content={content} />;
        })}
    </div>
  );
}
