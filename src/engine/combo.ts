// src/engine/combo.ts
//
// In-lesson combo/streak logic (PLAN-rev2 §4.3), as a pure reducer — the GC-04 oracle. It tracks the
// running correct streak per question, feeds the XP economy (best streak -> combo bonus) and the
// juice layer (a "flare" on every 5-in-a-row, which also triggers the energy refund of §4.4).

import { comboBonus } from './xp';

/** A combo flare (and its energy refund + celebration) fires on every Nth consecutive correct answer. */
export const COMBO_FLARE_INTERVAL = 5;

export interface ComboState {
  /** Consecutive correct answers right now (resets to 0 on a miss). */
  currentStreak: number;
  /** The best streak reached this lesson (never decreases). */
  bestStreak: number;
  totalCorrect: number;
  totalAnswered: number;
  /** How many 5-in-a-row flares have fired this lesson. */
  flares: number;
}

/** What one answer produced — consumed by the player to drive XP, energy, and juice. */
export interface ComboEvent {
  correct: boolean;
  currentStreak: number;
  bestStreak: number;
  /** True when this answer completed a fresh 5-in-a-row (fire the flare + energy refund). */
  flare: boolean;
  /** True when this (incorrect) answer broke a running streak. */
  broken: boolean;
}

/** A fresh combo tracker for the start of a lesson. */
export function createComboState(): ComboState {
  return { currentStreak: 0, bestStreak: 0, totalCorrect: 0, totalAnswered: 0, flares: 0 };
}

/** Fold one answer into the combo state, returning the next state and the event it produced. */
export function recordAnswer(
  state: ComboState,
  correct: boolean,
): { state: ComboState; event: ComboEvent } {
  const totalAnswered = state.totalAnswered + 1;

  if (correct) {
    const currentStreak = state.currentStreak + 1;
    const bestStreak = Math.max(state.bestStreak, currentStreak);
    const flare = currentStreak % COMBO_FLARE_INTERVAL === 0;
    const flares = flare ? state.flares + 1 : state.flares;
    const next: ComboState = {
      currentStreak,
      bestStreak,
      totalCorrect: state.totalCorrect + 1,
      totalAnswered,
      flares,
    };
    return { state: next, event: { correct: true, currentStreak, bestStreak, flare, broken: false } };
  }

  const broken = state.currentStreak > 0;
  const next: ComboState = { ...state, currentStreak: 0, totalAnswered };
  return {
    state: next,
    event: { correct: false, currentStreak: 0, bestStreak: state.bestStreak, flare: false, broken },
  };
}

/** Fraction correct so far (0 when nothing has been answered). */
export function comboAccuracy(state: ComboState): number {
  return state.totalAnswered === 0 ? 0 : state.totalCorrect / state.totalAnswered;
}

/** The XP combo bonus this lesson has earned, from its best streak (bridges combo -> {@link comboBonus}). */
export function lessonComboBonus(state: ComboState): number {
  return comboBonus(state.bestStreak);
}
