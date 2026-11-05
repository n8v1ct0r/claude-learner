// __tests__/engine/streak-refresh.test.ts — FT-13 at the streak engine (GC-04 oracle).
//
// A refresh (app open, no new lesson) must land on the same state a lesson-driven evaluation reaches.
// Freezes that run out pause the streak, and a pause already older than the 7-day window archives it
// in the SAME refresh — a second refresh must not be needed before the count is right.

import { describe, expect, it } from '@jest/globals';

import { createStreakState, reduceStreak, RESUME_WINDOW_DAYS, type StreakEvent, type StreakState } from '@/engine/streak';

const DONE: StreakEvent = { type: 'lessonCompleted' };
const OPEN: StreakEvent = { type: 'refresh' };

function sevenDays(): StreakState {
  let s = createStreakState();
  for (let d = 1; d <= 7; d += 1) s = reduceStreak(s, DONE, `2026-01-0${d}`);
  return s;
}

describe('streak refresh after missed days (FT-13)', () => {
  it('archives in one refresh when the gap already runs past the resume window', () => {
    // Last activity 01-07; freezes cover 01-08 and 01-09; the pause starts 01-10; 01-20 is 10 days later.
    const s = reduceStreak(sevenDays(), OPEN, '2026-01-20');
    expect(RESUME_WINDOW_DAYS).toBe(7);
    expect(s.status).toBe('active');
    expect(s.current).toBe(0);
    expect(s.longest).toBe(7);
    expect(s.settledDate).toBeNull();
    // Idempotent: another refresh the same day changes nothing.
    expect(reduceStreak(s, OPEN, '2026-01-20')).toEqual(s);
  });

  it('pauses (count frozen) when the gap is still inside the resume window', () => {
    const s = reduceStreak(sevenDays(), OPEN, '2026-01-14'); // pause began 01-10, 4 days ago
    expect(s.status).toBe('paused');
    expect(s.current).toBe(7);
    expect(s.pausedSince).toBe('2026-01-10');
  });

  it('matches what a lesson on the same day would see before it counts', () => {
    // A lesson 13 days later archives and restarts at 1; the refresh archives to 0, ready for that 1.
    const viaRefresh = reduceStreak(reduceStreak(sevenDays(), OPEN, '2026-01-20'), DONE, '2026-01-20');
    const viaLesson = reduceStreak(sevenDays(), DONE, '2026-01-20');
    expect(viaRefresh.current).toBe(1);
    expect(viaLesson.current).toBe(1);
    expect(viaRefresh.longest).toBe(viaLesson.longest);
  });
});
