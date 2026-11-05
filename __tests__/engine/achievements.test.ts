import { describe, expect, it } from '@jest/globals';
import { MONTHLY_BADGE_TARGET, newlyUnlocked, updateMonthlyBadge } from '../../src/engine/achievements';

describe('achievements and monthly badge', () => {
  it('unlocks every crossed tier exactly once', () => {
    const stats = { lessons: 12, xp: 1_200, streak: 8, exams: 1, perfectLessons: 0 };
    const first = newlyUnlocked(stats, []);
    expect(first.map((a) => a.id)).toEqual(expect.arrayContaining(['lessons-1', 'lessons-2', 'xp-1', 'xp-2', 'streak-1', 'exams-1']));
    expect(newlyUnlocked(stats, first.map((a) => a.id))).toHaveLength(0);
  });

  it('awards at the threshold and rolls cleanly into a new month', () => {
    const july = updateMonthlyBadge(null, '2026-07', MONTHLY_BADGE_TARGET);
    expect(july.awarded).toBe(true);
    const august = updateMonthlyBadge(july, '2026-08', 1);
    expect(august).toEqual({ month: '2026-08', completedQuests: 1, awarded: false });
  });
});
