import { MarketDataProvider } from './types';
import { TwelveDataProvider } from './twelve-data';

export function createMarketDataProvider(): MarketDataProvider {
  const providerName = process.env.MARKET_DATA_PROVIDER || 'twelve_data';
  
  if (providerName === 'twelve_data') {
    return new TwelveDataProvider();
  }
  
  throw new Error(`Unsupported market data provider: ${providerName}`);
}
