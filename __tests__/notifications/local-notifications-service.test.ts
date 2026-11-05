// __tests__/notifications/local-notifications-service.test.ts — the reminder service end to end
// against a mocked expo-notifications (FT-7, V-features-4, FT-11, FT-13).
//
// Replays what production does: enable reminders, then later app opens. Reminders are scheduled at the
// learner's usual LOCAL study hour on this device; five ignored reminders mute scheduling until the
// learner opts back in; "Not now" never blocks enabling later; and an app open settles the streak —
// only after the persisted stores have loaded, so nothing overwrites saved progress.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type MockPermission = { granted: boolean; status: 'granted' | 'denied' | 'undetermined'; canAskAgain: boolean };
let mockPermission: MockPermission = { granted: true, status: 'granted', canAskAgain: true };
let mockGrantOnRequest = true;
const mockScheduled: { date: Date; kind: string }[] = [];
// Opt-in OS behaviors for the failure tests (all off by default):
let mockDuringPrompt: (() => void) | null = null; // runs while the permission prompt is up
let mockRejectPastTriggers = false; // iOS: a DATE trigger must still be in the future when it arrives
let mockRefuseCall: number | null = null; // refuse the Nth scheduleNotificationAsync call of a pass
let mockPermissionReadFails = false;
let mockScheduleCalls = 0;
let mockSlowOs = false; // each schedule call takes a turn of the event loop, like a real bridge call

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getPermissionsAsync: jest.fn(async () => {
    if (mockPermissionReadFails) throw new Error('permission read failed');
    return mockPermission;
  }),
  requestPermissionsAsync: jest.fn(async () => {
    mockDuringPrompt?.();
    if (mockPermission.status === 'undetermined') {
      mockPermission = mockGrantOnRequest
        ? { granted: true, status: 'granted', canAskAgain: true }
        : { granted: false, status: 'denied', canAskAgain: false };
    }
    return mockPermission;
  }),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {
    mockScheduled.length = 0;
    mockScheduleCalls = 0;
  }),
  scheduleNotificationAsync: jest.fn(async (request: { content: { data: { kind: string } }; trigger: { date: Date } }) => {
    mockScheduleCalls += 1;
    if (mockSlowOs) await new Promise((resolve) => setTimeout(resolve, 0));
    if (mockRefuseCall === mockScheduleCalls) throw new Error('the OS refused this reminder');
    if (mockRejectPastTriggers && request.trigger.date.getTime() - Date.now() <= 0) {
      throw new Error('time interval must be greater than 0'); // UNTimeIntervalNotificationTrigger
    }
    mockScheduled.push({ date: request.trigger.date, kind: request.content.data.kind });
    return `reminder-${mockScheduled.length}`;
  }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

import { createStreakState, reduceStreak } from '@/engine/streak';
import { DAY_MS, localDateInTz, localHourInTz, MINUTE_MS, zonedTimeToEpoch } from '@/engine/time';
import {
  enableLocalReminders,
  readReminderPermission,
  registerAppOpen,
  turnRemindersBackOn,
} from '@/services/local-notifications';
import { NOTIFICATION_STORAGE_KEY, useNotificationStore } from '@/state/notifications';
import { PROGRESS_STORAGE_KEY, PROGRESS_VERSION, resolveTimezone, useProgressStore } from '@/state/progress';
import { SETTINGS_STORAGE_KEY, useSettingsStore } from '@/state/settings';
import { OUTBOX_STORAGE_KEY, useOutboxStore } from '@/sync/outbox';

const tz = resolveTimezone();
const today = localDateInTz(Date.now(), tz);
const at = (dayOffset: number, hour: number, minute = 0): number =>
  zonedTimeToEpoch(localDateInTz(zonedTimeToEpoch(today, 12, tz) + dayOffset * DAY_MS, tz), hour, tz) + minute * MINUTE_MS;

beforeEach(async () => {
  mockPermission = { granted: true, status: 'granted', canAskAgain: true };
  mockGrantOnRequest = true;
  mockScheduled.length = 0;
  mockDuringPrompt = null;
  mockRejectPastTriggers = false;
  mockRefuseCall = null;
  mockPermissionReadFails = false;
  mockScheduleCalls = 0;
  mockSlowOs = false;
  await AsyncStorage.clear();
  useNotificationStore.getState().reset();
  useProgressStore.getState().reset();
  useSettingsStore.getState().reset();
});

describe('scheduling in local time (FT-7, V-features-4)', () => {
  it('schedules at the learner’s usual local study hour, on the local calendar', async () => {
    // Recent lessons finished around 08:20 local time.
    useProgressStore.setState({ lessonUpdatedAt: { a: at(-3, 8, 20), b: at(-2, 8, 5), c: at(-1, 8, 40) } });
    useSettingsStore.getState().setNotificationsPrimed(true);

    await registerAppOpen(at(0, 6));

    expect(mockScheduled).toHaveLength(5);
    expect(mockScheduled.map((item) => localHourInTz(item.date.getTime(), tz))).toEqual([8, 8, 8, 8, 8]);
    expect(mockScheduled[0].date.getTime()).toBe(at(0, 8));
    expect(useNotificationStore.getState().scheduledFireAts).toEqual(mockScheduled.map((item) => item.date.getTime()));
  });

  it('still schedules at the usual local hour when Intl has no formatToParts (Hermes on iOS)', async () => {
    const proto = Intl.DateTimeFormat.prototype as { formatToParts?: unknown };
    const realFormatToParts = proto.formatToParts;
    useProgressStore.setState({ lessonUpdatedAt: { a: at(-3, 8, 20), b: at(-2, 8, 5), c: at(-1, 8, 40) } });
    useSettingsStore.getState().setNotificationsPrimed(true);
    const firstReminder = at(0, 8);

    Object.defineProperty(proto, 'formatToParts', { value: undefined, configurable: true, writable: true });
    try {
      await registerAppOpen(at(0, 6));
    } finally {
      Object.defineProperty(proto, 'formatToParts', { value: realFormatToParts, configurable: true, writable: true });
    }

    expect(mockScheduled).toHaveLength(5);
    expect(mockScheduled.map((item) => item.date.getHours())).toEqual([8, 8, 8, 8, 8]); // the device clock
    expect(mockScheduled[0].date.getTime()).toBe(firstReminder);
  });
});

describe('the five-ignore mute and the return offer (V-features-4)', () => {
  it('mutes after five unanswered reminders, keeps them off on later opens, and resumes on opt-in', async () => {
    await registerAppOpen(at(0, 9));
    expect(await enableLocalReminders(at(0, 9))).toBe('granted');
    expect(mockScheduled).toHaveLength(5);

    // Six days without opening the app: all five reminders went unanswered.
    await registerAppOpen(at(6, 12));
    expect(useNotificationStore.getState().reminder.mutedAt).not.toBeNull();
    expect(mockScheduled).toEqual([]);

    await registerAppOpen(at(7, 12));
    expect(mockScheduled).toEqual([]);

    await turnRemindersBackOn(at(21, 12));
    expect(useNotificationStore.getState().reminder.mutedAt).toBeNull();
    expect(mockScheduled).toHaveLength(5);
  });

  it('keeps reminders going when the learner comes back in between', async () => {
    await enableLocalReminders(at(0, 9));
    await registerAppOpen(at(2, 19)); // opened soon after the third reminder
    expect(useNotificationStore.getState().reminder.mutedAt).toBeNull();
    expect(mockScheduled).toHaveLength(5);
  });
});

describe('warm resumes are sessions too (V-features-4)', () => {
  const flushSessions = async (): Promise<void> => {
    for (let i = 0; i < 10; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  };

  it('does not mute a learner who answers reminders by resuming the app', async () => {
    await registerAppOpen(at(0, 9)); // the cold start also starts watching the foreground
    await enableLocalReminders(at(0, 9));
    const watch = (AppState.addEventListener as unknown as jest.Mock).mock.calls.find(([event]) => event === 'change');
    const onForeground = watch?.[1] as ((status: string) => void) | undefined;
    expect(onForeground).toBeDefined();

    // Each evening the learner resumes the suspended app an hour after the reminder.
    const clock = jest.spyOn(Date, 'now');
    for (let day = 1; day <= 4; day += 1) {
      clock.mockReturnValue(at(day, 19));
      onForeground?.('active');
      await flushSessions();
    }
    clock.mockRestore();

    await registerAppOpen(at(6, 12));
    expect(useNotificationStore.getState().reminder.mutedAt).toBeNull();
    expect(mockScheduled).toHaveLength(5);
  });
});

describe('"Not now" never blocks turning reminders on later (FT-11)', () => {
  it('asks for permission and schedules when the learner enables later', async () => {
    mockPermission = { granted: false, status: 'undetermined', canAskAgain: true };
    useSettingsStore.getState().setNotificationsPrimed(true); // the ceremony's "Not now"
    expect(await readReminderPermission()).toBe('ask');

    expect(await enableLocalReminders(at(1, 9))).toBe('granted');
    expect(mockScheduled).toHaveLength(5);
    expect(await readReminderPermission()).toBe('granted');
  });

  it('reports a system-level denial as blocked so the Profile can point to Settings', async () => {
    mockPermission = { granted: false, status: 'undetermined', canAskAgain: true };
    mockGrantOnRequest = false;
    expect(await enableLocalReminders(at(1, 9))).toBe('blocked');
    expect(await readReminderPermission()).toBe('blocked');
    expect(mockScheduled).toEqual([]);
  });
});

describe('app open settles the streak after the stores load (FT-13)', () => {
  it('waits for saved progress to load, then settles missed days on top of it', async () => {
    let streak = createStreakState();
    for (let back = 19; back >= 13; back -= 1) {
      streak = reduceStreak(streak, { type: 'lessonCompleted' }, localDateInTz(at(0, 12) - back * DAY_MS, tz));
    }
    const savedStreakAt = at(-13, 20);
    await AsyncStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: PROGRESS_VERSION,
        state: { ...useProgressStore.getState(), completedLessonIds: ['x', 'y'], streak, streakUpdatedAt: savedStreakAt },
      }),
    );
    // A cold start: the saved blob is still loading when the app-open hook runs.
    const loading = useProgressStore.persist.rehydrate();
    await registerAppOpen(at(0, 12));
    await loading;

    const progress = useProgressStore.getState();
    expect(progress.completedLessonIds).toEqual(['x', 'y']);
    expect(progress.streak.current).toBe(0);
    expect(progress.streak.longest).toBe(7);
    // The settle is derived state: it keeps the saved timestamp (never a newer LWW write).
    expect(progress.streakUpdatedAt).toBe(savedStreakAt);
    expect(mockScheduled).toEqual([]); // reminders were never enabled
  });
});

describe('the clock moves on while iOS asks for permission, and the OS can refuse a reminder', () => {
  it('skips a reminder time that passed while the prompt was up and still schedules five', async () => {
    // The first lesson finished at 06:30: hour 6 is quiet, so the first reminder would be today 07:00.
    useProgressStore.setState({ lessonUpdatedAt: { a: at(0, 6, 30) } });
    mockPermission = { granted: false, status: 'undetermined', canAskAgain: true };
    mockRejectPastTriggers = true;
    const tapAt = at(0, 7) - 20_000; // 06:59:40: "Enable reminders"
    const answeredAt = at(0, 7) + 5_000; // 07:00:05: the learner answers the iOS prompt
    const clock = jest.spyOn(Date, 'now').mockReturnValue(tapAt);
    mockDuringPrompt = () => clock.mockReturnValue(answeredAt);

    try {
      await expect(enableLocalReminders(tapAt)).resolves.toBe('granted');
    } finally {
      clock.mockRestore();
    }

    expect(mockScheduled).toHaveLength(5);
    expect(mockScheduled.every((item) => item.date.getTime() > answeredAt)).toBe(true);
    expect(mockScheduled[0].date.getTime()).toBe(at(1, 20)); // today's 07:00 had passed: tomorrow evening leads
    expect(useNotificationStore.getState().scheduledFireAts).toEqual(mockScheduled.map((item) => item.date.getTime()));
  });

  it('keeps the other reminders, and books only those, when the OS refuses one', async () => {
    mockRefuseCall = 2;
    await expect(enableLocalReminders(at(0, 9))).resolves.toBe('granted');

    expect(mockScheduled).toHaveLength(4);
    const bookkeeping = useNotificationStore.getState();
    expect(bookkeeping.scheduledFireAts).toEqual(mockScheduled.map((item) => item.date.getTime()));
    expect(bookkeeping.scheduledIds).toEqual(['reminder-1', 'reminder-2', 'reminder-3', 'reminder-4']);
  });

  it('an app open whose OS calls fail settles quietly, and the next open schedules', async () => {
    useSettingsStore.getState().setNotificationsPrimed(true);
    mockPermissionReadFails = true;
    await expect(registerAppOpen(at(0, 9))).resolves.toBeUndefined();
    expect(mockScheduled).toEqual([]);

    mockPermissionReadFails = false;
    await registerAppOpen(at(0, 10));
    expect(mockScheduled).toHaveLength(5);
  });
});

describe('app open after a saved store fails to load, or while the outbox is still loading', () => {
  const flush = async (): Promise<void> => {
    for (let i = 0; i < 10; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  };

  it('a corrupt saved blob never stalls the session: it still settles and schedules', async () => {
    useSettingsStore.getState().setNotificationsPrimed(true);
    await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, '{not json');
    void useProgressStore.persist.rehydrate(); // a cold start whose load throws (zustand signals no finish)
    await flush();
    try {
      expect(useProgressStore.persist.hasHydrated()).toBe(false);

      const outcome = await Promise.race([
        registerAppOpen(at(0, 9)).then(() => 'finished'),
        new Promise((resolve) => setTimeout(() => resolve('still waiting after 1 s'), 1_000)),
      ]);

      expect(outcome).toBe('finished');
      expect(useNotificationStore.getState().reminder.lastAppOpenAt).toBe(at(0, 9));
      expect(mockScheduled).toHaveLength(5);
    } finally {
      // Leave the store loaded for later tests.
      await AsyncStorage.removeItem(PROGRESS_STORAGE_KEY);
      await useProgressStore.persist.rehydrate();
      await flush();
    }
    expect(useProgressStore.persist.hasHydrated()).toBe(true);
  });

  it.each([
    ['progress', PROGRESS_STORAGE_KEY, () => useProgressStore.persist],
    ['reminder bookkeeping', NOTIFICATION_STORAGE_KEY, () => useNotificationStore.persist],
    ['settings', SETTINGS_STORAGE_KEY, () => useSettingsStore.persist],
    ['sync outbox', OUTBOX_STORAGE_KEY, () => useOutboxStore.persist],
  ])('a corrupt %s blob never stalls the session', async (_label, key, persistApi) => {
    await AsyncStorage.setItem(key, '{not json');
    void persistApi().rehydrate();
    await flush();
    try {
      expect(persistApi().hasHydrated()).toBe(false);
      const outcome = await Promise.race([
        registerAppOpen(at(0, 9)).then(() => 'finished'),
        new Promise((resolve) => setTimeout(() => resolve('still waiting after 1 s'), 1_000)),
      ]);
      expect(outcome).toBe('finished');
      expect(useNotificationStore.getState().reminder.lastAppOpenAt).toBe(at(0, 9));
    } finally {
      await AsyncStorage.removeItem(key);
      await persistApi().rehydrate();
      await flush();
    }
    expect(persistApi().hasHydrated()).toBe(true);
  });

  it('waits for the sync outbox to finish loading before the session writes anything', async () => {
    let release: () => void = () => {};
    const outboxLoaded = new Promise<void>((resolve) => {
      release = resolve;
    });
    // The outbox's saved blob takes a while to read (its load is the next storage read).
    (AsyncStorage.getItem as unknown as jest.Mock<(key: string) => Promise<string | null>>).mockImplementationOnce(async () => {
      await outboxLoaded;
      return null;
    });
    const loading = useOutboxStore.persist.rehydrate();
    expect(useOutboxStore.persist.hasHydrated()).toBe(false);
    let done = false;
    const session = registerAppOpen(at(0, 9)).then(() => {
      done = true;
    });
    await flush();
    expect(done).toBe(false);
    expect(useNotificationStore.getState().reminder.lastAppOpenAt).toBeNull(); // nothing written yet

    release();
    await loading;
    await session;
    expect(useNotificationStore.getState().reminder.lastAppOpenAt).toBe(at(0, 9));
    expect(OUTBOX_STORAGE_KEY).toBe(useOutboxStore.persist.getOptions().name);
  });
});

describe('safeguards: one scheduling pass at a time, and no stale fire times without permission', () => {
  it('an app open and an "Enable" tap at the same moment leave five reminders, not ten', async () => {
    useSettingsStore.getState().setNotificationsPrimed(true);
    mockSlowOs = true;

    await Promise.all([registerAppOpen(at(0, 9)), enableLocalReminders(at(0, 9))]);

    expect(mockScheduled).toHaveLength(5);
    expect(new Set(mockScheduled.map((item) => item.date.getTime())).size).toBe(5);
    expect(useNotificationStore.getState().scheduledFireAts).toEqual(mockScheduled.map((item) => item.date.getTime()));
  });

  it('forgets the saved fire times when notifications are turned off, so none can count as ignored', async () => {
    await enableLocalReminders(at(0, 9));
    expect(useNotificationStore.getState().scheduledFireAts).toHaveLength(5);

    mockPermission = { granted: false, status: 'denied', canAskAgain: false }; // turned off in iOS Settings
    await registerAppOpen(at(0, 12));
    expect(useNotificationStore.getState().scheduledFireAts).toEqual([]);

    // Turned back on a week later: nothing reached the learner meanwhile, so nothing was ignored.
    mockPermission = { granted: true, status: 'granted', canAskAgain: true };
    await registerAppOpen(at(7, 12));
    expect(useNotificationStore.getState().reminder.mutedAt).toBeNull();
    expect(useNotificationStore.getState().reminder.ignoredCount).toBe(0);
    expect(mockScheduled).toHaveLength(5);
  });
});
