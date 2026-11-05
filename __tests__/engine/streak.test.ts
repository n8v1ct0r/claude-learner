import { describe, expect, it } from '@jest/globals';

import {
  MAX_FREEZES,
  RESUME_WINDOW_DAYS,
  STARTING_FREEZES,
  createStreakState,
  grantFreeze,
  reduceStreak,
} from '@/engine/streak';
import type { StreakEvent, StreakState } from '@/engine/streak';

const DONE: StreakEvent = { type: 'lessonCompleted' };
const OPEN: StreakEvent = { type: 'refresh' };

/** Apply an event on a given local date. */
const on = (state: StreakState, event: StreakEvent, date: string): StreakState =>
  reduceStreak(state, event, date);

describe('createStreakState', () => {
  it('starts inactive-but-active-status with two free freezes', () => {
    expect(createStreakState()).toEqual({
      status: 'active',
      current: 0,
      longest: 0,
      lastActivityDate: null,
      settledDate: null,
      freezesAvailable: STARTING_FREEZES,
      freezesUsed: 0,
      pausedSince: null,
    });
    expect(STARTING_FREEZES).toBe(2);
  });
});

describe('the happy path', () => {
  it('a first lesson starts the streak at 1', () => {
    const s = on(createStreakState(), DONE, '2026-01-01');
    expect(s).toMatchObject({ status: 'active', current: 1, longest: 1, settledDate: '2026-01-01' });
  });

  it('increments on consecutive days', () => {
    let s = on(createStreakState(), DONE, '2026-01-01');
    s = on(s, DONE, '2026-01-02');
    s = on(s, DONE, '2026-01-03');
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
  });

  it('does not double-count multiple lessons on the same day', () => {
    let s = on(createStreakState(), DONE, '2026-01-01');
    s = on(s, DONE, '2026-01-01');
    expect(s.current).toBe(1);
  });

  it('a refresh on a consecutive day (in progress) is a no-op', () => {
    let s = on(createStreakState(), DONE, '2026-01-01');
    s = on(s, OPEN, '2026-01-02');
    expect(s.current).toBe(1);
    expect(s.settledDate).toBe('2026-01-01');
  });

  it('a refresh on an empty streak does nothing', () => {
    expect(on(createStreakState(), OPEN, '2026-01-01')).toEqual(createStreakState());
  });
});

describe('freeze auto-consume (silent)', () => {
  it('covers a single missed day and continues the streak', () => {
    let s = on(createStreakState(), DONE, '2026-01-01'); // current 1, freezes 2
    // skip 2026-01-02, return 2026-01-03
    s = on(s, DONE, '2026-01-03');
    expect(s.status).toBe('active');
    expect(s.current).toBe(2);
    expect(s.freezesAvailable).toBe(1); // one freeze spent on the missed day
    expect(s.freezesUsed).toBe(1);
  });

  it('spends both freezes across two separate missed days', () => {
    let s = on(createStreakState(), DONE, '2026-01-01');
    s = on(s, DONE, '2026-01-03'); // miss 01-02 -> 1 freeze
    s = on(s, DONE, '2026-01-05'); // miss 01-04 -> 1 freeze
    expect(s.freezesAvailable).toBe(0);
    expect(s.freezesUsed).toBe(2);
    expect(s.current).toBe(3);
    expect(s.status).toBe('active');
  });

  it('spends two freezes at once for a two-day gap', () => {
    let s = on(createStreakState(), DONE, '2026-01-01');
    s = on(s, DONE, '2026-01-04'); // miss 01-02 and 01-03 -> 2 freezes
    expect(s.freezesAvailable).toBe(0);
    expect(s.current).toBe(2);
  });

  it('a covering refresh advances the settled day without double-spending', () => {
    let s = on(createStreakState(), DONE, '2026-01-01');
    s = on(s, OPEN, '2026-01-03'); // 01-02 missed, covered by a freeze
    expect(s.freezesAvailable).toBe(1);
    expect(s.settledDate).toBe('2026-01-02');
    // a second refresh the same day must not spend another freeze
    s = on(s, OPEN, '2026-01-03');
    expect(s.freezesAvailable).toBe(1);
    // finishing a lesson that day continues the streak
    s = on(s, DONE, '2026-01-03');
    expect(s.current).toBe(2);
    expect(s.freezesAvailable).toBe(1);
  });
});

describe('freeze exhaustion -> pause', () => {
  it('pauses (count frozen) once freezes cannot cover the gap, on refresh', () => {
    let s = on(createStreakState(), DONE, '2026-01-01'); // current 1
    // miss 01-02, 01-03, 01-04 (3 missed) with only 2 freezes -> 1 uncovered -> pause
    s = on(s, OPEN, '2026-01-05');
    expect(s.status).toBe('paused');
    expect(s.current).toBe(1); // frozen
    expect(s.freezesAvailable).toBe(0);
    expect(s.pausedSince).toBe('2026-01-04'); // first uncovered missed day
  });

  it('pauses when a lesson arrives too late for the freezes but resumes if within window', () => {
    let s = createStreakState();
    s = on(s, DONE, '2026-01-01');
    s = on(s, DONE, '2026-01-02'); // current 2, freezes 2
    // miss 01-03, 01-04, 01-05 (3) -> 2 frozen, 1 uncovered -> pause at 01-05; lesson 01-06
    s = on(s, DONE, '2026-01-06');
    expect(s.status).toBe('active');
    expect(s.current).toBe(2); // resumed at the frozen count
  });
});

describe('paused -> resume within 7 days', () => {
  function pausedAt12(): StreakState {
    // Build a streak of 12, then blow past the freezes to force a pause.
    let s = createStreakState();
    for (let d = 1; d <= 12; d += 1) {
      s = on(s, DONE, `2026-02-${String(d).padStart(2, '0')}`);
    }
    expect(s.current).toBe(12);
    // last activity 2026-02-12; miss 13,14,15 with 2 freezes -> pause on 02-15
    s = on(s, OPEN, '2026-02-16');
    expect(s.status).toBe('paused');
    expect(s.pausedSince).toBe('2026-02-15');
    return s;
  }

  it('resumes at the frozen count for a lesson exactly on the 7th day', () => {
    const s = on(pausedAt12(), DONE, '2026-02-22'); // 7 days after 02-15
    expect(RESUME_WINDOW_DAYS).toBe(7);
    expect(s.status).toBe('active');
    expect(s.current).toBe(12);
    expect(s.pausedSince).toBeNull();
    expect(s.settledDate).toBe('2026-02-22');
  });

  it('archives to longest with a warm restart at 1 once past 7 days (via lesson)', () => {
    const s = on(pausedAt12(), DONE, '2026-02-23'); // 8 days after 02-15
    expect(s.status).toBe('active');
    expect(s.current).toBe(1);
    expect(s.longest).toBe(12);
  });

  it('archives silently on a refresh past the window, ready for a fresh start', () => {
    let s = on(pausedAt12(), OPEN, '2026-03-10'); // long past the window
    expect(s.longest).toBe(12);
    expect(s.current).toBe(0);
    expect(s.settledDate).toBeNull();
    // the next lesson starts a brand-new streak at 1
    s = on(s, DONE, '2026-03-11');
    expect(s.current).toBe(1);
  });

  it('a refresh still inside the window leaves the pause untouched', () => {
    const s = on(pausedAt12(), OPEN, '2026-02-18');
    expect(s.status).toBe('paused');
    expect(s.current).toBe(12);
  });
});

describe('grantFreeze', () => {
  it('adds freezes up to the equipped cap', () => {
    const s = createStreakState();
    expect(grantFreeze({ ...s, freezesAvailable: 0 }).freezesAvailable).toBe(1);
    expect(grantFreeze(s).freezesAvailable).toBe(MAX_FREEZES); // already at cap
    expect(grantFreeze({ ...s, freezesAvailable: 1 }, 5).freezesAvailable).toBe(MAX_FREEZES);
  });
});

describe('timezone-correct day boundary', () => {
  it('treats an activity and a late-evening return as the same local day, not a miss', () => {
    // Both dates are what localDateInTz would produce for the user's zone; the reducer trusts them.
    let s = on(createStreakState(), DONE, '2026-01-01');
    s = on(s, DONE, '2026-01-01'); // same local day => still 1
    expect(s.current).toBe(1);
    // and the next local day increments exactly once
    s = on(s, DONE, '2026-01-02');
    expect(s.current).toBe(2);
  });

  it('nothing ever transitions to a "broken" status', () => {
    // Exhaust everything and confirm the only terminal states are active/paused.
    let s = on(createStreakState(), DONE, '2026-01-01');
    s = on(s, OPEN, '2026-06-01'); // months later
    expect(['active', 'paused']).toContain(s.status);
  });
});
