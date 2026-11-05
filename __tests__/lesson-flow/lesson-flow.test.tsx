// __tests__/lesson-flow/lesson-flow.test.tsx  (GC-03)
//
// Drives the REAL pilot lesson (C1-U1-L1 "Workflows vs agents") through the LessonPlayer end to end:
// concept -> every renderer type in the lesson (mc + scenario/spot-bug/tf-speed variants, multi,
// order) -> explain-back -> gap -> ceremony. Asserts:
//   • XP is awarded exactly per the XP engine (computeLessonXp), and
//   • the ceremony renders WITHOUT awaiting any grading promise (the XP is present on the store the
//     instant the completing tap returns — finalize is synchronous), and
//   • a cold open resumes an in-progress lesson at the exact question after a simulated kill (store
//     rehydration), and
//   • the pure resume resolver deep-links the Continue CTA to that in-progress lesson.
// A separate block proves every renderer (including cloze) is answerable and grades correctly.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

// --- mocks (hoisted above imports by babel-plugin-jest-hoist) --------------------------------------

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

import { setHapticsEnabled } from '@/design/haptics';
import { computeLessonXp } from '@/engine/xp';
import { ExerciseStep } from '@/features/lesson-player/ExerciseStep';
import { LessonPlayer } from '@/features/lesson-player/LessonPlayer';
import { ClozeRenderer } from '@/features/lesson-player/renderers/ClozeRenderer';
import { McRenderer } from '@/features/lesson-player/renderers/McRenderer';
import { MultiRenderer } from '@/features/lesson-player/renderers/MultiRenderer';
import { OrderRenderer } from '@/features/lesson-player/renderers/OrderRenderer';
import { resolveContinueTarget } from '@/features/path/resume';
import { INITIAL_LESSON_SESSION, useLessonSessionStore } from '@/state/lesson-session';
import { useProgressStore } from '@/state/progress';

import { l1WorkflowsVsAgents } from '../../content/src/d1-agentic-architecture/c1-u1/l1-workflows-vs-agents';
import { l3AgenticLoop } from '../../content/src/d1-agentic-architecture/c1-u1/l3-agentic-loop';
import type {
  ClozeQuestion,
  McQuestion,
  MultiQuestion,
  OrderQuestion,
  Question,
} from '../../content/schema/types';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const lesson = l1WorkflowsVsAgents;

function currentQuestion(): Question {
  const s = useLessonSessionStore.getState();
  const id = s.queue[s.cursor];
  const q = lesson.exercises.find((e) => e.id === id);
  if (!q) throw new Error(`no question for queue position ${s.cursor} (${id})`);
  return q;
}

// Answer the current question CORRECTLY through the UI, then dismiss the feedback.
async function answerCurrentCorrectly(): Promise<void> {
  const q = currentQuestion();
  if (q.type === 'mc') {
    fireEvent.press(await screen.findByRole('button', { name: q.options[q.answerKey] }));
  } else if (q.type === 'multi') {
    for (const i of q.answerKey) {
      fireEvent.press(await screen.findByRole('button', { name: q.options[i] }));
    }
    fireEvent.press(await screen.findByRole('button', { name: 'Check' }));
  } else if (q.type === 'order') {
    for (const stepIndex of q.answerKey) {
      fireEvent.press(await screen.findByRole('button', { name: q.steps[stepIndex] }));
    }
  } else {
    throw new Error(`unexpected question type ${q.type} in the pilot flow`);
  }
  fireEvent.press(await screen.findByRole('button', { name: 'Continue' }));
}

beforeEach(async () => {
  setHapticsEnabled(false);
  useLessonSessionStore.setState({ ...INITIAL_LESSON_SESSION });
  useProgressStore.getState().reset();
  await AsyncStorage.clear();
});

describe('GC-03 — core lesson loop end to end', () => {
  it('runs concept -> every renderer -> explain-back -> gap -> ceremony with XP per the engine, optimistically', async () => {
    await render(<LessonPlayer lessonId="c1-u1-l1" />);

    // Concept card first (analogy shown), then the explicit decision-set start.
    expect(await screen.findByText(/train on rails/i)).toBeTruthy();
    fireEvent.press(await screen.findByRole('button', { name: 'Start 5 decisions' }));

    // Answer every exercise (10 questions, covering mc + variants, multi, order).
    let guard = 0;
    while (useLessonSessionStore.getState().phase === 'exercises') {
      await answerCurrentCorrectly();
      if (++guard > 20) throw new Error('exercise loop did not terminate');
    }

    // Explain-back is the default next phase (typed input present, not skipped).
    const input = await screen.findByLabelText('Your one-sentence explanation');
    fireEvent.changeText(input, 'A workflow runs fixed predefined steps; an agent decides its own path.');
    fireEvent.press(await screen.findByRole('button', { name: 'Teach it' }));

    // Self-assess: mark every key point covered.
    for (const kp of lesson.concept.keyPoints) {
      fireEvent.press(await screen.findByRole('button', { name: kp.text }));
    }
    fireEvent.press(await screen.findByRole('button', { name: 'See how I did' }));

    // Gap micro-card -> ceremony. Capture xpBreakdown SYNCHRONOUSLY right after the completing tap:
    // if finalize awaited any grading promise, xpBreakdown would still be null here.
    fireEvent.press(await screen.findByRole('button', { name: 'Continue' }));
    const afterTap = useLessonSessionStore.getState();
    expect(afterTap.phase).toBe('ceremony');
    expect(afterTap.xpBreakdown).not.toBeNull();

    // XP is exactly what the engine computes for a flawless decision set (the lesson bank remains
    // larger for review/exams, while the guided lesson serves five high-signal questions).
    const expected = computeLessonXp({
      bestComboStreak: afterTap.combo.bestStreak,
      unitCompleted: false,
      legendary: true,
      replayOfCompleted: false,
    });
    expect(afterTap.xpBreakdown?.total).toBe(expected.total);
    expect(afterTap.combo.bestStreak).toBe(afterTap.totalQuestions);
    expect(afterTap.totalQuestions).toBe(5);

    // The ceremony actually renders that number (no await of any grading).
    expect(await screen.findByLabelText(`${expected.total} XP earned`)).toBeTruthy();

    // The durable ledger got the XP and the completion.
    expect(useProgressStore.getState().totalXp).toBe(expected.total);
    expect(useProgressStore.getState().hasCompleted('c1-u1-l1')).toBe(true);
  });
});

describe('GC-03b — cold-open resume after a mid-lesson kill (store rehydration)', () => {
  it('rehydrates the in-progress lesson at the exact question', async () => {
    const now = Date.UTC(2026, 6, 14, 12, 0, 0);
    const s = useLessonSessionStore.getState();
    s.startLesson(lesson, now);
    s.advanceFromConcept();

    // Answer the first three questions (directly on the store — a kill can happen mid-lesson).
    for (let k = 0; k < 3; k++) {
      const st = useLessonSessionStore.getState();
      const q = lesson.exercises.find((e) => e.id === st.queue[st.cursor]);
      st.answerCurrent(true, q?.explanation ?? '', now);
      st.continueAfterFeedback();
    }
    await flush();

    // It persisted the exact cursor + lesson.
    const raw = await AsyncStorage.getItem('cca-quest:active-lesson');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as { state: { lessonId: string; cursor: number; phase: string } };
    expect(parsed.state.lessonId).toBe('c1-u1-l1');
    expect(parsed.state.cursor).toBe(3);

    // Simulate an app kill: the JS heap is gone but AsyncStorage survives. Wipe in-memory to prove
    // the store no longer knows the lesson, then restore the survived blob out-of-band (wiping via
    // setState would re-persist nulls — a real kill never writes) and rehydrate as a cold launch does.
    useLessonSessionStore.setState({ ...INITIAL_LESSON_SESSION });
    expect(useLessonSessionStore.getState().lessonId).toBeNull();
    await AsyncStorage.setItem('cca-quest:active-lesson', raw as string);
    await useLessonSessionStore.persist.rehydrate();

    const resumed = useLessonSessionStore.getState();
    expect(resumed.lessonId).toBe('c1-u1-l1');
    expect(resumed.cursor).toBe(3);
    expect(resumed.phase).toBe('exercises');

    // The Continue CTA deep-links to that in-progress lesson (not the next one).
    const target = resolveContinueTarget({
      sessionLessonId: resumed.lessonId,
      sessionPhase: resumed.phase,
      lastCompletedLessonId: null,
      firstLessonId: 'c1-u1-l1',
      nextLessonIdAfter: () => 'c1-u1-l2',
    });
    expect(target).toEqual({ lessonId: 'c1-u1-l1', mode: 'resume', label: 'Continue lesson' });
  });
});

describe('resolveContinueTarget (cold-open decision)', () => {
  it('starts the first lesson for a brand-new user', () => {
    expect(
      resolveContinueTarget({
        sessionLessonId: null,
        sessionPhase: 'concept',
        lastCompletedLessonId: null,
        firstLessonId: 'c1-u1-l1',
        nextLessonIdAfter: () => undefined,
      }),
    ).toEqual({ lessonId: 'c1-u1-l1', mode: 'start', label: 'Start lesson' });
  });

  it('opens the next lesson after the last completed one', () => {
    expect(
      resolveContinueTarget({
        sessionLessonId: null,
        sessionPhase: 'ceremony',
        lastCompletedLessonId: 'c1-u1-l1',
        firstLessonId: 'c1-u1-l1',
        nextLessonIdAfter: (id) => (id === 'c1-u1-l1' ? 'c1-u1-l2' : undefined),
      }),
    ).toEqual({ lessonId: 'c1-u1-l2', mode: 'start', label: 'Start lesson' });
  });

  it('treats a session that reached the ceremony as no longer in progress', () => {
    const target = resolveContinueTarget({
      sessionLessonId: 'c1-u1-l1',
      sessionPhase: 'ceremony',
      lastCompletedLessonId: 'c1-u1-l1',
      firstLessonId: 'c1-u1-l1',
      nextLessonIdAfter: () => 'c1-u1-l2',
    });
    expect(target?.mode).toBe('start');
    expect(target?.lessonId).toBe('c1-u1-l2');
  });
});

describe('every renderer is answerable and grades correctly', () => {
  it('keeps answer feedback and Continue inside the shared scrollable viewport', async () => {
    const q = lesson.exercises.find((e) => e.id === 'c1-u1-l1-q01') as McQuestion;
    await render(
      <ExerciseStep
        question={q}
        pending={{ correct: true, explanation: q.explanation }}
        onAnswer={jest.fn()}
        onContinue={jest.fn()}
      />,
    );

    const scroll = screen.getByTestId('exercise-scroll');
    expect(within(scroll).getByRole('button', { name: 'Continue' })).toBeTruthy();
  });

  it('mc (base) grades a correct tap', async () => {
    const q = lesson.exercises.find((e) => e.id === 'c1-u1-l1-q01') as McQuestion;
    const onAnswer = jest.fn();
    await render(<McRenderer question={q} answered={false} onAnswer={onAnswer} />);
    fireEvent.press(await screen.findByRole('button', { name: q.options[q.answerKey] }));
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('mc (tf-speed variant, 2 options) grades a correct tap', async () => {
    const q = lesson.exercises.find((e) => e.id === 'c1-u1-l1-q10') as McQuestion;
    expect(q.options).toHaveLength(2);
    const onAnswer = jest.fn();
    await render(<McRenderer question={q} answered={false} onAnswer={onAnswer} />);
    fireEvent.press(await screen.findByRole('button', { name: q.options[q.answerKey] }));
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('multi enforces the stated count and grades the correct set', async () => {
    const q = lesson.exercises.find((e) => e.id === 'c1-u1-l1-q07') as MultiQuestion;
    const onAnswer = jest.fn();
    await render(<MultiRenderer question={q} answered={false} onAnswer={onAnswer} />);
    // Check stays disabled until exactly selectCount are chosen: one selection is not enough.
    fireEvent.press(await screen.findByRole('button', { name: q.options[q.answerKey[0]] }));
    fireEvent.press(await screen.findByRole('button', { name: 'Check' }));
    expect(onAnswer).not.toHaveBeenCalled();
    // Add the second correct option -> now checkable.
    fireEvent.press(await screen.findByRole('button', { name: q.options[q.answerKey[1]] }));
    fireEvent.press(await screen.findByRole('button', { name: 'Check' }));
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('order grades the exact correct sequence', async () => {
    const q = lesson.exercises.find((e) => e.id === 'c1-u1-l1-q09') as OrderQuestion;
    const onAnswer = jest.fn();
    await render(<OrderRenderer question={q} answered={false} onAnswer={onAnswer} />);
    for (const stepIndex of q.answerKey) {
      fireEvent.press(await screen.findByRole('button', { name: q.steps[stepIndex] }));
    }
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('cloze grades a correct choice per blank', async () => {
    const q = l3AgenticLoop.exercises.find((e) => e.id === 'c1-u1-l3-q09') as ClozeQuestion;
    const onAnswer = jest.fn();
    await render(<ClozeRenderer question={q} answered={false} onAnswer={onAnswer} />);
    // Option buttons render blank-0 options then blank-1 options (then the Check button).
    const optionButtons = screen.getAllByRole('button').filter((b) => b.props.accessibilityLabel !== 'Check');
    const blank0Correct = q.answerKey[0]; // flat index into blank-0's options
    const blank1Correct = q.blanks[0].options.length + q.answerKey[1];
    fireEvent.press(optionButtons[blank0Correct]);
    fireEvent.press(optionButtons[blank1Correct]);
    fireEvent.press(await screen.findByRole('button', { name: 'Check' }));
    expect(onAnswer).toHaveBeenCalledWith(true);
  });
});
