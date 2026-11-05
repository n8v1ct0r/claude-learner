// src/services/local-notifications.ts
//
// The edge between the reminder policy (src/engine/notifications.ts) and the OS (expo-notifications).
// It owns the wall clock, the device timezone and the permission. Reminders are planned at the
// learner's LOCAL usual study hour and handed to the OS as absolute instants (FT-7). Everything stays
// on the device. Web has no local reminders here, so every entry point is a no-op there.

import { AppState, Platform } from 'react-native';

import { habitualHourFrom, planReminders } from '@/engine/notifications';
import { MINUTE_MS } from '@/engine/time';
import { loadNotificationsModule } from '@/services/notifications-module';
import { whenHydrated } from '@/state/hydration';
import { useNotificationStore } from '@/state/notifications';
import { resolveTimezone, useProgressStore } from '@/state/progress';
import { useSettingsStore } from '@/state/settings';
import { useOutboxStore } from '@/sync/outbox';

/** Where reminders stand with the OS: allowed, still askable, turned off in system Settings, or unsupported. */
export type ReminderPermission = 'granted' | 'ask' | 'blocked' | 'unavailable';

type NotificationsModule = typeof import('expo-notifications');

/**
 * Resolved lazily (the same pattern as src/juice/sfx.ts): importing this module never evaluates the
 * native module, so web and screens rendered in unit tests stay clean. Null when unavailable. The web
 * build resolves notifications-module.web.ts, so it never bundles expo-notifications.
 */
function loadNotifications(): NotificationsModule | null {
  if (Platform.OS === 'web') return null;
  return loadNotificationsModule();
}

function toPermission(response: { granted: boolean; canAskAgain: boolean }): ReminderPermission {
  if (response.granted) return 'granted';
  return response.canAskAgain ? 'ask' : 'blocked';
}

/** No reminder is set for sooner than this: iOS rejects a time that has passed when the request lands. */
const SCHEDULE_LEAD_MS = MINUTE_MS;

/**
 * A pass's clock: `now` when the pass was requested, moved on by the real time spent since. OS calls
 * can take long — the iOS permission prompt stays up until the learner answers — so reminder times
 * are checked against the clock as it reads when they are planned and set, not when the pass began.
 */
function passClock(now: number): () => number {
  const requestedAt = Date.now();
  return () => now + (Date.now() - requestedAt);
}

async function scheduleIfAllowed(clock: () => number): Promise<void> {
  if (!useSettingsStore.getState().notificationsPrimed) return;
  const Notifications = loadNotifications();
  if (!Notifications) return;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    // Nothing reaches the learner without permission, so these fire times must never count as ignored.
    if (useNotificationStore.getState().scheduledFireAts.length > 0) useNotificationStore.getState().setSchedule([], []);
    return;
  }

  const timeZone = resolveTimezone();
  const habitualHour = habitualHourFrom(Object.values(useProgressStore.getState().lessonUpdatedAt), timeZone);
  const plan = planReminders({
    now: clock() + SCHEDULE_LEAD_MS,
    habitualHour,
    timeZone,
    state: useNotificationStore.getState().reminder,
  });
  await Notifications.cancelAllScheduledNotificationsAsync();
  const ids: string[] = [];
  const fireAts: number[] = [];
  for (const item of plan) {
    if (item.fireAt <= clock() + SCHEDULE_LEAD_MS) continue; // came due while the OS was busy
    try {
      ids.push(
        await Notifications.scheduleNotificationAsync({
          content: { title: item.title, body: item.body, data: { kind: item.kind } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(item.fireAt) },
        }),
      );
      fireAts.push(item.fireAt);
    } catch {
      // The OS refused this one; the rest still go ahead, and the next pass plans afresh.
    }
  }
  useNotificationStore.getState().setSchedule(ids, fireAts);
}

// Scheduling talks to the OS in several awaited steps (cancel, then schedule each reminder). Passes run
// one at a time, so a foreground session and a tap on "Enable" can never interleave into duplicates.
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/**
 * One app session. Waits for the persisted stores it uses to finish loading, or to fail loading (an
 * earlier write would be saved over the saved state), plus the sync outbox, so no session write can
 * ever queue a sync row into an outbox that is still loading. Then it settles the streak for today
 * (FT-13), records the session — which settles the reminders ignored since the last one
 * (V-features-4) — and reschedules. Never rejects: a pass the OS refused (a failed permission read or
 * cancel) runs again at the next session.
 */
async function startSession(now: number): Promise<void> {
  const clock = passClock(now);
  await Promise.all([
    whenHydrated(useProgressStore),
    whenHydrated(useNotificationStore),
    whenHydrated(useSettingsStore),
    whenHydrated(useOutboxStore),
  ]);
  await exclusive(async () => {
    useProgressStore.getState().refreshStreak(now, resolveTimezone());
    useNotificationStore.getState().recordAppOpen(now);
    await scheduleIfAllowed(clock);
  }).catch(() => {});
}

let foregroundWatch: { remove: () => void } | null = null;

/**
 * The app-open hook: a session now (cold start) and, from then on, one on every return to the
 * foreground. A warm resume — often a tap on a reminder — is a session too; without it, a learner who
 * answers reminders from a suspended app would look like they ignore them. The returned promise never
 * rejects, so callers may fire and forget it.
 */
export function registerAppOpen(now: number = Date.now()): Promise<void> {
  if (foregroundWatch === null) {
    foregroundWatch = AppState.addEventListener('change', (status) => {
      if (status === 'active') void startSession(Date.now());
    });
  }
  return startSession(now);
}

/** The current OS permission for reminders (the Profile control follows this, not the priming flag). */
export async function readReminderPermission(): Promise<ReminderPermission> {
  const Notifications = loadNotifications();
  if (!Notifications) return 'unavailable';
  return toPermission(await Notifications.getPermissionsAsync());
}

async function enable(clock: () => number): Promise<ReminderPermission> {
  useSettingsStore.getState().setNotificationsPrimed(true);
  const Notifications = loadNotifications();
  if (!Notifications) return 'unavailable';
  // The prompt can stay up for a while; the scheduling pass reads the clock again after it.
  const permission = toPermission(await Notifications.requestPermissionsAsync());
  if (permission === 'granted') await scheduleIfAllowed(clock);
  return permission;
}

/**
 * The learner chose to turn reminders on: ask the OS, and schedule when allowed. Rejects only when an
 * OS call fails outright; callers handle that (the next app open schedules again).
 */
export function enableLocalReminders(now: number = Date.now()): Promise<ReminderPermission> {
  const clock = passClock(now);
  return exclusive(() => enable(clock));
}

/** Accept the return offer after reminders rested (five quiet days): clear the mute and schedule again. */
export function turnRemindersBackOn(now: number = Date.now()): Promise<ReminderPermission> {
  const clock = passClock(now);
  return exclusive(() => {
    useNotificationStore.getState().optInAgain();
    return enable(clock);
  });
}
