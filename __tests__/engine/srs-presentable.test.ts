// __tests__/engine/srs-presentable.test.ts — FT-1 at the engine (GC-04 oracle) level.
//
// A card the Practice player cannot load (a retired id, a feynman item, or — before FT-1 — every
// exam-register miss) must never sit at the head of the review queue or use up the session cap.
// The caller says which cards it can present; the engine drops the rest BEFORE ordering and capping,
// and leaves their due dates untouched so a later content build can still surface them.

import { describe, expect, it } from '@jest/globals';

import { captureMistake, selectDueForSession, WARMUP_MAX_CARDS, type SrsCard } from '@/engine/srs';
import { DAY_MS, HOUR_MS } from '@/engine/time';

const T0 = Date.UTC(2026, 8, 1, 9);

function misses(prefix: string, count: number, at: number): SrsCard[] {
  return Array.from({ length: count }, (_, i) =>
    captureMistake(null, `${prefix}-${String(i).padStart(2, '0')}`, 'concept-x', at),
  );
}

describe('selectDueForSession — cards the caller cannot present (FT-1)', () => {
  const unloadable = misses('reg-d1-q', 30, T0); // captured first ⇒ the most overdue cards
  const lessonMiss = captureMistake(null, 'c1-u1-l1-q01', 'concept-x', T0 + 12 * HOUR_MS);
  const loadable = new Set([lessonMiss.id]);
  const isPresentable = (card: SrsCard): boolean => loadable.has(card.id);

  it('skips them before ordering and capping, so a later lesson miss still gets a seat', () => {
    const session = selectDueForSession({
      allCards: [...unloadable, lessonMiss],
      now: T0 + DAY_MS,
      dailyGoalMinutes: 10,
      idleDays: 0,
      isPresentable,
    });
    expect(session.mode).toBe('normal');
    expect(session.cap).toBe(20);
    expect(session.cards.map((card) => card.id)).toEqual([lessonMiss.id]);
  });

  it('applies to the welcome-back warmup too', () => {
    const session = selectDueForSession({
      allCards: [...unloadable, lessonMiss],
      now: T0 + 8 * DAY_MS,
      dailyGoalMinutes: 10,
      idleDays: 7,
      isPresentable,
    });
    expect(session.mode).toBe('warmup');
    expect(session.cap).toBe(WARMUP_MAX_CARDS);
    expect(session.cards.map((card) => card.id)).toEqual([lessonMiss.id]);
  });

  it('returns an empty session when nothing presentable is due, never a list of unloadable cards', () => {
    const session = selectDueForSession({
      allCards: unloadable,
      now: T0 + DAY_MS,
      dailyGoalMinutes: 10,
      idleDays: 0,
      isPresentable,
    });
    expect(session.cards).toEqual([]);
  });

  it('leaves skipped cards scheduled (their due date is untouched)', () => {
    const before = unloadable.map((card) => card.due);
    selectDueForSession({ allCards: unloadable, now: T0 + DAY_MS, dailyGoalMinutes: 10, idleDays: 0, isPresentable });
    expect(unloadable.map((card) => card.due)).toEqual(before);
  });

  it('still presents every due card when the caller gives no predicate (unchanged default)', () => {
    const session = selectDueForSession({
      allCards: [...unloadable, lessonMiss],
      now: T0 + DAY_MS,
      dailyGoalMinutes: 10,
      idleDays: 0,
    });
    expect(session.cards).toHaveLength(20);
    expect(session.cards.map((card) => card.id)).not.toContain(lessonMiss.id);
  });
});
