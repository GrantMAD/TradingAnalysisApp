# AI Trading Analyst

A personal AI-assisted market-analysis tool for **crypto and forex**.

This application helps you analyse markets using a deterministic technical-analysis engine combined with an AI reasoning layer. It produces structured trade setups (LONG / SHORT / NO_TRADE) with full supporting evidence.

---

## Important: Project Rules

Before modifying any part of this project, read:

**[Documents/Phase0/PROJECT_RULES.md](../Documents/Phase0/PROJECT_RULES.md)**

These rules cover secrets management, database security, AI output integrity, trading safety, and data transparency. They are non-negotiable.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend / DB | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Charting | TradingView Lightweight Charts |
| Market Data | Twelve Data (via provider abstraction) |
| AI | Configurable via `AI_MODEL` env variable |

---

## Getting Started

1. Copy `.env.local.example` to `.env.local` and fill in your credentials.
2. Run `npm install`
3. Run `npm run dev`

---

## Build Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Project Rules and Safety | ✅ Complete |
| 1 | Initialize Web Application | ✅ Complete |
| 2 | Supabase Database Foundation | ✅ Complete |
| 3 | Market Data Layer | ✅ Complete |
| 4 | Charting | ✅ Complete |
| 5 | Technical Analysis Engine | ✅ Complete |
| 6 | Setup Detection | ✅ Complete |
| 7 | Trade-Level Calculation | ✅ Complete |
| 8 | Scoring Engine | ✅ Complete |
| 9 | AI Analysis Layer | ✅ Complete |
| 10 | Screenshot Analysis | ✅ Complete |
| 11 | Analysis UI | ✅ Complete |
| 12 | Analysis History | ✅ Complete |
| 13 | User Settings | ✅ Complete |
| 14 | Testing | ✅ Complete |
| 15 | Security Testing | ⏳ Active |

## Phase: 15 — Security Testing
## Status: ⏳ ACTIVE

Phase 15 focuses on Row Level Security (RLS) and authentication boundary testing:

- Verify users cannot read/modify other users' analyses
- Verify users cannot access other users' screenshots
- Verify database policies enforce user isolation
- Verify server endpoints authenticate requests
- Confirm secrets are never exposed to client bundles

---

## Previous Phase Summary: Phase 14 — Testing
## Status: ✅ COMPLETE

Phase 14 built a comprehensive automated test suite:

- **137 tests passing** across 8 test suites
- **Technical-analysis coverage**: RSI, MACD, EMA, ATR, Bollinger Bands, swing points, market structure, support/resistance, Fibonacci, candlestick patterns
- **Edge-case validation**: flat-price, near-zero volatility, insufficient candles, NaN/Infinity protection, invalid input handling
- **AI boundary testing**: malformed JSON, missing fields, invalid scores, impossible trade geometry, markdown-wrapped responses
- **User settings validation**: enum validation, numeric normalization, boolean checks, invalid ranges
- **Fixed baseline**: Known SHORT entry-zone test issue resolved (fixture used resistance level beyond 1.5×ATR threshold)
- **Verification**: TypeScript 0 errors, lint passing, 0 test failures

---

**Environment Setup**

- `AI_API_KEY` and `AI_MODEL` must be set in `.env.local` before the analysis pipeline will function
- See `.env.local.example` for the complete list of required credentials

---

## Testing

Run the full test suite from the `trading-analyst` directory:

```bash
npm test -- --runInBand
```

Or with TypeScript and linting:

```bash
npx tsc --noEmit
npm run lint
npm test -- --runInBand
```

---

## Disclaimer

This tool is for personal analysis and decision support only. It does not execute trades. Past analysis results do not guarantee future profitability.
