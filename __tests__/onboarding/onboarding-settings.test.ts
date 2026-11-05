// Onboarding cursor persistence + resumability (src/state/settings.ts). The persisted `onboardingStep`
// is what makes onboarding survive a cold kill: a learner who quits after the exam-date step resumes
// on daily-goal, not the start.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => {
  const backing: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: (key: string): Promise<string | null> =>
        Promise.resolve(key in backing ? backing[key] : null),
      setItem: (key: string, value: string): Promise<void> => {
        backing[key] = value;
        return Promise.resolve();
      },
      removeItem: (key: string): Promise<void> => {
        delete backing[key];
        return Promise.resolve();
      },
      getAllKeys: (): Promise<string[]> => Promise.resolve(Object.keys(backing)),
      clear: (): Promise<void> => {
        for (const key of Object.keys(backing)) delete backing[key];
        return Promise.resolve();
      },
    },
  };
});

import { SETTINGS_STORAGE_KEY, SETTINGS_VERSION, defaultSettings, useSettingsStore } from '../../src/state/settings';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  useSettingsStore.getState().reset();
  await AsyncStorage.clear();
});

describe('onboarding cursor', () => {
  it('ships un-onboarded so the first-run gate fires on a fresh install', () => {
    expect(defaultSettings.onboardingStep).toBe('exam-date');
    expect(useSettingsStore.getState().onboardingStep).toBe('exam-date');
  });

  it('advanceOnboarding walks exam-date → daily-goal → complete', () => {
    const settings = useSettingsStore.getState();
    settings.advanceOnboarding();
    expect(useSettingsStore.getState().onboardingStep).toBe('daily-goal');
    useSettingsStore.getState().advanceOnboarding();
    expect(useSettingsStore.getState().onboardingStep).toBe('complete');
    // Terminal — advancing past the end is a no-op.
    useSettingsStore.getState().advanceOnboarding();
    expect(useSettingsStore.getState().onboardingStep).toBe('complete');
  });

  it('setOnboardingStep supports skip-forward straight to complete', () => {
    useSettingsStore.getState().setOnboardingStep('complete');
    expect(useSettingsStore.getState().onboardingStep).toBe('complete');
  });

  it('persists the cursor and RESUMES mid-onboarding after a cold start', async () => {
    // Learner picks an exam date, then quits mid-onboarding.
    useSettingsStore.getState().setExamDate('2026-08-01T00:00:00.000Z');
    useSettingsStore.getState().advanceOnboarding(); // now on daily-goal
    await flush();

    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as { state: Record<string, unknown>; version: number };
    expect(parsed.version).toBe(SETTINGS_VERSION);
    expect(parsed.state.onboardingStep).toBe('daily-goal');

    // Cold start reading that prior blob rehydrates onto the daily-goal step, not the start.
    await useSettingsStore.persist.rehydrate();
    expect(useSettingsStore.getState().onboardingStep).toBe('daily-goal');
    expect(useSettingsStore.getState().examDate).toBe('2026-08-01T00:00:00.000Z');
  });

  it('reset returns the cursor to the un-onboarded default', () => {
    useSettingsStore.getState().setOnboardingStep('complete');
    useSettingsStore.getState().reset();
    expect(useSettingsStore.getState().onboardingStep).toBe('exam-date');
  });

  it('migrates a pre-v3 blob (existing install, no cursor) to complete — never re-onboards', async () => {
    // A v2 blob has no onboardingStep; its existence means the device already used the app.
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ state: { dailyGoalMinutes: 15, soundEnabled: false }, version: 2 }),
    );
    await useSettingsStore.persist.rehydrate();
    expect(useSettingsStore.getState().onboardingStep).toBe('complete');
    // The rest of the old blob still wins over defaults.
    expect(useSettingsStore.getState().dailyGoalMinutes).toBe(15);
    expect(useSettingsStore.getState().soundEnabled).toBe(false);
  });

  it('migration preserves an explicit persisted cursor from an old blob', async () => {
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ state: { onboardingStep: 'daily-goal' }, version: 2 }),
    );
    await useSettingsStore.persist.rehydrate();
    expect(useSettingsStore.getState().onboardingStep).toBe('daily-goal');
  });
});
