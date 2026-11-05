// __tests__/notifications/reminder-local-time.test.ts — FT-7 / V-features-4 at the engine level.
//
// Reminders fire at a LOCAL hour on the learner's device, quiet hours are local, "your usual study
// time" is learned from when the learner actually studies, and the five-ignore mute plus the 14-day
// return offer run from what the app can observe: scheduled fire times and app sessions.

import { describe, expect, it } from '@jest/globals';

import {
  DEFAULT_HABITUAL_HOUR,
  habitualHourFrom,
  MAX_IGNORED_REMINDERS,
  planReminders,
  recordAppSession,
  settleIgnoredReminders,
  shouldOfferUnmute,
  type ReminderState,
} from '@/engine/notifications';
import { DAY_MS, HOUR_MS, localHourInTz, zonedTimeToEpoch } from '@/engine/time';

const fresh: ReminderState = { ignoredCount: 0, mutedAt: null, lastFireAt: null, lastAppOpenAt: null };

/** Local wall-clock "HH:MM" of an instant in a zone. */
function wallClock(epochMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(epochMs));
}

describe('zonedTimeToEpoch / localHourInTz', () => {
  it('maps a local wall-clock hour to the right instant, half-hour zones and DST included', () => {
    expect(zonedTimeToEpoch('2026-09-24', 18, 'Asia/Tokyo')).toBe(Date.UTC(2026, 8, 24, 9));
    expect(zonedTimeToEpoch('2026-09-24', 18, 'Asia/Kolkata')).toBe(Date.UTC(2026, 8, 24, 12, 30));
    expect(zonedTimeToEpoch('2026-09-24', 18, 'America/New_York')).toBe(Date.UTC(2026, 8, 24, 22)); // EDT
    expect(zonedTimeToEpoch('2026-12-01', 18, 'America/New_York')).toBe(Date.UTC(2026, 11, 1, 23)); // EST
    expect(zonedTimeToEpoch('2026-09-24', 18, 'Australia/Sydney')).toBe(Date.UTC(2026, 8, 24, 8)); // AEST
    expect(zonedTimeToEpoch('2026-12-01', 18, 'Australia/Sydney')).toBe(Date.UTC(2026, 11, 1, 7)); // AEDT
    expect(localHourInTz(Date.UTC(2026, 8, 24, 12, 30), 'Asia/Kolkata')).toBe(18);
  });
});

describe('planReminders in local time (FT-7)', () => {
  const zones = ['Asia/Tokyo', 'Australia/Sydney', 'Asia/Kolkata', 'America/New_York', 'Europe/London'];

  it.each(zones)('fires at 18:00 local in %s, never in quiet hours', (timeZone) => {
    const now = zonedTimeToEpoch('2026-09-24', 9, timeZone); // 09:00 local
    const plan = planReminders({ now, habitualHour: 18, timeZone, state: fresh });
    expect(plan).toHaveLength(MAX_IGNORED_REMINDERS);
    for (const reminder of plan) {
      expect(reminder.fireAt).toBeGreaterThan(now);
      expect(wallClock(reminder.fireAt, timeZone)).toBe('18:00');
    }
    // One per local day, starting today.
    expect(new Set(plan.map((reminder) => wallClock(reminder.fireAt, timeZone))).size).toBe(1);
    expect(plan[0].fireAt).toBe(zonedTimeToEpoch('2026-09-24', 18, timeZone));
  });

  it('keeps local quiet hours: a late habit moves to 07:00, the streak nudge to 20:00 (Tokyo)', () => {
    const timeZone = 'Asia/Tokyo';
    const now = zonedTimeToEpoch('2026-09-24', 1, timeZone);
    const plan = planReminders({ now, habitualHour: 23, timeZone, state: { ...fresh, ignoredCount: 3 } });
    expect(plan.map((reminder) => [reminder.kind, wallClock(reminder.fireAt, timeZone)])).toEqual([
      ['habit', '07:00'],
      ['streak', '20:00'],
    ]);
  });

  it('never schedules the streak nudge inside early-morning quiet hours', () => {
    const timeZone = 'America/New_York';
    const now = zonedTimeToEpoch('2026-09-24', 12, timeZone);
    const plan = planReminders({ now, habitualHour: 2, timeZone, state: fresh });
    for (const reminder of plan) {
      const hour = localHourInTz(reminder.fireAt, timeZone);
      expect(hour >= 7 && hour < 21).toBe(true);
    }
  });

  it('stays on the local hour across a DST change (New York, March 2026)', () => {
    const timeZone = 'America/New_York';
    const now = zonedTimeToEpoch('2026-03-06', 9, timeZone);
    const plan = planReminders({ now, habitualHour: 18, timeZone, state: fresh });
    expect(plan.map((reminder) => wallClock(reminder.fireAt, timeZone))).toEqual(['18:00', '18:00', '18:00', '18:00', '18:00']);
  });
});

describe('habitualHourFrom — "your usual study time" (V-features-4)', () => {
  it('is the median local hour of recent lesson completions', () => {
    const timeZone = 'Asia/Tokyo';
    const at = (day: string, hour: number) => zonedTimeToEpoch(day, hour, timeZone) + 20 * 60_000;
    const completions = [at('2026-09-20', 7), at('2026-09-21', 8), at('2026-09-22', 8), at('2026-09-23', 21)];
    expect(habitualHourFrom(completions, timeZone)).toBe(8);
  });

  it('falls back to the default evening hour before any lesson is done', () => {
    expect(habitualHourFrom([], 'Asia/Tokyo')).toBe(DEFAULT_HABITUAL_HOUR);
    expect(DEFAULT_HABITUAL_HOUR).toBe(18);
  });
});

describe('the five-ignore mute and the 14-day return offer (V-features-4)', () => {
  const timeZone = 'America/New_York';
  const openedAt = zonedTimeToEpoch('2026-09-01', 10, timeZone);
  const scheduled = planReminders({ now: openedAt, habitualHour: 18, timeZone, state: fresh }).map((r) => r.fireAt);
  const afterFirstOpen = recordAppSession(fresh, [], openedAt);

  it('mutes once all five reminders went unanswered, and a later session does not unmute', () => {
    const nextOpen = openedAt + 6 * DAY_MS; // no session while the five reminders fired
    const settled = recordAppSession(afterFirstOpen, scheduled, nextOpen);
    expect(settled.mutedAt).toBe(scheduled[4] + DAY_MS);
    expect(settled.ignoredCount).toBe(0); // the session itself resets the counter…
    expect(planReminders({ now: nextOpen, habitualHour: 18, timeZone, state: settled })).toEqual([]); // …but the mute holds

    const later = recordAppSession(settled, [], nextOpen + DAY_MS);
    expect(later.mutedAt).toBe(settled.mutedAt);
  });

  it('does not count a reminder the learner answered by opening the app', () => {
    // The learner ignores four reminders and taps the fifth an hour after it fires.
    const settled = recordAppSession(afterFirstOpen, scheduled, scheduled[4] + HOUR_MS);
    expect(settled.mutedAt).toBeNull();
    expect(planReminders({ now: scheduled[4] + HOUR_MS, habitualHour: 18, timeZone, state: settled })).toHaveLength(5);
  });

  it('counts only reminders whose answer window has closed', () => {
    const partial = settleIgnoredReminders(afterFirstOpen, scheduled, scheduled[2] + HOUR_MS);
    expect(partial.ignoredCount).toBe(2);
    expect(partial.mutedAt).toBeNull();
  });

  it('offers the return 14 days after the mute, not before', () => {
    const muted = recordAppSession(afterFirstOpen, scheduled, openedAt + 6 * DAY_MS);
    const mutedAt = muted.mutedAt ?? 0;
    expect(shouldOfferUnmute(muted, mutedAt + 13 * DAY_MS)).toBe(false);
    expect(shouldOfferUnmute(muted, mutedAt + 14 * DAY_MS)).toBe(true);
  });
});
