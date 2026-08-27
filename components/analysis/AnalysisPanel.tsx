'use client';

import { AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { DataFreshnessBar } from './DataFreshnessBar';
import { DecisionBadge } from './DecisionBadge';
import { ScoreBars } from './ScoreBars';
import { TradeSetupSummary } from './TradeSetupSummary';
import { EvidenceCard } from './EvidenceCard';
import { AnalysisExplanation } from './AnalysisExplanation';

interface TradeSetup {
  decision: 'LONG' | 'SHORT' | 'NO_TRADE';
  entry_min: number | null;
  entry_max: number | null;
  stop_loss: number | null;
  take_profit_1: number | null;
  take_profit_2: number | null;
  risk_reward: number | null;
}

interface EvidenceItem {
  category: string;
  name: string;
  direction: string;
  score: number | null;
  finding: string;
  explanation: string | null;
}

interface MarketSnapshot {
  data_as_of: string | null;
  data_is_stale: boolean;
}

interface Analysis {
  decision: 'LONG' | 'SHORT' | 'NO_TRADE';
  market_bias: string | null;
  setup_score: number | null;
  confidence_score: number | null;
  summary: string | null;
  detailed_explanation: string | null;
  invalidation_conditions: string | null;
  screenshot_path: string | null;
}

interface AnalysisPanelProps {
  analysis: Analysis;
  tradeSetup: TradeSetup | null;
  evidence: EvidenceItem[];
  marketSnapshot: MarketSnapshot | null;
  screenshotPreviewUrl?: string | null;
  userMinimumRR?: number;
}

function parseWarnings(detailedExplanation: string | null): { explanation: object | null; warnings: string[] } {
  if (!detailedExplanation) return { explanation: null, warnings: [] };
  try {
    const parsed = JSON.parse(detailedExplanation);
    if (typeof parsed === 'object' && parsed !== null) {
      const { warnings, ...rest } = parsed as Record<string, unknown>;
      return {
        explanation: rest,
        warnings: Array.isArray(warnings) ? (warnings as string[]) : [],
      };
    }
  } catch { /* not JSON, treat as plain text */ }
  return { explanation: null, warnings: [] };
}

export function AnalysisPanel({
  analysis,
  tradeSetup,
  evidence,
  marketSnapshot,
  screenshotPreviewUrl,
  userMinimumRR = 2.0,
}: AnalysisPanelProps) {
  const { explanation, warnings } = parseWarnings(analysis.detailed_explanation);

  return (
    <div className="space-y-6">
      {/* Stale data banner — Rule 13/14 */}
      {marketSnapshot?.data_is_stale && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm text-amber-300">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
          <span>
            <strong>Stale Data Warning:</strong> The market data used for this analysis may not reflect current conditions. Do not act on this analysis without verifying current prices.
          </span>
        </div>
      )}

      {/* Data freshness bar — Rule 14 */}
      {marketSnapshot && (
        <DataFreshnessBar
          dataAsOf={marketSnapshot.data_as_of}
          isStale={marketSnapshot.data_is_stale}
        />
      )}

      {/* Summary text */}
      {analysis.summary && (
        <div className="glass rounded-xl px-4 py-3">
          <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
        </div>
      )}

      {/* Decision + market bias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <DecisionBadge
          decision={analysis.decision}
          setupScore={analysis.setup_score}
          confidenceScore={analysis.confidence_score}
        />
        {analysis.market_bias && (
          <div className="glass rounded-xl px-4 py-3 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Market Bias</span>
            <span className="text-lg font-semibold capitalize">{analysis.market_bias}</span>
          </div>
        )}
      </div>

      {/* Scores */}
      {(analysis.setup_score != null || analysis.confidence_score != null) && (
        <div className="glass rounded-xl p-4">
          <ScoreBars
            setupScore={analysis.setup_score}
            confidenceScore={analysis.confidence_score}
          />
        </div>
      )}

      {/* Trade levels */}
      <TradeSetupSummary
        tradeSetup={tradeSetup}
        decision={analysis.decision}
        userMinimumRR={userMinimumRR}
      />

      {/* Screenshot preview — Rule 10 compliant (just a visual) */}
      {screenshotPreviewUrl && (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-card/60 text-xs text-muted-foreground">
            <ImageIcon className="w-3.5 h-3.5" />
            Uploaded Chart Screenshot (supplementary visual evidence)
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={screenshotPreviewUrl}
            alt="Uploaded chart screenshot"
            className="w-full h-auto max-h-[400px] object-contain bg-background"
          />
        </div>
      )}

      {/* Evidence cards */}
      {evidence.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Evidence ({evidence.length} signals)
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {evidence.map((item, i) => (
              <EvidenceCard key={i} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Explanation sections */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          AI Reasoning
        </h3>
        <AnalysisExplanation
          explanation={explanation as Record<string, string> | null}
          invalidationConditions={analysis.invalidation_conditions}
          warnings={warnings}
        />
      </div>
    </div>
  );
}
