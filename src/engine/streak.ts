// src/engine/streak.ts
//
// The streak state machine (PLAN-rev2 §4.5), as a pure reducer over (state, event, todayLocal) — the
// GC-04 oracle. The design guarantee: NOTHING ever "breaks". The only statuses are `active` and
// `paused`; a lapse first burns silent freezes, then pauses (count frozen), then — only after a
// 7-day grace window with no return — archives the count into `longest` and warmly restarts at 1.
//
// Timezone correctness lives at the edge: the caller converts an instant + the user's zone into a
// `YYYY-MM-DD` local date (see time.ts `localDateInTz`) and passes THAT in. The reducer reasons only
// in calendar dates, so day boundaries are always evaluated in the user's local time.
//
// Idempotency: `settledDate` marks the last calendar day already accounted for. Re-evaluating on the
// same day (multiple lessons, repeated refreshes) never double-increments and never double-spends a
// freeze — the load-bearing property for offline replay and app relaunches.

import { addDays, diffDays } from './time';
import type { IsoDate } from './time';

/** Free freezes equipped from day one (spec §4.5). */
export const STARTING_FREEZES = 2;
/** Equipped-freeze cap (Duolingo-style: you can hold at most two). */
export const MAX_FREEZES = 2;
/** Days a paused streak can still be resumed at its frozen count before it archives. */
export const RESUME_WINDOW_DAYS = 7;

export type StreakStatus = 'active' | 'paused';

export interface StreakState {
  status: StreakStatus;
  /** Current streak length (frozen while paused). */
  current: number;
  /** Best streak ever reached. */
  longest: number;
  /** Last calendar day a lesson actually counted (null before the first ever lesson). */
  lastActivityDate: IsoDate | null;
  /** Last calendar day fully accounted for — activity, freeze-cover, or a resolved refresh. */
  settledDate: IsoDate | null;
  freezesAvailable: number;
  /** Lifetime count of automatically consumed freezes, retained for honest cross-device sync. */
  freezesUsed: number;
  /** The day the streak entered `paused` (first uncovered missed day); null while active. */
  pausedSince: IsoDate | null;
}

export type StreakEvent =
  /** A lesson was completed on `todayLocal`. */
  | { type: 'lessonCompleted' }
  /** The app opened / a scheduling pass ran on `todayLocal` with no new activity. */
  | { type: 'refresh' };

/** A brand-new streak: two freezes, nothing counted yet. */
export function createStreakState(): StreakState {
  return {
    status: 'active',
    current: 0,
    longest: 0,
    lastActivityDate: null,
    settledDate: null,
    freezesAvailable: STARTING_FREEZES,
    freezesUsed: 0,
    pausedSince: null,
  };
}

/** Add freezes (e.g. a gem purchase), clamped to {@link MAX_FREEZES}. */
export function grantFreeze(state: StreakState, count: number = 1): StreakState {
  return { ...state, freezesAvailable: Math.min(MAX_FREEZES, state.freezesAvailable + count) };
}

/** The single entry point: fold an event into the streak for the given user-local date. */
export function reduceStreak(
  state: StreakState,
  event: StreakEvent,
  todayLocal: IsoDate,
): StreakState {
  return state.status === 'paused'
    ? reducePaused(state, event, todayLocal)
    : reduceActive(state, event, todayLocal);
}

function reduceActive(state: StreakState, event: StreakEvent, today: IsoDate): StreakState {
  // Fresh start or post-archive restart: the first lesson (re)starts the streak at 1.
  if (state.current === 0 || state.settledDate === null) {
    if (event.type === 'lessonCompleted') {
      return {
        ...state,
        status: 'active',
        current: 1,
        longest: Math.max(state.longest, 1),
        lastActivityDate: today,
        settledDate: today,
      };
    }
    return state; // a refresh on an empty streak has nothing to do
  }

  const gap = diffDays(state.settledDate, today);

  // Same calendar day already settled — no double counting.
  if (gap <= 0) {
    return event.type === 'lessonCompleted' ? { ...state, lastActivityDate: today } : state;
  }

  // Consecutive day — no missed days.
  if (gap === 1) {
    if (event.type === 'lessonCompleted') {
      const current = state.current + 1;
      return {
        ...state,
        current,
        longest: Math.max(state.longest, current),
        lastActivityDate: today,
        settledDate: today,
      };
    }
    return state; // today is in progress; nothing is missed yet
  }

  // gap >= 2 — one or more fully-missed days strictly between settledDate and today.
  const missedDays = gap - 1;
  const freezesUsed = Math.min(state.freezesAvailable, missedDays);
  const uncovered = missedDays - freezesUsed;

  if (uncovered === 0) {
    // Every missed day was covered by a freeze — the streak survives.
    const freezesAvailable = state.freezesAvailable - freezesUsed;
    if (event.type === 'lessonCompleted') {
      const current = state.current + 1;
      return {
        ...state,
        freezesAvailable,
        freezesUsed: state.freezesUsed + freezesUsed,
        current,
        longest: Math.max(state.longest, current),
        lastActivityDate: today,
        settledDate: today,
      };
    }
    // Refresh: the covered days are behind us; advance settled to yesterday (today still in progress).
    return {
      ...state,
      freezesAvailable,
      freezesUsed: state.freezesUsed + freezesUsed,
      settledDate: addDays(today, -1),
    };
  }

  // Freezes ran out — the streak pauses at its current (frozen) count.
  const paused: StreakState = {
    ...state,
    status: 'paused',
    freezesAvailable: 0,
    freezesUsed: state.freezesUsed + freezesUsed,
    pausedSince: addDays(state.settledDate, state.freezesAvailable + 1), // first uncovered day
  };
  // The paused logic finishes this same evaluation: a lesson may resume immediately inside the 7-day
  // window, and a refresh whose pause already ran past the window archives now — one refresh settles
  // the streak, so a read after a long gap never shows the stale count (FT-13).
  return reducePaused(paused, event, today);
}

function reducePaused(state: StreakState, event: StreakEvent, today: IsoDate): StreakState {
  const since = state.pausedSince ?? state.lastActivityDate ?? today;
  const daysSincePause = diffDays(since, today);

  if (event.type === 'lessonCompleted') {
    if (daysSincePause <= RESUME_WINDOW_DAYS) {
      // Resume at the frozen count — the returning lesson keeps it warm (spec: "resumes at the
      // frozen count"). It is never punished for the gap.
      return {
        ...state,
        status: 'active',
        pausedSince: null,
        longest: Math.max(state.longest, state.current),
        lastActivityDate: today,
        settledDate: today,
      };
    }
    // Past the window — archive the old run into `longest` and warmly restart at 1.
    return {
      ...state,
      status: 'active',
      pausedSince: null,
      longest: Math.max(state.longest, state.current),
      current: 1,
      lastActivityDate: today,
      settledDate: today,
    };
  }

  // Refresh while paused.
  if (daysSincePause > RESUME_WINDOW_DAYS) {
    // Silently archive; a clean slate (current 0, dates cleared) so the next lesson starts fresh.
    return {
      ...state,
      status: 'active',
      longest: Math.max(state.longest, state.current),
      current: 0,
      pausedSince: null,
      settledDate: null,
      lastActivityDate: null,
    };
  }
  return state; // still inside the window — leave the warm pause untouched
}
