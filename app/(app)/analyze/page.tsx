'use client';

import { useState, useCallback } from 'react';
import { Timeframe, Instrument } from '@/lib/market-data/types';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { ChartLevel } from '@/components/charts/usePriceChart';
import { RunAnalysisButton } from '@/components/analysis/RunAnalysisButton';
import { AnalysisPanel } from '@/components/analysis/AnalysisPanel';
import { ScreenshotUpload } from '@/components/analysis/ScreenshotUpload';
import { ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LineStyle } from 'lightweight-charts';

// ── Types ────────────────────────────────────────────────────────────────────

// The DB instrument row uses market_type and display_name; the Instrument type
// from market-data/types uses `type` and `name`. We normalise here.
type DBInstrument = Instrument & {
  market_type?: 'crypto' | 'forex';
  display_name?: string;
};

interface AnalysisResult {
  analysis: {
    decision: 'LONG' | 'SHORT' | 'NO_TRADE';
    market_bias: string | null;
    setup_score: number | null;
    confidence_score: number | null;
    summary: string | null;
    detailed_explanation: string | null;
    invalidation_conditions: string | null;
    screenshot_path: string | null;
  };
  tradeSetup: {
    decision: 'LONG' | 'SHORT' | 'NO_TRADE';
    entry_min: number | null;
    entry_max: number | null;
    stop_loss: number | null;
    take_profit_1: number | null;
    take_profit_2: number | null;
    risk_reward: number | null;
  } | null;
  evidence: Array<{
    category: string;
    name: string;
    direction: string;
    score: number | null;
    finding: string;
    explanation: string | null;
  }>;
  marketSnapshot: {
    data_as_of: string | null;
    data_is_stale: boolean;
  } | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildChartLevels(tradeSetup: AnalysisResult['tradeSetup']): ChartLevel[] {
  if (!tradeSetup) return [];
  const levels: ChartLevel[] = [];

  const mid = (a: number | null, b: number | null) =>
    a != null && b != null ? (a + b) / 2 : (a ?? b ?? null);

  const entryPrice = mid(tradeSetup.entry_min, tradeSetup.entry_max);
  if (entryPrice != null) {
    levels.push({ price: entryPrice, label: 'Entry', color: '#00d4ff', lineStyle: LineStyle.Dashed, lineWidth: 2 });
  }
  if (tradeSetup.stop_loss != null) {
    levels.push({ price: tradeSetup.stop_loss, label: 'SL', color: '#f87171', lineStyle: LineStyle.Solid, lineWidth: 2 });
  }
  if (tradeSetup.take_profit_1 != null) {
    levels.push({ price: tradeSetup.take_profit_1, label: 'TP1', color: '#34d399', lineStyle: LineStyle.Solid, lineWidth: 2 });
  }
  if (tradeSetup.take_profit_2 != null) {
    levels.push({ price: tradeSetup.take_profit_2, label: 'TP2', color: '#6ee7b7', lineStyle: LineStyle.Dashed, lineWidth: 1 });
  }
  return levels;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AnalyzePage() {
  const [selectedInstrument, setSelectedInstrument] = useState<DBInstrument | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1h');

  const [screenshotPath, setScreenshotPath] = useState<string | null>(null);
  const [showScreenshotUpload, setShowScreenshotUpload] = useState(false);

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [chartLevels, setChartLevels] = useState<ChartLevel[]>([]);

  const handleInstrumentChange = useCallback((instrument: Instrument | null) => {
    setSelectedInstrument(instrument as DBInstrument | null);
    setAnalysisResult(null);
    setChartLevels([]);
  }, []);

  const handleTimeframeChange = useCallback((tf: Timeframe) => {
    setSelectedTimeframe(tf);
    setAnalysisResult(null);
    setChartLevels([]);
  }, []);

  const handleAnalysisComplete = useCallback(async (analysisId: string) => {
    try {
      const res = await fetch(`/api/analysis/${analysisId}`);
      if (!res.ok) return;
      const data: AnalysisResult = await res.json();
      setAnalysisResult(data);
      setChartLevels(buildChartLevels(data.tradeSetup));
    } catch {
      // RunAnalysisButton already handled error display
    }
  }, []);

  const clearScreenshot = () => {
    setScreenshotPath(null);
    setShowScreenshotUpload(false);
  };

  // Normalise DB instrument fields
  const instrumentId = selectedInstrument?.id ?? '';
  const symbol = selectedInstrument?.symbol ?? 'BTC/USD';
  const displayName = selectedInstrument?.display_name ?? selectedInstrument?.name ?? symbol;
  const marketType: 'crypto' | 'forex' =
    selectedInstrument?.market_type ??
    (selectedInstrument?.type as 'crypto' | 'forex') ??
    'crypto';

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Market Analysis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Select an instrument and timeframe, then run AI analysis.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Screenshot toggle */}
          {!screenshotPath ? (
            <Button
              id="toggle-screenshot-btn"
              variant="outline"
              size="sm"
              onClick={() => setShowScreenshotUpload((v) => !v)}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ImageIcon className="w-4 h-4" />
              {showScreenshotUpload ? 'Hide Screenshot' : 'Add Screenshot'}
            </Button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-xs text-primary font-medium">
              <ImageIcon className="w-3.5 h-3.5" />
              Screenshot attached
              <button onClick={clearScreenshot} className="ml-1 hover:text-destructive transition-colors" title="Remove screenshot">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Run analysis */}
          <RunAnalysisButton
            instrumentId={instrumentId}
            symbol={symbol}
            displayName={displayName}
            marketType={marketType}
            timeframe={selectedTimeframe}
            screenshotPath={screenshotPath}
            onComplete={handleAnalysisComplete}
            disabled={!selectedInstrument}
          />
        </div>
      </div>

      {/* Screenshot upload panel (optional) */}
      {showScreenshotUpload && !screenshotPath && (
        <div className="glass rounded-xl p-4 border border-border/60">
          <p className="text-xs text-muted-foreground mb-3">
            Upload a chart screenshot to provide supplementary visual evidence. The AI will treat it as secondary to structured market data.
          </p>
          <ScreenshotUpload
            onUploadComplete={(path) => {
              setScreenshotPath(path);
              setShowScreenshotUpload(false);
            }}
            onError={(err) => console.error('Screenshot upload error:', err)}
          />
        </div>
      )}

      {/* Live chart with level overlays */}
      <ChartContainer
        className="flex-none min-h-120"
        levels={chartLevels}
        onInstrumentChange={handleInstrumentChange}
        onTimeframeChange={handleTimeframeChange}
      />

      {/* Analysis result panel */}
      {analysisResult && (
        <div className="glass rounded-xl p-5 border border-border/60">
          <h2 className="font-semibold mb-4 text-muted-foreground uppercase tracking-wider text-xs">
            Analysis Result — {symbol} / {selectedTimeframe.toUpperCase()}
          </h2>
          <AnalysisPanel
            analysis={analysisResult.analysis}
            tradeSetup={analysisResult.tradeSetup}
            evidence={analysisResult.evidence}
            marketSnapshot={analysisResult.marketSnapshot}
          />
        </div>
      )}
    </div>
  );
}
