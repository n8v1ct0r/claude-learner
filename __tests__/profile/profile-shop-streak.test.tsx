// __tests__/profile/profile-shop-streak.test.tsx — Profile: streak freeze shop (FT-8) and streak stat (FT-13).
//
// A learner holding the most freezes they can carry must not be able to buy another (it used to spend
// 40 gems for nothing), and the shop says so kindly. The profile's streak stat shows the settled
// streak, not the count stored before missed days.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return { SafeAreaView: rn.View };
});

jest.mock('@/db/content-provider', () => ({
  useContentDb: () => ({ listCourses: () => [], getCourse: () => undefined }),
}));

jest.mock('@/services/local-notifications', () => ({
  enableLocalReminders: jest.fn(() => Promise.resolve('granted')),
  readReminderPermission: jest.fn(() => Promise.resolve('ask')),
  turnRemindersBackOn: jest.fn(() => Promise.resolve()),
}));

import ProfileScreen from '../../app/(tabs)/profile';
import { GEM_SINKS } from '@/engine/rewards';
import { createStreakState, reduceStreak } from '@/engine/streak';
import { DAY_MS, localDateInTz } from '@/engine/time';
import { useGameStore } from '@/state/game';
import { resolveTimezone, useProgressStore } from '@/state/progress';
import { useSettingsStore } from '@/state/settings';

beforeEach(() => {
  useProgressStore.getState().reset();
  useGameStore.getState().reset();
  useSettingsStore.getState().reset();
});

describe('Profile gem workshop: streak freeze (FT-8)', () => {
  it('blocks the purchase at the cap with a kind explanation and keeps the gems', async () => {
    useProgressStore.getState().grantGems(100);
    await render(<ProfileScreen />);

    expect(screen.getByText(/holding 2 of 2 freezes/)).toBeTruthy();
    const full = screen.getByRole('button', { name: 'Freezes full' });
    expect(full.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(full);
    expect(useProgressStore.getState().gems).toBe(100);
    expect(useProgressStore.getState().streak.freezesAvailable).toBe(2);
  });

  it('sells a freeze below the cap, then shows the cap', async () => {
    useProgressStore.getState().grantGems(100);
    useProgressStore.setState((state) => ({ streak: { ...state.streak, freezesAvailable: 1 } }));
    await render(<ProfileScreen />);

    expect(screen.getByText(/1 of 2 freezes ready/)).toBeTruthy();
    const [freezeButton] = screen.getAllByRole('button', { name: 'Get with gems' });
    await fireEvent.press(freezeButton);

    expect(useProgressStore.getState().gems).toBe(100 - GEM_SINKS.streakFreeze.price);
    expect(useProgressStore.getState().streak.freezesAvailable).toBe(2);
    expect(await screen.findByRole('button', { name: 'Freezes full' })).toBeTruthy();
  });
});

describe('Profile streak stat (FT-13)', () => {
  it('shows the settled streak after missed days', async () => {
    const tz = resolveTimezone();
    const now = Date.now();
    let streak = createStreakState();
    for (let back = 19; back >= 13; back -= 1) {
      streak = reduceStreak(streak, { type: 'lessonCompleted' }, localDateInTz(now - back * DAY_MS, tz));
    }
    expect(streak.current).toBe(7);
    useProgressStore.setState({ streak, totalXp: 11, completedLessonIds: ['a', 'b', 'c'] });
    useProgressStore.getState().grantGems(5);

    await render(<ProfileScreen />);
    // The stat grid is the first run of numbers on the screen: XP, GEMS, DAY RHYTHM, LESSONS.
    const numbers = screen.getAllByText(/^\d+$/).slice(0, 4).map((node) => node.props.children);
    expect(numbers).toEqual(['11', '5', '0', '3']);
    expect(screen.getByText('DAY RHYTHM')).toBeTruthy();
  });
});
