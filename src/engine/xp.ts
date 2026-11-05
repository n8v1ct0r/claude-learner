// src/engine/xp.ts
//
// The XP economy (PLAN-rev2 §4.1/§4.6), as pure functions — the GC-04 test oracle. No React Native,
// no I/O, no Date.now(): a boost's "is it live?" question takes `now` as a parameter.
//
// CRITICAL contract (GC-03a / GC-04, task item 1): a lesson's XP is awarded OPTIMISTICALLY and is
// completely independent of the Feynman explain-back grading outcome or connectivity. Grading only
// ever moves the coverage meter and the next-step hint — never the XP. `computeLessonXp` therefore
// accepts the explain-back result but deliberately ignores it when totaling, and the test suite
// asserts byte-for-byte identical XP across every grade/offline/degraded case.

import { MINUTE_MS } from './time';

/** Flat XP for completing a lesson (the optimistic base, granted the instant the lesson ends). */
export const BASE_LESSON_XP = 10;
/** Ceiling on the in-lesson combo bonus (spec: "up to 5 combo bonus"). */
export const MAX_COMBO_BONUS = 5;
/** Bonus when a lesson completion also finishes its unit. */
export const UNIT_COMPLETE_XP = 20;
/** Bonus for a legendary (perfect/gold) completion. */
export const LEGENDARY_XP = 40;
/** Decayed award for replaying an already-mastered ("gold") lesson. */
export const GOLD_REPLAY_XP = 5;
/** Multiplier applied while a 2× boost window is live. */
export const BOOST_MULTIPLIER = 2;
/** Default 2× boost window length (spec §4.6: 15-minute windows). */
export const BOOST_DURATION_MS = 15 * MINUTE_MS;

/**
 * Explain-back grading outcomes. Present here ONLY so `computeLessonXp` can accept the field and
 * prove it does not influence XP — the values themselves affect the coverage meter/hints elsewhere.
 */
export type ExplainBackGrade = 'covered' | 'partial' | 'missed' | 'offline' | 'degraded';

/** A live 2× XP boost window opened by spending gems (spec §4.6). */
export interface BoostWindow {
  /** Epoch ms the window opened. */
  startedAt: number;
  /** Optional custom length; defaults to {@link BOOST_DURATION_MS}. */
  durationMs?: number;
}

/** Whether a boost window is live at `now` — start-inclusive, end-exclusive. */
export function isBoostActive(window: BoostWindow | null | undefined, now: number): boolean {
  if (!window) return false;
  const duration = window.durationMs ?? BOOST_DURATION_MS;
  return now >= window.startedAt && now < window.startedAt + duration;
}

/** The XP multiplier in effect at `now`: {@link BOOST_MULTIPLIER} inside a live window, else 1. */
export function applyBoost(window: BoostWindow | null | undefined, now: number): number {
  return isBoostActive(window, now) ? BOOST_MULTIPLIER : 1;
}

/**
 * The combo XP bonus for a given best in-lesson correct streak: +1 per chained answer beyond the
 * first, capped at {@link MAX_COMBO_BONUS}. A streak of 0 or 1 earns nothing.
 */
export function comboBonus(bestStreakInLesson: number): number {
  if (bestStreakInLesson <= 1) return 0;
  return Math.min(MAX_COMBO_BONUS, bestStreakInLesson - 1);
}

/** Everything the economy needs to price a single lesson completion. */
export interface LessonXpInput {
  /** Best consecutive-correct streak reached in the lesson (drives {@link comboBonus}). */
  bestComboStreak?: number;
  /** This completion also finished the unit. */
  unitCompleted?: boolean;
  /** This completion was legendary (perfect/gold). */
  legendary?: boolean;
  /** This was a replay of an already-completed lesson — decays to a flat {@link GOLD_REPLAY_XP}. */
  replayOfCompleted?: boolean;
  /**
   * The explain-back result. Accepted but INTENTIONALLY IGNORED for XP (see the file header) —
   * present so the optimistic-ceremony invariant is provable at the type level, not just by omission.
   */
  explainBack?: { completed: boolean; grade?: ExplainBackGrade };
  /** A boost window + the current time, if a 2× window may be live. */
  boost?: { window: BoostWindow | null; now: number };
}

/** An itemized XP award, so the ceremony can animate each line. */
export interface LessonXpBreakdown {
  base: number;
  combo: number;
  unit: number;
  legendary: number;
  /** The multiplier applied to the subtotal (1 or {@link BOOST_MULTIPLIER}). */
  multiplier: number;
  total: number;
}

/**
 * Price a lesson completion. Deterministic and grading-independent: the only inputs that move the
 * total are the combo streak, the unit/legendary flags, the gold-replay flag, and a live boost.
 */
export function computeLessonXp(input: LessonXpInput): LessonXpBreakdown {
  const multiplier = input.boost ? applyBoost(input.boost.window, input.boost.now) : 1;

  if (input.replayOfCompleted) {
    // A gold replay decays to a flat award; no combo/unit/legendary stacking.
    return {
      base: GOLD_REPLAY_XP,
      combo: 0,
      unit: 0,
      legendary: 0,
      multiplier,
      total: GOLD_REPLAY_XP * multiplier,
    };
  }

  const base = BASE_LESSON_XP;
  const combo = comboBonus(input.bestComboStreak ?? 0);
  const unit = input.unitCompleted ? UNIT_COMPLETE_XP : 0;
  const legendary = input.legendary ? LEGENDARY_XP : 0;
  // `input.explainBack` is deliberately NOT read here — XP must not depend on grading/connectivity.
  const subtotal = base + combo + unit + legendary;

  return { base, combo, unit, legendary, multiplier, total: subtotal * multiplier };
}
