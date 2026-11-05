// src/features/onboarding/onboarding-flow.ts
//
// The PURE state machine behind first-run onboarding (PLAN-rev2 §4.7 #7, choice-minimized / ADHD-first).
//
// Onboarding is deliberately tiny: two choices, then straight into the first lesson. There is NO
// placement quiz and NO signup wall — anonymous auth runs invisibly underneath (SyncBootstrap no-ops
// without env), so the learner reaches real content in two taps.
//
//   exam-date  →  daily-goal  →  complete (deep-link into the first path lesson)
//
// This module holds ONLY pure logic (no React, no store, no navigation) so the flow — the first-run
// gate, step advancement, resumability, and the redirect decision — is unit-testable in isolation.
// The zustand `onboardingStep` field (src/state/settings.ts) is the durable cursor: it is persisted
// as the learner advances, which is what makes onboarding RESUMABLE across a cold kill. The screen
// (app/onboarding/index.tsx) and the gate (OnboardingGate.tsx) are thin wrappers over these functions.

/** The ordered, choosable onboarding steps (before the terminal 'complete'). */
export const ONBOARDING_STEPS = ['exam-date', 'daily-goal'] as const;

/** A step cursor. 'complete' is terminal — onboarding never shows again once here. */
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number] | 'complete';

/** Daily-goal minute options (PLAN-rev2 §4.7 #7). Index 1 (10 min) is the ADHD-sane default. */
export const DAILY_GOAL_OPTIONS = [5, 10, 15, 20] as const;
export type DailyGoalOption = (typeof DAILY_GOAL_OPTIONS)[number];

/**
 * Exam-date presets. `days === null` is the "just exploring" escape hatch — it stores a null exam
 * date (pacing stays off) and is the choice-minimized way to skip the date without a blocking picker.
 */
export interface ExamDatePreset {
  key: string;
  label: string;
  days: number | null;
}
export const EXAM_DATE_PRESETS: readonly ExamDatePreset[] = [
  { key: '2w', label: 'About 2 weeks away', days: 14 },
  { key: '1m', label: 'About 1 month away', days: 30 },
  { key: '3m', label: 'About 3 months away', days: 90 },
  { key: 'explore', label: 'Just exploring for now', days: null },
] as const;

const DAY_MS = 86_400_000;

/** Resolve a preset offset to a stored ISO exam date (or null for "just exploring"). */
export function examDateIso(now: number, days: number | null): string | null {
  return days === null ? null : new Date(now + days * DAY_MS).toISOString();
}

/** The next cursor after `current`. 'complete' is a fixed point (advancing past the end is a no-op). */
export function nextOnboardingStep(current: OnboardingStep): OnboardingStep {
  switch (current) {
    case 'exam-date':
      return 'daily-goal';
    case 'daily-goal':
      return 'complete';
    case 'complete':
      return 'complete';
  }
}

/** True once onboarding has been finished (or skipped forward) — the terminal state. */
export function isOnboardingComplete(step: OnboardingStep): boolean {
  return step === 'complete';
}

/** The first-run gate predicate: show onboarding until the cursor reaches 'complete'. */
export function shouldShowOnboarding(step: OnboardingStep): boolean {
  return !isOnboardingComplete(step);
}

/** Zero-based index for the "Step N of 2" progress affordance (returns 0 for 'complete'). */
export function onboardingStepIndex(step: OnboardingStep): number {
  const index = (ONBOARDING_STEPS as readonly string[]).indexOf(step);
  return index < 0 ? 0 : index;
}

/**
 * PURE redirect decision for the first-run gate (OnboardingGate.tsx). Returns the onboarding route
 * to `replace` to, or null to leave navigation untouched. Kept pure so the gate needs no store or
 * navigator to test.
 *
 *  - Waits for both settings rehydration AND a mounted navigator (avoids a first-frame flash that
 *    would wrongly bounce a returning learner into onboarding before the persisted cursor loads).
 *  - Never redirects while already on the onboarding route (no loop; the screen owns its own exit).
 */
export function resolveOnboardingRedirect(params: {
  hydrated: boolean;
  navReady: boolean;
  step: OnboardingStep;
  inOnboarding: boolean;
}): '/onboarding' | null {
  if (!params.hydrated || !params.navReady) return null;
  if (params.inOnboarding) return null;
  return shouldShowOnboarding(params.step) ? '/onboarding' : null;
}

/**
 * PURE exit decision for the onboarding SCREEN: send the learner back to the Learn tab when the cursor
 * is already 'complete' but this visit did not finish it — a deep link (claudelearner://onboarding) or a
 * restored route after onboarding. There is nothing left to set up, and replaying a step would reopen
 * the first lesson. A visit that just finished onboarding keeps its own exit (the first lesson on top
 * of the Learn tab).
 *
 * This lives with the screen, not the gate: expo-router applies navigation from a queue after the
 * render, so for one render after finishing the gate would see 'complete' while still on the
 * onboarding route, and a gate-side redirect would override the first lesson.
 */
export function shouldLeaveOnboarding(params: { step: OnboardingStep; finishedHere: boolean }): boolean {
  return isOnboardingComplete(params.step) && !params.finishedHere;
}
