// __tests__/mock-exam/exam-abandon.test.ts — FT-3 + V-features-2 at the store edge.
//
// Replacing an in-progress exam must close the old attempt as ABANDONED: never scored, never kept in
// history, and never resurrected by a sync pull (where, in simulation mode past its deadline, the
// player would auto-submit it as a failing "time-expired" attempt and flood Practice with its misses).

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { isAbandonedAttempt, useExamAttemptStore, type ExamAttempt } from '../../src/state/exam-attempt';
import { useOutboxStore } from '../../src/sync/outbox';

const MOCK_QUESTIONS = Array.from({ length: 60 }, (_, i) => `reg-q${i + 1}`);

beforeEach(() => {
  useExamAttemptStore.getState().reset();
  useOutboxStore.getState().reset();
});

/** A mock with 30 answers, then the learner starts a mini on top of it. */
function replaceHalfFinishedMock(): { abandoned: ExamAttempt; replacement: ExamAttempt } {
  const store = useExamAttemptStore.getState();
  store.start({ examId: 'mock-1', mode: 'simulation', questionIds: MOCK_QUESTIONS, timeLimitMinutes: 120, now: 1_000 });
  for (let i = 0; i < 30; i += 1) useExamAttemptStore.getState().answer(MOCK_QUESTIONS[i], [0], false, 2_000 + i);
  const abandoned = useExamAttemptStore.getState().activeAttempt as ExamAttempt;
  const replacement = useExamAttemptStore.getState().start({
    examId: 'mini-d1',
    mode: 'simulation',
    questionIds: ['m1', 'm2'],
    timeLimitMinutes: 25,
    now: 10_000,
  });
  return { abandoned, replacement };
}

describe('replacing an in-progress exam (FT-3)', () => {
  it('closes the old attempt as abandoned instead of silently dropping it', () => {
    const { abandoned, replacement } = replaceHalfFinishedMock();
    const state = useExamAttemptStore.getState();

    expect(state.activeAttempt?.attemptId).toBe(replacement.attemptId);
    expect(state.abandonedAttemptIds).toEqual([abandoned.attemptId]);
    // Never scored: it is not in history, so Readiness and achievements never see it.
    expect(state.history).toEqual([]);

    // The server copy becomes terminal and unscored, so no other device can resume it either.
    const rows = useOutboxStore
      .getState()
      .items.flatMap((item) => (item.kind === 'exam' && item.payload.attemptId === abandoned.attemptId ? [item.payload] : []));
    expect(rows).toHaveLength(1);
    expect(rows[0].completedAt).toBe(10_000);
    expect(rows[0].submittedReason).toBeNull();
    expect(rows[0].rawScore).toBeNull();
    expect(rows[0].updatedAt).toBeGreaterThan(abandoned.updatedAt);
  });

  it('does not mark anything abandoned when the previous attempt was already submitted', () => {
    const store = useExamAttemptStore.getState();
    store.start({ examId: 'mini-d1', mode: 'practice', questionIds: ['m1'], timeLimitMinutes: 25, now: 1_000 });
    useExamAttemptStore.getState().submit('completed', 2_000);
    useExamAttemptStore.getState().start({ examId: 'mini-d2', mode: 'practice', questionIds: ['m2'], timeLimitMinutes: 25, now: 3_000 });
    expect(useExamAttemptStore.getState().abandonedAttemptIds).toEqual([]);
    expect(useExamAttemptStore.getState().history).toHaveLength(1);
  });
});

describe('an abandoned attempt can never come back (V-features-2)', () => {
  it('ignores the stale incomplete server copy on a later pull', () => {
    const { abandoned } = replaceHalfFinishedMock();
    useExamAttemptStore.getState().submit('completed', 20_000);
    useExamAttemptStore.getState().clearActive();

    // The server still holds the incomplete copy (the terminal row has not been uploaded yet).
    useExamAttemptStore.getState().mergeRemote([abandoned]);

    const state = useExamAttemptStore.getState();
    expect(state.activeAttempt).toBeNull();
    expect(state.history.map((attempt) => attempt.examId)).toEqual(['mini-d1']);
  });

  it('treats a terminal row closed without a reason as abandoned: not scored, not resumed', () => {
    const { abandoned } = replaceHalfFinishedMock();
    useExamAttemptStore.getState().reset();

    const terminal: ExamAttempt = { ...abandoned, completedAt: 10_000, submittedReason: null, updatedAt: 10_000 };
    expect(isAbandonedAttempt(terminal)).toBe(true);
    useExamAttemptStore.getState().mergeRemote([terminal]);

    const state = useExamAttemptStore.getState();
    expect(state.activeAttempt).toBeNull();
    expect(state.history).toEqual([]);
    expect(state.abandonedAttemptIds).toContain(abandoned.attemptId);

    // And an older incomplete copy arriving afterwards still cannot resurrect it.
    useExamAttemptStore.getState().mergeRemote([abandoned]);
    expect(useExamAttemptStore.getState().activeAttempt).toBeNull();
  });

  it('still adopts a genuinely newer in-progress attempt from the server', () => {
    const remote: ExamAttempt = {
      attemptId: 'mock-2:5000:1',
      examId: 'mock-2',
      mode: 'practice',
      questionIds: ['x1'],
      timeLimitMinutes: 120,
      startedAt: 5_000,
      deadlineAt: null,
      cursor: 0,
      answers: {},
      flaggedQuestionIds: [],
      completedAt: null,
      submittedReason: null,
      mistakesCapturedAt: null,
      result: null,
      updatedAt: 6_000,
    };
    expect(isAbandonedAttempt(remote)).toBe(false);
    useExamAttemptStore.getState().mergeRemote([remote]);
    expect(useExamAttemptStore.getState().activeAttempt?.attemptId).toBe(remote.attemptId);
  });
});

describe('a submitted attempt is final on this device (sync builds)', () => {
  /** A mock this device submitted and scored: passed, 800/1000. */
  function submittedAndPassed(): ExamAttempt {
    const store = useExamAttemptStore.getState();
    store.start({ examId: 'mock-1', mode: 'simulation', questionIds: MOCK_QUESTIONS, timeLimitMinutes: 120, now: 1_000 });
    useExamAttemptStore.getState().answer(MOCK_QUESTIONS[0], [1], true, 2_000);
    useExamAttemptStore.getState().submit('completed', 5_000);
    useExamAttemptStore.getState().recordResult(
      { rawScore: 48, scaledScore: 800, passed: true, domainScores: {}, durationSeconds: 4 },
      5_000,
    );
    useExamAttemptStore.getState().clearActive();
    return useExamAttemptStore.getState().history[0];
  }

  it('keeps a passed 800/1000 attempt when a stale device’s newer "abandoned" row for it arrives', () => {
    const passed = submittedAndPassed();
    // Another device still had the in-progress copy, started a different exam at 9_000 and so closed
    // this attempt as abandoned: closed, no submit reason, no score, and a newer timestamp.
    const abandonedElsewhere: ExamAttempt = { ...passed, submittedReason: null, result: null, mistakesCapturedAt: null, completedAt: 9_000, updatedAt: 9_000 };
    expect(isAbandonedAttempt(abandonedElsewhere)).toBe(true);

    useExamAttemptStore.getState().mergeRemote([abandonedElsewhere]);

    const state = useExamAttemptStore.getState();
    expect(state.history).toHaveLength(1);
    expect(state.history[0]).toEqual(passed);
    expect(state.history[0].result).toMatchObject({ scaledScore: 800, passed: true });
    expect(state.abandonedAttemptIds).not.toContain(passed.attemptId);
  });

  it('keeps it submitted when a newer in-progress copy from a device that missed the submit arrives', () => {
    const passed = submittedAndPassed();
    const stillOpenElsewhere: ExamAttempt = { ...passed, submittedReason: null, result: null, completedAt: null, updatedAt: 9_000 };

    useExamAttemptStore.getState().mergeRemote([stillOpenElsewhere]);

    const state = useExamAttemptStore.getState();
    expect(state.history).toEqual([passed]);
    expect(state.activeAttempt).toBeNull(); // never reopened for resuming
  });

  it('still takes a newer submitted copy of the same attempt (e.g. the score recorded on another device)', () => {
    const passed = submittedAndPassed();
    const rescored: ExamAttempt = { ...passed, mistakesCapturedAt: 9_000, updatedAt: 9_000 };

    useExamAttemptStore.getState().mergeRemote([rescored]);

    expect(useExamAttemptStore.getState().history).toEqual([rescored]);
  });
});
