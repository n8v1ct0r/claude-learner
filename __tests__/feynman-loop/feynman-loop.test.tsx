// __tests__/feynman-loop/feynman-loop.test.tsx  (GC-15)
//
// The Feynman loop is the contract-protected pedagogy. This proves, on the real pilot lesson:
//   (a) explain-back is the DEFAULT path — after the exercises the typed "teach it" input appears with
//       no opt-in, and skipping requires an EXPLICIT tap that emits a distinct analytics event
//       (completed vs skipped);
//   (b) completing explain-back upgrades the chest bronze -> silver (and the ceremony shows it);
//   (c) the gap micro-card renders exactly the self-assessed MISSED key points;
//   (d) the key-point IDs the learner self-assesses are byte-identical to the lesson concept's key
//       points AND to the explain-back's keyPointIds (round-trip).

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

// --- mocks (hoisted) -------------------------------------------------------------------------------

jest.mock('@react-native-async-storage/async-storage', () => {
  const backing: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: (k: string) => Promise.resolve(k in backing ? backing[k] : null),
      setItem: (k: string, v: string) => {
        backing[k] = v;
        return Promise.resolve();
      },
      removeItem: (k: string) => {
        delete backing[k];
        return Promise.resolve();
      },
      getAllKeys: () => Promise.resolve(Object.keys(backing)),
      clear: () => {
        for (const k of Object.keys(backing)) delete backing[k];
        return Promise.resolve();
      },
    },
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ lessonId: 'c1-u1-l1' }),
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

// --- imports (after mocks) -------------------------------------------------------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAnalyticsEvents, resetAnalytics } from '@/analytics/events';
import { setHapticsEnabled } from '@/design/haptics';
import { LessonPlayer } from '@/features/lesson-player/LessonPlayer';
import {
  INITIAL_LESSON_SESSION,
  missingKeyPointIds,
  useLessonSessionStore,
} from '@/state/lesson-session';
import { useProgressStore } from '@/state/progress';

import { l1WorkflowsVsAgents } from '../../content/src/d1-agentic-architecture/c1-u1/l1-workflows-vs-agents';

const lesson = l1WorkflowsVsAgents;
const NOW = Date.UTC(2026, 6, 14, 12, 0, 0);

// Drive the store through the concept + every exercise so the player, when mounted, resumes exactly at
// the explain-back phase (the mount effect resumes a same-lesson pre-ceremony session untouched).
function fastForwardToExplainBack(): void {
  const s = useLessonSessionStore.getState();
  s.startLesson(lesson, NOW);
  s.advanceFromConcept();
  let guard = 0;
  while (useLessonSessionStore.getState().phase === 'exercises') {
    const st = useLessonSessionStore.getState();
    const q = lesson.exercises.find((e) => e.id === st.queue[st.cursor]);
    st.answerCurrent(true, q?.explanation ?? '', NOW);
    st.continueAfterFeedback();
    if (++guard > 30) throw new Error('fast-forward did not reach explain-back');
  }
}

beforeEach(async () => {
  setHapticsEnabled(false);
  useLessonSessionStore.setState({ ...INITIAL_LESSON_SESSION });
  useProgressStore.getState().reset();
  resetAnalytics();
  await AsyncStorage.clear();
});

describe('GC-15a — explain-back is the default path; skip is an explicit, tracked opt-out', () => {
  it('shows the typed explain-back by default and only skips on an explicit tap (distinct event)', async () => {
    fastForwardToExplainBack();
    resetAnalytics();
    await render(<LessonPlayer lessonId="c1-u1-l1" />);

    // Default path: the typed "teach it" input is present with no opt-in, and a SEPARATE skip control.
    expect(await screen.findByLabelText('Your one-sentence explanation')).toBeTruthy();
    const skip = screen.getByRole('button', { name: 'Skip explain-back' });
    expect(screen.getByRole('button', { name: 'Teach it' })).toBeTruthy();

    // No skip/complete event has fired merely by rendering (skip is never automatic).
    expect(
      getAnalyticsEvents().some((e) => e.name === 'explain_back_skipped' || e.name === 'explain_back_completed'),
    ).toBe(false);

    // An explicit tap skips — emitting the SKIPPED event (not completed), keeping the chest bronze.
    fireEvent.press(skip);
    const events = getAnalyticsEvents();
    expect(events.some((e) => e.name === 'explain_back_skipped')).toBe(true);
    expect(events.some((e) => e.name === 'explain_back_completed')).toBe(false);

    const s = useLessonSessionStore.getState();
    expect(s.explainBack.status).toBe('skipped');
    expect(s.chestTier).toBe('bronze');
    expect(s.phase).toBe('ceremony');
    expect(await screen.findByText(/Bronze chest/)).toBeTruthy();
  });
});

describe('GC-15b — completing explain-back upgrades the chest bronze -> silver', () => {
  it('emits the completed event, sets silver, and the ceremony shows the silver chest', async () => {
    fastForwardToExplainBack();
    resetAnalytics();
    await render(<LessonPlayer lessonId="c1-u1-l1" />);

    fireEvent.changeText(
      await screen.findByLabelText('Your one-sentence explanation'),
      'A workflow runs fixed predefined steps; an agent decides its own path.',
    );
    fireEvent.press(await screen.findByRole('button', { name: 'Teach it' }));

    for (const kp of lesson.concept.keyPoints) {
      fireEvent.press(await screen.findByRole('button', { name: kp.text }));
    }
    fireEvent.press(await screen.findByRole('button', { name: 'See how I did' }));
    // Gap -> ceremony.
    fireEvent.press(await screen.findByRole('button', { name: 'Continue' }));

    const s = useLessonSessionStore.getState();
    expect(s.explainBack.status).toBe('completed');
    expect(s.chestTier).toBe('silver');
    expect(getAnalyticsEvents().some((e) => e.name === 'explain_back_completed')).toBe(true);
    expect(await screen.findByText(/Silver chest/)).toBeTruthy();
  });
});

describe('GC-15c — the gap card renders the self-assessed missed key points', () => {
  it('shows exactly the key points the learner did NOT mark covered', async () => {
    fastForwardToExplainBack();
    await render(<LessonPlayer lessonId="c1-u1-l1" />);

    fireEvent.changeText(
      await screen.findByLabelText('Your one-sentence explanation'),
      'A workflow is fixed; an agent decides.',
    );
    fireEvent.press(await screen.findByRole('button', { name: 'Teach it' }));

    // Cover ONLY the first two key points, leaving the last two as gaps.
    const covered = lesson.concept.keyPoints.slice(0, 2);
    const missed = lesson.concept.keyPoints.slice(2);
    for (const kp of covered) {
      fireEvent.press(await screen.findByRole('button', { name: kp.text }));
    }
    fireEvent.press(await screen.findByRole('button', { name: 'See how I did' }));

    const s = useLessonSessionStore.getState();
    expect(s.phase).toBe('gap');
    expect(s.chestTier).toBe('bronze');
    expect(missingKeyPointIds(s.keyPointIds, s.explainBack.coveredIds)).toEqual(missed.map((k) => k.id));

    // The gap micro-card renders the missed key-point texts (reframed as "the good part").
    expect(await screen.findByText(/Found a gap/)).toBeTruthy();
    for (const kp of missed) {
      expect(screen.getByText(`• ${kp.text}`)).toBeTruthy();
    }
  });
});

describe('GC-15d — key-point IDs round-trip (card == explain-back == self-assessment)', () => {
  it('the concept key-point IDs are byte-identical to the explain-back and the session self-assessment', () => {
    const cardIds = lesson.concept.keyPoints.map((k) => k.id);
    // Card <-> explain-back (schema-enforced, asserted here explicitly).
    expect(lesson.explainBack.keyPointIds).toEqual(cardIds);

    // Card <-> the IDs the session self-assessment scores against.
    useLessonSessionStore.getState().startLesson(lesson, NOW);
    expect(useLessonSessionStore.getState().keyPointIds).toEqual(cardIds);

    // Toggling covered stores IDs in key-point order (stable round-trip for the gap card).
    const s = useLessonSessionStore.getState();
    s.toggleCovered(cardIds[1]);
    s.toggleCovered(cardIds[0]);
    expect(useLessonSessionStore.getState().explainBack.coveredIds).toEqual([cardIds[0], cardIds[1]]);
  });
});
