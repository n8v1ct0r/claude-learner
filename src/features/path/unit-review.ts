// src/features/path/unit-review.ts
//
// The PURE unit-review selector (PLAN-rev2 §4.4). Given a hydrated Unit, it returns the set of
// questions to re-serve as a "review this unit" session — every question across the unit's lessons,
// deduped by id, in spine order, with any previously-MISSED questions pulled to the front so the
// learner re-meets their weak spots first.
//
// Energy is deliberately NOT a concern here: unit review is energy-FREE (§4.4 — the guaranteed
// recovery path never charges to start). This module only decides WHICH questions and in WHAT order;
// the review player (src/features/path/UnitReviewPlayer.tsx) runs them without ever touching energy.
//
// `mistakenQuestionIds` is an input so the ordering stays pure and testable. The review player feeds
// it the question ids in the SRS deck (every card begins as a miss); with an empty list the selector
// simply returns the unit's questions in order.

import type { Question, Unit } from '../../../content/schema/types';

export interface UnitReviewInput {
  /** The fully hydrated unit to review. */
  unit: Unit;
  /** Question IDs the learner previously missed — ordered FIRST (mistakes-first). Defaults to none. */
  mistakenQuestionIds?: readonly string[];
}

/** Unit review never costs energy (§4.4). Exported so callers can assert/document the contract. */
export const UNIT_REVIEW_IS_ENERGY_FREE = true;

/**
 * Select the unit-review question set: all of the unit's questions (deduped, spine order), with
 * previously-missed questions moved to the front (preserving their relative spine order).
 */
export function selectUnitReviewQuestions({ unit, mistakenQuestionIds = [] }: UnitReviewInput): Question[] {
  const ordered: Question[] = [];
  const seen = new Set<string>();
  for (const lesson of unit.lessons) {
    for (const question of lesson.exercises) {
      if (seen.has(question.id)) continue;
      seen.add(question.id);
      ordered.push(question);
    }
  }

  const mistaken = new Set(mistakenQuestionIds);
  if (mistaken.size === 0) return ordered;

  const missedFirst = ordered.filter((q) => mistaken.has(q.id));
  const rest = ordered.filter((q) => !mistaken.has(q.id));
  return [...missedFirst, ...rest];
}
