// __tests__/lesson-flow/ceremony-reminder-prompt.test.tsx — the first-lesson reminder prompt.
//
// "Enable gentle reminders" closes the ceremony at once and lets the OS work in the background. When
// that work fails (an OS call rejects), the ceremony must still close and the rejection must be
// handled rather than left unhandled; the next app open schedules again.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Render the final state straight away (no count-up timers).
jest.mock('@/design/motion', () => ({ useReduceMotion: () => true }));

const mockEnable = jest.fn<() => Promise<unknown>>();
jest.mock('@/services/local-notifications', () => ({
  enableLocalReminders: () => mockEnable(),
}));

import type { LessonXpBreakdown } from '@/engine/xp';
import { Ceremony } from '@/features/lesson-player/Ceremony';
import { useProgressStore } from '@/state/progress';
import { useSettingsStore } from '@/state/settings';

const XP: LessonXpBreakdown = { base: 40, combo: 0, unit: 0, legendary: 0, multiplier: 1, total: 40 };

/** A rejected promise that records whether anything down its chain handles the rejection. */
function trackedRejection(error: Error): { create: () => Promise<never>; handled: () => boolean } {
  let handled = false;
  class Tracked<T> extends Promise<T> {
    then<R1 = T, R2 = never>(
      onFulfilled?: ((value: T) => R1 | PromiseLike<R1>) | null,
      onRejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
    ): Promise<R1 | R2> {
      if (onRejected) handled = true;
      return super.then(onFulfilled, onRejected);
    }
  }
  return { create: () => Tracked.reject(error) as Promise<never>, handled: () => handled };
}

beforeEach(() => {
  mockEnable.mockReset();
  useSettingsStore.getState().reset(); // reminders not yet offered
  useProgressStore.getState().reset();
  useProgressStore.setState({ completedLessonIds: ['c1-u1-l1'] }); // the first lesson just finished
});

describe('first-lesson reminder prompt', () => {
  it('closes the ceremony and handles the rejection when enabling fails', async () => {
    const failure = trackedRejection(new Error('an OS call failed'));
    mockEnable.mockImplementationOnce(failure.create);
    const onDone = jest.fn();
    await render(
      <Ceremony xp={XP} chestTier="bronze" accuracy={0.8} conceptCoverage={1} comboBest={2} streakCurrent={1} onDone={onDone} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Enable gentle reminders' }));

    expect(mockEnable).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(failure.handled()).toBe(true);
  });
});
