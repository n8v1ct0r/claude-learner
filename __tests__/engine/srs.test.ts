import { describe, expect, it } from '@jest/globals';

import { DAY_MS } from '@/engine/time';
import {
  DEFAULT_CARDS_PER_MINUTE,
  FEYNMAN_SEED_STABILITY,
  GRADE,
  REQUEST_RETENTION,
  WARMUP_MAX_CARDS,
  WELCOME_BACK_IDLE_DAYS,
  captureMistake,
  createCard,
  dailyPresentationCap,
  gradeFromCorrect,
  isDue,
  nextIntervalDays,
  retrievability,
  review,
  reviewCorrect,
  reviewIncorrect,
  selectDueForSession,
} from '@/engine/srs';
import type { Grade, SrsCard } from '@/engine/srs';

const T0 = 1_700_000_000_000; // fixed epoch anchor for the injectable clock
const intervalDays = (card: SrsCard, from: number): number => (card.due - from) / DAY_MS;

// A tiny deterministic PRNG (mulberry32) so generated backlogs are reproducible across runs.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build `n` cards with pseudo-random due offsets and stabilities around `now`. */
function makeBacklog(n: number, now: number, seed = 1): SrsCard[] {
  const rand = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const overdueDays = Math.floor(rand() * 60); // 0..59 days overdue
    return {
      id: `q${String(i).padStart(5, '0')}`,
      conceptId: `c${i % 40}`,
      itemType: rand() < 0.2 ? 'feynman' : 'question',
      stability: 0.1 + rand() * 100,
      difficulty: 1 + rand() * 9,
      due: now - overdueDays * DAY_MS,
      reps: Math.floor(rand() * 10),
      lapses: Math.floor(rand() * 3),
      lastReview: now - (overdueDays + 1) * DAY_MS,
      state: 'review',
    } satisfies SrsCard;
  });
}

/** Drive a card through repeated on-time reviews at a fixed grade, recording each interval (days). */
function driveOnTime(card: SrsCard, grade: Grade, steps: number): { cards: SrsCard[]; intervals: number[] } {
  const cards: SrsCard[] = [card];
  const intervals: number[] = [];
  let current = card;
  let clock = card.lastReview ?? T0;
  for (let i = 0; i < steps; i += 1) {
    clock = current.due; // review exactly when it comes due
    const next = review(current, grade, clock);
    intervals.push(intervalDays(next, clock));
    cards.push(next);
    current = next;
  }
  return { cards, intervals };
}

describe('FSRS math invariants', () => {
  it('retrievability is exactly the requested retention when elapsed == stability', () => {
    // FACTOR is defined so R(t=S) === 0.9.
    expect(retrievability(5, 5)).toBeCloseTo(REQUEST_RETENTION, 6);
    expect(retrievability(0, 5)).toBe(1); // just reviewed → certain recall
    expect(retrievability(100, 5)).toBeLessThan(0.5); // long overdue → weak recall
  });

  it('next interval ≈ stability at the default 0.9 retention', () => {
    expect(nextIntervalDays(10)).toBeCloseTo(10, 4);
    expect(nextIntervalDays(1)).toBeCloseTo(1, 4);
  });

  it('a lower requested retention yields a longer interval', () => {
    expect(nextIntervalDays(10, 0.8)).toBeGreaterThan(nextIntervalDays(10, 0.9));
  });
});

describe('createCard', () => {
  it('creates a `new`, due-now question card with no memory yet', () => {
    const card = createCard('q1', 'c1', 'question', T0);
    expect(card).toMatchObject({ id: 'q1', itemType: 'question', state: 'new', stability: 0, due: T0 });
    expect(card.lastReview).toBeNull();
    expect(isDue(card, T0)).toBe(true);
  });

  it('seeds a feynman card into `review` state with a ≈1-day first interval', () => {
    const card = createCard('f1', 'c1', 'feynman', T0);
    expect(card.state).toBe('review');
    expect(card.stability).toBe(FEYNMAN_SEED_STABILITY);
    expect(card.lastReview).toBe(T0); // seed time anchors the first on-time review to R = 0.9
    expect(intervalDays(card, T0)).toBeCloseTo(1, 1);
  });
});

describe('gradeFromCorrect (binary → FSRS)', () => {
  it('maps correct → GOOD and incorrect → AGAIN', () => {
    expect(gradeFromCorrect(true)).toBe(GRADE.GOOD);
    expect(gradeFromCorrect(false)).toBe(GRADE.AGAIN);
  });
});

describe('first review of a new card seeds memory from the FSRS weights', () => {
  it('a GOOD first answer graduates the card to `review`', () => {
    const card = review(createCard('q1', 'c1', 'question', T0), GRADE.GOOD, T0);
    expect(card.state).toBe('review');
    expect(card.stability).toBeGreaterThan(0);
    expect(card.reps).toBe(1);
    expect(card.lapses).toBe(0);
    expect(card.lastReview).toBe(T0);
  });

  it('an AGAIN first answer enters `learning` with a short interval and no lapse yet', () => {
    const card = review(createCard('q1', 'c1', 'question', T0), GRADE.AGAIN, T0);
    expect(card.state).toBe('learning');
    expect(card.lapses).toBe(0); // a brand-new card cannot lapse (it never graduated)
    expect(intervalDays(card, T0)).toBeLessThan(1);
  });

  it('EASY seeds more stability than HARD', () => {
    const easy = review(createCard('q1', 'c1', 'question', T0), GRADE.EASY, T0);
    const hard = review(createCard('q2', 'c1', 'question', T0), GRADE.HARD, T0);
    expect(easy.stability).toBeGreaterThan(hard.stability);
  });
});

// ── PROPERTY (b): intervals are monotonic non-decreasing on repeated GOOD ────────────────────────
describe('property (b): repeated GOOD reviews give monotonic non-decreasing intervals', () => {
  it('holds for a question card over many reps', () => {
    const start = review(createCard('q1', 'c1', 'question', T0), GRADE.GOOD, T0);
    const { intervals } = driveOnTime(start, GRADE.GOOD, 15);
    for (let i = 1; i < intervals.length; i += 1) {
      expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
    }
    expect(intervals[intervals.length - 1]).toBeGreaterThan(intervals[0]); // and it genuinely grows
  });

  it('stability strictly increases under on-time GOOD reviews', () => {
    const start = review(createCard('q1', 'c1', 'question', T0), GRADE.GOOD, T0);
    const { cards } = driveOnTime(start, GRADE.GOOD, 10);
    for (let i = 1; i < cards.length; i += 1) {
      expect(cards[i].stability).toBeGreaterThan(cards[i - 1].stability);
    }
  });
});

// ── PROPERTY (c): a lapse resets stability + state, and increments lapses ─────────────────────────
describe('property (c): a lapse resets stability and state', () => {
  it('an AGAIN on a graduated card drops stability, sets `relearning`, and counts a lapse', () => {
    // Build a strong, high-stability card first.
    const start = review(createCard('q1', 'c1', 'question', T0), GRADE.GOOD, T0);
    const strong = driveOnTime(start, GRADE.GOOD, 6).cards.at(-1)!;
    expect(strong.state).toBe('review');
    expect(strong.stability).toBeGreaterThan(5);

    const lapsed = review(strong, GRADE.AGAIN, strong.due);
    expect(lapsed.state).toBe('relearning');
    expect(lapsed.stability).toBeLessThan(strong.stability); // stability reset downward
    expect(lapsed.lapses).toBe(strong.lapses + 1);
    expect(intervalDays(lapsed, strong.due)).toBeLessThan(intervalDays(strong, strong.lastReview!));
  });

  it('reviewIncorrect never lets a lapse increase stability, for any generated card', () => {
    const backlog = makeBacklog(400, T0, 7);
    for (const card of backlog) {
      const lapsed = reviewIncorrect(card, card.due);
      expect(lapsed.stability).toBeLessThanOrEqual(card.stability + 1e-9);
      expect(lapsed.state).toBe('relearning');
    }
  });
});

// ── PROPERTY (d): due dates are deterministic (same inputs ⇒ same output, run twice) ──────────────
describe('property (d): determinism', () => {
  it('review() is a pure function of (card, grade, now)', () => {
    const card = createCard('q1', 'c1', 'question', T0);
    for (const grade of [GRADE.AGAIN, GRADE.HARD, GRADE.GOOD, GRADE.EASY] as Grade[]) {
      expect(review(card, grade, T0 + 3 * DAY_MS)).toEqual(review(card, grade, T0 + 3 * DAY_MS));
    }
  });

  it('selectDueForSession returns byte-identical sessions for identical inputs', () => {
    const allCards = makeBacklog(1000, T0, 42);
    const params = { allCards, now: T0, dailyGoalMinutes: 10, idleDays: 0 };
    expect(selectDueForSession(params)).toEqual(selectDueForSession(params));
  });

  it('due dates depend only on the state, not on wall-clock reads', () => {
    const a = review(createCard('q1', 'c1', 'question', T0), GRADE.GOOD, T0);
    const b = review(createCard('q1', 'c1', 'question', T0), GRADE.GOOD, T0);
    expect(a.due).toBe(b.due);
  });

  it('breaks ties on id so ordering is a stable total order (equal due + stability)', () => {
    // All cards share due and stability → selection must fall through to the id tie-break, giving a
    // deterministic ascending-id order in both the normal and warmup comparators.
    const tied: SrsCard[] = ['c', 'a', 'b', 'e', 'd'].map((id) => ({
      id,
      conceptId: 'k',
      itemType: 'question',
      stability: 4,
      difficulty: 5,
      due: T0 - DAY_MS,
      reps: 1,
      lapses: 0,
      lastReview: T0 - 2 * DAY_MS,
      state: 'review',
    }));
    const normal = selectDueForSession({ allCards: tied, now: T0, dailyGoalMinutes: 10, idleDays: 0 });
    const warm = selectDueForSession({ allCards: tied, now: T0, dailyGoalMinutes: 10, idleDays: 9 });
    expect(normal.cards.map((c) => c.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(warm.cards.map((c) => c.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

// ── PROPERTY (a): presented length ≤ cap for ANY backlog (normal, non-idle sessions) ──────────────
describe('property (a): the presented list never exceeds the daily cap for ANY backlog', () => {
  const sizes = [0, 1, 5, 19, 20, 21, 50, 200, 999, 1000, 3000, 5000];
  const goals = [1, 5, 10, 15, 20, 30];

  it('length ≤ round(goalMinutes × cardsPerMinute) across a wide sweep of backlog sizes/goals', () => {
    for (const size of sizes) {
      const allCards = makeBacklog(size, T0, size + 1);
      for (const dailyGoalMinutes of goals) {
        for (const idleDays of [0, 1, 4]) {
          // idle < 5 → normal session, capped from goal minutes
          const cap = dailyPresentationCap(dailyGoalMinutes);
          const session = selectDueForSession({ allCards, now: T0, dailyGoalMinutes, idleDays });
          expect(session.mode).toBe('normal');
          expect(session.cards.length).toBeLessThanOrEqual(cap);
          // presented ≤ due, and it presents everything up to the cap when there is a backlog
          const dueCount = allCards.filter((c) => isDue(c, T0)).length;
          expect(session.cards.length).toBe(Math.min(cap, dueCount));
        }
      }
    }
  });

  it('cap tracks the ADHD rule of thumb: a 10-min goal ⇒ ~20 cards', () => {
    expect(dailyPresentationCap(10)).toBe(20);
    expect(dailyPresentationCap(10, DEFAULT_CARDS_PER_MINUTE)).toBe(20);
    expect(DEFAULT_CARDS_PER_MINUTE).toBe(2);
  });

  it('overflow is not dropped — it stays scheduled (its due date is untouched)', () => {
    const allCards = makeBacklog(500, T0, 9);
    const session = selectDueForSession({ allCards, now: T0, dailyGoalMinutes: 5, idleDays: 0 });
    const shownIds = new Set(session.cards.map((c) => c.id));
    const overflow = allCards.filter((c) => isDue(c, T0) && !shownIds.has(c.id));
    expect(overflow.length).toBeGreaterThan(0);
    // Every overflow card is byte-identical to its original (never mutated/rescheduled by selection).
    for (const c of overflow) expect(c).toBe(allCards.find((o) => o.id === c.id));
  });
});

// ── PROPERTY (e): idle ≥ 5 ⇒ the fixed confidence-weighted warmup shape (≤10) ─────────────────────
describe('property (e): after ≥5 idle days the session is a fixed ≤10 confidence-weighted warmup', () => {
  it('returns ≤10 cards regardless of goal, ordered least-confident first, for ANY backlog', () => {
    for (const size of [0, 3, 9, 10, 11, 200, 5000]) {
      const allCards = makeBacklog(size, T0, size + 100);
      for (const dailyGoalMinutes of [1, 10, 60, 600]) {
        for (const idleDays of [WELCOME_BACK_IDLE_DAYS, 8, 40, 365]) {
          const session = selectDueForSession({ allCards, now: T0, dailyGoalMinutes, idleDays });
          expect(session.mode).toBe('warmup');
          expect(session.cards.length).toBeLessThanOrEqual(WARMUP_MAX_CARDS);
          const dueCount = allCards.filter((c) => isDue(c, T0)).length;
          expect(session.cards.length).toBe(Math.min(WARMUP_MAX_CARDS, dueCount));
          // confidence-weighted: non-decreasing stability (least confident surfaced first)
          for (let i = 1; i < session.cards.length; i += 1) {
            expect(session.cards[i].stability).toBeGreaterThanOrEqual(session.cards[i - 1].stability);
          }
        }
      }
    }
  });

  it('the warmup is independent of the daily goal (10-min and 600-min goals match)', () => {
    const allCards = makeBacklog(300, T0, 5);
    const small = selectDueForSession({ allCards, now: T0, dailyGoalMinutes: 10, idleDays: 9 });
    const large = selectDueForSession({ allCards, now: T0, dailyGoalMinutes: 600, idleDays: 9 });
    expect(small.cards.map((c) => c.id)).toEqual(large.cards.map((c) => c.id));
    expect(WELCOME_BACK_IDLE_DAYS).toBe(5);
    expect(WARMUP_MAX_CARDS).toBe(10);
  });

  it('exactly at the 5-idle-day threshold it is already a warmup', () => {
    const allCards = makeBacklog(30, T0, 3);
    expect(selectDueForSession({ allCards, now: T0, dailyGoalMinutes: 10, idleDays: 4 }).mode).toBe(
      'normal',
    );
    expect(selectDueForSession({ allCards, now: T0, dailyGoalMinutes: 10, idleDays: 5 }).mode).toBe(
      'warmup',
    );
  });
});

// ── PROPERTY (f): Feynman seeding lands early reps ≈1d/3d/7d ──────────────────────────────────────
describe('property (f): feynman items are seeded so early reps land ≈1d/3d/7d', () => {
  it('the first three on-time GOOD intervals approximate 1, 3, 7 days and are increasing', () => {
    const seed = createCard('f1', 'c1', 'feynman', T0);
    const first = intervalDays(seed, T0); // interval baked in at seed time
    const { intervals } = driveOnTime(seed, GRADE.GOOD, 2);
    const [second, third] = intervals;

    expect(first).toBeCloseTo(1, 1); // ≈ 1 day
    expect(second).toBeGreaterThan(2);
    expect(second).toBeLessThan(4.5); // ≈ 3 days
    expect(third).toBeGreaterThan(5);
    expect(third).toBeLessThan(9.5); // ≈ 7 days

    expect(second).toBeGreaterThan(first);
    expect(third).toBeGreaterThan(second);
  });
});

// ── PROPERTY (g): no API surface exposes a raw total-due count for display ────────────────────────
describe('property (g): the session type never exposes a raw total-due count (no backlog wall)', () => {
  it('SrsSession carries only { cards, mode, cap } — no totalDue/backlogCount/dueCount field', () => {
    // Intent encoded in the type (see SrsSession doc comment) AND asserted here: a caller cannot
    // read "how many cards are waiting" and render an Anki-style backlog wall (PLAN-rev2 §4.7 #9).
    const allCards = makeBacklog(2000, T0, 11);
    const session = selectDueForSession({ allCards, now: T0, dailyGoalMinutes: 10, idleDays: 0 });
    expect(Object.keys(session).sort()).toEqual(['cap', 'cards', 'mode']);
    const forbidden = ['totalDue', 'backlogCount', 'dueCount', 'total', 'remaining', 'overflow'];
    for (const key of forbidden) expect(session).not.toHaveProperty(key);
    // `cap` is a presentation budget, provably NOT the number of due cards (2000 due, cap 20).
    expect(session.cap).toBe(20);
    expect(allCards.filter((c) => isDue(c, T0)).length).toBeGreaterThan(session.cap);
  });
});

describe('graduated-card review branches (HARD/EASY penalties, elapsed guard)', () => {
  it('on a graduated card, EASY grows stability more than GOOD, which grows more than HARD', () => {
    const graduated = review(createCard('q1', 'c1', 'question', T0), GRADE.GOOD, T0);
    const at = graduated.due;
    const hard = review(graduated, GRADE.HARD, at).stability;
    const good = review(graduated, GRADE.GOOD, at).stability;
    const easy = review(graduated, GRADE.EASY, at).stability;
    expect(hard).toBeLessThan(good);
    expect(good).toBeLessThan(easy);
  });

  it('an AGAIN on a non-graduated (learning) card does NOT count another lapse', () => {
    const learning = captureMistake(null, 'q1', 'c1', T0); // state 'learning', lapses 0
    const again = review(learning, GRADE.AGAIN, learning.due);
    expect(again.state).toBe('relearning');
    expect(again.lapses).toBe(0); // learning → relearning is not a fresh lapse
  });

  it('a review-state card with a null lastReview treats elapsed as 0 (defensive guard)', () => {
    const card: SrsCard = {
      id: 'q1',
      conceptId: 'c1',
      itemType: 'question',
      stability: 5,
      difficulty: 5,
      due: T0,
      reps: 3,
      lapses: 0,
      lastReview: null,
      state: 'review',
    };
    // elapsed 0 ⇒ R = 1 ⇒ recall growth term is 0 ⇒ stability unchanged.
    expect(review(card, GRADE.GOOD, T0).stability).toBeCloseTo(5, 6);
  });
});

describe('dailyPresentationCap edge cases', () => {
  it('clamps a non-positive goal to a zero cap (never negative)', () => {
    expect(dailyPresentationCap(0)).toBe(0);
    expect(dailyPresentationCap(-5)).toBe(0);
  });
  it('honors a custom cards-per-minute rate', () => {
    expect(dailyPresentationCap(10, 3)).toBe(30);
  });
});

describe('captureMistake (automatic mistake capture)', () => {
  it('creates a fresh card and fails it when the concept is new to the deck', () => {
    const card = captureMistake(null, 'q1', 'c1', T0);
    expect(card).toMatchObject({ id: 'q1', conceptId: 'c1', itemType: 'question', state: 'learning' });
    expect(card.lapses).toBe(0);
    expect(isDue(card, T0 + DAY_MS)).toBe(true); // resurfaces soon
  });

  it('lapses an existing graduated card (increments lapses, resets to relearning)', () => {
    const strong = driveOnTime(
      review(createCard('q1', 'c1', 'question', T0), GRADE.GOOD, T0),
      GRADE.GOOD,
      4,
    ).cards.at(-1)!;
    const lapsed = captureMistake(strong, 'q1', 'c1', strong.due);
    expect(lapsed.state).toBe('relearning');
    expect(lapsed.lapses).toBe(strong.lapses + 1);
    expect(lapsed.stability).toBeLessThan(strong.stability);
  });

  it('is deterministic', () => {
    expect(captureMistake(null, 'q1', 'c1', T0)).toEqual(captureMistake(null, 'q1', 'c1', T0));
  });
});

describe('reviewCorrect / reviewIncorrect convenience wrappers', () => {
  it('reviewCorrect advances a card the same as a GOOD review', () => {
    const card = review(createCard('q1', 'c1', 'question', T0), GRADE.GOOD, T0);
    expect(reviewCorrect(card, card.due)).toEqual(review(card, GRADE.GOOD, card.due));
  });
  it('reviewIncorrect resets a card the same as an AGAIN review', () => {
    const card = review(createCard('q1', 'c1', 'question', T0), GRADE.GOOD, T0);
    expect(reviewIncorrect(card, card.due)).toEqual(review(card, GRADE.AGAIN, card.due));
  });
});

describe('isDue', () => {
  it('is true only once now reaches the due timestamp', () => {
    const card = createCard('f1', 'c1', 'feynman', T0); // due ≈ T0 + 1 day
    expect(isDue(card, T0)).toBe(false);
    expect(isDue(card, card.due)).toBe(true);
    expect(isDue(card, card.due + 1)).toBe(true);
  });
});
