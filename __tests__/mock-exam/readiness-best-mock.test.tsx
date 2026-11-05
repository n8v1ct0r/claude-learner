// __tests__/mock-exam/readiness-best-mock.test.tsx — the Readiness tab's "BEST MOCK SCORE" (smoke fix).
//
// A partial domain mini (3 of 18 answered) showed as "BEST MOCK SCORE 200". The figure now counts only
// full mock exams (exam kind 'mock') and never an abandoned attempt, even one that carries a result.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return { SafeAreaView: rn.View };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/db/content-provider', () => ({
  useContentDb: () => ({
    listCourses: () => [],
    getCourse: () => undefined,
    listExams: () => [
      { id: 'mini-d1', kind: 'mini', title: 'Agentic Architecture Mini', timeLimitMinutes: 25, questionCount: 18 },
      { id: 'mock-1', kind: 'mock', title: 'Full Mock 1', timeLimitMinutes: 120, questionCount: 60 },
    ],
  }),
}));

import ReadinessScreen from '../../app/(tabs)/leaderboard';
import { useExamAttemptStore, type ExamAttempt } from '@/state/exam-attempt';

interface HostNode {
  props: Record<string, unknown>;
  parent: HostNode | null;
  children: (HostNode | string)[];
}

function textContent(node: HostNode | string): string {
  if (typeof node === 'string') return node;
  return node.children.map(textContent).join('');
}

/** The big number above a metric's label. */
function metricValue(label: string): string {
  const labelNode = screen.getByText(label) as unknown as HostNode;
  const tile = labelNode.parent as HostNode;
  return textContent(tile.children[0]);
}

const T0 = 1_780_000_000_000;

function scored(attemptId: string, examId: string, scaledScore: number, overrides: Partial<ExamAttempt> = {}): ExamAttempt {
  return {
    attemptId,
    examId,
    mode: 'simulation',
    questionIds: ['q1'],
    timeLimitMinutes: 25,
    startedAt: T0,
    deadlineAt: null,
    cursor: 0,
    answers: {},
    flaggedQuestionIds: [],
    completedAt: T0 + 60_000,
    submittedReason: 'manual',
    mistakesCapturedAt: null,
    result: { rawScore: 0, scaledScore, passed: scaledScore >= 720, domainScores: {}, durationSeconds: 60 },
    updatedAt: T0 + 60_000,
    ...overrides,
  };
}

beforeEach(() => {
  useExamAttemptStore.getState().reset();
});

describe('Readiness: best mock score', () => {
  it('shows no mock score when only a domain mini was taken (the partial 3/18 mini scored 200)', async () => {
    useExamAttemptStore.setState({ history: [scored('mini-a', 'mini-d1', 200)] });
    await render(<ReadinessScreen />);
    expect(metricValue('BEST MOCK SCORE')).toBe('—');
  });

  it('counts full mocks only, even when a mini scored higher', async () => {
    useExamAttemptStore.setState({
      history: [scored('mini-a', 'mini-d1', 800), scored('mock-a', 'mock-1', 612)],
    });
    await render(<ReadinessScreen />);
    expect(metricValue('BEST MOCK SCORE')).toBe('612');
  });

  it('never counts an abandoned attempt, even one that carries a result', async () => {
    useExamAttemptStore.setState({
      history: [
        // Closed without a submit reason: the abandoned shape.
        scored('mock-abandoned', 'mock-1', 900, { submittedReason: null }),
        // Remembered as abandoned on this device.
        scored('mock-remembered', 'mock-1', 880),
        scored('mock-kept', 'mock-1', 540),
      ],
      abandonedAttemptIds: ['mock-remembered'],
    });
    await render(<ReadinessScreen />);
    expect(metricValue('BEST MOCK SCORE')).toBe('540');
    expect(screen.getByText('1 completed attempt · best estimated score 540')).toBeTruthy();
  });
});
