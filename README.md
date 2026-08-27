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
| 9 — AI Analysis Layer | ✅ COMPLETE |
| 10 — Screenshot Analysis | ✅ COMPLETE |
| 11 — Analysis UI | ✅ COMPLETE |

## Phase: 11 — Analysis UI
## Status: ✅ COMPLETE

### Verification
| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors (pre-existing warnings only) |
| All analysis components | ✅ Created and integrated |
| Dashboard page | ✅ Implemented |
| Analyze page | ✅ Implemented |

---

## Implemented

### New Analysis Components (`components/analysis/`)
- **`RunAnalysisButton.tsx`** — Client component triggering `POST /api/analysis/run`, polls `GET /api/analysis/[id]` every 2s. States: idle → loading → complete → error. Calls `onComplete(analysisId)` callback on success.
- **`AnalysisPanel.tsx`** — Main result display panel composing all sub-components. Shows stale-data banner if `data_is_stale = true`. Shows screenshot preview if `screenshot_path` is set.
- **`DecisionBadge.tsx`** — Renders LONG (green) / SHORT (red) / NO_TRADE (amber) with Rule 10 disclaimer: *"Scores reflect setup quality, not probability of profit."*
- **`TradeSetupSummary.tsx`** — Displays entry zone, stop loss, TP1, TP2, R:R in a clean grid. Labelled as pre-calculated facts from deterministic engine. R:R colour-coded (green ≥ user minimum, amber borderline). NO_TRADE shows "No trade setup — insufficient evidence".
- **`ScoreBars.tsx`** — Animated progress bars for Setup Score and Confidence Score (0–100). Tooltip: *"This is a heuristic quality score, not a win probability."*
- **`EvidenceCard.tsx`** — Renders one `analysis_evidence` item. Shows category, name, direction icon, score, finding, AI explanation. Visually distinguishes `finding` (deterministic fact) from `explanation` (AI interpretation).
- **`AnalysisExplanation.tsx`** — Collapsible accordion sections: Market Structure, Trend, Support & Resistance, Momentum, Volume, Volatility, Entry Reasoning, Stop Reasoning, Target Reasoning, Risk/Reward, Invalidation, Warnings. Warnings always expanded if non-empty.
- **`DataFreshnessBar.tsx`** — Persistent bar showing data timestamp, age in minutes, ⚠ stale badge if `data_is_stale = true`. Always visible.

### Pages
- **`app/(app)/analyze/page.tsx`** — Full Analysis screen (Client Component). Layout: ChartToolbar + DataFreshnessBar → ChartContainer with level overlays → ScreenshotUpload (toggleable) + RunAnalysisButton → AnalysisPanel with all sub-components. Chart levels derived from trade setup on completion.
- **`app/(app)/dashboard/page.tsx`** — Server-rendered dashboard. Sections: Welcome header, Quick Stats (total analyses, last analysis, most analysed instrument), Recent Analyses list (click navigates to `/analyze` with pre-selected instrument/timeframe), Watchlist Panel, "Run New Analysis" CTA.

### Chart Integration
- `ChartContainer` level overlays wired: entry zone, SL (red), TP1 (green), TP2 (green dashed) passed as `ChartLevel[]` on analysis completion. Cleared on new analysis run.

### Database / Storage
| Item | Status |
|------|--------|
| All Phase 10 items | ✅ Applied |
| Analysis UI components integrated | ✅ Complete |

---

## Files Changed

| File | Status |
|------|--------|
| `components/analysis/RunAnalysisButton.tsx` | NEW |
| `components/analysis/AnalysisPanel.tsx` | NEW |
| `components/analysis/DecisionBadge.tsx` | NEW |
| `components/analysis/TradeSetupSummary.tsx` | NEW |
| `components/analysis/ScoreBars.tsx` | NEW |
| `components/analysis/EvidenceCard.tsx` | NEW |
| `components/analysis/AnalysisExplanation.tsx` | NEW |
| `components/analysis/DataFreshnessBar.tsx` | NEW |
| `app/(app)/analyze/page.tsx` | REPLACED (was placeholder) |
| `app/(app)/dashboard/page.tsx` | REPLACED (was placeholder) |

---

## Architecture Notes

- All analysis components are Client Components (`'use client'`).
- Chart instrument/timeframe state lifted to Analyze page so `RunAnalysisButton` receives current selection.
- `ScreenshotUpload` hidden behind optional "Add Screenshot" toggle to avoid cluttering default flow.
- Screenshot path stored in state and passed to `RunAnalysisButton` when present.
- Dashboard is server-rendered for initial load performance; uses Supabase RLS for user-scoped data.
- `GET /api/analysis/[id]` endpoint (from Phase 9) returns all fields needed by UI including `market_snapshots.data_as_of`, `data_is_stale`, `trade_setups`, `analysis_evidence`, `screenshot_path`.

---

## Rule Compliance Checklist

| Rule | How it is enforced in Phase 11 |
|------|-------------------------------|
| Rule 5 — Validate AI output | Only data from validated `GET /api/analysis/[id]` endpoint is rendered. |
| Rule 8 — Allow NO_TRADE | `NO_TRADE` is a first-class UI state with its own layout (no trade table shown). |
| Rule 9 — No execution | No broker connect, order, or execution UI of any kind. |
| Rule 10 — No profit claims | Disclaimer shown beneath all score displays. |
| Rule 13 — No silent stale data | Stale data banner shown prominently when `data_is_stale = true`. |
| Rule 14 — Show timestamps | `DataFreshnessBar` on every analysis panel. |
| Rule 15 — Distinguish facts vs AI | `EvidenceCard` visually separates `finding` (fact) from `explanation` (AI). |

---

## Known Issues

- The pre-existing `trade-levels.test.ts` has 1 failing test (`SHORT entry zone`) — predates Phase 10 and is unrelated.
- `AI_API_KEY` and `AI_MODEL` must be set in `.env.local` before the pipeline will function.

---

## Disclaimer

This tool is for personal analysis and decision support only. It does not execute trades. Past analysis results do not guarantee future profitability.
