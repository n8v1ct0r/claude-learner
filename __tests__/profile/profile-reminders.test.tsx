// __tests__/profile/profile-reminders.test.tsx — the Profile "Gentle reminders" control.
//
// FT-11: answering "Not now" at the first-lesson prompt (or an earlier denial the learner can still
// change) must not permanently disable "Enable reminders"; the control follows the real permission.
// V-features-4: after five quiet days reminders rest, and 14 days later Profile offers them back.

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, Linking } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return { SafeAreaView: rn.View };
});

jest.mock('@/db/content-provider', () => ({
  useContentDb: () => ({ listCourses: () => [], getCourse: () => undefined }),
}));

type Permission = 'granted' | 'ask' | 'blocked' | 'unavailable';
let mockPermission: Permission = 'ask';
let mockPendingRead: Promise<Permission> | null = null; // a permission read that has not answered yet
const mockEnable = jest.fn(async (): Promise<Permission> => 'granted');
const mockTurnBackOn = jest.fn(async (): Promise<Permission> => 'granted');
jest.mock('@/services/local-notifications', () => ({
  readReminderPermission: jest.fn(async () => mockPendingRead ?? mockPermission),
  enableLocalReminders: () => mockEnable(),
  turnRemindersBackOn: () => mockTurnBackOn(),
}));

import ProfileScreen from '../../app/(tabs)/profile';
import { DAY_MS } from '@/engine/time';
import { useNotificationStore } from '@/state/notifications';
import { useSettingsStore } from '@/state/settings';

/** A rejected promise that records whether anything down its chain handles the rejection. */
function trackedRejection(error: Error): { create: () => Promise<never>; handled: () => boolean } {
  let handled = false;
  class Tracked<T> extends Promise<T> {
    then<R1 = T, R2 = never>(
      onFulfilled?: ((value: T) => R1 | PromiseLike<R1>) | null,
      onRejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
    ): Promise<R1 | R2> {
      if (onRejected) handled = true;
      return super.then(onFulfilled, onRejected);
    }
  }
  return { create: () => Tracked.reject(error) as Promise<never>, handled: () => handled };
}

beforeEach(() => {
  mockPermission = 'ask';
  mockPendingRead = null;
  mockEnable.mockClear();
  mockTurnBackOn.mockClear();
  useSettingsStore.getState().reset();
  useNotificationStore.getState().reset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Profile reminders control', () => {
  it('keeps "Enable reminders" available after "Not now" (FT-11)', async () => {
    useSettingsStore.getState().setNotificationsPrimed(true); // the ceremony's "Not now"
    await render(<ProfileScreen />);

    const enable = await screen.findByRole('button', { name: 'Enable reminders' });
    expect(enable.props.accessibilityState).toMatchObject({ disabled: false });
    await fireEvent.press(enable);

    expect(mockEnable).toHaveBeenCalledTimes(1);
    const on = await screen.findByRole('button', { name: 'Reminders on' });
    expect(on.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('shows the real permission when enabling fails, and handles the rejection', async () => {
    useSettingsStore.getState().setNotificationsPrimed(true);
    const failure = trackedRejection(new Error('an OS call failed'));
    mockEnable.mockImplementationOnce(failure.create);
    await render(<ProfileScreen />);
    const enable = await screen.findByRole('button', { name: 'Enable reminders' });

    mockPermission = 'granted'; // the learner allowed reminders; a later OS call is what failed
    await fireEvent.press(enable);

    expect(await screen.findByRole('button', { name: 'Reminders on' })).toBeTruthy();
    expect(failure.handled()).toBe(true);
  });

  it('shows reminders as on when permission is granted and they are scheduled', async () => {
    mockPermission = 'granted';
    useSettingsStore.getState().setNotificationsPrimed(true);
    await render(<ProfileScreen />);
    expect(await screen.findByRole('button', { name: 'Reminders on' })).toBeTruthy();
  });

  it('points to iOS Settings when the system has turned notifications off', async () => {
    mockPermission = 'blocked';
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await render(<ProfileScreen />);

    expect(await screen.findByText(/off in iOS Settings/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Open Settings' }));
    expect(openSettings).toHaveBeenCalled();
  });

  it('picks up a change made in iOS Settings when the app returns to the foreground', async () => {
    mockPermission = 'blocked';
    useSettingsStore.getState().setNotificationsPrimed(true);
    await render(<ProfileScreen />);
    expect(await screen.findByRole('button', { name: 'Open Settings' })).toBeTruthy();

    mockPermission = 'granted'; // turned on in Settings, then back to the app
    const listeners = (AppState.addEventListener as unknown as jest.Mock).mock.calls
      .filter(([event]) => event === 'change')
      .map(([, listener]) => listener as (status: string) => void);
    await act(async () => {
      for (const listener of listeners) listener('active');
    });
    expect(await screen.findByRole('button', { name: 'Reminders on' })).toBeTruthy();
  });

  it('rests reminders after five quiet days without nagging before two weeks (V-features-4)', async () => {
    mockPermission = 'granted';
    useSettingsStore.getState().setNotificationsPrimed(true);
    useNotificationStore.setState((state) => ({ reminder: { ...state.reminder, mutedAt: Date.now() - 3 * DAY_MS } }));
    await render(<ProfileScreen />);

    expect(await screen.findByText(/resting after five quiet days/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Turn reminders back on' })).toBeNull();
  });

  it('offers reminders back 14 days after they paused', async () => {
    mockPermission = 'granted';
    useSettingsStore.getState().setNotificationsPrimed(true);
    useNotificationStore.setState((state) => ({ reminder: { ...state.reminder, mutedAt: Date.now() - 15 * DAY_MS } }));
    await render(<ProfileScreen />);

    expect(await screen.findByText(/Want gentle reminders again\?/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Turn reminders back on' }));
    expect(mockTurnBackOn).toHaveBeenCalledTimes(1);
  });

  it('offers reminders back when the 14 days pass while Profile stays open (live clock)', async () => {
    const opened = Date.UTC(2026, 8, 25, 14);
    jest.useFakeTimers({ now: opened });
    mockPermission = 'granted';
    useSettingsStore.getState().setNotificationsPrimed(true);
    // Muted 14 days ago, less 30 seconds: the offer is due half a minute after Profile opens.
    useNotificationStore.setState((state) => ({ reminder: { ...state.reminder, mutedAt: opened - 14 * DAY_MS + 30_000 } }));
    await render(<ProfileScreen />);
    expect(await screen.findByText(/resting after five quiet days/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Turn reminders back on' })).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(60_000); // the next minute tick
    });

    expect(await screen.findByText(/Want gentle reminders again\?/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Turn reminders back on' })).toBeTruthy();
  });

  it('keeps "Enable reminders" inert until the first permission read answers', async () => {
    let answer: (permission: Permission) => void = () => {};
    mockPendingRead = new Promise<Permission>((resolve) => {
      answer = resolve;
    });
    await render(<ProfileScreen />);

    const pending = screen.getByRole('button', { name: 'Enable reminders' });
    expect(pending.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(pending);
    expect(mockEnable).not.toHaveBeenCalled();

    await act(async () => {
      answer('ask');
      mockPendingRead = null;
    });
    const ready = await screen.findByRole('button', { name: 'Enable reminders' });
    expect(ready.props.accessibilityState).toMatchObject({ disabled: false });
  });
});
