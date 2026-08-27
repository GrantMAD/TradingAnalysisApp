/**
 * lib/analysis/ai-client.ts — Phase 9: AI Analysis Layer
 *
 * Server-side only AI API client.
 *
 * ⚠️  NEVER import this file from client components or 'use client' pages.
 *     It reads AI_API_KEY from process.env, which must never reach the browser.
 *
 * PROJECT RULES:
 *   Rule 1  — AI_API_KEY is read only from server-side process.env.
 *   Rule 9  — This client produces text analysis only. No broker execution.
 *   Rule 12 — Raw response text is returned before any validation so the
 *              pipeline can store it for audit purposes.
 */

import { GoogleGenAI } from '@google/genai';
import { AICallError } from './types';

/** Maximum tokens the AI may return. Prevents runaway responses. */
const MAX_OUTPUT_TOKENS = 4096;

/**
 * Calls the configured AI model with the given system and user prompts.
 *
 * Returns the raw response text and the model identifier used.
 * The caller is responsible for validation — this function never parses the JSON.
 *
 * @throws {AICallError} if the API call fails or returns no content.
 */
export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  screenshot?: { base64: string; mimeType: string },
): Promise<{ rawText: string; modelUsed: string }> {
  const apiKey = process.env.AI_API_KEY;
  const modelId = process.env.AI_MODEL || 'gemini-2.0-flash';

  if (!apiKey) {
    throw new AICallError('AI_API_KEY environment variable is not set.');
  }

  const client = new GoogleGenAI({ apiKey });

  let rawText: string;

  try {
    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [{ text: userPrompt }];
    
    if (screenshot) {
      parts.push({
        inlineData: {
          data: screenshot.base64,
          mimeType: screenshot.mimeType,
        },
      });
    }

    const response = await client.models.generateContent({
      model: modelId,
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        // Request JSON output where supported.
        responseMimeType: 'application/json',
      },
    });

    rawText = response.text ?? '';
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new AICallError(`AI API call failed: ${message}`);
  }

  if (!rawText || rawText.trim().length === 0) {
    throw new AICallError('AI returned an empty response.');
  }

  return { rawText, modelUsed: modelId };
}
