// src/engine/srs.ts
//
// The SINGLE spaced-repetition scheduler (PLAN-rev2 §4.7 #9, GC-04), as pure functions with an
// injectable clock — the GC-04 SRS oracle. Implements FSRS (Free Spaced Repetition Scheduler), the
// long-term FSRS-5 model: every card carries a memory state {stability, difficulty}, retrievability
// decays on a power curve, and each graded review updates the state deterministically. There is ONE
// scheduler — re-explain Feynman prompts are modeled as FSRS items too (a distinct `itemType`),
// seeded so their early reps land ≈1d/3d/7d, so no competing fixed-interval scheduler exists.
//
// Determinism (GC-04): every function takes `now` (epoch ms) as a parameter; NOTHING here reads the
// wall clock. Same (card, grade, now) ⇒ byte-identical next card. That is the load-bearing property
// for offline replay, idempotent sync, and the property tests.
//
// ADHD / no-shame rules encoded here (PLAN-rev2 §4.7 #9, contract-critical):
//   • SRS NEVER exposes a total "due" count. `selectDueForSession` returns ONLY the presented list
//     (already capped) + the session mode — deliberately no `totalDue`/`backlogCount`/`dueCount`
//     field, so no caller can render an Anki-style backlog wall. This intent is encoded in the
//     `SrsSession` type (see its doc comment) and asserted by a test.
//   • Daily presentation is CAPPED from the daily-goal minutes (≈2 cards/min): a 10-min goal ⇒ ~20
//     cards. Overflow is NOT dropped — it just stays scheduled (its due date is untouched), so FSRS
//     silently reschedules it to a later session.
//   • After ≥5 idle days the first session is a FIXED small (≤10) confidence-weighted warmup
//     (lowest-stability / most-overdue first) regardless of the daily goal — a warm "welcome back",
//     never a backlog wall.
//   • All SRS review is ENERGY-FREE (this engine never references energy; see energy.ts).

import { DAY_MS } from './time';

// ─────────────────────────────────────────────────────────────────────────────
// FSRS model constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default FSRS-5 weights (the published py-fsrs/ts-fsrs defaults). Indices 0..16 drive the
 * long-term stability/difficulty model used here; 17/18 are the same-day short-term terms, which
 * we intentionally do not apply (same-day reviews leave stability ~unchanged — acceptable for a
 * study app that schedules in whole days). Kept at full length for provenance.
 */
export const FSRS_WEIGHTS: readonly number[] = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925,
  1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
];

/** Target retention the scheduler aims for at each review (FSRS default 0.9). */
export const REQUEST_RETENTION = 0.9;

/** Power-law forgetting-curve decay exponent (FSRS default). */
export const DECAY = -0.5;

/** Curve factor so that R = 0.9 exactly when elapsed time equals stability. */
export const FACTOR = Math.pow(0.9, 1 / DECAY) - 1; // = 19/81 ≈ 0.234567

/** Stability is clamped to this range (days) to stay positive and finite (FSRS caps at ~100y). */
export const MIN_STABILITY = 0.01;
export const MAX_STABILITY = 36_500;

/** Difficulty lives on a 1..10 scale. */
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 10;

/** Feynman re-explain items are seeded to this memory state so early reps land ≈1d/3d/7d. */
export const FEYNMAN_SEED_STABILITY = 1.0; // → first interval ≈ 1 day at REQUEST_RETENTION
export const FEYNMAN_SEED_DIFFICULTY = 7.5; // tuned so good reps land ≈1d → ~3d → ~7d

// ─────────────────────────────────────────────────────────────────────────────
// Scheduling / presentation constants (ADHD rules)
// ─────────────────────────────────────────────────────────────────────────────

/** Cards a learner clears per minute — turns the daily-goal minutes into a presentation cap. */
export const DEFAULT_CARDS_PER_MINUTE = 2;

/** Idle days that trigger the gentle welcome-back warmup instead of a normal session. */
export const WELCOME_BACK_IDLE_DAYS = 5;

/** Hard ceiling on the welcome-back warmup, regardless of the daily goal. */
export const WARMUP_MAX_CARDS = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Card model
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A four-point FSRS grade. The app uses a binary correct/incorrect mapping (see
 * {@link gradeFromCorrect}: correct → GOOD, incorrect → AGAIN); the full four-grade API is exposed
 * so a richer self-rating UI can drive the same scheduler later.
 */
export const GRADE = { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 } as const;
export type Grade = 1 | 2 | 3 | 4;

/** Two kinds of SRS item, scheduled by the SAME engine. */
export type SrsItemType = 'question' | 'feynman';

/** FSRS lifecycle state. `new` = never reviewed; `relearning` = a graduated card that lapsed. */
export type SrsCardState = 'new' | 'learning' | 'review' | 'relearning';

export interface SrsCard {
  /** Stable key — the questionId (or the concept's feynman-prompt id). Append-only (D3). */
  id: string;
  /** The concept this item drills (drives deck derivation and weakest-concept review). */
  conceptId: string;
  itemType: SrsItemType;
  /** FSRS memory strength in days (0 until the first review, for a `new` card). */
  stability: number;
  /** FSRS difficulty on a 1..10 scale (0 until the first review, for a `new` card). */
  difficulty: number;
  /** Epoch ms the card next becomes due. */
  due: number;
  reps: number;
  lapses: number;
  /** Epoch ms of the last review (or seed time for a pre-seeded feynman card); null when `new`. */
  lastReview: number | null;
  state: SrsCardState;
}

// ─────────────────────────────────────────────────────────────────────────────
// FSRS math (pure)
// ─────────────────────────────────────────────────────────────────────────────

const w = FSRS_WEIGHTS;

const clampStability = (s: number): number => Math.min(MAX_STABILITY, Math.max(MIN_STABILITY, s));
const clampDifficulty = (d: number): number =>
  Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, d));

/** Retrievability (recall probability) after `elapsedDays` at a given `stability`. */
export function retrievability(elapsedDays: number, stability: number): number {
  const t = Math.max(0, elapsedDays);
  return Math.pow(1 + (FACTOR * t) / stability, DECAY);
}

/**
 * The next interval in days for a given stability, at the requested retention. At the default 0.9
 * retention this is ≈ the stability itself (by construction of {@link FACTOR}).
 */
export function nextIntervalDays(
  stability: number,
  requestRetention: number = REQUEST_RETENTION,
): number {
  return (stability / FACTOR) * (Math.pow(requestRetention, 1 / DECAY) - 1);
}

/** Initial stability for a first-ever review at `grade`: the FSRS S0 weights. */
function initialStability(grade: Grade): number {
  return clampStability(w[grade - 1]);
}

/** Initial difficulty for a first-ever review at `grade`. */
function initialDifficulty(grade: Grade): number {
  return clampDifficulty(w[4] - Math.exp(w[5] * (grade - 1)) + 1);
}

/** Next difficulty after a review, with linear damping + mean reversion toward the easy anchor. */
function nextDifficulty(difficulty: number, grade: Grade): number {
  const deltaD = -w[6] * (grade - 3);
  const damped = difficulty + deltaD * ((10 - difficulty) / 9);
  const reverted = w[7] * initialDifficulty(GRADE.EASY) + (1 - w[7]) * damped;
  return clampDifficulty(reverted);
}

/** Stability after a successful recall (grade HARD/GOOD/EASY). Grows with the current stability. */
function recallStability(difficulty: number, stability: number, r: number, grade: Grade): number {
  const hardPenalty = grade === GRADE.HARD ? w[15] : 1;
  const easyBonus = grade === GRADE.EASY ? w[16] : 1;
  const growth =
    Math.exp(w[8]) *
    (11 - difficulty) *
    Math.pow(stability, -w[9]) *
    (Math.exp(w[10] * (1 - r)) - 1) *
    hardPenalty *
    easyBonus;
  return clampStability(stability * (1 + growth));
}

/** Post-lapse stability after a forget (grade AGAIN). Resets to a small fraction of the old value. */
function forgetStability(difficulty: number, stability: number, r: number): number {
  const s =
    w[11] *
    Math.pow(difficulty, -w[12]) *
    (Math.pow(stability + 1, w[13]) - 1) *
    Math.exp(w[14] * (1 - r));
  // Never let a lapse *increase* stability (can happen for tiny stabilities); FSRS clamps to S.
  return clampStability(Math.min(s, stability));
}

// ─────────────────────────────────────────────────────────────────────────────
// Card lifecycle
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A brand-new SRS card, due immediately (`new` state, no memory yet). For `feynman` items the card
 * is seeded into `review` state at {@link FEYNMAN_SEED_STABILITY}/{@link FEYNMAN_SEED_DIFFICULTY} so
 * its first interval is ≈1 day and good reps ramp ≈1d → 3d → 7d — the single scheduler owning the
 * re-explain spacing (no separate fixed-interval scheduler).
 */
export function createCard(
  id: string,
  conceptId: string,
  itemType: SrsItemType,
  now: number,
): SrsCard {
  if (itemType === 'feynman') {
    const stability = FEYNMAN_SEED_STABILITY;
    return {
      id,
      conceptId,
      itemType,
      stability,
      difficulty: FEYNMAN_SEED_DIFFICULTY,
      due: now + Math.round(nextIntervalDays(stability) * DAY_MS),
      reps: 0,
      lapses: 0,
      // Seed time acts as the "last review" anchor so an on-time first review sees R = 0.9.
      lastReview: now,
      state: 'review',
    };
  }
  return {
    id,
    conceptId,
    itemType,
    stability: 0,
    difficulty: 0,
    due: now,
    reps: 0,
    lapses: 0,
    lastReview: null,
    state: 'new',
  };
}

/** Map the app's binary answer correctness to an FSRS grade. */
export function gradeFromCorrect(correct: boolean): Grade {
  return correct ? GRADE.GOOD : GRADE.AGAIN;
}

/**
 * Apply one graded review at `now` and return the next card. Deterministic: pure function of
 * (card, grade, now). A first review of a `new` card seeds memory from the FSRS S0/D0 weights; a
 * subsequent AGAIN lapses the card into `relearning` (resetting stability, incrementing lapses only
 * when it had graduated to `review`); any success advances it in `review` with growing stability.
 */
export function review(card: SrsCard, grade: Grade, now: number): SrsCard {
  let stability: number;
  let difficulty: number;
  let state: SrsCardState;
  let lapses = card.lapses;

  if (card.state === 'new') {
    stability = initialStability(grade);
    difficulty = initialDifficulty(grade);
    state = grade === GRADE.AGAIN ? 'learning' : 'review';
  } else {
    const elapsedDays = card.lastReview === null ? 0 : (now - card.lastReview) / DAY_MS;
    const r = retrievability(elapsedDays, card.stability);
    difficulty = nextDifficulty(card.difficulty, grade);
    if (grade === GRADE.AGAIN) {
      stability = forgetStability(card.difficulty, card.stability, r);
      // A "lapse" is a graduated card failing; already-learning/relearning cards don't re-count.
      if (card.state === 'review') lapses += 1;
      state = 'relearning';
    } else {
      stability = recallStability(card.difficulty, card.stability, r, grade);
      state = 'review';
    }
  }

  return {
    ...card,
    stability,
    difficulty,
    due: now + Math.round(nextIntervalDays(stability) * DAY_MS),
    reps: card.reps + 1,
    lapses,
    lastReview: now,
    state,
  };
}

/**
 * Capture a mistake into the SRS deck. If the card is new to the deck it is created and immediately
 * failed (AGAIN); if it already existed it lapses per FSRS relearning. Returns the updated card.
 */
export function captureMistake(
  existing: SrsCard | null,
  questionId: string,
  conceptId: string,
  now: number,
): SrsCard {
  const card = existing ?? createCard(questionId, conceptId, 'question', now);
  return review(card, GRADE.AGAIN, now);
}

/** Correct-in-review advances the card (GOOD). A convenience wrapper over {@link review}. */
export function reviewCorrect(card: SrsCard, now: number): SrsCard {
  return review(card, GRADE.GOOD, now);
}

/** Wrong-in-review resets the card per FSRS relearning (AGAIN). A convenience wrapper. */
export function reviewIncorrect(card: SrsCard, now: number): SrsCard {
  return review(card, GRADE.AGAIN, now);
}

/** Whether a card is due at `now`. */
export function isDue(card: SrsCard, now: number): boolean {
  return card.due <= now;
}

// ─────────────────────────────────────────────────────────────────────────────
// Session selection (the ADHD-safe presentation layer)
// ─────────────────────────────────────────────────────────────────────────────

export type SessionMode = 'normal' | 'warmup';

/**
 * The presented review session.
 *
 * INTENTIONAL OMISSION (PLAN-rev2 §4.7 #9, contract-critical): there is NO `totalDue`, `dueCount`,
 * `backlogCount`, or any raw "how many cards are waiting" integer here. The whole point is that a
 * caller CANNOT render a backlog wall — it only ever receives the already-capped `cards` to show and
 * the `mode`. Overflow simply stays scheduled (its due date untouched) and resurfaces next session.
 */
export interface SrsSession {
  cards: SrsCard[];
  mode: SessionMode;
  /** The presentation cap that produced `cards` (a display budget, NOT a count of due cards). */
  cap: number;
}

export interface SelectDueParams {
  allCards: readonly SrsCard[];
  now: number;
  dailyGoalMinutes: number;
  /** Cards cleared per minute; defaults to {@link DEFAULT_CARDS_PER_MINUTE}. */
  cardsPerMinute?: number;
  /** Whole days since the learner's last session (drives the welcome-back warmup). */
  idleDays: number;
  /**
   * Whether the caller can actually present a card (its question loads in the bundled content). Cards
   * it rejects are dropped BEFORE ordering and capping, so a card the player cannot open can never sit
   * at the head of the queue or use up the session budget (FT-1). They stay scheduled (due date
   * untouched), so a later content build can still surface them. Defaults to every card.
   */
  isPresentable?: (card: SrsCard) => boolean;
  /**
   * Whether a card is an exam miss (a mock or mini question) rather than a lesson miss. One mock can
   * add dozens of misses at once; while any lesson miss is due, exam misses take at most half of the
   * session's seats (rounded up), so lesson misses are reviewed on time. Defaults to none.
   */
  isExamCard?: (card: SrsCard) => boolean;
}

/** The daily presentation cap derived from the goal minutes (≈2 cards/min): 10-min goal ⇒ ~20. */
export function dailyPresentationCap(
  dailyGoalMinutes: number,
  cardsPerMinute: number = DEFAULT_CARDS_PER_MINUTE,
): number {
  return Math.max(0, Math.round(dailyGoalMinutes * cardsPerMinute));
}

/** Total-order comparator: most-overdue first, then least-confident, then id (fully deterministic). */
function byMostOverdue(a: SrsCard, b: SrsCard): number {
  return a.due - b.due || a.stability - b.stability || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** Total-order comparator: least-confident first, then most-overdue, then id (warmup ordering). */
function byLeastConfident(a: SrsCard, b: SrsCard): number {
  return a.stability - b.stability || a.due - b.due || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * Take up to `cap` cards in `ordered` order. While any lesson miss is in `ordered`, exam misses fill at
 * most half the seats (rounded up) and are otherwise skipped (they stay scheduled for a later session).
 */
function fillSeats(ordered: readonly SrsCard[], cap: number, isExamCard: (card: SrsCard) => boolean): SrsCard[] {
  const examSeats = ordered.some((card) => !isExamCard(card)) ? Math.ceil(cap / 2) : cap;
  const cards: SrsCard[] = [];
  let examTaken = 0;
  for (const card of ordered) {
    if (cards.length >= cap) break;
    if (isExamCard(card)) {
      if (examTaken >= examSeats) continue;
      examTaken += 1;
    }
    cards.push(card);
  }
  return cards;
}

/**
 * Select the review session to present. Rules ENFORCED here (PLAN-rev2 §4.7 #9):
 *   • Normal session: at most {@link dailyPresentationCap} cards for ANY backlog size (overflow
 *     stays scheduled, never dropped, never surfaced as a count).
 *   • After ≥{@link WELCOME_BACK_IDLE_DAYS} idle days: a FIXED ≤{@link WARMUP_MAX_CARDS} confidence-
 *     weighted warmup (lowest-stability / most-overdue first), regardless of the daily goal.
 *   • Only cards the caller can present compete for a seat ({@link SelectDueParams.isPresentable}).
 *   • While lesson misses are due, exam misses take at most half the seats, rounded up
 *     ({@link SelectDueParams.isExamCard}).
 * Deterministic: identical params ⇒ identical session.
 */
export function selectDueForSession(params: SelectDueParams): SrsSession {
  const { allCards, now, dailyGoalMinutes, idleDays } = params;
  const cardsPerMinute = params.cardsPerMinute ?? DEFAULT_CARDS_PER_MINUTE;
  const isPresentable = params.isPresentable ?? (() => true);
  const isExamCard = params.isExamCard ?? (() => false);

  const due = allCards.filter((c) => isDue(c, now) && isPresentable(c));

  if (idleDays >= WELCOME_BACK_IDLE_DAYS) {
    const warmup = fillSeats([...due].sort(byLeastConfident), WARMUP_MAX_CARDS, isExamCard);
    return { cards: warmup, mode: 'warmup', cap: WARMUP_MAX_CARDS };
  }

  const cap = dailyPresentationCap(dailyGoalMinutes, cardsPerMinute);
  const cards = fillSeats([...due].sort(byMostOverdue), cap, isExamCard);
  return { cards, mode: 'normal', cap };
}
