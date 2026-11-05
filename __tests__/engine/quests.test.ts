import { describe, expect, it } from '@jest/globals';
import { advanceQuests, allThreeComplete, claimableQuests, createDailyQuests } from '../../src/engine/quests';

describe('daily quests', () => {
  it('rotates exactly three escalating quests by day', () => {
    const first = createDailyQuests('2026-07-14', 10);
    const second = createDailyQuests('2026-07-15', 10);
    expect(first).toHaveLength(3);
    expect(first.map((q) => q.chestTier)).toEqual(['bronze', 'silver', 'gold']);
    expect(second.map((q) => q.metric)).not.toEqual(first.map((q) => q.metric));
  });

  it('advances only matching metrics, clamps at target, and exposes the all-three bonus', () => {
    let quests = createDailyQuests('2026-07-14', 10);
    quests = advanceQuests(quests, { xp: 10_000, lessons: 10_000, correct: 10_000, combo: 10_000, minutes: 10_000 });
    expect(quests.every((q) => q.progress === q.target)).toBe(true);
    expect(claimableQuests(quests)).toHaveLength(3);
    expect(allThreeComplete(quests)).toBe(true);
    quests[0] = { ...quests[0], claimed: true };
    expect(claimableQuests(quests)).toHaveLength(2);
  });
});
