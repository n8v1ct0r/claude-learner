// __tests__/path/path-live-progress.test.tsx — the Path tab reads energy and streak at read time.
//
// V-features-1: after running out, passive refill must reach the screen, so the Path stops sending the
// learner to Practice once a refill has landed. FT-13: the header streak must be the settled one,
// not the count stored before the missed days.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return { SafeAreaView: rn.View };
});

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

jest.mock('@/db/content-provider', () => {
  const {
    l1WorkflowsVsAgents,
  } = require('../../content/src/d1-agentic-architecture/c1-u1/l1-workflows-vs-agents');
  const course = {
    id: 'c1',
    domain: 'd1',
    title: 'Agentic Architecture',
    description: 'Course under test',
    order: 1,
    units: [{ id: 'c1-u1', title: 'Unit 1', order: 1, lessons: [l1WorkflowsVsAgents] }],
  };
  return {
    useContentDb: () => ({
      listCourses: () => [{ id: 'c1', domain: 'd1', title: course.title, description: course.description, order: 1 }],
      getCourse: () => course,
      getFirstLesson: () => l1WorkflowsVsAgents,
      getNextLesson: () => undefined,
    }),
  };
});

import PathScreen from '../../app/(tabs)/index';
import { createEnergyState, REFILL_INTERVAL_MS } from '@/engine/energy';
import { createStreakState, reduceStreak } from '@/engine/streak';
import { DAY_MS, localDateInTz } from '@/engine/time';
import { useLessonSessionStore } from '@/state/lesson-session';
import { resolveTimezone, useProgressStore } from '@/state/progress';

beforeEach(() => {
  mockPush.mockClear();
  useProgressStore.getState().reset();
  useLessonSessionStore.getState().clearSession();
});

describe('Path energy (V-features-1)', () => {
  it('shows the refilled energy and starts the lesson instead of redirecting to Practice', async () => {
    useProgressStore.setState({ energy: createEnergyState(Date.now() - REFILL_INTERVAL_MS - 60_000, 0) });
    await render(<PathScreen />);

    expect(screen.getByLabelText('1 energy')).toBeTruthy();
    const cta = screen.getByRole('button', { name: 'Start lesson' });
    await fireEvent.press(cta);
    expect(mockPush).toHaveBeenCalledWith('/lesson/c1-u1-l1');
  });

  it('still offers the warm-up while the bar is genuinely empty', async () => {
    useProgressStore.setState({ energy: createEnergyState(Date.now(), 0) });
    await render(<PathScreen />);

    expect(screen.getByLabelText('0 energy')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Warm up to refill' }));
    expect(mockPush).toHaveBeenCalledWith('/practice');
  });
});

describe('Path streak (FT-13)', () => {
  it('shows the settled streak after missed days, not the stale stored count', async () => {
    const tz = resolveTimezone();
    const now = Date.now();
    let streak = createStreakState();
    for (let back = 19; back >= 13; back -= 1) {
      streak = reduceStreak(streak, { type: 'lessonCompleted' }, localDateInTz(now - back * DAY_MS, tz));
    }
    expect(streak.current).toBe(7);
    useProgressStore.setState({ streak });

    await render(<PathScreen />);
    expect(screen.getByLabelText('0 day streak')).toBeTruthy();
  });
});
