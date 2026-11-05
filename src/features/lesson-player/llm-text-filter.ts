// src/features/lesson-player/llm-text-filter.ts
//
// The RUNTIME half of the no-shame guarantee (GC-13). The build-time linter (evals/checks/copy-lint.mjs)
// scans STATIC string literals in the source tree, so it can prove the app's own authored copy is
// clean — but it cannot see text the Feynman grader generates at runtime (next_step_hint, misconception).
// This filter applies the EXACT SAME banned-phrase list to that live model output, and on any hit swaps
// the whole string for an app-authored templated fallback (which the linter itself has already cleared).
//
// Single source of truth: the banned list is imported straight from evals/banned-copy.json — the same
// file the linter reads — so the runtime filter and the build gate can never drift. Matching mirrors the
// linter exactly: case-insensitive substring on the rendered text.
//
// Scope: only free-form model PROSE passes through here (next_step_hint and misconception). The grader's
// covered_points / missing_points are key-point IDs that the app renders as its own canonical, linted
// key-point text — they are never model prose and must not be filtered as such.

import bannedCopy from '../../../evals/banned-copy.json';

/** The banned phrases, lower-cased once, sourced from the same file the copy-lint gate enforces. */
export const RUNTIME_BANNED_COPY: readonly string[] = (bannedCopy.banned ?? []).map((phrase) =>
  String(phrase).toLowerCase(),
);

/** Which app-authored fallback to substitute when a banned phrase is found in model prose. */
export type LlmFallbackTemplateId = 'next-step-hint' | 'misconception';

// App-authored, no-shame, and themselves clear of the banned list — the linter scans these literals.
export const LLM_FALLBACK_TEMPLATES: Record<LlmFallbackTemplateId, string> = {
  'next-step-hint': 'Re-read the key points below, then try teaching it once more from memory.',
  misconception: 'One idea here is worth a second look — check the key points below.',
};

/**
 * Return `text` unchanged when it is free of every banned phrase; otherwise return the app-authored
 * fallback for `fallbackTemplateId`. Empty/blank input passes through untouched (an absent hint is not
 * shame copy). Never throws.
 */
export function filterLlmText(text: string, fallbackTemplateId: LlmFallbackTemplateId): string {
  const lower = text.toLowerCase();
  for (const phrase of RUNTIME_BANNED_COPY) {
    if (phrase.length > 0 && lower.includes(phrase)) {
      return LLM_FALLBACK_TEMPLATES[fallbackTemplateId];
    }
  }
  return text;
}
