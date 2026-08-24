import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { marketDataService } from '../../../../lib/market-data/service';
import { handleMarketDataError } from '../candles/route';
import { z } from 'zod';

const InstrumentsQuerySchema = z.object({
  type: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = { type: searchParams.get('type') || undefined };

    const parsedQuery = InstrumentsQuerySchema.safeParse(query);
    if (!parsedQuery.success) {
      return NextResponse.json({ error: 'Invalid parameters', details: parsedQuery.error.format() }, { status: 400 });
    }

    const instruments = await marketDataService.getInstruments(parsedQuery.data.type);

    return NextResponse.json({ instruments });

  } catch (error) {
    return handleMarketDataError(error);
  }
}
