'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ScoreBarsProps {
  setupScore: number | null;
  confidenceScore: number | null;
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(Math.max(value, 0), 100);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="w-full text-left cursor-help">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">{label}</span>
              <span className="font-semibold tabular-nums">
                {pct.toFixed(0)}<span className="text-muted-foreground text-xs">/100</span>
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-center text-xs">
          This is a heuristic quality score, not a win probability. A score of {pct}/100 does not mean a {pct}% chance of profit.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ScoreBars({ setupScore, confidenceScore }: ScoreBarsProps) {
  if (setupScore == null && confidenceScore == null) return null;

  return (
    <div className="space-y-4">
      {setupScore != null && (
        <ScoreBar
          label="Setup Score"
          value={setupScore}
          color={
            setupScore >= 70
              ? 'bg-emerald-500'
              : setupScore >= 45
              ? 'bg-amber-500'
              : 'bg-red-500'
          }
        />
      )}
      {confidenceScore != null && (
        <ScoreBar
          label="AI Confidence"
          value={confidenceScore}
          color="bg-primary"
        />
      )}
      {/* Rule 10 */}
      <p className="text-xs text-muted-foreground/60 italic">
        Scores are heuristic quality metrics — not probabilities of profit.
      </p>
    </div>
  );
}
