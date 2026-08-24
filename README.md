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
| 2 | Supabase Database Foundation | ⬜ Pending |
| 3 | Market Data Layer | ⬜ Pending |
| 4 | Technical Analysis Engine | ⬜ Pending |
| 5 | AI Analysis Engine | ⬜ Pending |
| 6 | Analysis UI | ⬜ Pending |
| 7 | History and Review | ⬜ Pending |

See [Documents/AI_Trading_Analyst_Phased_Build_Spec.md](../Documents/AI_Trading_Analyst_Phased_Build_Spec.md) for full specification.

---

## Disclaimer

This tool is for personal analysis and decision support only. It does not execute trades. Past analysis results do not guarantee future profitability.
