// src/services/notifications-module.web.ts: web has no local reminders (see local-notifications.ts),
// so the web build resolves this instead of bundling expo-notifications.
type NotificationsModule = typeof import('expo-notifications');

export function loadNotificationsModule(): NotificationsModule | null {
  return null;
}
