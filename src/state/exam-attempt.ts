// Crash-resumable local mock-exam state. Certification practice is fully offline and energy-free;
// this store persists only question IDs, numeric choices, flags, and timing metadata.
//
// Abandoned attempts (FT-3, V-features-2): starting another exam while one is in progress closes the
// old attempt as ABANDONED. It is never scored or kept in history, its id is remembered so a sync pull
// can never make it active again, and its server copy is made terminal (completed_at set, no submit
// reason, no score) — a shape `submit()` never produces, so any device reads it as abandoned. The
// reverse never happens: an attempt submitted on this device stays submitted, whatever a device that
// missed the submit later sends for it (an abandon or its in-progress copy).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ExamSelection } from '@/engine/mock-exam';
import { useOutboxStore, type ExamSyncPayload } from '@/sync/outbox';
import { reportHydrationFailure } from '@/state/hydration';

export type ExamMode = 'simulation' | 'practice';
export type SubmitReason = 'completed' | 'time-expired' | 'manual';

export interface ExamAnswer {
  selection: ExamSelection;
  correct: boolean;
  answeredAt: number;
}

export interface ExamAttempt {
  attemptId: string;
  examId: string;
  mode: ExamMode;
  questionIds: string[];
  timeLimitMinutes: number;
  startedAt: number;
  deadlineAt: number | null;
  cursor: number;
  answers: Record<string, ExamAnswer>;
  flaggedQuestionIds: string[];
  completedAt: number | null;
  submittedReason: SubmitReason | null;
  mistakesCapturedAt: number | null;
  result: {
    rawScore: number;
    scaledScore: number;
    passed: boolean;
    domainScores: Record<string, unknown>;
    durationSeconds: number;
  } | null;
  updatedAt: number;
}

export interface ExamAttemptData {
  activeAttempt: ExamAttempt | null;
  history: ExamAttempt[];
  /** Ids of attempts closed as abandoned (newest last): never resumed, never scored (V-features-2). */
  abandonedAttemptIds: string[];
}

export interface ExamAttemptActions {
  /**
   * Start a new attempt. An attempt still in progress is closed as abandoned first (never silently
   * dropped); the UI asks the learner before calling this in that case (FT-3).
   */
  start: (params: {
    examId: string;
    mode: ExamMode;
    questionIds: string[];
    timeLimitMinutes: number;
    now: number;
  }) => ExamAttempt;
  answer: (questionId: string, selection: ExamSelection, correct: boolean, now: number) => void;
  navigate: (cursor: number) => void;
  toggleFlag: (questionId: string) => void;
  submit: (reason: SubmitReason, now: number) => void;
  markMistakesCaptured: (now: number) => void;
  recordResult: (result: NonNullable<ExamAttempt['result']>, now: number) => void;
  mergeRemote: (attempts: ExamAttempt[]) => void;
  clearActive: () => void;
  reset: () => void;
}

export type ExamAttemptState = ExamAttemptData & ExamAttemptActions;

export const EXAM_ATTEMPTS_STORAGE_KEY = 'cca-quest:exam-attempts';
export const EXAM_ATTEMPTS_VERSION = 2;
export const INITIAL_EXAM_ATTEMPT_DATA: ExamAttemptData = { activeAttempt: null, history: [], abandonedAttemptIds: [] };
/** Abandoned ids kept to block resurrection; far more than a learner can have in flight. */
export const MAX_ABANDONED_ATTEMPT_IDS = 50;

let attemptSequence = 0;

/**
 * Whether an attempt row is an abandoned one: closed (completedAt set) without a submit reason.
 * `submit()` always records a reason, so only an abandon produces this shape — including the terminal
 * server copy another device pulls down (the server accepts a null reason on a closed row).
 */
export function isAbandonedAttempt(attempt: Pick<ExamAttempt, 'completedAt' | 'submittedReason'>): boolean {
  return attempt.completedAt !== null && attempt.submittedReason === null;
}

function rememberAbandoned(ids: readonly string[], attemptId: string): string[] {
  return [...ids.filter((id) => id !== attemptId), attemptId].slice(-MAX_ABANDONED_ATTEMPT_IDS);
}

export function examToSyncPayload(attempt: ExamAttempt): ExamSyncPayload {
  return {
    attemptId: attempt.attemptId,
    examId: attempt.examId,
    mode: attempt.mode,
    questionIds: attempt.questionIds,
    timeLimitMinutes: attempt.timeLimitMinutes,
    deadlineAt: attempt.deadlineAt,
    cursor: attempt.cursor,
    answers: attempt.answers,
    flaggedQuestionIds: attempt.flaggedQuestionIds,
    rawScore: attempt.result?.rawScore ?? null,
    scaledScore: attempt.result?.scaledScore ?? null,
    passed: attempt.result?.passed ?? null,
    domainScores: attempt.result?.domainScores ?? {},
    durationSeconds: attempt.result?.durationSeconds ?? null,
    completedAt: attempt.completedAt,
    submittedReason: attempt.submittedReason,
    mistakesCapturedAt: attempt.mistakesCapturedAt,
    createdAt: attempt.startedAt,
    updatedAt: attempt.updatedAt,
  };
}

function queueAttempt(attempt: ExamAttempt): void {
  useOutboxStore.getState().queueExam(examToSyncPayload(attempt));
}

export const useExamAttemptStore = create<ExamAttemptState>()(
  persist(
    (set, get) => ({
      ...INITIAL_EXAM_ATTEMPT_DATA,

      start: ({ examId, mode, questionIds, timeLimitMinutes, now }) => {
        const previous = get().activeAttempt;
        const abandoning = previous !== null && previous.completedAt === null ? previous : null;
        attemptSequence += 1;
        const attempt: ExamAttempt = {
          attemptId: `${examId}:${now}:${attemptSequence}`,
          examId,
          mode,
          questionIds: [...questionIds],
          timeLimitMinutes,
          startedAt: now,
          deadlineAt: mode === 'simulation' ? now + timeLimitMinutes * 60_000 : null,
          cursor: 0,
          answers: {},
          flaggedQuestionIds: [],
          completedAt: null,
          submittedReason: null,
          mistakesCapturedAt: null,
          result: null,
          updatedAt: now,
        };
        set((state) => ({
          activeAttempt: attempt,
          abandonedAttemptIds: abandoning
            ? rememberAbandoned(state.abandonedAttemptIds, abandoning.attemptId)
            : state.abandonedAttemptIds,
        }));
        if (abandoning) {
          // The replaced attempt closes as abandoned: unscored, out of history, and terminal on the
          // server, so no pull (here or on another device) can resume or auto-submit it.
          const closedAt = Math.max(now, abandoning.updatedAt + 1);
          queueAttempt({ ...abandoning, completedAt: closedAt, submittedReason: null, result: null, updatedAt: closedAt });
        }
        queueAttempt(attempt);
        return attempt;
      },

      answer: (questionId, selection, correct, now) => {
        const attempt = get().activeAttempt;
        if (!attempt || attempt.completedAt !== null) return;
        const updated = {
          ...attempt,
          answers: { ...attempt.answers, [questionId]: { selection: [...selection], correct, answeredAt: now } },
          updatedAt: now,
        };
        set({ activeAttempt: updated });
        queueAttempt(updated);
      },

      navigate: (cursor) => {
        const attempt = get().activeAttempt;
        if (!attempt || attempt.questionIds.length === 0) return;
        const updated = {
          ...attempt,
          cursor: Math.max(0, Math.min(Math.trunc(cursor), attempt.questionIds.length - 1)),
          updatedAt: Date.now(),
        };
        set({ activeAttempt: updated });
        queueAttempt(updated);
      },

      toggleFlag: (questionId) => {
        const attempt = get().activeAttempt;
        if (!attempt || attempt.completedAt !== null) return;
        const flaggedQuestionIds = attempt.flaggedQuestionIds.includes(questionId)
          ? attempt.flaggedQuestionIds.filter((id) => id !== questionId)
          : [...attempt.flaggedQuestionIds, questionId];
        const updated = { ...attempt, flaggedQuestionIds, updatedAt: Date.now() };
        set({ activeAttempt: updated });
        queueAttempt(updated);
      },

      submit: (reason, now) => {
        const attempt = get().activeAttempt;
        if (!attempt || attempt.completedAt !== null) return;
        const completed: ExamAttempt = { ...attempt, completedAt: now, submittedReason: reason, updatedAt: now };
        set((state) => ({ activeAttempt: completed, history: [completed, ...state.history].slice(0, 20) }));
        queueAttempt(completed);
      },

      markMistakesCaptured: (now) => {
        const attempt = get().activeAttempt;
        if (!attempt || attempt.mistakesCapturedAt !== null) return;
        const updated = { ...attempt, mistakesCapturedAt: now, updatedAt: now };
        set((state) => ({
          activeAttempt: updated,
          history: state.history.map((candidate) => candidate.attemptId === updated.attemptId ? updated : candidate),
        }));
        queueAttempt(updated);
      },

      recordResult: (result, now) => {
        const attempt = get().activeAttempt;
        if (!attempt) return;
        const updated = { ...attempt, result, updatedAt: now };
        set((state) => ({
          activeAttempt: updated,
          history: state.history.map((candidate) => candidate.attemptId === updated.attemptId ? updated : candidate),
        }));
        queueAttempt(updated);
      },

      mergeRemote: (remote) => {
        set((state) => {
          const byId = new Map(state.history.map((attempt) => [attempt.attemptId, attempt]));
          const localCopy = (attemptId: string): ExamAttempt | undefined =>
            byId.get(attemptId) ?? (state.activeAttempt?.attemptId === attemptId ? state.activeAttempt : undefined);

          // A submitted attempt is final here. A row without a submit reason for it — an abandon or an
          // in-progress copy from a device that had not seen the submit — never demotes it, however new
          // its timestamp: the scored result stays in history and the attempt never reopens.
          const incoming = remote.filter((attempt) => {
            const local = localCopy(attempt.attemptId);
            return !(local && local.submittedReason !== null && attempt.submittedReason === null);
          });

          // A newer abandoned (terminal, reasonless) row closes that attempt here too.
          let abandonedAttemptIds = state.abandonedAttemptIds;
          for (const attempt of incoming) {
            const local = localCopy(attempt.attemptId);
            if (isAbandonedAttempt(attempt) && (!local || attempt.updatedAt > local.updatedAt)) {
              abandonedAttemptIds = rememberAbandoned(abandonedAttemptIds, attempt.attemptId);
            }
          }
          const abandoned = new Set(abandonedAttemptIds);
          // Abandoned attempts never come back: not as history (scoring) and not as the active attempt.
          const live = incoming.filter((attempt) => !abandoned.has(attempt.attemptId));

          for (const attempt of live) {
            const local = byId.get(attempt.attemptId);
            if (!local || attempt.updatedAt > local.updatedAt) byId.set(attempt.attemptId, attempt);
          }
          const history = [...byId.values()]
            .filter((attempt) => attempt.completedAt !== null && !abandoned.has(attempt.attemptId))
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, 20);
          const remoteActive = live.filter((attempt) => attempt.completedAt === null).sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
          const localActive = state.activeAttempt && !abandoned.has(state.activeAttempt.attemptId) ? state.activeAttempt : null;
          const activeAttempt = remoteActive && (!localActive || remoteActive.updatedAt > localActive.updatedAt)
            ? remoteActive
            : localActive;
          return { history, activeAttempt, abandonedAttemptIds };
        });
      },

      clearActive: () => set({ activeAttempt: null }),
      reset: () => set({ ...INITIAL_EXAM_ATTEMPT_DATA }),
    }),
    {
      name: EXAM_ATTEMPTS_STORAGE_KEY,
      version: EXAM_ATTEMPTS_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: reportHydrationFailure(EXAM_ATTEMPTS_STORAGE_KEY),
      partialize: (state): ExamAttemptData => ({
        activeAttempt: state.activeAttempt,
        history: state.history,
        abandonedAttemptIds: state.abandonedAttemptIds,
      }),
      migrate: (persistedState) => {
        const state = persistedState as Partial<ExamAttemptData>;
        const upgrade = (attempt: ExamAttempt): ExamAttempt => ({
          ...attempt,
          result: attempt.result ?? null,
          updatedAt: attempt.updatedAt ?? attempt.completedAt ?? attempt.startedAt,
        });
        return {
          activeAttempt: state.activeAttempt ? upgrade(state.activeAttempt) : null,
          history: (state.history ?? []).map(upgrade),
          abandonedAttemptIds: state.abandonedAttemptIds ?? [],
        } as ExamAttemptState;
      },
    },
  ),
);
