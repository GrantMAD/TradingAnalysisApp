import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { marketDataService } from '../../../../lib/market-data/service';
import { handleMarketDataError } from '../candles/route';
import { z } from 'zod';

const PriceQuerySchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = { symbol: searchParams.get('symbol') };

    const parsedQuery = PriceQuerySchema.safeParse(query);
    if (!parsedQuery.success) {
      return NextResponse.json({ error: 'Invalid parameters', details: parsedQuery.error.format() }, { status: 400 });
    }

    const result = await marketDataService.getLatestPrice(parsedQuery.data.symbol);

    return NextResponse.json({ price: result.data, quality: result.quality });

  } catch (error) {
    return handleMarketDataError(error);
  }
}
