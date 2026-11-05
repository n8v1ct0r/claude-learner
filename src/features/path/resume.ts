// src/features/path/resume.ts
//
// The cold-open "Continue" resolver (GC-03b): a PURE function of the persisted lesson-session + the
// durable progress + the content spine that answers "which lesson does the one primary Continue CTA
// open, and does it resume mid-lesson?". Kept pure (no React, no reader instance) so it is unit-tested
// directly and the Path screen is a thin wrapper around it.
//
// Priority:
//   1. An in-progress lesson (session has a lessonId and has NOT reached the ceremony) -> resume it,
//      exactly where the learner left off — including the mid-lesson-kill case.
//   2. Otherwise the next lesson after the most recently completed one (spine order).
//   3. Otherwise the very first lesson (a brand-new user).

import type { LessonPhase } from '@/state/lesson-session';

export interface ContinueTarget {
  lessonId: string;
  /** 'resume' when re-entering an in-progress lesson; 'start' when opening a fresh one. */
  mode: 'resume' | 'start';
  /** Human label for the CTA (e.g. "Continue lesson" vs "Start lesson"). */
  label: string;
}

export interface ResumeInputs {
  /** The persisted in-progress lesson id, or null if none. */
  sessionLessonId: string | null;
  /** The phase that lesson is in (only meaningful when sessionLessonId is set). */
  sessionPhase: LessonPhase;
  /** The most recently completed lesson id, or null. */
  lastCompletedLessonId: string | null;
  /** The first lesson in the global spine. */
  firstLessonId: string | undefined;
  /** Resolve the lesson immediately after `id` in the spine (undefined at the end). */
  nextLessonIdAfter: (id: string) => string | undefined;
}

/** Resolve the single Continue target, or null when there is no content at all. */
export function resolveContinueTarget(inputs: ResumeInputs): ContinueTarget | null {
  const { sessionLessonId, sessionPhase, lastCompletedLessonId, firstLessonId, nextLessonIdAfter } = inputs;

  // 1. Resume an in-progress lesson. The ceremony phase means the lesson is finalized (progress was
  //    already written), so it is NOT "in progress" — fall through to the next lesson instead.
  if (sessionLessonId !== null && sessionPhase !== 'ceremony') {
    return { lessonId: sessionLessonId, mode: 'resume', label: 'Continue lesson' };
  }

  // 2. Next lesson after the last completed one.
  if (lastCompletedLessonId !== null) {
    const next = nextLessonIdAfter(lastCompletedLessonId);
    if (next !== undefined) {
      return { lessonId: next, mode: 'start', label: 'Start lesson' };
    }
    // Nothing after the last completed lesson — the user is at the end of available content.
    return null;
  }

  // 3. Brand-new user: the first lesson in the spine.
  if (firstLessonId !== undefined) {
    return { lessonId: firstLessonId, mode: 'start', label: 'Start lesson' };
  }

  return null;
}
