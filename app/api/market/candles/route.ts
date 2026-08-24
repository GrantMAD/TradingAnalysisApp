import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { marketDataService } from '../../../../lib/market-data/service';
import { CandleQuerySchema } from '../../../../lib/market-data/schemas';
import { MarketDataError } from '../../../../lib/market-data/errors';

export function handleMarketDataError(error: unknown) {
  if (error instanceof MarketDataError) {
    switch (error.code) {
      case 'PROVIDER_NOT_CONFIGURED':
        return NextResponse.json({ error: error.message }, { status: 503 });
      case 'INVALID_SYMBOL':
      case 'INVALID_RESPONSE':
        return NextResponse.json({ error: error.message }, { status: 400 });
      case 'RATE_LIMITED':
        return NextResponse.json({ error: error.message }, { status: 429 });
      default:
        return NextResponse.json({ error: error.message }, { status: 502 });
    }
  }
  console.error('[API Route Error]', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = {
      symbol: searchParams.get('symbol'),
      timeframe: searchParams.get('timeframe'),
      limit: searchParams.get('limit'),
      start: searchParams.get('start'),
      end: searchParams.get('end'),
    };

    const parsedQuery = CandleQuerySchema.safeParse(query);
    if (!parsedQuery.success) {
      return NextResponse.json({ error: 'Invalid parameters', details: parsedQuery.error.format() }, { status: 400 });
    }

    const result = await marketDataService.getCandles({
      symbol: parsedQuery.data.symbol,
      timeframe: parsedQuery.data.timeframe as any,
      limit: parsedQuery.data.limit,
      start: parsedQuery.data.start,
      end: parsedQuery.data.end
    });

    return NextResponse.json({ candles: result.data, quality: result.quality });

  } catch (error) {
    return handleMarketDataError(error);
  }
}
