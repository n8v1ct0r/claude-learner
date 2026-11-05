// __tests__/lesson-flow/exits-and-recovery.test.tsx  (IB-6, V-web-runtime-1, V-web-runtime-3, IB-2)
//
// No dead ends:
//   • the lesson briefing and the invalid-lesson screen have a close control, and every lesson exit
//     goes back when there is history and otherwise to the Learn tab (a deep link or web refresh has no
//     history, and a bare router.back() there is an unhandled GO_BACK);
//   • the unit review exits the same way;
//   • unknown URLs get a branded not-found screen with a way back to Learn;
//   • a render error shows a friendly recovery screen (retry, and Learn when the navigator survives)
//     and lifts the native splash, instead of a blank screen.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return { SafeAreaView: rn.View };
});

jest.mock('@/components/splash', () => ({
  hideAppSplash: jest.fn(),
  forceHideAppSplash: jest.fn(),
}));

const mockRouter = {
  back: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
  dismissTo: jest.fn(),
  canGoBack: jest.fn(() => false),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  get router() {
    return mockRouter;
  },
  Stack: { Screen: () => null },
}));

jest.mock('@/db/content-provider', () => {
  const { l1WorkflowsVsAgents } = require('../../content/src/d1-agentic-architecture/c1-u1/l1-workflows-vs-agents');
  const { c1AgenticArchitecture } = require('../../content/src/d1-agentic-architecture/course');
  return {
    useLesson: (id: string) => (id === l1WorkflowsVsAgents.id ? l1WorkflowsVsAgents : undefined),
    useContentDb: () => ({
      listCourses: () => [],
      getCourse: () => undefined,
      getUnit: (id: string) => c1AgenticArchitecture.units.find((unit: { id: string }) => unit.id === id),
      getLesson: () => l1WorkflowsVsAgents,
      getFirstLesson: () => l1WorkflowsVsAgents,
      getNextLesson: () => undefined,
    }),
  };
});

import NotFoundScreen from '../../app/+not-found';
import { ErrorRecovery } from '@/components/ErrorRecovery';
import { forceHideAppSplash, hideAppSplash } from '@/components/splash';
import { LessonPlayer } from '@/features/lesson-player/LessonPlayer';
import { UnitReviewPlayer } from '@/features/path/UnitReviewPlayer';
import { INITIAL_LESSON_SESSION, useLessonSessionStore } from '@/state/lesson-session';

beforeEach(() => {
  for (const fn of Object.values(mockRouter)) fn.mockClear();
  mockRouter.canGoBack.mockReturnValue(false);
  jest.mocked(hideAppSplash).mockClear();
  jest.mocked(forceHideAppSplash).mockClear();
  useLessonSessionStore.setState({ ...INITIAL_LESSON_SESSION });
});

describe('lesson exits', () => {
  it('gives the invalid-lesson screen a close control and a way back to Learn', async () => {
    await render(<LessonPlayer lessonId="no-such-lesson" />);
    expect(screen.getByText('This lesson isn’t available yet.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Close lesson' }));
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/');

    await fireEvent.press(screen.getByRole('button', { name: 'Back to Learn' }));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
  });

  it('gives the briefing a close control that goes back when there is history', async () => {
    mockRouter.canGoBack.mockReturnValue(true);
    await render(<LessonPlayer lessonId="c1-u1-l1" />);
    const close = await screen.findByRole('button', { name: 'Close lesson' });
    expect(close.props.accessibilityHint).toBe('Your place in this lesson is saved');
    expect(screen.getByText('CONCEPT BRIEFING')).toBeTruthy();

    await fireEvent.press(close);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
    // Closing the briefing keeps the session, so Continue resumes it.
    expect(useLessonSessionStore.getState().lessonId).toBe('c1-u1-l1');
  });

  it('lands on the Learn tab when a deep-linked briefing is closed', async () => {
    await render(<LessonPlayer lessonId="c1-u1-l1" />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Close lesson' }));
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });
});

describe('unit review exits', () => {
  it('closes to the Learn tab when the review was opened without history', async () => {
    await render(<UnitReviewPlayer unitId="c1-u1" />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Close review' }));
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('goes back when there is history', async () => {
    mockRouter.canGoBack.mockReturnValue(true);
    await render(<UnitReviewPlayer unitId="c1-u1" />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Close review' }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});

describe('not-found screen', () => {
  it('explains the dead link, offers Learn, and lifts the splash', async () => {
    await render(<NotFoundScreen />);
    expect(screen.getByRole('header', { name: 'This page isn’t here' })).toBeTruthy();
    expect(hideAppSplash).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Back to Learn' }));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
  });
});

describe('error recovery screen', () => {
  it('offers a retry and, when the navigator survives, a way back to Learn', async () => {
    const onRetry = jest.fn<() => void>();
    const onHome = jest.fn<() => void>();
    await render(<ErrorRecovery onRetry={onRetry} onHome={onHome} />);
    expect(screen.getByRole('header', { name: 'This screen hit a snag' })).toBeTruthy();
    expect(screen.getByText(/Your progress is saved on this device/)).toBeTruthy();
    expect(forceHideAppSplash).toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Back to Learn' }));
    expect(onHome).toHaveBeenCalledTimes(1);
  });

  it('offers only a retry above the navigator', async () => {
    await render(<ErrorRecovery onRetry={jest.fn<() => void>()} />);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Back to Learn' })).toBeNull();
  });
});
