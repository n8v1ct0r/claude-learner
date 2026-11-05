// src/features/lesson-player/grade.ts
//
// Pure answer grading for every renderer type in this milestone (mc + variants, multi, order, cloze).
// No React, no I/O — a plain function of (question, response) -> boolean, so it is trivially testable
// and shared by every renderer. The renderers own the input UI and build a typed `QuestionResponse`;
// this module owns the single source of truth for "is that response correct?".
//
// Correctness rules mirror the zod answer-key semantics (content/schema/zod.ts):
//   • mc     — the chosen option index equals answerKey (a single index).
//   • multi  — the chosen index SET equals the answerKey set (order irrelevant).
//   • order  — the arranged step-index sequence equals answerKey exactly (order IS the answer).
//   • cloze  — the chosen option index for every blank equals answerKey[i] exactly.
//   • match  — not gradeable in M3 (renderer is a stub); returns false defensively.

import type { Question } from '../../../content/schema/types';

export type QuestionResponse =
  | { type: 'mc'; index: number }
  | { type: 'multi'; indices: number[] }
  | { type: 'order'; order: number[] }
  | { type: 'cloze'; indices: number[] };

function sameSequence(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sameSequence(sortedA, sortedB);
}

/** Grade a typed response against the question's answer key. Unmatched type pairings grade false. */
export function gradeQuestion(question: Question, response: QuestionResponse): boolean {
  switch (question.type) {
    case 'mc':
      return response.type === 'mc' && response.index === question.answerKey;
    case 'multi':
      return response.type === 'multi' && sameSet(response.indices, question.answerKey);
    case 'order':
      return response.type === 'order' && sameSequence(response.order, question.answerKey);
    case 'cloze':
      return response.type === 'cloze' && sameSequence(response.indices, question.answerKey);
    case 'match':
      // Match renderer is deferred to M4 (no match questions in the pilot); never graded here.
      return false;
  }
}
