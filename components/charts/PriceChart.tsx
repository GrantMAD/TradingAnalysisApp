'use client';

import { useRef } from 'react';
import { CandlestickData, HistogramData, Time } from 'lightweight-charts';
import { usePriceChart, ChartLevel } from './usePriceChart';
import { Loader2 } from 'lucide-react';

interface PriceChartProps {
  candles: CandlestickData<Time>[];
  volumes: HistogramData<Time>[];
  levels?: ChartLevel[];
  isLoading?: boolean;
  isStale?: boolean;
  dataAsOf?: string;
  className?: string;
}

export function PriceChart({
  candles,
  volumes,
  levels = [],
  isLoading = false,
  isStale = false,
  dataAsOf,
  className = '',
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  usePriceChart({ containerRef, candles, volumes, levels });

  return (
    <div className={`relative flex flex-col ${className}`}>
      {/* Data quality strip */}
      {dataAsOf && (
        <div className="flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground border-b border-border/50">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              isStale ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
          />
          {isStale ? (
            <span className="text-amber-400 font-medium">⚠ Stale data —&nbsp;</span>
          ) : null}
          <span>Data as of {dataAsOf}</span>
        </div>
      )}

      {/* Chart canvas */}
      <div ref={containerRef} className="flex-1 w-full" />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading market data…</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && candles.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <p className="text-muted-foreground text-sm">No candle data available for this instrument/timeframe.</p>
        </div>
      )}
    </div>
  );
}
