'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  Time,
  IPriceLine,
  ColorType,
  CrosshairMode,
  LineStyle,
  LineWidth,
  CandlestickSeries,
  HistogramSeries,
} from 'lightweight-charts';

export interface ChartLevel {
  price: number;
  label: string;
  color: string;
  lineStyle?: LineStyle;
  lineWidth?: LineWidth;
}

interface UsePriceChartOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  candles: CandlestickData<Time>[];
  volumes: HistogramData<Time>[];
  levels?: ChartLevel[];
}

export function usePriceChart({ containerRef, candles, volumes, levels = [] }: UsePriceChartOptions) {
  const chartRef        = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'>  | null>(null);
  const priceLinesRef   = useRef<IPriceLine[]>([]);

  // ── Initialise chart once ──────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el || chartRef.current) return;

    const chart = createChart(el, {
      layout: {
        background:  { type: ColorType.Solid, color: 'transparent' },
        textColor:   'rgba(148, 163, 184, 1)',   // slate-400
        fontSize:    12,
        fontFamily:  'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(0, 212, 255, 0.4)',
          width: 1 as LineWidth,
          style: LineStyle.Dashed,
          labelBackgroundColor: 'rgba(0, 212, 255, 0.8)',
        },
        horzLine: {
          color: 'rgba(0, 212, 255, 0.4)',
          width: 1 as LineWidth,
          style: LineStyle.Dashed,
          labelBackgroundColor: 'rgba(0, 212, 255, 0.8)',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        textColor:   'rgba(148, 163, 184, 1)',
      },
      timeScale: {
        borderColor:     'rgba(255,255,255,0.06)',
        timeVisible:     true,
        secondsVisible:  false,
      },
      handleScroll: true,
      handleScale:  true,
    });

    // ── Candlestick series (v5 API) ──────────────────────────────────────────
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor:        '#22c55e',
      downColor:      '#ef4444',
      borderUpColor:  '#22c55e',
      borderDownColor:'#ef4444',
      wickUpColor:    '#22c55e',
      wickDownColor:  '#ef4444',
    });

    // ── Volume histogram ─────────────────────────────────────────────────────
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color:        'rgba(0, 212, 255, 0.25)',
      priceFormat:  { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
      borderVisible: false,
    });

    chartRef.current        = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // ── ResizeObserver ───────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      if (el) chart.resize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current        = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync candle + volume data ──────────────────────────────────────────────
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    if (!candles.length) return;
    candleSeriesRef.current.setData(candles);
    volumeSeriesRef.current.setData(volumes);
    chartRef.current?.timeScale().fitContent();
  }, [candles, volumes]);

  // ── Sync overlay price lines ───────────────────────────────────────────────
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;

    priceLinesRef.current.forEach(l => {
      try { series.removePriceLine(l); } catch { /* ignore */ }
    });
    priceLinesRef.current = [];

    levels.forEach(lvl => {
      const line = series.createPriceLine({
        price:            lvl.price,
        color:            lvl.color,
        lineWidth:        (lvl.lineWidth ?? 1) as LineWidth,
        lineStyle:        lvl.lineStyle ?? LineStyle.Dashed,
        axisLabelVisible: true,
        title:            lvl.label,
      });
      priceLinesRef.current.push(line);
    });
  }, [levels]);

  const fitContent = useCallback(() => {
    chartRef.current?.timeScale().fitContent();
  }, []);

  const takeScreenshot = useCallback(() => {
    if (!chartRef.current || !candles.length) return null;
    const screenshot = chartRef.current.takeScreenshot();
    const context = screenshot.getContext('2d');
    if (!context) return screenshot;

    const chartWidth = screenshot.width / window.devicePixelRatio;
    const chartHeight = screenshot.height / window.devicePixelRatio;
    context.save();
    context.scale(window.devicePixelRatio, window.devicePixelRatio);
    context.font = '600 12px sans-serif';
    context.textBaseline = 'middle';

    levels.forEach((level) => {
      const coordinate = candleSeriesRef.current
        ? candleSeriesRef.current.priceToCoordinate(level.price)
        : null;
      if (coordinate === null) return;

      const y = Number(coordinate);
      context.strokeStyle = level.color;
      context.fillStyle = level.color;
      context.lineWidth = level.lineWidth ?? 1;
      context.setLineDash(level.lineStyle === LineStyle.Dashed ? [6, 4] : []);
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(chartWidth, y);
      context.stroke();
      context.setLineDash([]);
      context.fillText(level.label, Math.max(4, chartWidth - 42), Math.min(chartHeight - 12, Math.max(12, y)));
    });

    context.restore();
    return screenshot;
  }, [candles.length, levels]);

  return { fitContent, takeScreenshot };
}
