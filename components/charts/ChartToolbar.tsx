'use client';

import { Timeframe, Instrument } from '@/lib/market-data/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: '1m',  label: '1m'  },
  { value: '5m',  label: '5m'  },
  { value: '15m', label: '15m' },
  { value: '1h',  label: '1h'  },
  { value: '4h',  label: '4h'  },
  { value: '1d',  label: '1D'  },
];

interface ChartToolbarProps {
  instruments: Instrument[];
  selectedSymbol: string;
  selectedTimeframe: Timeframe;
  currentPrice?: number | null;
  isLoading?: boolean;
  onSymbolChange: (symbol: string) => void;
  onTimeframeChange: (tf: Timeframe) => void;
  onRefresh: () => void;
}

export function ChartToolbar({
  instruments,
  selectedSymbol,
  selectedTimeframe,
  currentPrice,
  isLoading = false,
  onSymbolChange,
  onTimeframeChange,
  onRefresh,
}: ChartToolbarProps) {
  const selectedInstrument = instruments.find(i => i.symbol === selectedSymbol);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/40 backdrop-blur-sm flex-wrap">
      {/* Instrument selector */}
      <Select value={selectedSymbol} onValueChange={(v) => v != null && onSymbolChange(v)}>
        <SelectTrigger
          id="chart-instrument-selector"
          className="w-44 bg-background/60 border-border/60 text-foreground font-medium"
        >
          <SelectValue placeholder="Select instrument" />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          {instruments.length === 0 && (
            <SelectItem value="__none__" disabled>No instruments</SelectItem>
          )}
          {/* Group by type */}
          {(['crypto', 'forex'] as const).map(type => {
            // Normalise: DB rows may return market_type instead of type
            const group = instruments.filter(i => {
              const mtype = (i as unknown as Record<string, string>)['market_type'] ?? i.type;
              return mtype === type;
            });
            if (!group.length) return null;
            return (
              <div key={type}>
                <div className="px-2 py-1.5 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  {type}
                </div>
                {group.map(inst => (
                  <SelectItem key={inst.symbol} value={inst.symbol}>
                    {inst.symbol}
                  </SelectItem>
                ))}
              </div>
            );
          })}
        </SelectContent>
      </Select>

      {/* Market type badge */}
      {selectedInstrument && (() => {
        // DB rows may use market_type; normalise
        const mtype = (selectedInstrument as unknown as Record<string, string>)['market_type'] ?? selectedInstrument.type;
        if (!mtype) return null;
        return (
          <Badge
            variant="outline"
            className={
              mtype === 'crypto'
                ? 'border-violet-500/50 text-violet-400 bg-violet-500/10'
                : 'border-amber-500/50 text-amber-400 bg-amber-500/10'
            }
          >
            {mtype.toUpperCase()}
          </Badge>
        );
      })()}

      {/* Timeframe pills */}
      <div className="flex items-center gap-1 ml-2">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf.value}
            id={`chart-tf-${tf.value}`}
            onClick={() => onTimeframeChange(tf.value)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150 ${
              selectedTimeframe === tf.value
                ? 'bg-primary text-primary-foreground shadow-[0_0_10px_rgba(0,212,255,0.3)]'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Current price */}
      {currentPrice != null && (
        <div className="text-right">
          <span className="text-xs text-muted-foreground mr-1">Price</span>
          <span className="text-sm font-mono font-semibold text-primary tabular-nums">
            {currentPrice.toLocaleString(undefined, { maximumFractionDigits: 8 })}
          </span>
        </div>
      )}

      {/* Refresh button */}
      <Button
        id="chart-refresh-btn"
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        disabled={isLoading}
        className="text-muted-foreground hover:text-foreground"
        title="Refresh market data"
      >
        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}
