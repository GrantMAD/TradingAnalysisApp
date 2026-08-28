import { z } from 'zod';

export const RISK_PROFILES = ['conservative', 'balanced', 'aggressive'] as const;
export const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;
export const SESSIONS = ['asian', 'london', 'new_york', 'overlap'] as const;

export const UserSettingsSchema = z.object({
  risk_profile: z.enum(RISK_PROFILES),
  risk_per_trade: z.number().finite().gt(0).lte(100),
  minimum_risk_reward: z.number().finite().positive(),
  preferred_timeframes: z.array(z.enum(TIMEFRAMES)).min(1),
  preferred_sessions: z.array(z.enum(SESSIONS)).min(1),
  require_multi_timeframe_confirmation: z.boolean(),
  enable_market_structure: z.boolean(),
  enable_support_resistance: z.boolean(),
  enable_momentum: z.boolean(),
  enable_volume: z.boolean(),
  enable_price_action: z.boolean(),
  enable_chart_patterns: z.boolean(),
  enable_liquidity_analysis: z.boolean(),
  enable_fibonacci: z.boolean(),
  screenshot_analysis_enabled: z.boolean(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

export function parseUserSettings(input: unknown): UserSettings | null {
  if (!input || typeof input !== 'object') return null;

  const candidate = input as Record<string, unknown>;
  const parsed = UserSettingsSchema.safeParse({
    ...candidate,
    risk_per_trade: Number(candidate.risk_per_trade),
    minimum_risk_reward: Number(candidate.minimum_risk_reward),
  });

  return parsed.success ? parsed.data : null;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  risk_profile: 'balanced',
  risk_per_trade: 1,
  minimum_risk_reward: 2,
  preferred_timeframes: ['5m', '15m', '1h'],
  preferred_sessions: ['london', 'new_york'],
  require_multi_timeframe_confirmation: true,
  enable_market_structure: true,
  enable_support_resistance: true,
  enable_momentum: true,
  enable_volume: true,
  enable_price_action: true,
  enable_chart_patterns: true,
  enable_liquidity_analysis: true,
  enable_fibonacci: false,
  screenshot_analysis_enabled: true,
};

export const ANALYSIS_COMPONENTS = [
  { key: 'enable_market_structure', label: 'Market structure', description: 'Swing highs, lows, breaks, and changes of character.' },
  { key: 'enable_support_resistance', label: 'Support and resistance', description: 'Reaction zones and meaningful price levels.' },
  { key: 'enable_momentum', label: 'Momentum', description: 'RSI, MACD, and price momentum.' },
  { key: 'enable_volume', label: 'Volume', description: 'Volume context where the provider supplies it.' },
  { key: 'enable_price_action', label: 'Price action', description: 'Candlestick reactions and continuation clues.' },
  { key: 'enable_chart_patterns', label: 'Chart patterns', description: 'Recognized formations and their key levels.' },
  { key: 'enable_liquidity_analysis', label: 'Liquidity analysis', description: 'Liquidity pools and market reaction areas.' },
  { key: 'enable_fibonacci', label: 'Fibonacci', description: 'Retracement and extension levels when meaningful.' },
] as const;

export type AnalysisComponentKey = (typeof ANALYSIS_COMPONENTS)[number]['key'];
