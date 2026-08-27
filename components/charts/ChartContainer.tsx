'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CandlestickData, HistogramData, Time } from 'lightweight-charts';
import { Timeframe, Instrument, Candle } from '@/lib/market-data/types';
import { PriceChart } from './PriceChart';
import { ChartToolbar } from './ChartToolbar';
import { ChartLevel } from './usePriceChart';

const DEFAULT_SYMBOL    = 'BTC/USD';
const DEFAULT_TIMEFRAME: Timeframe = '1h';
const DEFAULT_LIMIT     = 200;

// ── Helpers ─────────────────────────────────────────────────────────────────

function toCandlestickData(candles: Candle[]): CandlestickData<Time>[] {
  return candles.map(c => ({
    time:  c.timestamp as Time,
    open:  c.open,
    high:  c.high,
    low:   c.low,
    close: c.close,
  }));
}

function toVolumeData(candles: Candle[]): HistogramData<Time>[] {
  return candles.map(c => ({
    time:  c.timestamp as Time,
    value: c.volume ?? 0,
    color: c.close >= c.open
      ? 'rgba(34, 197, 94, 0.35)'   // bull green
      : 'rgba(239, 68, 68, 0.35)',   // bear red
  }));
}

function formatDataAsOf(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
}

// ── Component ────────────────────────────────────────────────────────────────

interface ChartContainerProps {
  /** Optional overlay levels (entry, SL, TP) injected from parent when an analysis exists */
  levels?: ChartLevel[];
  className?: string;
  /** Optional callbacks so the parent can lift selected instrument/timeframe */
  onInstrumentChange?: (instrument: Instrument | null) => void;
  onTimeframeChange?: (tf: Timeframe) => void;
}

export function ChartContainer({ levels = [], className = '', onInstrumentChange, onTimeframeChange }: ChartContainerProps) {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [symbol,      setSymbol]      = useState<string>(DEFAULT_SYMBOL);
  const [timeframe,   setTimeframe]   = useState<Timeframe>(DEFAULT_TIMEFRAME);

  const [candles,  setCandles]  = useState<CandlestickData<Time>[]>([]);
  const [volumes,  setVolumes]  = useState<HistogramData<Time>[]>([]);
  const [price,    setPrice]    = useState<number | null>(null);
  const [dataAsOf, setDataAsOf] = useState<string | undefined>();
  const [isStale,  setIsStale]  = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // Track latest fetch so stale responses don't overwrite newer data
  const fetchIdRef = useRef(0);

  // ── Fetch instruments once ─────────────────────────────────────────────────
  useEffect(() => {
    async function loadInstruments() {
      try {
        const res = await fetch('/api/market/instruments');
        if (!res.ok) throw new Error('Failed to load instruments');
        const json = await res.json();
        const list: Instrument[] = json.instruments ?? [];
        setInstruments(list);
        // Pick first instrument if default is not in the list
        if (list.length > 0 && !list.some(i => i.symbol === DEFAULT_SYMBOL)) {
          setSymbol(list[0].symbol);
        }
      } catch (e) {
        console.error('[ChartContainer] loadInstruments', e);
      }
    }
    loadInstruments();
  }, []);

  // ── Fetch candles ─────────────────────────────────────────────────────────
  const fetchCandles = useCallback(async (sym: string, tf: Timeframe) => {
    if (!sym) return;
    const id = ++fetchIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ symbol: sym, timeframe: tf, limit: String(DEFAULT_LIMIT) });
      const res = await fetch(`/api/market/candles?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      if (id !== fetchIdRef.current) return; // stale fetch

      const raw: Candle[] = json.candles ?? [];
      setCandles(toCandlestickData(raw));
      setVolumes(toVolumeData(raw));
      setIsStale(json.quality?.isStale ?? false);
      setDataAsOf(json.quality?.dataAsOf ? formatDataAsOf(json.quality.dataAsOf) : undefined);
    } catch (e: unknown) {
      if (id !== fetchIdRef.current) return;
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      console.error('[ChartContainer] fetchCandles', e);
    } finally {
      if (id === fetchIdRef.current) setIsLoading(false);
    }
  }, []);

  // ── Fetch price ────────────────────────────────────────────────────────────
  const fetchPrice = useCallback(async (sym: string) => {
    if (!sym) return;
    try {
      const params = new URLSearchParams({ symbol: sym });
      const res = await fetch(`/api/market/price?${params}`);
      if (!res.ok) return;
      const json = await res.json();
      setPrice(json.price?.price ?? null);
    } catch { /* price is non-critical */ }
  }, []);

  // Re-fetch on symbol / timeframe change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCandles(symbol, timeframe);
    fetchPrice(symbol);
  }, [symbol, timeframe, fetchCandles, fetchPrice]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    fetchCandles(symbol, timeframe);
    fetchPrice(symbol);
  }, [symbol, timeframe, fetchCandles, fetchPrice]);

  // Notify parent of symbol change so it can update RunAnalysisButton props
  const handleSymbolChange = useCallback((newSymbol: string) => {
    setSymbol(newSymbol);
    const inst = instruments.find(i => i.symbol === newSymbol) ?? null;
    onInstrumentChange?.(inst);
  }, [instruments, onInstrumentChange]);

  // Notify parent of timeframe change
  const handleTimeframeChange = useCallback((tf: Timeframe) => {
    setTimeframe(tf);
    onTimeframeChange?.(tf);
  }, [onTimeframeChange]);

  return (
    <div className={`flex flex-col rounded-xl border border-border/60 overflow-hidden glass ${className}`}>
      <ChartToolbar
        instruments={instruments}
        selectedSymbol={symbol}
        selectedTimeframe={timeframe}
        currentPrice={price}
        isLoading={isLoading}
        onSymbolChange={handleSymbolChange}
        onTimeframeChange={handleTimeframeChange}
        onRefresh={handleRefresh}
      />

      {error && (
        <div className="px-4 py-2 text-xs text-destructive bg-destructive/10 border-b border-destructive/20">
          ⚠ {error}
        </div>
      )}

      <PriceChart
        candles={candles}
        volumes={volumes}
        levels={levels}
        isLoading={isLoading}
        isStale={isStale}
        dataAsOf={dataAsOf}
        className="flex-1"
      />
    </div>
  );
}
