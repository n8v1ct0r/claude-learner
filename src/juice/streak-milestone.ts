// src/juice/streak-milestone.ts — pure logic for "is this streak length a celebration moment?".
//
// Kept pure (no React, no side effects) so it is trivially unit-testable and can be called from the
// ceremony, a takeover surface, or a test alike. A milestone fires ONLY when the streak lands exactly on
// a threshold — we never nag "3 days until 30"; the app celebrates arrivals, never pressures (GC-13).

/** Ordered streak thresholds worth a full-screen moment. 100+ is the "legendary" tier. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365] as const;

const LEGENDARY_FROM = 100;

export interface StreakMilestone {
  days: number;
  /** True at 100+ days — drives the legendary mascot pose + shimmer + biggest SFX. */
  legendary: boolean;
  /** Gain-framed headline (never loss-framed — passes evals/checks/copy-lint.mjs). */
  title: string;
  message: string;
}

/**
 * Returns the milestone for an exact streak length, or null if this length is not a threshold.
 * Copy is deliberately warm and gain-framed: it celebrates what the learner built, with no mention of
 * losing, breaking, or falling behind.
 */
export function streakMilestone(current: number): StreakMilestone | null {
  if (!STREAK_MILESTONES.includes(current as (typeof STREAK_MILESTONES)[number])) return null;
  const legendary = current >= LEGENDARY_FROM;
  return {
    days: current,
    legendary,
    title: legendary ? `${current}-day streak — legendary` : `${current}-day streak`,
    message: legendary
      ? `${current} days of showing up. You have built a rare, durable habit — Archie is in awe.`
      : `${current} days in a row. Your rhythm is real — a few minutes today keeps it warm.`,
  };
}
