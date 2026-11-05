// src/state/lesson-session.ts
//
// The in-progress lesson: the single persisted record of "where the learner is" inside the Feynman
// spine (concept -> exercises -> explain-back -> gap -> ceremony), the answers/combo so far, the
// explain-back self-assessment, and the optimistically-computed XP. It is PERSISTED to AsyncStorage
// so a mid-lesson app kill resumes at the exact question (GC-03b) — the store is the source of truth
// the cold-open Continue rehydrates.
//
// Division of labor: this store owns lesson *progression* state (a serializable reducer over taps);
// the pure engines own the *numbers* (combo -> src/engine/combo, XP -> src/engine/xp) and the durable
// ledger lives in src/state/progress. On completion this store calls computeLessonXp ONCE and hands
// the total to the progress store — synchronously, never awaiting anything (the optimistic-ceremony
// contract GC-03a: XP is ready the instant the ceremony mounts, independent of any grading).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { emitAnalytics } from '@/analytics/events';
import { requestGrading, type FeynmanGrade } from '@/api/grading';
import {
  COMBO_FLARE_INTERVAL,
  createComboState,
  recordAnswer,
  type ComboEvent,
  type ComboState,
} from '@/engine/combo';
import { computeLessonXp, type BoostWindow, type LessonXpBreakdown, type LessonXpInput } from '@/engine/xp';
import { localDateInTz } from '@/engine/time';
import { selectLessonDecisionSet } from '@/features/lesson-player/question-selection';
import { useGameStore } from '@/state/game';
import { useProgressStore } from '@/state/progress';
import { useSettingsStore } from '@/state/settings';
import { createClientEventId } from '@/sync/outbox';

import type { Lesson } from '../../content/schema/types';
import { reportHydrationFailure } from '@/state/hydration';

/** The fixed Feynman spine phases (PLAN-rev2 §3.1). */
export type LessonPhase = 'concept' | 'exercises' | 'explainBack' | 'gap' | 'ceremony';

/** Explain-back progression: default path is pending -> submitted -> completed; skip is an opt-out. */
export type ExplainBackStatus = 'pending' | 'submitted' | 'completed' | 'skipped';

/**
 * Where the OPTIONAL server grading stands. It is fully orthogonal to `ExplainBackStatus` and to
 * completion: `idle` before a transcript is submitted; `pending` while a verdict is in flight (the UI
 * shows manual self-assessment meanwhile); `graded` once a schema-valid verdict lands (which pre-marks
 * coverage); `degraded` for every silent fallback (no server, offline, timeout, quota/budget, error).
 */
export type GradingStatus = 'idle' | 'pending' | 'graded' | 'degraded';

/** The persisted, serializable copy of a grader verdict (identical shape to the API's FeynmanGrade). */
export type StoredGrade = FeynmanGrade;

/** Chest tier reflected in the ceremony: bronze for partial/skipped coverage, silver for full coverage. */
export type ChestTier = 'bronze' | 'silver';

/** Live transcript ceiling (GC-09: the server rejects >1000 chars with 400; the client hard-stops here). */
export const EXPLAIN_BACK_TRANSCRIPT_MAX = 1000;
/** Soft-warn threshold — past this the counter nudges "keep it tight" (no shame), still fully typable. */
export const EXPLAIN_BACK_TRANSCRIPT_SOFT_WARN = 800;
/** At most ONE refine ("add the missing bit") per lesson; a second grading counts against quota. */
export const EXPLAIN_BACK_MAX_REFINES = 1;

export interface AnswerRecord {
  questionId: string;
  correct: boolean;
}

export interface ExplainBackSessionState {
  status: ExplainBackStatus;
  transcript: string;
  /** Key-point IDs marked "covered" — self-assessed while manual, or set from the grader when graded. */
  coveredIds: string[];
  /** Optional server-grading lifecycle; `idle`/`degraded` both render the manual self-assessment path. */
  grading: GradingStatus;
  /** The last schema-valid verdict, when `grading === 'graded'`. Serializable for persist/resume. */
  grade?: StoredGrade;
  /** How many refine passes have been spent this lesson (capped at EXPLAIN_BACK_MAX_REFINES). */
  refinesUsed: number;
  /** Idempotency key of the in-flight/last grading request, so a stale response can't clobber a newer one. */
  submissionId: string | null;
}

/** The fresh explain-back sub-state at lesson start (no transcript, idle grading, no refines spent). */
export const INITIAL_EXPLAIN_BACK: ExplainBackSessionState = {
  status: 'pending',
  transcript: '',
  coveredIds: [],
  grading: 'idle',
  refinesUsed: 0,
  submissionId: null,
};

/** Everything the player needs to finalize a completion, resolved at the app edge (clock, reader, ledger). */
export interface LessonCompletion {
  unitCompleted: boolean;
  alreadyCompleted: boolean;
  boostWindow: BoostWindow | null;
  now: number;
  timezone: string;
}

export interface LessonSessionData {
  lessonId: string | null;
  phase: LessonPhase;
  /** The presentation queue of question IDs; a wrong question is re-queued ONCE at the end. */
  queue: string[];
  /** Index into `queue` of the current question. */
  cursor: number;
  /** How many questions the lesson originally had — the segmented progress-bar denominator. */
  totalQuestions: number;
  answers: AnswerRecord[];
  /** Question IDs already re-queued once (so a wrong question re-queues at most once). */
  requeuedIds: string[];
  combo: ComboState;
  /** The just-answered feedback state: null while awaiting an answer, set while showing feedback. */
  pending: { questionId: string; correct: boolean; explanation: string } | null;
  /** The last combo event, for driving juice on the current render (not persisted-critical). */
  lastEvent: ComboEvent | null;
  /** The lesson's explain-back key-point IDs (copied at start; byte-identical to the concept card, GC-15d). */
  keyPointIds: string[];
  /** The lesson concept id (copied at start), sent to the grader as the rubric selector (GC-09). */
  conceptId: string | null;
  explainBack: ExplainBackSessionState;
  chestTier: ChestTier;
  /** Optimistic XP, computed once on completion via the XP engine. */
  xpBreakdown: LessonXpBreakdown | null;
  startedAt: number | null;
  /**
   * True when this completion moved `streak.current` (FT-9). Only such a completion can land on a
   * milestone, so a second lesson or a replay the same day never repeats the milestone takeover.
   */
  streakAdvanced: boolean;
}

export interface LessonSessionActions {
  /** Begin a FRESH lesson (resets any prior in-progress state) and charge the energy to start it. */
  startLesson: (lesson: Lesson, now: number) => void;
  /** Concept briefing CTA -> move to the exam-style decisions. */
  advanceFromConcept: () => void;
  /** Record an answer to the current question, updating the combo and energy; then show feedback. */
  answerCurrent: (correct: boolean, explanation: string, now: number) => void;
  /** Dismiss feedback: re-queue a wrong answer once, advance, and enter explain-back when exhausted. */
  continueAfterFeedback: () => void;
  /**
   * Submit the typed explain-back transcript (moves to the self-assessment key-point checklist) AND
   * kick off server grading in the BACKGROUND. Grading is fire-and-forget: it never blocks the UI, the
   * checklist, or completion — a verdict, if it arrives, only enriches what is already interactive.
   */
  submitExplainBack: (transcript: string) => void;
  /**
   * Refine once ("add the missing bit"): append a short follow-up to the transcript and re-grade with a
   * NEW submission id (counts against quota). No-ops past EXPLAIN_BACK_MAX_REFINES.
   */
  refineExplainBack: (refinement: string) => void;
  /** Toggle a key point as covered in self-assessment. */
  toggleCovered: (keyPointId: string) => void;
  /** Complete explain-back: award silver only for full self-assessed coverage, then show the gap card. */
  finishExplainBack: (now: number) => void;
  /** Skip explain-back — requires an explicit tap; emits a distinct analytics event; not punished. */
  skipExplainBack: (completion: LessonCompletion) => void;
  /** Gap micro-card "Continue" -> finalize and enter the ceremony. */
  finishGap: (completion: LessonCompletion) => void;
  /** Clear the session (after the ceremony "Done"), so cold-open Continue advances to the next lesson. */
  clearSession: () => void;
}

export type LessonSessionState = LessonSessionData & LessonSessionActions;

// Key deliberately avoids the substring "session" so it can never trip the auth/session persistence
// sweep in __tests__/state/persistence.test.ts (which forbids that field/key name in stored blobs).
export const LESSON_SESSION_STORAGE_KEY = 'cca-quest:active-lesson';
export const LESSON_SESSION_VERSION = 1;

export const INITIAL_LESSON_SESSION: LessonSessionData = {
  lessonId: null,
  phase: 'concept',
  queue: [],
  cursor: 0,
  totalQuestions: 0,
  answers: [],
  requeuedIds: [],
  combo: createComboState(),
  pending: null,
  lastEvent: null,
  keyPointIds: [],
  conceptId: null,
  explainBack: { ...INITIAL_EXPLAIN_BACK },
  chestTier: 'bronze',
  xpBreakdown: null,
  startedAt: null,
  streakAdvanced: false,
};

/** The missing key-point IDs, given the lesson's full key-point set and what was self-assessed covered. */
export function missingKeyPointIds(keyPointIds: readonly string[], coveredIds: readonly string[]): string[] {
  const covered = new Set(coveredIds);
  return keyPointIds.filter((id) => !covered.has(id));
}

export const useLessonSessionStore = create<LessonSessionState>()(
  persist(
    (set, get) => ({
      ...INITIAL_LESSON_SESSION,

      startLesson: (lesson, now) => {
        const decisionSet = selectLessonDecisionSet(lesson.exercises);
        useProgressStore.getState().chargeLessonStart(now);
        emitAnalytics('lesson_started', { lessonId: lesson.id }, now);
        set({
          ...INITIAL_LESSON_SESSION,
          combo: createComboState(),
          explainBack: { ...INITIAL_EXPLAIN_BACK },
          lessonId: lesson.id,
          phase: 'concept',
          queue: decisionSet.map((q) => q.id),
          cursor: 0,
          totalQuestions: decisionSet.length,
          keyPointIds: [...lesson.explainBack.keyPointIds],
          conceptId: lesson.concept.conceptId,
          startedAt: now,
        });
      },

      advanceFromConcept: () => set({ phase: 'exercises' }),

      answerCurrent: (correct, explanation, now) => {
        const state = get();
        const questionId = state.queue[state.cursor];
        if (questionId === undefined || state.pending !== null) return;

        const { state: combo, event } = recordAnswer(state.combo, correct);
        set({
          combo,
          lastEvent: event,
          answers: [...state.answers, { questionId, correct }],
          pending: { questionId, correct, explanation },
        });

        // Energy at the edge: a mistake costs 1, a fresh 5-in-a-row refunds 1 (spec §4.4/§4.3).
        const progress = useProgressStore.getState();
        if (!correct) progress.registerMistake(now);
        if (event.flare) progress.restoreFromCombo(now);
      },

      continueAfterFeedback: () => {
        const state = get();
        if (state.pending === null) return;
        const { questionId, correct } = state.pending;

        let queue = state.queue;
        let requeuedIds = state.requeuedIds;
        // Re-queue a wrong answer ONCE, at the end, so the learner sees it again (no shame framing).
        if (!correct && !requeuedIds.includes(questionId)) {
          queue = [...queue, questionId];
          requeuedIds = [...requeuedIds, questionId];
        }

        const cursor = state.cursor + 1;
        const done = cursor >= queue.length;
        set({
          queue,
          requeuedIds,
          cursor,
          pending: null,
          phase: done ? 'explainBack' : 'exercises',
        });
      },

      submitExplainBack: (transcript) => {
        const clipped = transcript.slice(0, EXPLAIN_BACK_TRANSCRIPT_MAX);
        set((state) => ({
          explainBack: { ...state.explainBack, status: 'submitted', transcript: clipped },
        }));
        // Background grading — never awaited by the checklist, the gap card, or completion (GC-03a).
        runGrading(get, set, clipped);
      },

      refineExplainBack: (refinement) => {
        const state = get();
        if (state.explainBack.refinesUsed >= EXPLAIN_BACK_MAX_REFINES) return;
        // Append the follow-up so the grader re-scores the FULL explanation; keep it within the cap.
        const combined = `${state.explainBack.transcript} ${refinement}`
          .trim()
          .slice(0, EXPLAIN_BACK_TRANSCRIPT_MAX);
        set({
          explainBack: {
            ...state.explainBack,
            transcript: combined,
            refinesUsed: state.explainBack.refinesUsed + 1,
          },
        });
        runGrading(get, set, combined);
      },

      toggleCovered: (keyPointId) =>
        set((state) => {
          const covered = new Set(state.explainBack.coveredIds);
          if (covered.has(keyPointId)) covered.delete(keyPointId);
          else covered.add(keyPointId);
          // Preserve key-point order for stable rendering.
          const coveredIds = state.keyPointIds.filter((id) => covered.has(id));
          return { explainBack: { ...state.explainBack, coveredIds } };
        }),

      finishExplainBack: (now) => {
        const state = get();
        emitAnalytics('explain_back_completed', { lessonId: state.lessonId ?? '' }, now);
        const fullCoverage = state.keyPointIds.length > 0
          && state.explainBack.coveredIds.length === state.keyPointIds.length;
        set({
          explainBack: { ...state.explainBack, status: 'completed' },
          chestTier: fullCoverage ? 'silver' : 'bronze',
          phase: 'gap',
        });
      },

      skipExplainBack: (completion) => {
        const state = get();
        emitAnalytics('explain_back_skipped', { lessonId: state.lessonId ?? '' }, completion.now);
        set({
          explainBack: { ...state.explainBack, status: 'skipped' },
          chestTier: 'bronze',
        });
        finalize(get, set, completion);
      },

      finishGap: (completion) => finalize(get, set, completion),

      clearSession: () => set({ ...INITIAL_LESSON_SESSION, combo: createComboState() }),
    }),
    {
      name: LESSON_SESSION_STORAGE_KEY,
      version: LESSON_SESSION_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: reportHydrationFailure(LESSON_SESSION_STORAGE_KEY),
      // Persist the full progression so a mid-lesson kill resumes exactly (GC-03b). `lastEvent` is a
      // transient juice hint (safe to drop on rehydrate); everything else is load-bearing for resume.
      partialize: (state): LessonSessionData => ({
        lessonId: state.lessonId,
        phase: state.phase,
        queue: state.queue,
        cursor: state.cursor,
        totalQuestions: state.totalQuestions,
        answers: state.answers,
        requeuedIds: state.requeuedIds,
        combo: state.combo,
        pending: state.pending,
        lastEvent: null,
        keyPointIds: state.keyPointIds,
        conceptId: state.conceptId,
        explainBack: state.explainBack,
        chestTier: state.chestTier,
        xpBreakdown: state.xpBreakdown,
        startedAt: state.startedAt,
        streakAdvanced: state.streakAdvanced,
      }),
      // Resume-safe grading: a mid-grading app kill leaves `grading: 'pending'` in storage with no
      // in-flight request to ever resolve it. On rehydrate we settle that orphan to `degraded` so the
      // learner lands in manual self-assessment instead of an eternal "checking…" (GC-09.8).
      merge: (persisted, current): LessonSessionState => {
        const merged = { ...current, ...(persisted as Partial<LessonSessionData>) };
        if (merged.explainBack?.grading === 'pending') {
          merged.explainBack = { ...merged.explainBack, grading: 'degraded', submissionId: null };
        }
        return merged;
      },
    },
  ),
);

/**
 * Fire a single grading attempt in the background and fold its result into the explain-back state.
 * Fully decoupled from progression: it mutates ONLY `explainBack.{grading,grade,coveredIds}` and is
 * guarded by `submissionId`, so a slow first response can never overwrite a newer refine. On a graded
 * verdict it adopts the server's coverage (valid key-point IDs, in key-point order) — which flows the
 * misses through the exact same gap-card path as self-assessment. Any non-graded result degrades
 * silently; XP and completion are never touched here.
 */
function runGrading(
  get: () => LessonSessionState,
  set: (partial: Partial<LessonSessionState>) => void,
  transcript: string,
): void {
  const state = get();
  const conceptId = state.conceptId;
  if (conceptId === null) {
    set({ explainBack: { ...state.explainBack, grading: 'degraded', submissionId: null } });
    return;
  }

  const submissionId = createClientEventId();
  set({ explainBack: { ...state.explainBack, grading: 'pending', submissionId } });

  void requestGrading({ conceptId, transcript, clientSubmissionId: submissionId }).then((result) => {
    const now = get();
    // A newer submission (refine) superseded this one — drop the stale verdict.
    if (now.explainBack.submissionId !== submissionId) return;
    // The learner has already moved past the explain-back/gap window (finalized, skipped, or a new
    // lesson began) — a late verdict has nowhere to land, so drop it rather than mutate a done lesson.
    if (now.phase !== 'explainBack' && now.phase !== 'gap') return;

    if (result.kind === 'graded') {
      // Adopt server coverage ONLY while the learner is still on the explain-back checklist. Once
      // finishExplainBack has run (phase 'gap'), chestTier is already fixed from the coverage shown
      // at that moment — rewriting coveredIds now would make the gap card disagree with the chest.
      if (now.phase !== 'explainBack') {
        set({ explainBack: { ...now.explainBack, grading: 'graded', grade: result.grade } });
        return;
      }
      const covered = new Set(result.grade.covered_points);
      const coveredIds = now.keyPointIds.filter((id) => covered.has(id));
      set({
        explainBack: { ...now.explainBack, grading: 'graded', grade: result.grade, coveredIds },
      });
      return;
    }
    set({ explainBack: { ...now.explainBack, grading: 'degraded' } });
  });
}

/**
 * Compute the optimistic XP ONCE (via the XP engine), write the durable ledger, and enter the
 * ceremony. Idempotent: a second call (e.g. a resumed ceremony) never double-awards. Synchronous by
 * contract (GC-03a) — no promise is created or awaited on the completion path.
 */
function finalize(
  get: () => LessonSessionState,
  set: (partial: Partial<LessonSessionState>) => void,
  completion: LessonCompletion,
): void {
  const state = get();
  if (state.xpBreakdown !== null || state.lessonId === null) {
    set({ phase: 'ceremony' });
    return;
  }

  const input: LessonXpInput = {
    bestComboStreak: state.combo.bestStreak,
    unitCompleted: completion.unitCompleted,
    // Legendary = a flawless first pass (every answered question correct, nothing re-queued).
    legendary:
      !completion.alreadyCompleted &&
      state.combo.totalAnswered > 0 &&
      state.combo.totalCorrect === state.combo.totalAnswered,
    replayOfCompleted: completion.alreadyCompleted,
    boost: completion.boostWindow ? { window: completion.boostWindow, now: completion.now } : undefined,
  };
  const breakdown = computeLessonXp(input);

  const streakBefore = useProgressStore.getState().streak.current;
  useProgressStore.getState().completeLesson({
    lessonId: state.lessonId,
    xp: breakdown.total,
    now: completion.now,
    timezone: completion.timezone,
  });
  const streakAdvanced = useProgressStore.getState().streak.current !== streakBefore;

  useGameStore.getState().recordLesson({
    lessonId: state.lessonId,
    firstCompletion: !completion.alreadyCompleted,
    xp: breakdown.total,
    correct: Math.min(state.totalQuestions, state.combo.totalCorrect),
    bestCombo: state.combo.bestStreak,
    minutes: Math.max(1, Math.round((completion.now - (state.startedAt ?? completion.now)) / 60_000)),
    chestTier: state.chestTier,
    perfect: input.legendary === true,
    date: localDateInTz(completion.now, completion.timezone),
    now: completion.now,
    dailyGoalMinutes: useSettingsStore.getState().dailyGoalMinutes,
    random: Math.random(),
  });

  emitAnalytics('lesson_completed', { lessonId: state.lessonId, xp: breakdown.total }, completion.now);
  set({ xpBreakdown: breakdown, phase: 'ceremony', streakAdvanced });
}

/** The current question's segmented-progress fill: distinct original questions answered, capped. */
export function progressFill(state: LessonSessionData): { filled: number; total: number } {
  const distinct = new Set(state.answers.map((a) => a.questionId));
  const filled = Math.min(distinct.size, state.totalQuestions);
  return { filled, total: state.totalQuestions };
}

export { COMBO_FLARE_INTERVAL };
