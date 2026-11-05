// __tests__/feynman-loop/feynman-grading.test.tsx  (GC-09 client lane)
//
// The optional server grading enriches the explain-back WITHOUT ever changing its guarantees. This
// proves, on the real pilot lesson, with src/api/grading mocked at the jest layer (no network):
//   (a) a graded verdict pre-marks the covered key points and shows the agent's coaching line, with no
//       tap from the learner, and its missing IDs render through the SAME canonical key-point text path
//       as self-assessed misses;
//   (b) a degraded verdict (no server / offline / quota) is byte-identical to today's manual
//       self-assessment — same flow, same chest, no error surface;
//   (c) XP is IDENTICAL across graded, degraded, and skip — grading never touches the number;
//   (d) the one-shot refine loop re-grades with a NEW submission id and upgrades coverage;
//   (e) banned model prose is swapped for the app-authored fallback before it renders (GC-13);
//   (f) the character counter hard-stops the transcript at 1000 (GC-09).

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

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

// The network boundary: fully mocked so grading is deterministic and offline.
jest.mock('@/api/grading', () => ({
  requestGrading: jest.fn(),
}));

// --- imports (after mocks) -------------------------------------------------------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';

import { requestGrading, type GradingResult } from '@/api/grading';
import { getAnalyticsEvents, resetAnalytics } from '@/analytics/events';
import { setHapticsEnabled } from '@/design/haptics';
import { LessonPlayer } from '@/features/lesson-player/LessonPlayer';
import { LLM_FALLBACK_TEMPLATES } from '@/features/lesson-player/llm-text-filter';
import {
  INITIAL_LESSON_SESSION,
  LESSON_SESSION_STORAGE_KEY,
  LESSON_SESSION_VERSION,
  useLessonSessionStore,
} from '@/state/lesson-session';
import { useProgressStore } from '@/state/progress';

import { l1WorkflowsVsAgents } from '../../content/src/d1-agentic-architecture/c1-u1/l1-workflows-vs-agents';

const lesson = l1WorkflowsVsAgents;
const kp = lesson.concept.keyPoints;
const NOW = Date.UTC(2026, 6, 14, 12, 0, 0);

const mockRequestGrading = requestGrading as jest.MockedFunction<typeof requestGrading>;

function gradeWith(partial: Partial<Parameters<typeof gradeResult>[0]> = {}) {
  return gradeResult(partial);
}
function gradeResult(g: {
  covered?: string[];
  missing?: string[];
  jargon?: string[];
  misconception?: string | null;
  score?: 1 | 2 | 3 | 4 | 5;
  hint?: string;
}): GradingResult {
  return {
    kind: 'graded',
    grade: {
      covered_points: g.covered ?? [],
      missing_points: g.missing ?? [],
      jargon_flags: g.jargon ?? [],
      misconception: g.misconception ?? null,
      simple_score: g.score ?? 3,
      next_step_hint: g.hint ?? 'Nice start — now name what an agent decides for itself.',
    },
  };
}

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
  mockRequestGrading.mockReset();
  // Default: never resolves within a test unless a test opts into a specific result.
  mockRequestGrading.mockResolvedValue({ kind: 'degraded', reason: 'no-server' });
  await AsyncStorage.clear();
});

describe('GC-09 — a graded verdict pre-marks coverage without a learner tap', () => {
  it('marks the server-covered points and shows the agent coaching line', async () => {
    mockRequestGrading.mockResolvedValue(
      gradeWith({ covered: [kp[0].id, kp[1].id], missing: [kp[2].id, kp[3].id], hint: 'Now name what an agent decides for itself.' }),
    );
    fastForwardToExplainBack();
    await render(<LessonPlayer lessonId="c1-u1-l1" />);

    fireEvent.changeText(
      await screen.findByLabelText('Your one-sentence explanation'),
      'A workflow is fixed; an agent decides.',
    );
    fireEvent.press(await screen.findByRole('button', { name: 'Teach it' }));

    // The agent's coaching line arrives with the verdict — proof the graded branch rendered.
    expect(await screen.findByText('Now name what an agent decides for itself.')).toBeTruthy();

    // The two server-covered points are pre-marked (selected) WITHOUT any tap; the other two are not.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: kp[0].text }).props.accessibilityState.selected).toBe(true);
    });
    expect(screen.getByRole('button', { name: kp[1].text }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole('button', { name: kp[2].text }).props.accessibilityState.selected).toBe(false);

    const s = useLessonSessionStore.getState();
    expect(s.explainBack.grading).toBe('graded');
    expect(s.explainBack.coveredIds).toEqual([kp[0].id, kp[1].id]);
  });

  it('renders the server missing_points as canonical key-point text on the gap card (ID path)', async () => {
    mockRequestGrading.mockResolvedValue(
      gradeWith({ covered: [kp[0].id, kp[1].id], missing: [kp[2].id, kp[3].id] }),
    );
    fastForwardToExplainBack();
    await render(<LessonPlayer lessonId="c1-u1-l1" />);

    fireEvent.changeText(await screen.findByLabelText('Your one-sentence explanation'), 'Workflow fixed; agent decides.');
    fireEvent.press(await screen.findByRole('button', { name: 'Teach it' }));
    await waitFor(() => expect(useLessonSessionStore.getState().explainBack.grading).toBe('graded'));

    fireEvent.press(await screen.findByRole('button', { name: 'See how I did' }));

    // The gap card shows exactly the server-missed points, as the app's own canonical text (lintable).
    expect(await screen.findByText(/Found a gap/)).toBeTruthy();
    expect(screen.getByText(`• ${kp[2].text}`)).toBeTruthy();
    expect(screen.getByText(`• ${kp[3].text}`)).toBeTruthy();
    expect(screen.queryByText(`• ${kp[0].text}`)).toBeNull();
  });
});

describe('GC-13 — banned model prose never reaches the learner', () => {
  it('swaps a shame-framed next_step_hint for the app-authored fallback', async () => {
    mockRequestGrading.mockResolvedValue(
      gradeWith({ covered: [kp[0].id], missing: [kp[1].id, kp[2].id, kp[3].id], hint: 'You should have mentioned tool use.' }),
    );
    fastForwardToExplainBack();
    await render(<LessonPlayer lessonId="c1-u1-l1" />);

    fireEvent.changeText(await screen.findByLabelText('Your one-sentence explanation'), 'A workflow is fixed.');
    fireEvent.press(await screen.findByRole('button', { name: 'Teach it' }));

    expect(await screen.findByText(LLM_FALLBACK_TEMPLATES['next-step-hint'])).toBeTruthy();
    expect(screen.queryByText(/you should have/i)).toBeNull();
  });
});

describe('GC-09 — a degraded verdict is byte-identical to manual self-assessment', () => {
  it('flows exactly like the pre-grading path: manual toggles, silver chest, no error surface', async () => {
    mockRequestGrading.mockResolvedValue({ kind: 'degraded', reason: 'quota' });
    fastForwardToExplainBack();
    await render(<LessonPlayer lessonId="c1-u1-l1" />);

    fireEvent.changeText(
      await screen.findByLabelText('Your one-sentence explanation'),
      'A workflow runs fixed predefined steps; an agent decides its own path.',
    );
    fireEvent.press(await screen.findByRole('button', { name: 'Teach it' }));
    await waitFor(() => expect(useLessonSessionStore.getState().explainBack.grading).toBe('degraded'));

    // No key point is auto-marked; the learner self-assesses exactly as before grading existed.
    expect(screen.getByRole('button', { name: kp[0].text }).props.accessibilityState.selected).toBe(false);
    for (const point of kp) {
      fireEvent.press(await screen.findByRole('button', { name: point.text }));
    }

    fireEvent.press(await screen.findByRole('button', { name: 'See how I did' }));
    fireEvent.press(await screen.findByRole('button', { name: 'Continue' }));

    const s = useLessonSessionStore.getState();
    expect(s.phase).toBe('ceremony');
    expect(s.chestTier).toBe('silver');
    expect((s.xpBreakdown?.total ?? 0)).toBeGreaterThan(0);
  });
});

describe('GC-09 — XP is invariant to grading (graded == degraded == skip)', () => {
  // Drive completion at the STORE level so the three paths share an identical XP input, proving the
  // number comes only from combo/completion — grading and chest tier never feed computeLessonXp.
  const completion = {
    now: NOW,
    timezone: 'UTC',
    unitCompleted: false,
    alreadyCompleted: false,
    boostWindow: null,
  };

  function reset(): void {
    useLessonSessionStore.setState({ ...INITIAL_LESSON_SESSION });
    useProgressStore.getState().reset();
    fastForwardToExplainBack();
  }

  it('awards the SAME total across a graded-full, a self-assessed-full, and a skipped lesson', () => {
    const allIds = kp.map((k) => k.id);

    // (1) Graded full coverage → silver.
    reset();
    useLessonSessionStore.setState((state) => ({
      explainBack: { ...state.explainBack, status: 'submitted', grading: 'graded', coveredIds: allIds },
    }));
    useLessonSessionStore.getState().finishExplainBack(NOW);
    expect(useLessonSessionStore.getState().chestTier).toBe('silver');
    useLessonSessionStore.getState().finishGap(completion);
    const gradedXp = useLessonSessionStore.getState().xpBreakdown?.total ?? -1;

    // (2) Degraded + manual self-assessment to full coverage → silver.
    reset();
    for (const id of allIds) useLessonSessionStore.getState().toggleCovered(id);
    useLessonSessionStore.getState().finishExplainBack(NOW);
    expect(useLessonSessionStore.getState().chestTier).toBe('silver');
    useLessonSessionStore.getState().finishGap(completion);
    const degradedXp = useLessonSessionStore.getState().xpBreakdown?.total ?? -1;

    // (3) Skip → bronze, but the SAME XP number.
    reset();
    useLessonSessionStore.getState().skipExplainBack(completion);
    expect(useLessonSessionStore.getState().chestTier).toBe('bronze');
    const skipXp = useLessonSessionStore.getState().xpBreakdown?.total ?? -1;

    expect(gradedXp).toBeGreaterThan(0);
    expect(degradedXp).toBe(gradedXp);
    expect(skipXp).toBe(gradedXp);
  });
});

describe('GC-09 — one-shot refine re-grades with a fresh submission id', () => {
  it('offers a single refine after a graded miss, and the second grading upgrades coverage', async () => {
    mockRequestGrading
      .mockResolvedValueOnce(gradeWith({ covered: [kp[0].id, kp[1].id], missing: [kp[2].id, kp[3].id] }))
      .mockResolvedValueOnce(gradeWith({ covered: kp.map((k) => k.id), missing: [] }));

    fastForwardToExplainBack();
    await render(<LessonPlayer lessonId="c1-u1-l1" />);

    fireEvent.changeText(await screen.findByLabelText('Your one-sentence explanation'), 'A workflow is fixed; an agent decides.');
    fireEvent.press(await screen.findByRole('button', { name: 'Teach it' }));

    // First verdict leaves gaps → a refine is offered.
    const refine = await screen.findByRole('button', { name: 'Add the missing bit' });
    fireEvent.press(refine);
    fireEvent.changeText(await screen.findByLabelText('Your added detail'), 'An agent picks its own tools and steps.');
    fireEvent.press(await screen.findByRole('button', { name: 'Teach it again' }));

    // Second verdict upgrades to full coverage and the refine is spent (cap = 1).
    await waitFor(() => {
      expect(useLessonSessionStore.getState().explainBack.coveredIds).toEqual(kp.map((k) => k.id));
    });
    const s = useLessonSessionStore.getState();
    expect(s.explainBack.refinesUsed).toBe(1);
    expect(screen.queryByRole('button', { name: 'Add the missing bit' })).toBeNull();

    // Two gradings fired, each with a DISTINCT idempotency key.
    expect(mockRequestGrading).toHaveBeenCalledTimes(2);
    const firstId = mockRequestGrading.mock.calls[0][0].clientSubmissionId;
    const secondId = mockRequestGrading.mock.calls[1][0].clientSubmissionId;
    expect(firstId).not.toBe(secondId);
  });
});

describe('GC-09 — a mid-grading app kill rehydrates safely (no eternal "checking…")', () => {
  it('settles a persisted grading:"pending" orphan to degraded manual self-assessment on rehydrate', async () => {
    // Simulate an app killed mid-flight: persisted state says a grading is pending, but no request
    // will ever resolve it in this fresh process.
    fastForwardToExplainBack();
    const live = useLessonSessionStore.getState();
    await AsyncStorage.setItem(
      LESSON_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: LESSON_SESSION_VERSION,
        state: {
          ...INITIAL_LESSON_SESSION,
          lessonId: live.lessonId,
          phase: 'explainBack',
          keyPointIds: live.keyPointIds,
          conceptId: live.conceptId,
          explainBack: {
            status: 'submitted',
            transcript: 'A workflow is fixed; an agent decides.',
            coveredIds: [],
            grading: 'pending',
            refinesUsed: 0,
            submissionId: 'dead-beef-dead-beef-dead',
          },
        },
      }),
    );

    await useLessonSessionStore.persist.rehydrate();

    const s = useLessonSessionStore.getState();
    expect(s.explainBack.grading).toBe('degraded'); // never stuck pending
    expect(s.explainBack.submissionId).toBeNull(); // no orphan key for a stale response to match
    expect(s.explainBack.status).toBe('submitted'); // the learner resumes at manual self-assessment
    expect(s.phase).toBe('explainBack');
  });
});

describe('GC-09 — the transcript character counter hard-stops at 1000', () => {
  it('caps the field at 1000 (native + counter) and the store clamps any over-long transcript', async () => {
    fastForwardToExplainBack();
    await render(<LessonPlayer lessonId="c1-u1-l1" />);

    const input = await screen.findByLabelText('Your one-sentence explanation');
    // Native hard stop: the field itself refuses to hold more than 1000 characters.
    expect(input.props.maxLength).toBe(1000);

    // The counter tracks the live length and, past the soft-warn threshold, nudges (no shame).
    fireEvent.changeText(input, 'a'.repeat(900));
    expect(await screen.findByText('900 / 1000')).toBeTruthy();
    expect(screen.getByText('keep it tight — one sentence')).toBeTruthy();

    // Belt-and-suspenders: even a programmatic over-long transcript is clamped before it is stored/sent.
    useLessonSessionStore.getState().submitExplainBack('b'.repeat(1500));
    expect(useLessonSessionStore.getState().explainBack.transcript.length).toBe(1000);
  });
});
