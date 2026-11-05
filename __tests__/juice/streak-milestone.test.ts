// __tests__/juice/streak-milestone.test.ts — pure logic for the streak celebration thresholds.

import { describe, expect, it } from '@jest/globals';

import { STREAK_MILESTONES, streakMilestone } from '@/juice/streak-milestone';

describe('streakMilestone', () => {
  it('fires only on exact thresholds', () => {
    expect(streakMilestone(7)).not.toBeNull();
    expect(streakMilestone(30)).not.toBeNull();
    // A non-threshold length is not a celebration moment (no nagging on "almost" days).
    expect(streakMilestone(6)).toBeNull();
    expect(streakMilestone(8)).toBeNull();
    expect(streakMilestone(0)).toBeNull();
    expect(streakMilestone(29)).toBeNull();
  });

  it('marks 100+ day streaks as legendary and below-100 as not', () => {
    expect(streakMilestone(7)?.legendary).toBe(false);
    expect(streakMilestone(60)?.legendary).toBe(false);
    expect(streakMilestone(100)?.legendary).toBe(true);
    expect(streakMilestone(365)?.legendary).toBe(true);
  });

  it('reports the milestone day and a gain-framed message with no loss/shame language', () => {
    for (const days of STREAK_MILESTONES) {
      const moment = streakMilestone(days);
      expect(moment).not.toBeNull();
      expect(moment?.days).toBe(days);
      const copy = `${moment?.title} ${moment?.message}`.toLowerCase();
      for (const banned of ['lose', 'danger', 'break', 'falling behind', 'last chance', "don't let"]) {
        expect(copy).not.toContain(banned);
      }
    }
  });
});
