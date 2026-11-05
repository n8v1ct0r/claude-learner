// __tests__/a11y/progress-announcements.a11y.test.tsx  (AP-5, V-a11y-perf-1, V-a11y-perf-5)
//
// Where am I, and how long do I have? VoiceOver must hear:
//   • completed path lessons as "completed" (not "available");
//   • the exam position ("Question X of Y") — in the pill's label and announced on every move — and the
//     current question in the navigator;
//   • a warning before a timed simulation auto-submits (10, 5 and 1 minutes left), plus a spoken timer.

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return { SafeAreaView: rn.View };
});

jest.mock('@/db/content-provider', () => {
  const make = (id: string, stem: string) => ({
    id,
    type: 'mc',
    domain: 'd1',
    conceptId: 'agentic-loop',
    taskStatement: '1.1',
    difficulty: 2,
    estimatedSeconds: 60,
    stem,
    options: ['Ignore tools', 'Append the tool result', 'End immediately'],
    answerKey: 1,
    explanation: 'The model must observe the tool result before choosing the next action.',
    sourceUrls: ['https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls'],
  });
  const questions: Record<string, unknown> = {
    'exam-q1': make('exam-q1', 'What keeps an agent loop moving?'),
    'exam-q2': make('exam-q2', 'What does the loop do with a tool result?'),
  };
  return {
    useContentDb: () => ({
      getQuestion: (id: string) => questions[id],
      getLessonForConcept: () => ({ id: 'c1-u1-l3', title: 'The agentic loop' }),
    }),
  };
});

import { ExamPlayer } from '@/features/exams/ExamPlayer';
import { PathNode } from '@/features/path/PathNode';
import type { PathNode as PathNodeModel } from '@/features/path/path-model';
import { useExamAttemptStore } from '@/state/exam-attempt';

const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

function LiveExam() {
  const attempt = useExamAttemptStore((state) => state.activeAttempt);
  return attempt ? <ExamPlayer attempt={attempt} onExit={jest.fn()} /> : null;
}

const node = (overrides: Partial<PathNodeModel>): PathNodeModel => ({
  key: 'n',
  type: 'lesson',
  status: 'completed',
  unitId: 'c1-u1',
  unitTitle: 'Think in Agents',
  title: 'Workflows vs agents',
  subtitle: 'Completed',
  lessonId: 'c1-u1-l1',
  lessonNumber: 1,
  ...overrides,
});

beforeEach(() => {
  announce.mockClear();
  useExamAttemptStore.getState().reset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('path nodes', () => {
  it('announces a finished lesson as completed', async () => {
    await render(<PathNode node={node({})} onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Workflows vs agents. completed.' })).toBeTruthy();
  });

  it('keeps unlocked checkpoints as available, and current/locked lessons as they are', async () => {
    await render(
      <>
        <PathNode node={node({ key: 'c', type: 'chest', title: 'Reward chest', lessonId: undefined })} onPress={jest.fn()} />
        <PathNode node={node({ key: 'l2', status: 'current', title: 'Agentic loop', subtitle: 'Up next' })} onPress={jest.fn()} />
        <PathNode node={node({ key: 'l3', status: 'locked', title: 'Tool results', subtitle: 'Locked' })} onPress={jest.fn()} />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Reward chest. available.' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agentic loop. current.' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tool results. locked.' })).toBeTruthy();
  });
});

describe('exam position', () => {
  it('labels the pill with the position and announces it on every move', async () => {
    useExamAttemptStore.getState().start({
      examId: 'mock-1',
      mode: 'simulation',
      questionIds: ['exam-q1', 'exam-q2'],
      timeLimitMinutes: 120,
      now: Date.now(),
    });
    await render(<LiveExam />);

    const pill = screen.getByRole('button', { name: 'Question 1 of 2' });
    expect(pill.props.accessibilityHint).toBe('Opens the question navigator');
    expect(screen.getByText('1 / 2')).toBeTruthy();
    expect(announce).toHaveBeenCalledWith('Question 1 of 2');

    await fireEvent.press(screen.getByRole('radio', { name: 'B. Append the tool result' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save & next' }));
    expect(await screen.findByRole('button', { name: 'Question 2 of 2' })).toBeTruthy();
    expect(announce).toHaveBeenLastCalledWith('Question 2 of 2');

    // The navigator marks the current question in words and state, not only with a border.
    await fireEvent.press(screen.getByRole('button', { name: 'Question 2 of 2' }));
    const current = screen.getByRole('button', { name: 'Question 2, current' });
    expect(current.props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByRole('button', { name: 'Question 1, answered' }).props.accessibilityState).toMatchObject({
      selected: false,
    });
  });
});

describe('timed simulation warnings', () => {
  it('warns at 10, 5 and 1 minutes left, once each, before the auto-submit', async () => {
    const now = Date.UTC(2026, 8, 24, 12, 0, 0);
    jest.useFakeTimers({ now });
    // 601 seconds left on the clock.
    useExamAttemptStore.getState().start({
      examId: 'mock-1',
      mode: 'simulation',
      questionIds: ['exam-q1'],
      timeLimitMinutes: 120,
      now: now - (120 * 60 - 601) * 1000,
    });
    await render(<LiveExam />);
    expect(screen.getByRole('timer', { name: 'Time left: 10 minutes' })).toBeTruthy();

    const warnings = () =>
      announce.mock.calls.map(([message]) => message).filter((message) => message.includes('submits automatically'));
    expect(warnings()).toEqual([]);

    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });
    expect(warnings()).toEqual(['10 minutes left. The exam submits automatically when time runs out.']);

    await act(async () => {
      jest.advanceTimersByTime(300_000);
    });
    await act(async () => {
      jest.advanceTimersByTime(240_000);
    });
    expect(warnings()).toEqual([
      '10 minutes left. The exam submits automatically when time runs out.',
      '5 minutes left. The exam submits automatically when time runs out.',
      '1 minute left. The exam submits automatically when time runs out.',
    ]);
    expect(screen.getByRole('timer', { name: 'Time left: 1 minute' })).toBeTruthy();
  });

  it('does not warn in untimed guided practice', async () => {
    useExamAttemptStore.getState().start({
      examId: 'mini-d1',
      mode: 'practice',
      questionIds: ['exam-q1'],
      timeLimitMinutes: 25,
      now: Date.now(),
    });
    await render(<LiveExam />);
    expect(screen.queryByRole('timer')).toBeNull();
    expect(announce.mock.calls.some(([message]) => message.includes('submits automatically'))).toBe(false);
  });
});
