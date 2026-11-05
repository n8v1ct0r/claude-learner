// First-run onboarding screen flow (app/onboarding/index.tsx). Drives the two-step flow end to end
// against the REAL settings store and asserts the completion deep-links into the first path lesson.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return { SafeAreaView: rn.View };
});

// useRouter().dismissTo/.replace/.push are single stable jest.fns (closed over in the factory), so the
// same references are returned on every call and are assertable below.
jest.mock('expo-router', () => {
  const dismissTo = jest.fn();
  const replace = jest.fn();
  const push = jest.fn();
  // The screen's native-stack navigation events, fired by hand in the tests (emit is test-only).
  const listeners = new Map();
  const navigation = {
    addListener: (type: string, listener: (payload: unknown) => void) => {
      const forType = listeners.get(type) ?? new Set();
      forType.add(listener);
      listeners.set(type, forType);
      return () => {
        forType.delete(listener);
      };
    },
    emit: (type: string, payload: unknown) =>
      listeners.get(type)?.forEach((listener: (payload: unknown) => void) => listener(payload)),
  };
  return { useRouter: () => ({ dismissTo, replace, push, back: jest.fn() }), useNavigation: () => navigation };
});

jest.mock('@/db/content-provider', () => ({
  useContentDbWhenReady: () => ({ reader: { getFirstLesson: () => ({ id: 'c1-u1-l1' }) }, ready: async () => ({}) }),
}));

import OnboardingScreen from '../../app/onboarding/index';
import { isOnboardingShown, resetOnboardingShownForTests } from '../../src/features/onboarding/onboarding-shown';
import { useSettingsStore } from '../../src/state/settings';

// Reach the stable router fns through the mocked module (not by calling useRouter() at module top
// level, which trips react-hooks/rules-of-hooks even though the mock is a plain function).
const expoRouterMock = jest.requireMock('expo-router') as {
  useRouter: () => { dismissTo: jest.Mock; replace: jest.Mock; push: jest.Mock };
  useNavigation: () => { emit: (type: string, event: unknown) => void };
};
const dismissToMock = expoRouterMock.useRouter().dismissTo;
const replaceMock = expoRouterMock.useRouter().replace;
const pushMock = expoRouterMock.useRouter().push;
const navigationMock = expoRouterMock.useNavigation();

beforeEach(() => {
  useSettingsStore.getState().reset();
  resetOnboardingShownForTests();
  dismissToMock.mockClear();
  replaceMock.mockClear();
  pushMock.mockClear();
});

describe('onboarding screen', () => {
  it('opens on the exam-date step for a fresh install', async () => {
    await render(<OnboardingScreen />);
    expect(screen.getByRole('header', { name: 'When is your exam?' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'About 1 month away' })).toBeTruthy();
    expect(screen.getByLabelText('Step 1 of 2')).toBeTruthy();
  });

  it('states the affiliation line on the first step, and only there', async () => {
    await render(<OnboardingScreen />);
    expect(screen.getByText('Independent project. Not affiliated with Anthropic.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Just exploring for now' }));
    expect(await screen.findByRole('header', { name: 'How much time feels good each day?' })).toBeTruthy();
    expect(screen.queryByText('Independent project. Not affiliated with Anthropic.')).toBeNull();
  });

  it('walks exam-date → daily-goal → first lesson, storing both choices', async () => {
    await render(<OnboardingScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'About 1 month away' }));
    // Cursor advanced and the exam date was stored (pacing on).
    expect(useSettingsStore.getState().onboardingStep).toBe('daily-goal');
    expect(useSettingsStore.getState().examDate).not.toBeNull();

    // The store subscription re-renders the screen onto step 2.
    expect(await screen.findByRole('header', { name: 'How much time feels good each day?' })).toBeTruthy();
    expect(screen.getByLabelText('Step 2 of 2')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: '15 minutes a day' }));
    expect(useSettingsStore.getState().dailyGoalMinutes).toBe(15);
    expect(useSettingsStore.getState().onboardingStep).toBe('complete');
    // Completion rebuilds a sane stack — home beneath, first lesson on top — so the ceremony's
    // router.back() after the very first lesson lands on the Path instead of an empty history, and a
    // deep-link cold open (tabs already underneath) never ends up with two Learn tabs.
    expect(dismissToMock).toHaveBeenCalledWith('/');
    expect(replaceMock).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/lesson/c1-u1-l1');
    // The now-complete cursor must not send this visit back to Learn on top of that exit.
    expect(dismissToMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  it('"just exploring" advances with a null exam date (pacing stays off)', async () => {
    await render(<OnboardingScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Just exploring for now' }));
    expect(useSettingsStore.getState().examDate).toBeNull();
    expect(useSettingsStore.getState().onboardingStep).toBe('daily-goal');
  });

  it('skip-forward never blocks: finishes onboarding and starts the first lesson', async () => {
    await render(<OnboardingScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Skip for now' }));
    expect(useSettingsStore.getState().onboardingStep).toBe('complete');
    expect(dismissToMock).toHaveBeenCalledWith('/');
    expect(replaceMock).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/lesson/c1-u1-l1');
    expect(dismissToMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  it('sends a learner who already finished onboarding back to the Learn tab instead of replaying a step (deep link)', async () => {
    // claudelearner://onboarding after onboarding is complete.
    useSettingsStore.getState().setDailyGoalMinutes(15);
    useSettingsStore.getState().setOnboardingStep('complete');
    await render(<OnboardingScreen />);

    // Back to the Learn tab already underneath (never a second Learn tab), and no first lesson reopened.
    expect(dismissToMock).toHaveBeenCalledWith('/');
    expect(dismissToMock).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
    // No "STEP 1 OF 2" daily-goal step without a way back.
    expect(screen.queryByText(/^STEP \d OF \d$/)).toBeNull();
    expect(screen.queryByRole('button', { name: /minutes a day$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Skip for now' })).toBeNull();
    // Nothing is rewritten.
    expect(useSettingsStore.getState().onboardingStep).toBe('complete');
    expect(useSettingsStore.getState().dailyGoalMinutes).toBe(15);
  });

  it('is resumable: rehydrating onto daily-goal renders step 2 directly', async () => {
    useSettingsStore.getState().setOnboardingStep('daily-goal');
    await render(<OnboardingScreen />);
    expect(screen.getByRole('header', { name: 'How much time feels good each day?' })).toBeTruthy();
  });

  it('reports once the native stack has finished showing it, not on layout, so the gate can lift the splash (IB-5)', async () => {
    await render(<OnboardingScreen />);
    expect(isOnboardingShown()).toBe(false);

    // Laid out is not enough: Fabric can deliver onLayout before the native swap from the Learn tab lands.
    const root = screen.root;
    if (!root) throw new Error('expected a rendered onboarding screen');
    await fireEvent(root, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 844 } } });
    expect(isOnboardingShown()).toBe(false);

    // A closing transition is this screen leaving, not arriving.
    await act(() => navigationMock.emit('transitionEnd', { data: { closing: true } }));
    expect(isOnboardingShown()).toBe(false);

    // transitionEnd (closing: false) comes from the screen's viewDidAppear: the outgoing screen is gone.
    await act(() => navigationMock.emit('transitionEnd', { data: { closing: false } }));
    expect(isOnboardingShown()).toBe(true);
  });
});
