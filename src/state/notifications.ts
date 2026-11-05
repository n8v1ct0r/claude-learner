// src/state/notifications.ts
//
// Persisted reminder bookkeeping for the local-notification policy (src/engine/notifications.ts). It
// remembers the fire times of the reminders currently scheduled with the OS, so the next app open can
// settle which of them the learner ignored (no code runs while they are ignored), and the resulting
// ignore/mute state. The service (src/services/local-notifications.ts) owns the clock and the OS calls.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { recordAppSession, type ReminderState } from '@/engine/notifications';
import { reportHydrationFailure } from '@/state/hydration';

export interface NotificationData {
  reminder: ReminderState;
  scheduledIds: string[];
  /** Fire times of the reminders scheduled at the last pass (epoch ms), for the next settle. */
  scheduledFireAts: number[];
}
export interface NotificationActions {
  /** An app session: settle ignored reminders since the last one, then reset the counter (a mute stays). */
  recordAppOpen: (now: number) => void;
  /** Record what was just scheduled with the OS (empty when nothing is). */
  setSchedule: (ids: string[], fireAts: number[]) => void;
  /** The learner opted back in (the 14-day return offer): clear the mute and the counter. */
  optInAgain: () => void;
  reset: () => void;
}
export type NotificationState = NotificationData & NotificationActions;
export const NOTIFICATION_STORAGE_KEY = 'cca-quest:reminders';
export const NOTIFICATION_VERSION = 1;
export const INITIAL_NOTIFICATION_DATA: NotificationData = {
  reminder: { ignoredCount: 0, mutedAt: null, lastFireAt: null, lastAppOpenAt: null },
  scheduledIds: [],
  scheduledFireAts: [],
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      ...INITIAL_NOTIFICATION_DATA,
      recordAppOpen: (now) =>
        set((state) => ({ reminder: recordAppSession(state.reminder, state.scheduledFireAts, now) })),
      setSchedule: (scheduledIds, scheduledFireAts) => set({ scheduledIds, scheduledFireAts }),
      optInAgain: () => set((state) => ({ reminder: { ...state.reminder, ignoredCount: 0, mutedAt: null } })),
      reset: () => set({ ...INITIAL_NOTIFICATION_DATA }),
    }),
    {
      name: NOTIFICATION_STORAGE_KEY,
      version: NOTIFICATION_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: reportHydrationFailure(NOTIFICATION_STORAGE_KEY),
      partialize: (state): NotificationData => ({
        reminder: state.reminder,
        scheduledIds: state.scheduledIds,
        scheduledFireAts: state.scheduledFireAts,
      }),
    },
  ),
);
