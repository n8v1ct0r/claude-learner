// __tests__/onboarding/splash-gate.test.tsx  (IB-5, V-a11y-perf-2)
//
// The native splash stays up until the first real screen is settled, and never longer than that:
//   • a fresh install is redirected into onboarding UNDER the splash, which lifts only once the native
//     stack has finished showing the onboarding SCREEN, one frame later (no Learn-tab flash). The route
//     alone is not enough: on iOS the native swap away from the Learn tab can still be in flight when
//     the JS navigation state already reports /onboarding;
//   • a returning learner's splash lifts as soon as every persisted store has rehydrated and the
//     navigator is mounted;
//   • nothing lifts it early while any persisted store is still rehydrating.
// The gate only mounts inside ContentProvider (after fonts load and the content DB opens), which is
// what makes "content ready" part of the same contract.

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/components/splash', () => ({
  hideAppSplash: jest.fn(),
  forceHideAppSplash: jest.fn(),
}));

const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn() };
let mockSegments: string[] = ['(tabs)'];
let mockNavKey: string | undefined = 'root';

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useSegments: () => mockSegments,
  useRootNavigationState: () => (mockNavKey ? { key: mockNavKey } : undefined),
}));

import { hideAppSplash } from '@/components/splash';
import { isFirstScreenSettled, OnboardingGate } from '@/features/onboarding/OnboardingGate';
import { reportOnboardingShown, resetOnboardingShownForTests } from '@/features/onboarding/onboarding-shown';
import { useExamAttemptStore } from '@/state/exam-attempt';
import { useGameStore } from '@/state/game';
import { useLessonSessionStore } from '@/state/lesson-session';
import { useNotificationStore } from '@/state/notifications';
import { PROGRESS_STORAGE_KEY, useProgressStore } from '@/state/progress';
import { SETTINGS_STORAGE_KEY, useSettingsStore } from '@/state/settings';
import { useSrsStore } from '@/state/srs';

const hideSplash = jest.mocked(hideAppSplash);

/** Let the gate's one-frame delay (requestAnimationFrame) run. */
const nextFrame = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

beforeEach(async () => {
  hideSplash.mockClear();
  mockRouter.replace.mockClear();
  mockSegments = ['(tabs)'];
  mockNavKey = 'root';
  resetOnboardingShownForTests();
  await Promise.all(
    [useSettingsStore, useProgressStore, useLessonSessionStore, useGameStore, useSrsStore, useExamAttemptStore, useNotificationStore].map(
      (store) => store.persist.rehydrate(),
    ),
  );
  useSettingsStore.getState().reset();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('isFirstScreenSettled', () => {
  const base = { storesHydrated: true, navReady: true, step: 'complete' as const, inOnboarding: false, onboardingShown: false };

  it('waits for hydration and the navigator', () => {
    expect(isFirstScreenSettled(base)).toBe(true);
    expect(isFirstScreenSettled({ ...base, storesHydrated: false })).toBe(false);
    expect(isFirstScreenSettled({ ...base, navReady: false })).toBe(false);
  });

  it('keeps a fresh install covered until the onboarding screen itself has been shown', () => {
    expect(isFirstScreenSettled({ ...base, step: 'exam-date' })).toBe(false);
    expect(isFirstScreenSettled({ ...base, step: 'daily-goal' })).toBe(false);
    // On the route but not yet shown: the native swap away from the Learn tab may still be running.
    expect(isFirstScreenSettled({ ...base, step: 'exam-date', inOnboarding: true })).toBe(false);
    expect(isFirstScreenSettled({ ...base, step: 'exam-date', inOnboarding: true, onboardingShown: true })).toBe(true);
    // A shown signal never stands in for the route.
    expect(isFirstScreenSettled({ ...base, step: 'exam-date', onboardingShown: true })).toBe(false);
  });

  it('keeps a finished learner who opened the onboarding route covered until they are back on Learn', () => {
    // claudelearner://onboarding after onboarding is complete: that screen hands straight back to Learn.
    expect(isFirstScreenSettled({ ...base, inOnboarding: true })).toBe(false);
    expect(isFirstScreenSettled({ ...base, inOnboarding: true, onboardingShown: true })).toBe(false);
    expect(isFirstScreenSettled({ ...base, inOnboarding: false, onboardingShown: true })).toBe(true);
  });
});

describe('OnboardingGate and the splash', () => {
  it('redirects a fresh install under the splash', async () => {
    await render(<OnboardingGate />);
    await nextFrame();
    expect(mockRouter.replace).toHaveBeenCalledWith('/onboarding');
    expect(hideSplash).not.toHaveBeenCalled();
  });

  it('keeps the splash over the onboarding route until the onboarding screen has been shown, then lifts it on the next frame', async () => {
    // Hold animation frames so "the next frame" is observable.
    const frames = new Map<number, (time: number) => void>();
    let nextId = 0;
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation((callback: (time: number) => void) => {
      nextId += 1;
      frames.set(nextId, callback);
      return nextId;
    });
    jest.spyOn(global, 'cancelAnimationFrame').mockImplementation((id: number | null | undefined) => {
      if (typeof id === 'number') frames.delete(id);
    });
    const runFrames = () =>
      act(() => {
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach((callback) => callback(Date.now()));
      });

    const view = await render(<OnboardingGate />);
    expect(mockRouter.replace).toHaveBeenCalledWith('/onboarding');

    // The JS navigation state already reports /onboarding, but the native stack has not shown it yet.
    mockSegments = ['onboarding'];
    await view.rerender(<OnboardingGate />);
    await runFrames();
    expect(hideSplash).not.toHaveBeenCalled();

    // The onboarding screen reports it has been shown: the lift waits one more frame.
    await act(() => reportOnboardingShown());
    expect(hideSplash).not.toHaveBeenCalled();
    expect(frames.size).toBe(1);
    await runFrames();
    expect(hideSplash).toHaveBeenCalledTimes(1);
  });

  it('keeps the splash while a finished learner who deep-linked into onboarding is sent back to Learn', async () => {
    useSettingsStore.getState().setOnboardingStep('complete');
    mockSegments = ['onboarding'];
    reportOnboardingShown();
    const view = await render(<OnboardingGate />);
    await nextFrame();
    // The gate never redirects a finished learner; the onboarding screen owns that exit.
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(hideSplash).not.toHaveBeenCalled();

    mockSegments = ['(tabs)'];
    await view.rerender(<OnboardingGate />);
    await nextFrame();
    expect(hideSplash).toHaveBeenCalledTimes(1);
  });

  it('lifts the splash straight away for a returning learner', async () => {
    useSettingsStore.getState().setOnboardingStep('complete');
    await render(<OnboardingGate />);
    await nextFrame();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(hideSplash).toHaveBeenCalledTimes(1);
  });

  it('keeps the splash while any persisted store is still rehydrating', async () => {
    useSettingsStore.getState().setOnboardingStep('complete');
    const hydrating = jest.spyOn(useProgressStore.persist, 'hasHydrated').mockReturnValue(false);
    await render(<OnboardingGate />);
    await nextFrame();
    expect(hideSplash).not.toHaveBeenCalled();
    hydrating.mockRestore();
  });

  it('lifts the splash for a returning learner whose saved progress cannot be read', async () => {
    useSettingsStore.getState().setOnboardingStep('complete');
    await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, '{not json');
    await useProgressStore.persist.rehydrate();
    // zustand v5 never marks a failed load as hydrated; the gate must still count it as settled.
    expect(useProgressStore.persist.hasHydrated()).toBe(false);
    try {
      await render(<OnboardingGate />);
      await nextFrame();
      expect(hideSplash).toHaveBeenCalledTimes(1);
    } finally {
      await AsyncStorage.removeItem(PROGRESS_STORAGE_KEY);
      await useProgressStore.persist.rehydrate();
    }
  });

  it('still sends a fresh install with unreadable saved settings to onboarding', async () => {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, '{not json');
    await useSettingsStore.persist.rehydrate();
    expect(useSettingsStore.persist.hasHydrated()).toBe(false);
    try {
      await render(<OnboardingGate />);
      await nextFrame();
      expect(mockRouter.replace).toHaveBeenCalledWith('/onboarding');
    } finally {
      await AsyncStorage.removeItem(SETTINGS_STORAGE_KEY);
      await useSettingsStore.persist.rehydrate();
    }
  });

  it('keeps the splash until the navigator is mounted', async () => {
    useSettingsStore.getState().setOnboardingStep('complete');
    mockNavKey = undefined;
    const view = await render(<OnboardingGate />);
    await nextFrame();
    expect(hideSplash).not.toHaveBeenCalled();

    mockNavKey = 'root';
    await view.rerender(<OnboardingGate />);
    await nextFrame();
    expect(hideSplash).toHaveBeenCalledTimes(1);
  });
});
