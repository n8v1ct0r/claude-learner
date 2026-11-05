// __tests__/state/live-progress.test.ts — read-time energy and streak (V-features-1, FT-13).
//
// The stored energy and streak only change when an action writes them, but both follow the clock:
// energy refills passively (+1 per 45 min) and missed days settle a streak (freezes, pause, archive).
// What a screen shows — and gates on — must be the value the engines give right now.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { canStartPathLesson, createEnergyState, REFILL_INTERVAL_MS } from '@/engine/energy';
import { createStreakState, reduceStreak, type StreakState } from '@/engine/streak';
import { DAY_MS, HOUR_MS, localDateInTz } from '@/engine/time';
import { effectiveEnergy, effectiveStreak } from '@/state/live-progress';
import { useProgressStore } from '@/state/progress';
import { useOutboxStore } from '@/sync/outbox';

const TZ = 'America/New_York';
const T0 = Date.UTC(2026, 8, 1, 3); // 23:00 on Aug 31 in New York

function sevenDayStreakEndingOn(lastDay: number): StreakState {
  let streak = createStreakState();
  for (let day = lastDay - 6; day <= lastDay; day += 1) {
    streak = reduceStreak(streak, { type: 'lessonCompleted' }, localDateInTz(T0 + day * DAY_MS, TZ));
  }
  return streak;
}

describe('effectiveEnergy (V-features-1)', () => {
  it('applies passive refill at read time: an empty bar shows 1 / 4 / 5 after 1 h / 3 h / 8 h', () => {
    const empty = createEnergyState(T0, 0);
    expect(effectiveEnergy(empty, T0)).toBe(0);
    expect(effectiveEnergy(empty, T0 + HOUR_MS)).toBe(1);
    expect(effectiveEnergy(empty, T0 + 3 * HOUR_MS)).toBe(4);
    expect(effectiveEnergy(empty, T0 + 8 * HOUR_MS)).toBe(5);
  });

  it('agrees with the lesson gate: 0 energy plus 45 minutes lets a lesson start', () => {
    const empty = createEnergyState(T0, 0);
    expect(effectiveEnergy(empty, T0 + REFILL_INTERVAL_MS - 1)).toBe(0);
    expect(canStartPathLesson(empty, T0 + REFILL_INTERVAL_MS - 1)).toBe(false);
    expect(effectiveEnergy(empty, T0 + REFILL_INTERVAL_MS)).toBe(1);
    expect(canStartPathLesson(empty, T0 + REFILL_INTERVAL_MS)).toBe(true);
  });
});

describe('effectiveStreak (FT-13)', () => {
  it('shows the archived count after a 13-day gap instead of the stale stored 7', () => {
    const stored = sevenDayStreakEndingOn(0);
    expect(stored.current).toBe(7);
    const shown = effectiveStreak(stored, T0 + 13 * DAY_MS, TZ);
    expect(shown.current).toBe(0);
    expect(shown.longest).toBe(7);
  });

  it('keeps a streak whose missed days the freezes cover (and spends them)', () => {
    const stored = sevenDayStreakEndingOn(0);
    const shown = effectiveStreak(stored, T0 + 3 * DAY_MS, TZ); // two missed days, two freezes
    expect(shown.status).toBe('active');
    expect(shown.current).toBe(7);
    expect(shown.freezesAvailable).toBe(0);
  });

  it('shows a resting streak at its frozen count inside the 7-day window', () => {
    const shown = effectiveStreak(sevenDayStreakEndingOn(0), T0 + 5 * DAY_MS, TZ);
    expect(shown.status).toBe('paused');
    expect(shown.current).toBe(7);
  });

  it('changes nothing later the same day or the next day', () => {
    const stored = sevenDayStreakEndingOn(0);
    expect(effectiveStreak(stored, T0 + HOUR_MS / 2, TZ)).toBe(stored);
    expect(effectiveStreak(stored, T0 + DAY_MS, TZ)).toBe(stored);
  });
});

describe('progress store refreshStreak (FT-13, app open)', () => {
  beforeEach(() => {
    useProgressStore.getState().reset();
    useOutboxStore.getState().reset();
  });

  it('settles missed days into the stored streak as derived state: same timestamp, nothing queued', () => {
    // A settle is not a new write: stamping it `now` would beat another device's newer real streak
    // under last-write-wins (see __tests__/sync/streak-refresh-lww.test.ts).
    useProgressStore.setState({ streak: sevenDayStreakEndingOn(0), streakUpdatedAt: T0 });
    const now = T0 + 13 * DAY_MS;
    useProgressStore.getState().refreshStreak(now, TZ);

    const { streak, streakUpdatedAt } = useProgressStore.getState();
    expect(streak.current).toBe(0);
    expect(streak.longest).toBe(7);
    expect(streakUpdatedAt).toBe(T0);
    expect(useOutboxStore.getState().items.some((item) => item.kind === 'streak')).toBe(false);
  });

  it('writes nothing when there is nothing to settle', () => {
    const streak = sevenDayStreakEndingOn(0);
    useProgressStore.setState({ streak, streakUpdatedAt: T0 });
    useProgressStore.getState().refreshStreak(T0 + HOUR_MS, TZ);
    expect(useProgressStore.getState().streak).toBe(streak);
    expect(useProgressStore.getState().streakUpdatedAt).toBe(T0);
    expect(useOutboxStore.getState().items).toEqual([]);
  });
});
