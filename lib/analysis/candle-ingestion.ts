import type { Candle as MDCandle } from '../market-data/types';

export function filterFreshCandlesForPersistence(
  candles: MDCandle[],
  newestStoredTimestamp: number | null,
): MDCandle[] {
  if (newestStoredTimestamp === null) {
    return candles;
  }

  return candles.filter((candle) => candle.timestamp > newestStoredTimestamp);
}
