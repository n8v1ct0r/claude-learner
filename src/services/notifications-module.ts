// src/services/notifications-module.ts: the expo-notifications module, resolved lazily.
//
// Kept in its own file so the web build can swap in notifications-module.web.ts (no reminders on web)
// and never bundle expo-notifications. Importing this file never evaluates the native module.

type NotificationsModule = typeof import('expo-notifications');

/** expo-notifications, or null when it is unavailable (e.g. a unit test without the native module). */
export function loadNotificationsModule(): NotificationsModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy so import never forces native
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}
