import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  EXAM_ATTEMPTS_STORAGE_KEY,
  EXAM_ATTEMPTS_VERSION,
  useExamAttemptStore,
} from '../../src/state/exam-attempt';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  useExamAttemptStore.getState().reset();
  await AsyncStorage.clear();
});

describe('mock-exam crash-resume state', () => {
  it('starts timed simulation and untimed guided-practice attempts', () => {
    const timed = useExamAttemptStore.getState().start({
      examId: 'mock-1',
      mode: 'simulation',
      questionIds: ['q1', 'q2'],
      timeLimitMinutes: 120,
      now: 1_000,
    });
    expect(timed.deadlineAt).toBe(7_201_000);

    const guided = useExamAttemptStore.getState().start({
      examId: 'mini-d1',
      mode: 'practice',
      questionIds: ['q1'],
      timeLimitMinutes: 25,
      now: 2_000,
    });
    expect(guided.deadlineAt).toBeNull();
  });

  it('persists answers, cursor, and flags so a cold start can resume exactly', async () => {
    const store = useExamAttemptStore.getState();
    store.start({
      examId: 'mock-1',
      mode: 'simulation',
      questionIds: ['q1', 'q2', 'q3'],
      timeLimitMinutes: 120,
      now: 1_000,
    });
    useExamAttemptStore.getState().answer('q1', [2], false, 1_500);
    useExamAttemptStore.getState().navigate(2);
    useExamAttemptStore.getState().toggleFlag('q3');
    await flush();

    const raw = await AsyncStorage.getItem(EXAM_ATTEMPTS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const payload = JSON.parse(raw as string) as { version: number; state: Record<string, unknown> };
    expect(payload.version).toBe(EXAM_ATTEMPTS_VERSION);
    expect(payload.state.activeAttempt).toMatchObject({
      examId: 'mock-1',
      cursor: 2,
      flaggedQuestionIds: ['q3'],
      answers: { q1: { selection: [2], correct: false, answeredAt: 1_500 } },
    });
  });

  it('submits once, records history, and supports an explicit time-expired reason', () => {
    useExamAttemptStore.getState().start({
      examId: 'mini-d1',
      mode: 'simulation',
      questionIds: ['q1'],
      timeLimitMinutes: 25,
      now: 1_000,
    });
    useExamAttemptStore.getState().submit('time-expired', 1_501_000);
    useExamAttemptStore.getState().submit('manual', 2_000_000);

    const state = useExamAttemptStore.getState();
    expect(state.activeAttempt?.submittedReason).toBe('time-expired');
    expect(state.history).toHaveLength(1);
    expect(state.history[0].completedAt).toBe(1_501_000);
  });

  it('clamps navigator movement to the available question range', () => {
    useExamAttemptStore.getState().start({
      examId: 'mini-d1',
      mode: 'practice',
      questionIds: ['q1', 'q2'],
      timeLimitMinutes: 25,
      now: 1_000,
    });
    useExamAttemptStore.getState().navigate(99);
    expect(useExamAttemptStore.getState().activeAttempt?.cursor).toBe(1);
    useExamAttemptStore.getState().navigate(-5);
    expect(useExamAttemptStore.getState().activeAttempt?.cursor).toBe(0);
  });
});
