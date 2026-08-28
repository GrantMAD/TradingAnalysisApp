'use client';

import { AlertTriangle, Clock } from 'lucide-react';
import { formatMarketTimestamp } from '@/lib/market-data/timestamps';
import { LiveLocalTime } from '@/components/ui/LiveLocalTime';

interface DataFreshnessBarProps {
  dataAsOf: string | null;
  dataAgeMinutes?: number;
  isStale: boolean;
}

export function DataFreshnessBar({ dataAsOf, dataAgeMinutes, isStale }: DataFreshnessBarProps) {
  const formatted = formatMarketTimestamp(dataAsOf);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${
        isStale
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          : 'bg-card border-border/50 text-muted-foreground'
      }`}
    >
      {isStale ? (
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Clock className="w-3.5 h-3.5 shrink-0" />
      )}
      <span>
        Data as of <span className="font-medium text-foreground">{formatted}</span>
        {dataAgeMinutes !== undefined && (
          <span className="ml-1 text-muted-foreground">({dataAgeMinutes}m ago)</span>
        )}
      </span>
      {isStale && (
        <span className="ml-auto font-semibold tracking-wide uppercase text-amber-400">
          ⚠ Stale
        </span>
      )}
      <span className="ml-auto border-l border-border/50 pl-2 text-muted-foreground">
        <LiveLocalTime />
      </span>
    </div>
  );
}
