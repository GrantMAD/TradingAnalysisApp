/**
 * lib/analysis/validator.ts — Phase 9: AI Analysis Layer
 *
 * Validates raw AI response text against the AIResponseSchema.
 *
 * PROJECT RULES:
 *   Rule 5  — All AI output must be validated before storing or displaying.
 *             Unvalidated output must never reach the DB or UI.
 *   Rule 9  — No broker execution fields in validation logic.
 *   Rule 12 — The raw text is stored before this function is called;
 *             validation failure still allows the raw text to be audited.
 */

import { AIResponseSchema } from './schemas';
import type { AIAnalysisResult } from './types';

export type ValidationSuccess = { success: true; data: AIAnalysisResult };
export type ValidationFailure = { success: false; error: string };
export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Parses and validates the raw AI response text.
 *
 * Never throws — all errors are returned as ValidationFailure so the
 * pipeline can record them without crashing.
 */
export function validateAIResponse(rawText: string): ValidationResult {
  // Step 1: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      success: false,
      error: `AI response is not valid JSON: ${rawText.slice(0, 200)}`,
    };
  }

  // Step 2: Zod schema validation (includes cross-field refinements)
  const result = AIResponseSchema.safeParse(parsed);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    return {
      success: false,
      error: `AI response schema validation failed: ${issues}`,
    };
  }

  // Step 3: Cast to the application type and return
  // The Zod schema and AIAnalysisResult are structurally equivalent.
  return {
    success: true,
    data: result.data as AIAnalysisResult,
  };
}
