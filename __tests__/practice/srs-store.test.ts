// __tests__/practice/srs-store.test.ts
//
// The persisted SRS deck store (src/state/srs.ts) — the thin edge over the pure FSRS engine. These
// tests assert the store's four contracts: mistake capture creates a card, grading advances it,
// selectSession respects the daily cap for any backlog, and the exposed session view carries NO raw
// due count (the no-shame / ADHD rule, PLAN-rev2 §4.7 #9). The engine math itself is proven in
// __tests__/engine/srs.test.ts; here we only prove the store wires it correctly.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { DAY_MS } from '@/engine/time';
import { WARMUP_MAX_CARDS } from '@/engine/srs';
import { useSrsStore } from '@/state/srs';

jest.mock('@react-native-async-storage/async-storage', () => {
  const backing: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: (k: string) => Promise.resolve(k in backing ? backing[k] : null),
      setItem: (k: string, v: string) => {
        backing[k] = v;
        return Promise.resolve();
      },
      removeItem: (k: string) => {
        delete backing[k];
        return Promise.resolve();
      },
      getAllKeys: () => Promise.resolve(Object.keys(backing)),
      clear: () => {
        for (const k of Object.keys(backing)) delete backing[k];
        return Promise.resolve();
      },
    },
  };
});

const T0 = 1_700_000_000_000;
const GOAL_MINUTES = 10; // → cap = round(10 * 2 cards/min) = 20

beforeEach(() => {
  useSrsStore.getState().reset();
});

describe('recordMistake', () => {
  it('creates a card keyed by questionId, in the deck, reviewed once', () => {
    useSrsStore.getState().recordMistake('q-1', 'concept-a', T0);

    const card = useSrsStore.getState().cards['q-1'];
    expect(card).toBeDefined();
    expect(card.id).toBe('q-1');
    expect(card.conceptId).toBe('concept-a');
    expect(card.reps).toBe(1);
    // A first-ever miss lands the card in a learning state and gives it a (small, positive) interval.
    expect(card.state).toBe('learning');
    expect(card.due).toBeGreaterThan(T0);
    // The LWW high-water mark advanced to the write time.
    expect(useSrsStore.getState().updatedAt).toBe(T0);
  });

  it('lapses an existing card on a repeat miss rather than duplicating it', () => {
    useSrsStore.getState().recordMistake('q-1', 'concept-a', T0);
    useSrsStore.getState().recordMistake('q-1', 'concept-a', T0 + DAY_MS);

    expect(Object.keys(useSrsStore.getState().cards)).toEqual(['q-1']);
    expect(useSrsStore.getState().cards['q-1'].reps).toBe(2);
  });
});

describe('gradeReview', () => {
  it('advances an existing card on a correct review (graduates it to review state)', () => {
    useSrsStore.getState().recordMistake('q-1', 'concept-a', T0);
    const before = useSrsStore.getState().cards['q-1'];

    useSrsStore.getState().gradeReview('q-1', true, T0 + DAY_MS);
    const after = useSrsStore.getState().cards['q-1'];

    expect(after.reps).toBe(before.reps + 1);
    expect(after.state).toBe('review');
    expect(after.due).toBeGreaterThan(after.lastReview ?? 0);
  });

  it('is a no-op for an unknown question id (e.g. a warm-up card never missed)', () => {
    useSrsStore.getState().gradeReview('never-seen', true, T0);
    expect(useSrsStore.getState().cards['never-seen']).toBeUndefined();
    expect(Object.keys(useSrsStore.getState().cards)).toHaveLength(0);
  });
});

describe('selectSession', () => {
  it('caps the presented list at the daily budget for a large backlog (normal mode)', () => {
    // 50 misses, all captured at T0 (so lastReview = T0).
    for (let i = 0; i < 50; i++) {
      useSrsStore.getState().recordMistake(`q-${i}`, `concept-${i % 5}`, T0);
    }
    // 3 days later: every card is due, but only 3 idle days → NORMAL mode (no welcome-back).
    const session = useSrsStore.getState().selectSession({
      now: T0 + 3 * DAY_MS,
      dailyGoalMinutes: GOAL_MINUTES,
    });

    expect(session.mode).toBe('normal');
    expect(session.cap).toBe(20);
    expect(session.cards).toHaveLength(20);
  });

  it('returns a gentle welcome-back warmup after ≥5 idle days (≤ warmup ceiling)', () => {
    for (let i = 0; i < 30; i++) {
      useSrsStore.getState().recordMistake(`q-${i}`, `concept-${i % 5}`, T0);
    }
    const session = useSrsStore.getState().selectSession({
      now: T0 + 6 * DAY_MS,
      dailyGoalMinutes: GOAL_MINUTES,
    });

    expect(session.mode).toBe('warmup');
    expect(session.cards.length).toBeLessThanOrEqual(WARMUP_MAX_CARDS);
  });

  it('exposes NO raw due count anywhere on the session view (no-shame contract)', () => {
    for (let i = 0; i < 10; i++) {
      useSrsStore.getState().recordMistake(`q-${i}`, 'concept-a', T0);
    }
    const session = useSrsStore.getState().selectSession({
      now: T0 + 3 * DAY_MS,
      dailyGoalMinutes: GOAL_MINUTES,
    });

    expect(session).not.toHaveProperty('totalDue');
    expect(session).not.toHaveProperty('dueCount');
    expect(session).not.toHaveProperty('backlogCount');
    // The only integer on the view is `cap` — a display budget, not a count of what's waiting.
    expect(Object.keys(session).sort()).toEqual(['cap', 'cards', 'mode']);
  });
});
