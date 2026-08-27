'use client';

import { useState, useCallback, useRef } from 'react';
import { Loader2, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RunAnalysisButtonProps {
  instrumentId: string;
  symbol: string;
  displayName: string;
  marketType: 'crypto' | 'forex';
  timeframe: string;
  screenshotPath?: string | null;
  userPreferences?: {
    riskProfile: 'conservative' | 'balanced' | 'aggressive';
    minimumRR: number;
    requireMultiTimeframeConfirmation: boolean;
    enabledComponents: string[];
  };
  onComplete: (analysisId: string) => void;
  disabled?: boolean;
}

type State = 'idle' | 'loading' | 'error';

export function RunAnalysisButton({
  instrumentId,
  symbol,
  displayName,
  marketType,
  timeframe,
  screenshotPath,
  userPreferences,
  onComplete,
  disabled = false,
}: RunAnalysisButtonProps) {
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const pollForResult = useCallback((analysisId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/analysis/${analysisId}`);
        if (!res.ok) return;
        const json = await res.json();
        const status = json.analysis?.status;

        if (status === 'completed') {
          stopPolling();
          setState('idle');
          onComplete(analysisId);
        } else if (status === 'failed') {
          stopPolling();
          setState('error');
          setErrorMsg(json.analysis?.error_message ?? 'Analysis failed. Please try again.');
        }
        // 'pending' or 'running' — keep polling
      } catch {
        // network hiccup — keep polling
      }
    }, 2000);
  }, [onComplete]);

  const handleRun = async () => {
    if (!instrumentId) {
      setErrorMsg('Please select an instrument first.');
      setState('error');
      return;
    }

    setState('loading');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/analysis/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrumentId,
          symbol,
          displayName,
          marketType,
          timeframe,
          ...(screenshotPath ? { screenshotPath } : {}),
          userPreferences: userPreferences ?? {
            riskProfile: 'balanced',
            minimumRR: 2.0,
            requireMultiTimeframeConfirmation: true,
            enabledComponents: [],
          },
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setState('error');
        setErrorMsg(json.error ?? `Request failed (${res.status})`);
        return;
      }

      if (!json.analysisId) {
        setState('error');
        setErrorMsg('No analysis ID returned from server.');
        return;
      }

      pollForResult(json.analysisId);
    } catch {
      setState('error');
      setErrorMsg('Could not reach the server. Please check your connection.');
    }
  };

  const handleRetry = () => {
    setState('idle');
    setErrorMsg(null);
  };

  if (state === 'error') {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
        <div className="flex gap-2">
          <Button
            id="retry-analysis-btn"
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </Button>
          <Button
            id="run-analysis-btn-after-error"
            size="sm"
            onClick={handleRun}
            className="gap-2"
          >
            <Zap className="w-3.5 h-3.5" />
            Run Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      id="run-analysis-btn"
      size="lg"
      onClick={handleRun}
      disabled={state === 'loading' || disabled}
      className="gap-2.5 font-semibold shadow-[0_0_20px_rgba(0,212,255,0.15)] hover:shadow-[0_0_28px_rgba(0,212,255,0.25)] transition-all"
    >
      {state === 'loading' ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Analysing…
        </>
      ) : (
        <>
          <Zap className="w-4 h-4" />
          Run Analysis
          {screenshotPath && (
            <span className="text-xs bg-primary/20 px-1.5 py-0.5 rounded-full font-normal">
              + Screenshot
            </span>
          )}
        </>
      )}
    </Button>
  );
}
