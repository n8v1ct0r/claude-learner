// __tests__/lesson-flow/streak-milestone-once.test.tsx — FT-9: celebrate a streak milestone once.
//
// The full-screen milestone takeover belongs to the completion that moved the streak onto the
// milestone. A second lesson (or a replay) later the same day leaves the streak where it was, so it
// must go straight back to the path instead of celebrating the same milestone again.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  // canGoBack: the lesson player only calls back() when there is history to go back to.
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: jest.fn(), canGoBack: () => true }),
}));

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return {
    SafeAreaView: rn.View,
    SafeAreaProvider: ({ children }: { children: unknown }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@/db/content-provider', () => {
  const {
    l1WorkflowsVsAgents,
  } = require('../../content/src/d1-agentic-architecture/c1-u1/l1-workflows-vs-agents');
  return {
    useLesson: () => l1WorkflowsVsAgents,
    useContentDb: () => ({
      listCourses: () => [],
      getCourse: () => undefined,
      getUnit: () => undefined,
      getLesson: () => l1WorkflowsVsAgents,
      getFirstLesson: () => l1WorkflowsVsAgents,
      getNextLesson: () => undefined,
    }),
  };
});

import { setHapticsEnabled } from '@/design/haptics';
import { createStreakState, reduceStreak } from '@/engine/streak';
import { DAY_MS, localDateInTz } from '@/engine/time';
import { LessonPlayer } from '@/features/lesson-player/LessonPlayer';
import { INITIAL_LESSON_SESSION, useLessonSessionStore } from '@/state/lesson-session';
import { resolveTimezone, useProgressStore } from '@/state/progress';
import { useSettingsStore } from '@/state/settings';

import { l1WorkflowsVsAgents } from '../../content/src/d1-agentic-architecture/c1-u1/l1-workflows-vs-agents';

/** Answer the whole decision set and skip the teach-back, straight through the session store. */
function finishLessonToCeremony(alreadyCompleted: boolean): void {
  const session = useLessonSessionStore.getState();
  session.advanceFromConcept();
  while (useLessonSessionStore.getState().phase === 'exercises') {
    useLessonSessionStore.getState().answerCurrent(true, 'explanation', Date.now());
    useLessonSessionStore.getState().continueAfterFeedback();
  }
  useLessonSessionStore.getState().skipExplainBack({
    unitCompleted: false,
    alreadyCompleted,
    boostWindow: null,
    now: Date.now(),
    timezone: resolveTimezone(),
  });
}

beforeEach(() => {
  setHapticsEnabled(false);
  mockBack.mockClear();
  useLessonSessionStore.setState({ ...INITIAL_LESSON_SESSION });
  useProgressStore.getState().reset();
  useSettingsStore.getState().reset();
  useSettingsStore.getState().setNotificationsPrimed(true); // plain "Done" at the ceremony

  // Six study days in a row up to yesterday: today's first lesson lands on the 7-day milestone.
  const tz = resolveTimezone();
  let streak = createStreakState();
  for (let back = 6; back >= 1; back -= 1) {
    streak = reduceStreak(streak, { type: 'lessonCompleted' }, localDateInTz(Date.now() - back * DAY_MS, tz));
  }
  useProgressStore.setState({ streak, completedLessonIds: ['c0-u1-l1', 'c0-u1-l2'] });
});

describe('streak milestone takeover (FT-9)', () => {
  it('celebrates the lesson that reaches 7 days, and not a second lesson the same day', async () => {
    const first = await render(<LessonPlayer lessonId="c1-u1-l1" />);
    await act(async () => finishLessonToCeremony(false));
    expect(useProgressStore.getState().streak.current).toBe(7);

    await fireEvent.press(await screen.findByRole('button', { name: 'Done' }));
    expect(await screen.findByText('7-day streak')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Keep it going' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    first.unmount();

    // A replay later the same day: the streak stays at 7, so no second celebration.
    await render(<LessonPlayer lessonId="c1-u1-l1" />);
    await act(async () => finishLessonToCeremony(true));
    expect(useProgressStore.getState().streak.current).toBe(7);

    await fireEvent.press(await screen.findByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('button', { name: 'Keep it going' })).toBeNull();
    expect(mockBack).toHaveBeenCalledTimes(2);
  });

  it('records on the session whether this completion moved the streak', () => {
    const session = useLessonSessionStore.getState();
    session.startLesson(l1WorkflowsVsAgents, Date.now());
    finishLessonToCeremony(false);
    expect(useLessonSessionStore.getState().streakAdvanced).toBe(true);

    useLessonSessionStore.getState().clearSession();
    expect(useLessonSessionStore.getState().streakAdvanced).toBe(false);
  });
});
