import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { newlyUnlocked, updateMonthlyBadge, type AchievementStats, type MonthlyBadgeState } from '@/engine/achievements';
import { advanceCommitment, claimCommitmentBonus, createCommitment, type CommitmentState } from '@/engine/commitment';
import { advanceQuests, allThreeComplete, claimableQuests, createDailyQuests, type DailyQuest } from '@/engine/quests';
import { canAfford, GEM_SINKS, openChest, type ChestTier, type RewardDrop } from '@/engine/rewards';
import { MAX_FREEZES } from '@/engine/streak';
import { BOOST_DURATION_MS, type BoostWindow } from '@/engine/xp';
import { resolveTimezone, useProgressStore } from '@/state/progress';
import { useOutboxStore } from '@/sync/outbox';
import { reportHydrationFailure } from '@/state/hydration';

/** Whether a gem sink can be bought right now, and if not, why (the shop shows the reason). */
export type SinkAvailability = 'available' | 'owned' | 'freezes-full' | 'needs-gems' | 'unknown';

/**
 * A freeze at the cap would be clamped away (grantFreeze never exceeds {@link MAX_FREEZES}), so it is
 * not for sale then (FT-8); a cosmetic sells once; everything else needs enough gems.
 */
export function sinkAvailability(
  sinkId: string,
  context: { gems: number; freezesAvailable: number; ownedCosmetics: readonly string[] },
): SinkAvailability {
  const sink = Object.values(GEM_SINKS).find((candidate) => candidate.id === sinkId);
  if (!sink) return 'unknown';
  if (sinkId === GEM_SINKS.streakFreeze.id && context.freezesAvailable >= MAX_FREEZES) return 'freezes-full';
  if (sinkId !== GEM_SINKS.streakFreeze.id && sinkId !== GEM_SINKS.xpBoost.id && context.ownedCosmetics.includes(sinkId)) {
    return 'owned';
  }
  return canAfford(context.gems, sink.price) ? 'available' : 'needs-gems';
}

export interface RewardSummary { gems: number; drops: RewardDrop[]; chests: ChestTier[] }
export interface GameData {
  questDate: string | null;
  quests: DailyQuest[];
  allThreeBonusClaimed: boolean;
  monthlyBadge: MonthlyBadgeState | null;
  unlockedAchievementIds: string[];
  stats: AchievementStats;
  commitment: CommitmentState | null;
  rewardedLessonIds: string[];
  recordedExamAttemptIds: string[];
  ownedCosmetics: string[];
  activeBoost: BoostWindow | null;
  lastReward: RewardSummary | null;
  questUpdatedAt: Record<string, number>;
  achievementUnlockedAt: Record<string, number>;
}

export interface GameActions {
  refreshDaily: (date: string, dailyGoalMinutes: number) => void;
  recordLesson: (params: { lessonId: string; firstCompletion: boolean; xp: number; correct: number; bestCombo: number; minutes: number; chestTier: 'bronze' | 'silver'; perfect: boolean; date: string; now: number; dailyGoalMinutes: number; random: number }) => void;
  recordExam: (attemptId: string) => void;
  startCommitment: (date: string, targetDays: 3 | 5 | 7) => void;
  claimCommitmentChest: (random: number) => void;
  purchase: (sinkId: string, now: number) => boolean;
  clearLastReward: () => void;
  mergeRemote: (snapshot: {
    quests: { questId: string; progress: number; claimed: boolean; updatedAt: number }[];
    achievements: { achievementId: string; unlockedAt: number }[];
  }) => void;
  reset: () => void;
}

export type GameState = GameData & GameActions;
export const GAME_STORAGE_KEY = 'cca-quest:game';
export const GAME_VERSION = 2;
export const INITIAL_GAME_DATA: GameData = {
  questDate: null, quests: [], allThreeBonusClaimed: false, monthlyBadge: null,
  unlockedAchievementIds: [], stats: { lessons: 0, xp: 0, streak: 0, exams: 0, perfectLessons: 0 },
  commitment: null, rewardedLessonIds: [], recordedExamAttemptIds: [], ownedCosmetics: [], activeBoost: null, lastReward: null,
  questUpdatedAt: {}, achievementUnlockedAt: {},
};

function roll(seed: number, offset: number): number {
  return Math.abs((seed * 9_973 + offset * 0.371) % 1);
}

function unlockedFor(stats: AchievementStats, current: string[]): string[] {
  return [...current, ...newlyUnlocked(stats, current).map((achievement) => achievement.id)];
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...INITIAL_GAME_DATA,
      refreshDaily: (date, dailyGoalMinutes) => {
        if (get().questDate === date) return;
        const now = Date.now();
        const quests = createDailyQuests(date, dailyGoalMinutes);
        const questUpdatedAt = Object.fromEntries(quests.map((quest) => [quest.id, now]));
        set({ questDate: date, quests, questUpdatedAt, allThreeBonusClaimed: false, lastReward: null });
        for (const quest of quests) useOutboxStore.getState().queueQuest({ quest, updatedAt: now });
      },
      recordLesson: (params) => {
        get().refreshDaily(params.date, params.dailyGoalMinutes);
        const state = get();
        const advanced = advanceQuests(state.quests, { xp: params.xp, lessons: 1, correct: params.correct, combo: params.bestCombo, minutes: params.minutes });
        const claimable = claimableQuests(advanced);
        const firstLessonChest = !state.rewardedLessonIds.includes(params.lessonId);
        const bonus = allThreeComplete(advanced) && !state.allThreeBonusClaimed;
        const chestTiers: ChestTier[] = [
          ...(firstLessonChest ? [params.chestTier] : []),
          ...claimable.map((quest) => quest.chestTier),
          ...(bonus ? ['bonus' as const] : []),
        ];
        let gems = 0;
        const drops: RewardDrop[] = [];
        chestTiers.forEach((tier, index) => {
          const reward = openChest(tier, roll(params.random, index), roll(params.random, index + 30));
          gems += reward.gems;
          if (reward.drop) drops.push(reward.drop);
        });
        const quests = advanced.map((quest) => claimable.some((candidate) => candidate.id === quest.id) ? { ...quest, claimed: true } : quest);
        const stats: AchievementStats = {
          lessons: state.stats.lessons + (params.firstCompletion ? 1 : 0),
          xp: state.stats.xp + params.xp,
          streak: useProgressStore.getState().streak.current,
          exams: state.stats.exams,
          perfectLessons: state.stats.perfectLessons + (params.firstCompletion && params.perfect ? 1 : 0),
        };
        const ownedCosmetics = [...state.ownedCosmetics];
        for (const drop of drops) if (drop && drop !== 'xp-boost' && !ownedCosmetics.includes(drop)) ownedCosmetics.push(drop);
        const activeBoost = drops.includes('xp-boost') ? { startedAt: params.now, durationMs: BOOST_DURATION_MS } : state.activeBoost;
        const commitment = state.commitment ? advanceCommitment(state.commitment, params.date, true) : null;
        const unlockedAchievementIds = unlockedFor(stats, state.unlockedAchievementIds);
        const newlyUnlockedIds = unlockedAchievementIds.filter((id) => !state.unlockedAchievementIds.includes(id));
        const achievementUnlockedAt = { ...state.achievementUnlockedAt };
        for (const id of newlyUnlockedIds) achievementUnlockedAt[id] = params.now;
        const questUpdatedAt = { ...state.questUpdatedAt };
        for (const quest of quests) questUpdatedAt[quest.id] = params.now;
        set({
          quests,
          allThreeBonusClaimed: state.allThreeBonusClaimed || bonus,
          monthlyBadge: updateMonthlyBadge(state.monthlyBadge, params.date.slice(0, 7), claimable.length),
          unlockedAchievementIds,
          achievementUnlockedAt,
          questUpdatedAt,
          stats,
          commitment,
          rewardedLessonIds: firstLessonChest ? [...state.rewardedLessonIds, params.lessonId] : state.rewardedLessonIds,
          ownedCosmetics,
          activeBoost,
          lastReward: chestTiers.length > 0 ? { gems, drops, chests: chestTiers } : null,
        });
        useProgressStore.getState().grantGems(gems);
        for (const quest of quests) useOutboxStore.getState().queueQuest({ quest, updatedAt: params.now });
        for (const achievementId of newlyUnlockedIds) {
          useOutboxStore.getState().queueAchievement({ achievementId, unlockedAt: params.now, updatedAt: params.now });
        }
      },
      recordExam: (attemptId) => {
        const state = get();
        if (state.recordedExamAttemptIds.includes(attemptId)) return;
        const now = Date.now();
        const stats = { ...state.stats, exams: state.stats.exams + 1 };
        const unlockedAchievementIds = unlockedFor(stats, state.unlockedAchievementIds);
        const newlyUnlockedIds = unlockedAchievementIds.filter((id) => !state.unlockedAchievementIds.includes(id));
        const achievementUnlockedAt = { ...state.achievementUnlockedAt };
        for (const id of newlyUnlockedIds) achievementUnlockedAt[id] = now;
        set({ recordedExamAttemptIds: [...state.recordedExamAttemptIds, attemptId], stats, unlockedAchievementIds, achievementUnlockedAt });
        for (const achievementId of newlyUnlockedIds) {
          useOutboxStore.getState().queueAchievement({ achievementId, unlockedAt: now, updatedAt: now });
        }
      },
      startCommitment: (date, targetDays) => set({ commitment: createCommitment(date, targetDays) }),
      claimCommitmentChest: (random) => {
        const state = get();
        if (!state.commitment || state.commitment.bonusChests <= 0) return;
        const reward = openChest('bonus', random, roll(random, 10));
        set({ commitment: claimCommitmentBonus(state.commitment), lastReward: { gems: reward.gems, drops: reward.drop ? [reward.drop] : [], chests: ['bonus'] } });
        useProgressStore.getState().grantGems(reward.gems);
      },
      purchase: (sinkId, now) => {
        const sink = Object.values(GEM_SINKS).find((candidate) => candidate.id === sinkId);
        if (!sink) return false;
        const progress = useProgressStore.getState();
        // Settle missed days first so the freeze count checked here is the one the learner sees.
        if (sinkId === GEM_SINKS.streakFreeze.id) progress.refreshStreak(now, resolveTimezone());
        const availability = sinkAvailability(sinkId, {
          gems: useProgressStore.getState().gems,
          freezesAvailable: useProgressStore.getState().streak.freezesAvailable,
          ownedCosmetics: get().ownedCosmetics,
        });
        // Refuse BEFORE any gems move: at the freeze cap the purchase would grant nothing (FT-8).
        if (availability !== 'available' || !useProgressStore.getState().spendGems(sink.price)) return false;
        if (sinkId === GEM_SINKS.streakFreeze.id) useProgressStore.getState().grantFreeze();
        else if (sinkId === GEM_SINKS.xpBoost.id) set({ activeBoost: { startedAt: now, durationMs: BOOST_DURATION_MS } });
        else set((state) => ({ ownedCosmetics: state.ownedCosmetics.includes(sinkId) ? state.ownedCosmetics : [...state.ownedCosmetics, sinkId] }));
        return true;
      },
      clearLastReward: () => set({ lastReward: null }),
      mergeRemote: ({ quests: remoteQuests, achievements }) => {
        set((state) => {
          const questUpdatedAt = { ...state.questUpdatedAt };
          const quests = state.quests.map((quest) => {
            const remote = remoteQuests.find((row) => row.questId === quest.id);
            if (!remote || remote.updatedAt <= (questUpdatedAt[quest.id] ?? 0)) return quest;
            questUpdatedAt[quest.id] = remote.updatedAt;
            return { ...quest, progress: Math.max(quest.progress, remote.progress), claimed: quest.claimed || remote.claimed };
          });
          const unlocked = new Set(state.unlockedAchievementIds);
          const achievementUnlockedAt = { ...state.achievementUnlockedAt };
          for (const achievement of achievements) {
            unlocked.add(achievement.achievementId);
            achievementUnlockedAt[achievement.achievementId] = Math.max(
              achievementUnlockedAt[achievement.achievementId] ?? 0,
              achievement.unlockedAt,
            );
          }
          return { quests, questUpdatedAt, unlockedAchievementIds: [...unlocked], achievementUnlockedAt };
        });
      },
      reset: () => set({ ...INITIAL_GAME_DATA }),
    }),
    { name: GAME_STORAGE_KEY, version: GAME_VERSION, storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: reportHydrationFailure(GAME_STORAGE_KEY), partialize: (state): GameData => ({
      questDate: state.questDate, quests: state.quests, allThreeBonusClaimed: state.allThreeBonusClaimed, monthlyBadge: state.monthlyBadge,
      unlockedAchievementIds: state.unlockedAchievementIds, stats: state.stats, commitment: state.commitment, rewardedLessonIds: state.rewardedLessonIds,
      recordedExamAttemptIds: state.recordedExamAttemptIds, ownedCosmetics: state.ownedCosmetics, activeBoost: state.activeBoost, lastReward: state.lastReward,
      questUpdatedAt: state.questUpdatedAt, achievementUnlockedAt: state.achievementUnlockedAt,
    }),
    migrate: (persistedState) => ({ ...INITIAL_GAME_DATA, ...(persistedState as Partial<GameData>) }) as GameState,
    },
  ),
);
