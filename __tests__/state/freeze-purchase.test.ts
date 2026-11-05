// __tests__/state/freeze-purchase.test.ts — FT-8: a streak freeze at the cap is never sold.
//
// Learners start holding the maximum two freezes. Buying a third used to spend 40 gems and grant
// nothing (grantFreeze clamps to the cap). The purchase must be refused before any gems move, and the
// shop must be able to say why.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { GEM_SINKS } from '../../src/engine/rewards';
import { createStreakState, MAX_FREEZES, reduceStreak } from '../../src/engine/streak';
import { DAY_MS, localDateInTz } from '../../src/engine/time';
import { sinkAvailability, useGameStore } from '../../src/state/game';
import { resolveTimezone, useProgressStore } from '../../src/state/progress';

beforeEach(() => {
  useGameStore.getState().reset();
  useProgressStore.getState().reset();
});

describe('streak freeze purchase at the cap (FT-8)', () => {
  it('refuses the purchase and keeps every gem when the learner already holds two freezes', () => {
    useProgressStore.getState().grantGems(100);
    expect(useProgressStore.getState().streak.freezesAvailable).toBe(MAX_FREEZES);

    expect(useGameStore.getState().purchase(GEM_SINKS.streakFreeze.id, Date.now())).toBe(false);

    expect(useProgressStore.getState().gems).toBe(100);
    expect(useProgressStore.getState().streak.freezesAvailable).toBe(MAX_FREEZES);
  });

  it('settles missed days first, so freezes a gap just used can be restocked', () => {
    const now = Date.now();
    const tz = resolveTimezone();
    let streak = createStreakState();
    for (let back = 5; back >= 3; back -= 1) {
      streak = reduceStreak(streak, { type: 'lessonCompleted' }, localDateInTz(now - back * DAY_MS, tz));
    }
    // Two missed days (the day before yesterday and yesterday) are still unsettled in storage.
    useProgressStore.setState({ streak });
    useProgressStore.getState().grantGems(GEM_SINKS.streakFreeze.price);

    expect(useGameStore.getState().purchase(GEM_SINKS.streakFreeze.id, now)).toBe(true);
    expect(useProgressStore.getState().gems).toBe(0);
    expect(useProgressStore.getState().streak.freezesAvailable).toBe(1);
    expect(useProgressStore.getState().streak.current).toBe(3);
  });

  it('says why a sink is unavailable', () => {
    const base = { gems: 500, freezesAvailable: 1, ownedCosmetics: [] as string[] };
    expect(sinkAvailability(GEM_SINKS.streakFreeze.id, base)).toBe('available');
    expect(sinkAvailability(GEM_SINKS.streakFreeze.id, { ...base, freezesAvailable: MAX_FREEZES })).toBe('freezes-full');
    expect(sinkAvailability(GEM_SINKS.streakFreeze.id, { ...base, gems: 10 })).toBe('needs-gems');
    expect(sinkAvailability(GEM_SINKS.agentHardHat.id, { ...base, ownedCosmetics: [GEM_SINKS.agentHardHat.id] })).toBe('owned');
    expect(sinkAvailability('not-a-sink', base)).toBe('unknown');
  });
});
