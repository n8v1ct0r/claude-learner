// src/state/progress.ts
//
// Durable player progress — the app-side ledger the cold-open Continue and the ceremony read/write.
// It holds ONLY non-sensitive game state (completed lessons, total XP, gems, the engine state objects
// for energy + streak) and never any auth/session material (see src/state/README.md). Streak and
// energy math live entirely in the pure engines (src/engine/*, the GC-04 oracle); this store is the
// thin, persisted edge that owns the wall clock and the user's timezone and hands both INTO the
// engines. That keeps the engines clock-free and testable while the store stays logic-free.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  createEnergyState,
  registerMistake as energyRegisterMistake,
  restoreFromCombo as energyRestoreFromCombo,
  restoreFromPractice as energyRestoreFromPractice,
  warmupRefill,
  startPathLesson,
  type EnergyState,
} from '@/engine/energy';
import { createStreakState, reduceStreak, type StreakState } from '@/engine/streak';
import { grantFreeze as grantStreakFreeze } from '@/engine/streak';
import { localDateInTz } from '@/engine/time';
import { reportHydrationFailure } from '@/state/hydration';
import { useOutboxStore } from '@/sync/outbox';

/** The user's IANA timezone, resolved at the app edge (never inside an engine). */
export function resolveTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export interface ProgressData {
  /** Lesson IDs the user has completed at least once (append-only set, deduped). */
  completedLessonIds: string[];
  /** The most recently completed lesson ID — the anchor for "what's next" on the path. */
  lastCompletedLessonId: string | null;
  totalXp: number;
  gems: number;
  energy: EnergyState;
  streak: StreakState;
  lessonUpdatedAt: Record<string, number>;
  energyUpdatedAt: number;
  streakUpdatedAt: number;
}

export interface RemoteProgressSnapshot {
  lessons: { lessonId: string; updatedAt: number }[];
  totalXp: number;
  energy: { state: EnergyState; updatedAt: number } | null;
  streak: { state: StreakState; updatedAt: number } | null;
}

export interface ProgressActions {
  /** Charge energy to start a NEW path lesson. Returns whether it was affordable (never hard-blocks). */
  chargeLessonStart: (now: number) => boolean;
  /** A mistake inside a path lesson costs 1 energy (never below 0). */
  registerMistake: (now: number) => void;
  /** A 5-in-a-row combo restores 1 energy (the refund lightning). */
  restoreFromCombo: (now: number) => void;
  /** Completing any practice/SRS session restores 1 energy (guaranteed recovery path). */
  restoreFromPractice: (now: number) => void;
  restoreFromWarmup: (now: number) => void;
  grantGems: (amount: number) => void;
  spendGems: (amount: number) => boolean;
  grantFreeze: () => void;
  /**
   * Record a completed lesson: add its XP, mark it complete, and advance the streak for the user's
   * local day. Idempotent-ish on the completed set (never duplicates an ID); XP is additive by design
   * (the caller decides gold-replay decay via the XP engine before calling this).
   */
  completeLesson: (params: { lessonId: string; xp: number; gems?: number; now: number; timezone: string }) => void;
  /**
   * Settle the streak for the learner's local day without new activity (app open): spend freezes on
   * missed days, pause, or archive, as the streak engine's `refresh` event defines (FT-13). Writes
   * only when something changed, and never as a new write: the settle is derived from the stored
   * streak and the date, so it keeps `streakUpdatedAt` and queues nothing for sync.
   */
  refreshStreak: (now: number, timezone: string) => void;
  hasCompleted: (lessonId: string) => boolean;
  mergeRemote: (snapshot: RemoteProgressSnapshot) => void;
  reset: () => void;
}

export type ProgressState = ProgressData & ProgressActions;

export const PROGRESS_STORAGE_KEY = 'cca-quest:progress';
export const PROGRESS_VERSION = 2;

// Engine state objects need a clock anchor at creation. The store is the edge, so reading Date.now()
// HERE (not in an engine) is correct.
function freshProgressData(): ProgressData {
  const now = Date.now();
  return {
    completedLessonIds: [],
    lastCompletedLessonId: null,
    totalXp: 0,
    gems: 0,
    energy: createEnergyState(now),
    streak: createStreakState(),
    lessonUpdatedAt: {},
    // Zero means "unmodified on this install" so a restored server row wins on a new device.
    energyUpdatedAt: 0,
    streakUpdatedAt: 0,
  };
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...freshProgressData(),

      chargeLessonStart: (now) => {
        const result = startPathLesson(get().energy, now);
        set({ energy: result.state, energyUpdatedAt: now });
        useOutboxStore.getState().queueEnergy({ state: result.state, updatedAt: now });
        return result.ok;
      },

      registerMistake: (now) => {
        const energy = energyRegisterMistake(get().energy, now);
        set({ energy, energyUpdatedAt: now });
        useOutboxStore.getState().queueEnergy({ state: energy, updatedAt: now });
      },

      restoreFromCombo: (now) => {
        const energy = energyRestoreFromCombo(get().energy, now);
        set({ energy, energyUpdatedAt: now });
        useOutboxStore.getState().queueEnergy({ state: energy, updatedAt: now });
      },

      restoreFromPractice: (now) => {
        const energy = energyRestoreFromPractice(get().energy, now);
        set({ energy, energyUpdatedAt: now });
        useOutboxStore.getState().queueEnergy({ state: energy, updatedAt: now });
      },

      restoreFromWarmup: (now) => {
        const energy = warmupRefill(get().energy, now);
        set({ energy, energyUpdatedAt: now });
        useOutboxStore.getState().queueEnergy({ state: energy, updatedAt: now });
      },

      grantGems: (amount) => set((state) => ({ gems: state.gems + Math.max(0, Math.trunc(amount)) })),

      spendGems: (amount) => {
        const price = Math.max(0, Math.trunc(amount));
        if (get().gems < price) return false;
        set((state) => ({ gems: state.gems - price }));
        return true;
      },

      grantFreeze: () => {
        const now = Date.now();
        const streak = grantStreakFreeze(get().streak);
        set({ streak, streakUpdatedAt: now });
        useOutboxStore.getState().queueStreak({ state: streak, updatedAt: now });
      },

      completeLesson: ({ lessonId, xp, gems = 0, now, timezone }) => {
        const state = get();
        const todayLocal = localDateInTz(now, timezone);
        const completedLessonIds = state.completedLessonIds.includes(lessonId)
          ? state.completedLessonIds
          : [...state.completedLessonIds, lessonId];
        const streak = reduceStreak(state.streak, { type: 'lessonCompleted' }, todayLocal);
        set({
          completedLessonIds,
          lastCompletedLessonId: lessonId,
          totalXp: state.totalXp + xp,
          gems: state.gems + gems,
          streak,
          lessonUpdatedAt: { ...state.lessonUpdatedAt, [lessonId]: now },
          streakUpdatedAt: now,
        });
        useOutboxStore.getState().queueXp({ amount: xp, source: 'lesson', sourceId: lessonId, occurredAt: now });
        useOutboxStore.getState().queueProgress({ lessonId, bestScore: 100, updatedAt: now });
        useOutboxStore.getState().queueStreak({ state: streak, updatedAt: now });
      },

      refreshStreak: (now, timezone) => {
        const current = get().streak;
        const streak = reduceStreak(current, { type: 'refresh' }, localDateInTz(now, timezone));
        if (streak === current) return; // the engine returns the same state when nothing settles
        // Derived state, not a new write: it keeps the stored timestamp and is not queued. Stamping it
        // `now` would let a device that sat idle overwrite another device's newer, real streak under
        // last-write-wins (the server's guard_lww and mergeRemote). A sync still backs it up under
        // its original timestamp (seedLocalStateForSync), so a newer row from another device still wins.
        set({ streak });
      },

      hasCompleted: (lessonId) => get().completedLessonIds.includes(lessonId),

      mergeRemote: (snapshot) => {
        const state = get();
        const lessonUpdatedAt = { ...state.lessonUpdatedAt };
        const completed = new Set(state.completedLessonIds);
        let latestLesson = state.lastCompletedLessonId;
        let latestLessonAt = latestLesson ? lessonUpdatedAt[latestLesson] ?? 0 : 0;
        for (const lesson of snapshot.lessons) {
          completed.add(lesson.lessonId);
          lessonUpdatedAt[lesson.lessonId] = Math.max(lessonUpdatedAt[lesson.lessonId] ?? 0, lesson.updatedAt);
          if (lesson.updatedAt >= latestLessonAt) {
            latestLesson = lesson.lessonId;
            latestLessonAt = lesson.updatedAt;
          }
        }
        const energyWins = snapshot.energy && snapshot.energy.updatedAt > state.energyUpdatedAt;
        const streakWins = snapshot.streak && snapshot.streak.updatedAt > state.streakUpdatedAt;
        set({
          completedLessonIds: [...completed],
          lastCompletedLessonId: latestLesson,
          lessonUpdatedAt,
          totalXp: Math.max(state.totalXp, snapshot.totalXp),
          energy: energyWins ? snapshot.energy!.state : state.energy,
          energyUpdatedAt: energyWins ? snapshot.energy!.updatedAt : state.energyUpdatedAt,
          streak: streakWins ? snapshot.streak!.state : state.streak,
          streakUpdatedAt: streakWins ? snapshot.streak!.updatedAt : state.streakUpdatedAt,
        });
      },

      reset: () => set({ ...freshProgressData() }),
    }),
    {
      name: PROGRESS_STORAGE_KEY,
      version: PROGRESS_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: reportHydrationFailure(PROGRESS_STORAGE_KEY),
      // Persist DATA only; the engine state objects are plain serializable structs.
      partialize: (state): ProgressData => ({
        completedLessonIds: state.completedLessonIds,
        lastCompletedLessonId: state.lastCompletedLessonId,
        totalXp: state.totalXp,
        gems: state.gems,
        energy: state.energy,
        streak: state.streak,
        lessonUpdatedAt: state.lessonUpdatedAt,
        energyUpdatedAt: state.energyUpdatedAt,
        streakUpdatedAt: state.streakUpdatedAt,
      }),
      migrate: (persistedState) => {
        const state = persistedState as Partial<ProgressData>;
        const fresh = freshProgressData();
        return {
          ...fresh,
          ...state,
          lessonUpdatedAt: state.lessonUpdatedAt ?? Object.fromEntries((state.completedLessonIds ?? []).map((id) => [id, 0])),
          energyUpdatedAt: state.energyUpdatedAt ?? 0,
          streakUpdatedAt: state.streakUpdatedAt ?? 0,
        } as ProgressState;
      },
    },
  ),
);
