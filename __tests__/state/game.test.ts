import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { GEM_SINKS, REWARD_RULES } from '../../src/engine/rewards';
import { useGameStore } from '../../src/state/game';
import { useProgressStore } from '../../src/state/progress';

beforeEach(() => {
  useGameStore.getState().reset();
  useProgressStore.getState().reset();
});

describe('persisted game economy edge', () => {
  it('awards a lesson chest once and advances normal-study quests', () => {
    const record = () => useGameStore.getState().recordLesson({
      lessonId: 'lesson-1', firstCompletion: true, xp: 70, correct: 20, bestCombo: 10, minutes: 15,
      chestTier: 'silver', perfect: true, date: '2026-07-14', now: 1_000, dailyGoalMinutes: 10, random: 0,
    });
    record();
    const firstBalance = useProgressStore.getState().gems;
    expect(firstBalance).toBeGreaterThanOrEqual(REWARD_RULES.silver.minGems);
    expect(useGameStore.getState().rewardedLessonIds).toEqual(['lesson-1']);
    expect(useGameStore.getState().quests.some((quest) => quest.progress > 0)).toBe(true);
    record();
    expect(useGameStore.getState().rewardedLessonIds).toEqual(['lesson-1']);
    expect(useGameStore.getState().lastReward?.chests ?? []).not.toContain('silver');
    expect(useProgressStore.getState().gems).toBeGreaterThanOrEqual(firstBalance);
  });

  it('spends only an affordable amount and applies the purchased sink', () => {
    useProgressStore.getState().grantGems(GEM_SINKS.streakFreeze.price);
    useProgressStore.setState((state) => ({ streak: { ...state.streak, freezesAvailable: 0 } }));
    expect(useGameStore.getState().purchase(GEM_SINKS.streakFreeze.id, 1_000)).toBe(true);
    expect(useProgressStore.getState().gems).toBe(0);
    expect(useProgressStore.getState().streak.freezesAvailable).toBe(1);
    expect(useGameStore.getState().purchase(GEM_SINKS.xpBoost.id, 1_000)).toBe(false);
    expect(useProgressStore.getState().gems).toBe(0);
  });

  it('records each completed exam once for achievement progress', () => {
    useGameStore.getState().recordExam('attempt-1');
    useGameStore.getState().recordExam('attempt-1');
    expect(useGameStore.getState().stats.exams).toBe(1);
    expect(useGameStore.getState().unlockedAchievementIds).toContain('exams-1');
  });
});
