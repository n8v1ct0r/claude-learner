// __tests__/path/unit-review.test.ts
//
// The unit-review selector (src/features/path/unit-review.ts) is pure, so it is tested directly. It
// runs against the REAL pilot unit (C1-U1 "Think in Agents") to prove it returns the unit's actual
// questions, and against synthetic fixtures to prove the mistakes-first ordering and dedupe. Also
// asserts the energy-free contract flag (§4.4).

import { describe, expect, it } from '@jest/globals';

import { selectUnitReviewQuestions, UNIT_REVIEW_IS_ENERGY_FREE } from '@/features/path/unit-review';

import { c1u1ThinkInAgents } from '../../content/src/d1-agentic-architecture/c1-u1/unit';
import type { Lesson, Question, Unit } from '../../content/schema/types';

function question(id: string): Question {
  return { id } as unknown as Question;
}

function unit(lessons: Lesson[]): Unit {
  return { id: 'u', title: 'U', order: 0, lessons } as unknown as Unit;
}

function lesson(id: string, exercises: Question[]): Lesson {
  return { id, title: id, order: 0, exercises } as unknown as Lesson;
}

describe('selectUnitReviewQuestions — the real pilot unit', () => {
  it('returns every question across the unit in spine order (no mistakes given)', () => {
    const expected = c1u1ThinkInAgents.lessons.flatMap((l) => l.exercises.map((q) => q.id));
    const selected = selectUnitReviewQuestions({ unit: c1u1ThinkInAgents });
    expect(selected.map((q) => q.id)).toEqual(expected);
    expect(selected.length).toBeGreaterThan(0);
  });
});

describe('selectUnitReviewQuestions — ordering and dedupe', () => {
  const fixture = unit([
    lesson('la', [question('q1'), question('q2'), question('q3')]),
    lesson('lb', [question('q4'), question('q5')]),
  ]);

  it('keeps spine order when there are no recorded mistakes', () => {
    expect(selectUnitReviewQuestions({ unit: fixture }).map((q) => q.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5']);
  });

  it('pulls previously-missed questions to the front, preserving their relative order', () => {
    const selected = selectUnitReviewQuestions({ unit: fixture, mistakenQuestionIds: ['q4', 'q2'] });
    // q2 and q4 first (in spine order q2 before q4), then the untouched remainder.
    expect(selected.map((q) => q.id)).toEqual(['q2', 'q4', 'q1', 'q3', 'q5']);
  });

  it('ignores unknown mistaken ids and still returns the full set once', () => {
    const selected = selectUnitReviewQuestions({ unit: fixture, mistakenQuestionIds: ['does-not-exist'] });
    expect(selected.map((q) => q.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5']);
  });

  it('dedupes a question id shared across lessons', () => {
    const dupUnit = unit([lesson('la', [question('q1'), question('q2')]), lesson('lb', [question('q1'), question('q3')])]);
    expect(selectUnitReviewQuestions({ unit: dupUnit }).map((q) => q.id)).toEqual(['q1', 'q2', 'q3']);
  });

  it('is documented as energy-free (§4.4)', () => {
    expect(UNIT_REVIEW_IS_ENERGY_FREE).toBe(true);
  });
});
