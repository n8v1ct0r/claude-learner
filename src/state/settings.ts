import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { nextOnboardingStep, type OnboardingStep } from '@/features/onboarding/onboarding-flow';
import { reportHydrationFailure } from '@/state/hydration';
import { useOutboxStore } from '@/sync/outbox';

// PERSISTED user preferences. This store holds ONLY non-sensitive settings data — never any
// auth/session material (see src/state/README.md). supabase-js owns session persistence; the
// JWT-hygiene test in __tests__/state/persistence.test.ts enforces that this store never leaks
// a JWT-shaped string or an access_token/refresh_token/session field.

export type ReduceMotionOverride = 'system' | 'on' | 'off';

// v1 ships a single warm-dark theme (D17); the union keeps a future light theme additive.
export type ThemeName = 'dark';

export interface SettingsData {
  /** Daily study goal in minutes. Drives SRS presentation cap + daily-quest sizing. */
  dailyGoalMinutes: number;
  /** Onboarding exam date (ISO 8601) that feeds pacing; null until the user sets one. */
  examDate: string | null;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  /** 'system' honors the OS reduce-motion setting; 'on'/'off' are explicit user overrides. */
  reduceMotionOverride: ReduceMotionOverride;
  /** WCAG 2.2.1: converts timed rounds to untimed with identical XP (GC-10). */
  reduceTimePressure: boolean;
  /** Hides the user from the global weekly leaderboard (GC-07 opt-out). */
  leaderboardOptOut: boolean;
  leaderboardOptOutUpdatedAt: number;
  theme: ThemeName;
  /** True once the post-first-lesson notification permission priming has run (4.7 #6). */
  notificationsPrimed: boolean;
  /**
   * First-run onboarding cursor (4.7 #7). Persisted so onboarding is RESUMABLE across a cold kill:
   * a learner who quits after picking an exam date resumes on the daily-goal step, not the start.
   * 'complete' is terminal — the first-run gate never shows onboarding again once here.
   */
  onboardingStep: OnboardingStep;
}

export interface SettingsActions {
  setDailyGoalMinutes: (minutes: number) => void;
  setExamDate: (iso: string | null) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setReduceMotionOverride: (value: ReduceMotionOverride) => void;
  setReduceTimePressure: (enabled: boolean) => void;
  setLeaderboardOptOut: (optOut: boolean) => void;
  setNotificationsPrimed: (primed: boolean) => void;
  /** Jump the onboarding cursor to a specific step (used by "skip forward"). */
  setOnboardingStep: (step: OnboardingStep) => void;
  /** Advance one onboarding step (exam-date → daily-goal → complete). */
  advanceOnboarding: () => void;
  mergeRemoteLeaderboardPreference: (optOut: boolean, updatedAt: number) => void;
  /** Restore every preference to its shipped default (Settings screen "reset"). */
  reset: () => void;
}

export type SettingsState = SettingsData & SettingsActions;

export const SETTINGS_STORAGE_KEY = 'cca-quest:settings';
export const SETTINGS_VERSION = 3;

// ADHD-sane defaults: a low-friction 10-minute goal, no time pressure, and notifications left
// un-primed until the app has earned the prompt (value demonstrated first).
export const defaultSettings: SettingsData = {
  dailyGoalMinutes: 10,
  examDate: null,
  soundEnabled: true,
  hapticsEnabled: true,
  reduceMotionOverride: 'system',
  reduceTimePressure: false,
  leaderboardOptOut: false,
  leaderboardOptOutUpdatedAt: 0,
  theme: 'dark',
  notificationsPrimed: false,
  onboardingStep: 'exam-date',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setDailyGoalMinutes: (minutes) => set({ dailyGoalMinutes: minutes }),
      setExamDate: (iso) => set({ examDate: iso }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
      setReduceMotionOverride: (value) => set({ reduceMotionOverride: value }),
      setReduceTimePressure: (enabled) => set({ reduceTimePressure: enabled }),
      setLeaderboardOptOut: (optOut) => {
        const updatedAt = Date.now();
        set({ leaderboardOptOut: optOut, leaderboardOptOutUpdatedAt: updatedAt });
        useOutboxStore.getState().queueProfile({ leaderboardOptOut: optOut, updatedAt });
      },
      setNotificationsPrimed: (primed) => set({ notificationsPrimed: primed }),
      setOnboardingStep: (step) => set({ onboardingStep: step }),
      advanceOnboarding: () => set((state) => ({ onboardingStep: nextOnboardingStep(state.onboardingStep) })),
      mergeRemoteLeaderboardPreference: (optOut, updatedAt) => set((state) =>
        updatedAt > state.leaderboardOptOutUpdatedAt
          ? { leaderboardOptOut: optOut, leaderboardOptOutUpdatedAt: updatedAt }
          : {},
      ),
      reset: () => set({ ...defaultSettings }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: SETTINGS_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: reportHydrationFailure(SETTINGS_STORAGE_KEY),
      // Persist ONLY preference DATA. Action functions are excluded, and — by the rule in
      // src/state/README.md — no auth/session material is ever a member of this state, so the
      // persisted payload can never carry a token.
      partialize: (state): SettingsData => ({
        dailyGoalMinutes: state.dailyGoalMinutes,
        examDate: state.examDate,
        soundEnabled: state.soundEnabled,
        hapticsEnabled: state.hapticsEnabled,
        reduceMotionOverride: state.reduceMotionOverride,
        reduceTimePressure: state.reduceTimePressure,
        leaderboardOptOut: state.leaderboardOptOut,
        leaderboardOptOutUpdatedAt: state.leaderboardOptOutUpdatedAt,
        theme: state.theme,
        notificationsPrimed: state.notificationsPrimed,
        onboardingStep: state.onboardingStep,
      }),
      // Migrations. An older blob is defensively merged onto current defaults so a stale shape can
      // never drop a required field; per-version fixups run first so the persisted values (when
      // present) still win.
      migrate: (persistedState, fromVersion): SettingsState => {
        if (fromVersion !== SETTINGS_VERSION) {
          return {
            ...defaultSettings,
            // v3 added the onboarding cursor. Any pre-v3 blob predates the field, and having a blob
            // at all means this device has already used the app — treat it as onboarded rather than
            // bouncing a returning learner into first-run onboarding (the spread below still keeps
            // an explicit persisted cursor when one exists).
            onboardingStep: 'complete',
            ...(persistedState as Partial<SettingsData>),
          } as SettingsState;
        }
        return persistedState as SettingsState;
      },
    },
  ),
);
