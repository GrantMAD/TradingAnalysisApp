import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import {
  DEFAULT_USER_SETTINGS,
  parseUserSettings,
  UserSettingsSchema,
} from '../../../lib/user-settings';

const settingsColumns = `
  risk_profile,
  risk_per_trade,
  minimum_risk_reward,
  preferred_timeframes,
  preferred_sessions,
  require_multi_timeframe_confirmation,
  enable_market_structure,
  enable_support_resistance,
  enable_momentum,
  enable_volume,
  enable_price_action,
  enable_chart_patterns,
  enable_liquidity_analysis,
  enable_fibonacci,
  screenshot_analysis_enabled
`;

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_settings')
    .select(settingsColumns)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[Settings API] Failed to load settings:', error.message);
    return NextResponse.json({ error: 'Could not load your settings.' }, { status: 500 });
  }

  return NextResponse.json({ settings: parseUserSettings(data) ?? DEFAULT_USER_SETTINGS });
}

export async function PUT(request: NextRequest) {
  const { supabase, user } = await getAuthenticatedClient();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request.' }, { status: 400 });
  }

  const parsed = UserSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please correct the highlighted settings and try again.', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: 'user_id' })
    .select(settingsColumns)
    .single();

  if (error || !data) {
    console.error('[Settings API] Failed to save settings:', error?.message);
    return NextResponse.json({ error: 'Could not save your settings. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ settings: parseUserSettings(data) ?? DEFAULT_USER_SETTINGS });
}
