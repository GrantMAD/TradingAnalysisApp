/**
 * lib/analysis/schemas.ts — Phase 9: AI Analysis Layer
 *
 * Zod validation schemas for the AI response.
 *
 * PROJECT RULES:
 *   Rule 5  — All AI output must be validated before storing or displaying.
 *   Rule 8  — NO_TRADE must be a valid first-class decision state.
 *   Rule 9  — No broker execution fields exist in this schema.
 *   Rule 10 — Scores are labelled as heuristics, not win probabilities.
 *   Rule 15 — Explanation fields are AI interpretation, not mathematical facts.
 *
 * Invalid AI responses are rejected here — they must never reach the database
 * or the UI in an unvalidated form.
 */

import { z } from 'zod';

// ─── Evidence item ────────────────────────────────────────────────────────────

export const AIEvidenceSchema = z.object({
  category: z.string().min(1),
  name: z.string().min(1),
  direction: z.enum(['bullish', 'bearish', 'neutral']),
  /** Score contribution for this evidence item (0–100). */
  score: z.number().min(0).max(100),
  finding: z.string().min(1),
  /** AI interpretation — not a mathematical fact. Rule 15. */
  explanation: z.string().min(1),
});

// ─── AI explanation (all strings are AI interpretation) ───────────────────────

export const AIExplanationSchema = z.object({
  market_structure: z.string().min(1),
  trend: z.string().min(1),
  support_resistance: z.string().min(1),
  momentum: z.string().min(1),
  volume: z.string().min(1),
  volatility: z.string().min(1),
  entry: z.string().min(1),
  stop_loss: z.string().min(1),
  take_profit: z.string().min(1),
  risk_reward: z.string().min(1),
  why_this_trade: z.string().min(1),
  why_not_other_trade: z.string().min(1),
});

// ─── Trade levels (only present for LONG / SHORT decisions) ──────────────────

export const AITradeSchema = z.object({
  entry_min: z.number().positive(),
  entry_max: z.number().positive(),
  stop_loss: z.number().positive(),
  take_profit_1: z.number().positive(),
  take_profit_2: z.number().positive().optional(),
  risk_reward: z.number().positive().min(0.1),
});

// ─── Top-level AI response schema ─────────────────────────────────────────────

export const AIResponseSchema = z
  .object({
    decision: z.enum(['LONG', 'SHORT', 'NO_TRADE']),
    market_bias: z.string().min(1),
    /**
     * AI holistic setup quality score (0–100).
     * This is a heuristic, NOT a probability of winning. Rule 10.
     */
    setup_score: z.number().min(0).max(100),
    /**
     * AI confidence in its interpretation (0–100).
     * This is NOT a probability of winning. Rule 10.
     */
    confidence_score: z.number().min(0).max(100),
    summary: z.string().min(1),
    /** Only populated for LONG / SHORT decisions. */
    trade: AITradeSchema.optional(),
    trigger_condition: z.string().optional(),
    invalidation_condition: z.string().min(1),
    evidence: z.array(AIEvidenceSchema).min(1),
    explanation: AIExplanationSchema,
    /** Data quality issues, methodology limitations, market caveats. */
    warnings: z.array(z.string()),
  })
  // ─── Cross-field validation ──────────────────────────────────────────────
  .superRefine((val, ctx) => {
    // LONG and SHORT decisions MUST include trade levels
    if ((val.decision === 'LONG' || val.decision === 'SHORT') && !val.trade) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `decision is '${val.decision}' but 'trade' field is absent`,
        path: ['trade'],
      });
      return;
    }

    if (!val.trade) return; // NO_TRADE — no further level checks needed

    const { entry_min, entry_max, stop_loss, take_profit_1 } = val.trade;

    // entry_min must be <= entry_max
    if (entry_min > entry_max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `entry_min (${entry_min}) must be <= entry_max (${entry_max})`,
        path: ['trade', 'entry_min'],
      });
    }

    if (val.decision === 'LONG') {
      // Stop must be below the entry zone
      if (stop_loss >= entry_min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `LONG stop_loss (${stop_loss}) must be below entry_min (${entry_min})`,
          path: ['trade', 'stop_loss'],
        });
      }
      // TP1 must be above the entry zone
      if (take_profit_1 <= entry_max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `LONG take_profit_1 (${take_profit_1}) must be above entry_max (${entry_max})`,
          path: ['trade', 'take_profit_1'],
        });
      }
    }

    if (val.decision === 'SHORT') {
      // Stop must be above the entry zone
      if (stop_loss <= entry_max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `SHORT stop_loss (${stop_loss}) must be above entry_max (${entry_max})`,
          path: ['trade', 'stop_loss'],
        });
      }
      // TP1 must be below the entry zone
      if (take_profit_1 >= entry_min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `SHORT take_profit_1 (${take_profit_1}) must be below entry_min (${entry_min})`,
          path: ['trade', 'take_profit_1'],
        });
      }
    }

    // TP2 must be more favorable than TP1
    if (val.trade.take_profit_2 !== undefined) {
      if (val.decision === 'LONG' && val.trade.take_profit_2 <= take_profit_1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `LONG take_profit_2 must be above take_profit_1`,
          path: ['trade', 'take_profit_2'],
        });
      }
      if (val.decision === 'SHORT' && val.trade.take_profit_2 >= take_profit_1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `SHORT take_profit_2 must be below take_profit_1`,
          path: ['trade', 'take_profit_2'],
        });
      }
    }
  });

export type AIResponse = z.infer<typeof AIResponseSchema>;
