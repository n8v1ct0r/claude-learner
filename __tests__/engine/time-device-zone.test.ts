// __tests__/engine/time-device-zone.test.ts — local times without Intl.formatToParts.
//
// Every reminder time goes through the zone helpers in src/engine/time.ts. Hermes on iOS has shipped
// without Intl.DateTimeFormat.prototype.formatToParts, and Node's full Intl (Jest) can never show that.
// In production the zone is always the device's own, so the helpers must work there with plain local
// Date math, keep Intl for an explicit other zone, and fall back to device-local math instead of
// throwing when formatToParts is missing.

import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { planReminders } from '@/engine/notifications';
import { addDays, localDateInTz, localHourInTz, zonedTimeToEpoch } from '@/engine/time';

const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// A zone that is not this machine's, with its known 18:00 on 2026-09-24 (no DST in either).
const other = deviceZone === 'Asia/Tokyo'
  ? { zone: 'Asia/Kolkata', sixPm: Date.UTC(2026, 8, 24, 12, 30) }
  : { zone: 'Asia/Tokyo', sixPm: Date.UTC(2026, 8, 24, 9) };

type DateTimeFormatProto = { formatToParts?: unknown };
const proto = Intl.DateTimeFormat.prototype as DateTimeFormatProto;
const realFormatToParts = proto.formatToParts;

/** Simulate a Hermes build without formatToParts. */
function removeFormatToParts(): void {
  Object.defineProperty(proto, 'formatToParts', { value: undefined, configurable: true, writable: true });
}

afterEach(() => {
  Object.defineProperty(proto, 'formatToParts', { value: realFormatToParts, configurable: true, writable: true });
  jest.restoreAllMocks();
});

/** Wall clock of an instant in a zone, read with Intl `format` (independent of the code under test). */
function wall(epoch: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(new Date(epoch));
}

/** Local dates across a year, so both sides of any DST change are covered. */
const DATES = Array.from({ length: 26 }, (_, i) => addDays('2026-01-03', i * 14));

describe('the device zone uses local Date math (no Intl needed)', () => {
  it('lands on HH:00 local for every reminder hour even with formatToParts missing', () => {
    removeFormatToParts();
    for (const date of DATES) {
      for (let hour = 7; hour <= 20; hour += 1) {
        const at = zonedTimeToEpoch(date, hour, deviceZone);
        expect(zonedTimeToEpoch(date, hour)).toBe(at); // no zone given = the device's own
        const local = new Date(at);
        expect([local.getHours(), local.getMinutes(), local.getSeconds()]).toEqual([hour, 0, 0]);
        expect(localHourInTz(at, deviceZone)).toBe(hour);
        expect(localDateInTz(at, deviceZone)).toBe(date);
        expect(localDateInTz(at)).toBe(date);
      }
    }
  });

  it('agrees with an independent Intl reading of the device zone', () => {
    for (const date of DATES) {
      const at = zonedTimeToEpoch(date, 18, deviceZone);
      expect(wall(at, deviceZone)).toBe(`${date}, 18:00:00`);
    }
  });

  it('never calls formatToParts for the device zone', () => {
    const formatToParts = jest.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts');
    zonedTimeToEpoch('2026-09-24', 18, deviceZone);
    localHourInTz(Date.UTC(2026, 8, 24, 12), deviceZone);
    localDateInTz(Date.UTC(2026, 8, 24, 12), deviceZone);
    expect(formatToParts).not.toHaveBeenCalled();
  });

  it('plans five reminders at the habitual local hour with formatToParts missing', () => {
    removeFormatToParts();
    const now = zonedTimeToEpoch('2026-09-24', 9, deviceZone);
    const plan = planReminders({
      now,
      habitualHour: 18,
      timeZone: deviceZone,
      state: { ignoredCount: 0, mutedAt: null, lastFireAt: null, lastAppOpenAt: null },
    });
    expect(plan).toHaveLength(5);
    expect(plan.map((reminder) => new Date(reminder.fireAt).getHours())).toEqual([18, 18, 18, 18, 18]);
    expect(plan.map((reminder) => localDateInTz(reminder.fireAt, deviceZone))).toEqual(
      [0, 1, 2, 3, 4].map((offset) => addDays('2026-09-24', offset)),
    );
  });
});

describe('an explicit other zone uses Intl', () => {
  it('converts through the zone’s own offset', () => {
    const formatToParts = jest.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts');
    expect(zonedTimeToEpoch('2026-09-24', 18, other.zone)).toBe(other.sixPm);
    expect(localHourInTz(other.sixPm, other.zone)).toBe(18);
    expect(localDateInTz(other.sixPm, other.zone)).toBe('2026-09-24');
    expect(formatToParts).toHaveBeenCalled();
  });

  it('falls back to device-local math instead of throwing when formatToParts is missing', () => {
    removeFormatToParts();
    let at = 0;
    expect(() => {
      at = zonedTimeToEpoch('2026-09-24', 18, other.zone);
    }).not.toThrow();
    expect(at).toBe(new Date(2026, 8, 24, 18).getTime());
    expect(localHourInTz(at, other.zone)).toBe(18);
    expect(localDateInTz(at, other.zone)).toBe('2026-09-24');
  });
});
