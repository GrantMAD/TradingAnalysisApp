export type MarketDataErrorCode =
  | 'PROVIDER_NOT_CONFIGURED'
  | 'PROVIDER_ERROR'
  | 'STALE_DATA'
  | 'INVALID_SYMBOL'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'
  | 'INSUFFICIENT_CANDLES';

export class MarketDataError extends Error {
  constructor(
    public readonly code: MarketDataErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'MarketDataError';
  }
}
