import { Candle } from '../types';

export interface ADXPoint {
  adx: number | null;
  plusDI: number | null;
  minusDI: number | null;
}

/**
 * Calculates Average Directional Index (ADX) with +DI and -DI.
 * 
 * @param candles Array of historical candles
 * @param period ADX period (default 14)
 * @returns Array of ADX values aligned with candles
 */
export function calculateADX(candles: Candle[], period: number = 14): ADXPoint[] {
  const result: ADXPoint[] = Array.from({ length: candles.length }, () => ({
    adx: null,
    plusDI: null,
    minusDI: null
  }));

  if (candles.length <= period) {
    return result;
  }

  const tr: number[] = new Array(candles.length).fill(0);
  const plusDM: number[] = new Array(candles.length).fill(0);
  const minusDM: number[] = new Array(candles.length).fill(0);

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevHigh = candles[i - 1].high;
    const prevLow = candles[i - 1].low;
    const prevClose = candles[i - 1].close;

    // True Range
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    tr[i] = Math.max(tr1, tr2, tr3);

    // Directional Movement
    const upMove = high - prevHigh;
    const downMove = prevLow - low;

    if (upMove > downMove && upMove > 0) {
      plusDM[i] = upMove;
    } else {
      plusDM[i] = 0;
    }

    if (downMove > upMove && downMove > 0) {
      minusDM[i] = downMove;
    } else {
      minusDM[i] = 0;
    }
  }

  // Initial Smoothed TR, +DM, -DM (Sum of first 'period' values)
  let smoothedTR = 0;
  let smoothedPlusDM = 0;
  let smoothedMinusDM = 0;

  for (let i = 1; i <= period; i++) {
    smoothedTR += tr[i];
    smoothedPlusDM += plusDM[i];
    smoothedMinusDM += minusDM[i];
  }

  const plusDI: number[] = new Array(candles.length).fill(null);
  const minusDI: number[] = new Array(candles.length).fill(null);
  const dx: number[] = new Array(candles.length).fill(null);

  // Calculate first DI and DX
  if (smoothedTR !== 0) {
    plusDI[period] = (smoothedPlusDM / smoothedTR) * 100;
    minusDI[period] = (smoothedMinusDM / smoothedTR) * 100;
    const diDiff = Math.abs(plusDI[period]! - minusDI[period]!);
    const diSum = plusDI[period]! + minusDI[period]!;
    dx[period] = diSum === 0 ? 0 : (diDiff / diSum) * 100;
  } else {
    plusDI[period] = 0;
    minusDI[period] = 0;
    dx[period] = 0;
  }

  result[period].plusDI = plusDI[period];
  result[period].minusDI = minusDI[period];

  // Smooth the rest of TR, +DM, -DM
  for (let i = period + 1; i < candles.length; i++) {
    smoothedTR = smoothedTR - (smoothedTR / period) + tr[i];
    smoothedPlusDM = smoothedPlusDM - (smoothedPlusDM / period) + plusDM[i];
    smoothedMinusDM = smoothedMinusDM - (smoothedMinusDM / period) + minusDM[i];

    if (smoothedTR !== 0) {
      plusDI[i] = (smoothedPlusDM / smoothedTR) * 100;
      minusDI[i] = (smoothedMinusDM / smoothedTR) * 100;
      const diDiff = Math.abs(plusDI[i]! - minusDI[i]!);
      const diSum = plusDI[i]! + minusDI[i]!;
      dx[i] = diSum === 0 ? 0 : (diDiff / diSum) * 100;
    } else {
      plusDI[i] = 0;
      minusDI[i] = 0;
      dx[i] = 0;
    }

    result[i].plusDI = plusDI[i];
    result[i].minusDI = minusDI[i];
  }

  // Calculate ADX (Smoothed moving average of DX)
  let adxSum = 0;
  if (candles.length > period * 2) {
    for (let i = period; i < period * 2; i++) {
      adxSum += dx[i]!;
    }
    
    let adx = adxSum / period;
    result[period * 2 - 1].adx = adx;

    for (let i = period * 2; i < candles.length; i++) {
      adx = ((adx * (period - 1)) + dx[i]!) / period;
      result[i].adx = adx;
    }
  }

  return result;
}
