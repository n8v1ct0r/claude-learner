// Pure onboarding state-machine tests (src/features/onboarding/onboarding-flow.ts). No React, no
// store — just the flow logic that powers the first-run gate, step advancement, resumability, and the
// gate's redirect decision.
import { describe, expect, it } from '@jest/globals';

import {
  DAILY_GOAL_OPTIONS,
  EXAM_DATE_PRESETS,
  ONBOARDING_STEPS,
  examDateIso,
  isOnboardingComplete,
  nextOnboardingStep,
  onboardingStepIndex,
  resolveOnboardingRedirect,
  shouldLeaveOnboarding,
  shouldShowOnboarding,
  type OnboardingStep,
} from '../../src/features/onboarding/onboarding-flow';

describe('onboarding step machine', () => {
  it('advances exam-date → daily-goal → complete and fixes at complete', () => {
    expect(nextOnboardingStep('exam-date')).toBe('daily-goal');
    expect(nextOnboardingStep('daily-goal')).toBe('complete');
    expect(nextOnboardingStep('complete')).toBe('complete');
  });

  it('shows onboarding until the cursor reaches complete (first-run gate)', () => {
    expect(shouldShowOnboarding('exam-date')).toBe(true);
    expect(shouldShowOnboarding('daily-goal')).toBe(true);
    expect(shouldShowOnboarding('complete')).toBe(false);
    expect(isOnboardingComplete('complete')).toBe(true);
    expect(isOnboardingComplete('exam-date')).toBe(false);
  });

  it('maps steps to a 1-based progress index', () => {
    expect(onboardingStepIndex('exam-date')).toBe(0);
    expect(onboardingStepIndex('daily-goal')).toBe(1);
    // 'complete' has no progress dot; index clamps to 0 rather than -1.
    expect(onboardingStepIndex('complete')).toBe(0);
  });

  it('exposes exactly two choosable steps and the documented option sets', () => {
    expect(ONBOARDING_STEPS).toEqual(['exam-date', 'daily-goal']);
    expect(DAILY_GOAL_OPTIONS).toEqual([5, 10, 15, 20]);
    expect(EXAM_DATE_PRESETS.map((p) => p.key)).toEqual(['2w', '1m', '3m', 'explore']);
    // "Just exploring" is the null-date escape hatch.
    expect(EXAM_DATE_PRESETS.find((p) => p.key === 'explore')?.days).toBeNull();
  });
});

describe('examDateIso', () => {
  const now = Date.parse('2026-07-17T00:00:00.000Z');

  it('offsets from now by the preset day count', () => {
    expect(examDateIso(now, 14)).toBe('2026-07-31T00:00:00.000Z');
    expect(examDateIso(now, 30)).toBe('2026-08-16T00:00:00.000Z');
  });

  it('returns null for "just exploring" (pacing stays off)', () => {
    expect(examDateIso(now, null)).toBeNull();
  });
});

describe('resolveOnboardingRedirect (gate decision)', () => {
  const base = { hydrated: true, navReady: true, step: 'exam-date' as OnboardingStep, inOnboarding: false };

  it('redirects a fresh install to /onboarding once hydrated and the navigator is mounted', () => {
    expect(resolveOnboardingRedirect(base)).toBe('/onboarding');
  });

  it('waits for rehydration and a mounted navigator (no first-frame flash)', () => {
    expect(resolveOnboardingRedirect({ ...base, hydrated: false })).toBeNull();
    expect(resolveOnboardingRedirect({ ...base, navReady: false })).toBeNull();
  });

  it('never redirects while already on onboarding (loop-free)', () => {
    expect(resolveOnboardingRedirect({ ...base, inOnboarding: true })).toBeNull();
  });

  it('leaves a returning learner alone once onboarding is complete', () => {
    expect(resolveOnboardingRedirect({ ...base, step: 'complete' })).toBeNull();
  });
});

describe("shouldLeaveOnboarding (the onboarding screen's own exit)", () => {
  it('sends a learner who already finished onboarding back to Learn (a deep link to /onboarding)', () => {
    expect(shouldLeaveOnboarding({ step: 'complete', finishedHere: false })).toBe(true);
  });

  it('keeps a visit that just finished onboarding on its own exit (first lesson over Learn)', () => {
    expect(shouldLeaveOnboarding({ step: 'complete', finishedHere: true })).toBe(false);
  });

  it('never leaves while a step is still open', () => {
    expect(shouldLeaveOnboarding({ step: 'exam-date', finishedHere: false })).toBe(false);
    expect(shouldLeaveOnboarding({ step: 'daily-goal', finishedHere: false })).toBe(false);
  });
});
