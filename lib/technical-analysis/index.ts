import { Candle, UserSettings, MultiTimeframeContext, TAResult, IndicatorSnapshot } from './types';
import { calculateRSI } from './indicators/rsi';
import { calculateMACD } from './indicators/macd';
import { calculateSMA, calculateEMA } from './indicators/moving-averages';
import { calculateBollingerBands } from './indicators/bollinger';
import { calculateATR } from './indicators/atr';
import { calculateADX } from './indicators/adx';
import { calculateVWAP } from './indicators/vwap';

import { detectSwingPoints } from './structure/swing-points';
import { analyseMarketStructure } from './structure/market-structure';
import { evaluateTrend } from './structure/trend';

import { identifySupportResistance } from './levels/support-resistance';
import { calculateFibonacci } from './levels/fibonacci';
import { identifyLiquidityZones } from './levels/liquidity';

import { detectCandlestickPatterns } from './patterns/candlestick-patterns';
import { detectChartPatterns } from './patterns/chart-patterns';

import { calculateSetupScore } from './scoring/setup-score';

export * from './types';
export * from './patterns/candlestick-patterns';
export * from './patterns/chart-patterns';
export * from './scoring/setup-score';
export * from './setup/types';
export * from './setup/evaluator';
// Phase 7 — Trade-Level Calculation
// Note: calculateTradeLevels is NOT called inside runTechnicalAnalysis.
// It must be invoked explicitly by the analysis pipeline after evaluateSetup().
export * from './trade-levels/types';
export * from './trade-levels/calculator';
export * from './trade-levels/risk-reward';

/**
 * Orchestrates the full Technical Analysis process.
 * 
 * @param params Parameters including candles, timeframe, current price, and context
 * @returns Comprehensive TAResult
 */
export async function runTechnicalAnalysis(params: {
  candles: Candle[];
  timeframe: string;
  currentPrice: number;
  userSettings: UserSettings;
  higherTimeframeContext?: MultiTimeframeContext;
  proposedDirection?: 'long' | 'short'; // Optional for scoring
}): Promise<TAResult> {
  const { candles, currentPrice, userSettings, higherTimeframeContext, proposedDirection } = params;

  // 1. Calculate Indicators
  const rsi = calculateRSI(candles, userSettings.rsiPeriod || 14);
  const macd = calculateMACD(candles, userSettings.macdFast || 12, userSettings.macdSlow || 26, userSettings.macdSignal || 9);
  const sma20 = calculateSMA(candles, 20);
  const sma50 = calculateSMA(candles, 50);
  const sma200 = calculateSMA(candles, 200);
  const ema9 = calculateEMA(candles, 9);
  const ema20 = calculateEMA(candles, 20);
  const ema50 = calculateEMA(candles, 50);
  const bollinger = calculateBollingerBands(candles, 20, 2);
  const atr = calculateATR(candles, 14);
  const adx = calculateADX(candles, 14);
  const vwapResult = calculateVWAP(candles);

  const indicators: IndicatorSnapshot = {
    rsi,
    macd,
    sma20,
    sma50,
    sma200,
    ema9,
    ema20,
    ema50,
    bollinger,
    atr,
    adx,
    vwap: vwapResult.values
  };

  const hasVolume = !vwapResult.reason;

  // 2. Structure Analysis
  const swings = detectSwingPoints(candles, userSettings.swingLookback || 3);
  const structure = analyseMarketStructure(swings, candles);
  const trend = evaluateTrend(candles, structure, indicators, higherTimeframeContext);

  // 3. Levels
  const currentAtr = (atr[atr.length - 1] as number) || (currentPrice * 0.01);
  const levels = identifySupportResistance(swings, currentPrice, currentAtr);
  const fibonacci = calculateFibonacci(swings) || undefined;
  const liquidityZones = identifyLiquidityZones(candles, swings, currentAtr);

  // 4. Patterns
  const candlestickPatterns = detectCandlestickPatterns(candles);
  const chartPatterns = detectChartPatterns(swings, levels);

  // 5. Setup Score (Now calculated externally after Phase 6 and Phase 7)
  const setupScore = undefined;

  // Assemble the result
  return {
    candles,
    indicators,
    structure,
    trend,
    levels,
    fibonacci,
    liquidityZones,
    candlestickPatterns,
    chartPatterns,
    setupScore,
    dataQuality: vwapResult.reason || undefined
  };
}
