// __tests__/feynman-loop/llm-text-filter.test.ts  (GC-13 runtime half)
//
// The runtime no-shame filter is the only thing standing between model-generated prose and the
// learner's screen. This proves: (a) clean prose passes through untouched; (b) ANY banned phrase —
// case-insensitively, anywhere in the string — is swapped wholesale for the app-authored fallback;
// and (c) the runtime banned list is a SUPERSET of the exact list the build-time linter enforces
// (evals/banned-copy.json), so the two gates can never drift apart and let shame copy slip through
// at runtime that the linter would have caught at build time.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from '@jest/globals';

import {
  LLM_FALLBACK_TEMPLATES,
  RUNTIME_BANNED_COPY,
  filterLlmText,
} from '@/features/lesson-player/llm-text-filter';

const BANNED_JSON_PATH = resolve(__dirname, '../../evals/banned-copy.json');
const lintBanned: string[] = JSON.parse(readFileSync(BANNED_JSON_PATH, 'utf8')).banned;

describe('filterLlmText — clean prose passes, banned prose is templated', () => {
  it('returns clean model text unchanged', () => {
    const clean = 'Nice — now say what an agent decides on its own each step.';
    expect(filterLlmText(clean, 'next-step-hint')).toBe(clean);
  });

  it('passes empty/blank text through untouched (an absent hint is not shame copy)', () => {
    expect(filterLlmText('', 'next-step-hint')).toBe('');
    expect(filterLlmText('   ', 'misconception')).toBe('   ');
  });

  it('swaps the whole string for the fallback on any banned phrase, case-insensitively', () => {
    // "you should have" is on the banned list — a classic shame framing.
    const shamed = 'You should have covered what an agent decides.';
    expect(filterLlmText(shamed, 'next-step-hint')).toBe(LLM_FALLBACK_TEMPLATES['next-step-hint']);

    // Upper/mixed case and mid-sentence placement are still caught.
    const mixed = 'This is INCORRECT! Try again with the agent idea.';
    expect(filterLlmText(mixed, 'misconception')).toBe(LLM_FALLBACK_TEMPLATES.misconception);
  });

  it('uses the requested template id for the fallback', () => {
    const shamed = 'you failed to mention tool use';
    expect(filterLlmText(shamed, 'misconception')).toBe(LLM_FALLBACK_TEMPLATES.misconception);
    expect(filterLlmText(shamed, 'next-step-hint')).toBe(LLM_FALLBACK_TEMPLATES['next-step-hint']);
  });
});

describe('runtime banned list stays a superset of the linter list (no drift)', () => {
  it('contains every phrase evals/banned-copy.json enforces (case-insensitive)', () => {
    const runtime = new Set(RUNTIME_BANNED_COPY.map((p) => p.toLowerCase()));
    for (const phrase of lintBanned) {
      expect(runtime.has(String(phrase).toLowerCase())).toBe(true);
    }
  });

  it('the app-authored fallbacks are themselves free of every banned phrase', () => {
    for (const template of Object.values(LLM_FALLBACK_TEMPLATES)) {
      const lower = template.toLowerCase();
      for (const phrase of RUNTIME_BANNED_COPY) {
        expect(lower.includes(phrase)).toBe(false);
      }
    }
  });
});
