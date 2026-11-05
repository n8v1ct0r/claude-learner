import { describe, expect, it } from '@jest/globals';
import { DAY_MS } from '../../src/engine/time';
import { MAX_IGNORED_REMINDERS, planReminders, reconcileReminder, shouldOfferUnmute, type ReminderState } from '../../src/engine/notifications';

const base: ReminderState = { ignoredCount: 0, mutedAt: null, lastFireAt: null, lastAppOpenAt: null };

describe('GC-13 local notification policy', () => {
  it('operationally counts an ignored reminder and resets after an app open', () => {
    const ignored = reconcileReminder({ ...base, lastFireAt: 1_000, lastAppOpenAt: 500 }, 2_000);
    expect(ignored.ignoredCount).toBe(1);
    expect(reconcileReminder({ ...ignored, lastAppOpenAt: 2_100 }, 2_200).ignoredCount).toBe(0);
  });

  it('auto-mutes at five ignores and offers an explicit return after fourteen days', () => {
    const muted = reconcileReminder({ ...base, ignoredCount: 4, lastFireAt: 1_000, lastAppOpenAt: 0 }, 2_000);
    expect(muted.ignoredCount).toBe(MAX_IGNORED_REMINDERS);
    expect(muted.mutedAt).toBe(2_000);
    expect(planReminders({ now: 2_000, habitualHour: 18, timeZone: 'UTC', state: muted })).toEqual([]);
    expect(shouldOfferUnmute(muted, 2_000 + 14 * DAY_MS)).toBe(true);
  });

  it('pre-applies the mute horizon so at most five reminders are ever scheduled ahead', () => {
    const now = Date.UTC(2026, 6, 14, 12);
    expect(planReminders({ now, habitualHour: 18, timeZone: 'UTC', state: base })).toHaveLength(5);
    expect(planReminders({ now, habitualHour: 18, timeZone: 'UTC', state: { ...base, ignoredCount: 3 } })).toHaveLength(2);
  });

  it('honors quiet hours and gives the supportive streak nudge its specified precedence', () => {
    const now = Date.UTC(2026, 6, 14, 1);
    const lateHabit = planReminders({ now, habitualHour: 23, timeZone: 'UTC', quietStart: 21, quietEnd: 7, state: { ...base, ignoredCount: 3 } });
    expect(new Date(lateHabit[0].fireAt).getUTCHours()).toBe(7);
    expect(new Date(lateHabit[1].fireAt).getUTCHours()).toBe(20);
  });
});
