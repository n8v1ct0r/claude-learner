// src/engine/time.ts
//
// Pure, dependency-free time helpers — the injectable-clock boundary for the game engines. NOTHING
// here reads the wall clock (no Date.now()); every function is a deterministic transform of its
// arguments, so the streak/energy logic that builds on them stays fully unit-testable.
//
// The streak engine reasons entirely in *local calendar dates* (`YYYY-MM-DD` strings). The app layer
// converts an epoch + the user's IANA timezone into that string via `localDateInTz` at the edge, and
// the engine trusts it — that is how "timezone-correct day boundaries" (spec §4.5) are honored
// without burying `Intl`/timezone math inside the reducer.
//
// Two ways to read a zone's wall clock. For the device's own zone — always the case in the app, and
// the meaning of an omitted zone — plain local `Date` math (getHours, new Date(y, m, d, h)) is exact
// and needs no `Intl`: Hermes on iOS has shipped without `Intl.DateTimeFormat.prototype.formatToParts`,
// which a Node test run can never reveal. Any other zone goes through `Intl`, and if that fails (no
// formatToParts, no Intl) the device-local reading stands in rather than throwing.

export const SECOND_MS = 1_000;
export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

/** A local calendar date in `YYYY-MM-DD` form (no time, no zone — a pure day label). */
export type IsoDate = string;

/** The wall-clock fields an instant shows in an IANA zone. */
interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** The device's own IANA zone, or null when the runtime cannot say. */
function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** Whether `timeZone` names the device's own zone. */
function isDeviceZone(timeZone: string): boolean {
  return timeZone === deviceTimeZone();
}

/** The wall clock in the device's own zone, from local `Date` fields (DST included, no Intl). */
function deviceWallClock(epochMs: number): WallClock {
  const local = new Date(epochMs);
  return {
    year: local.getFullYear(),
    month: local.getMonth() + 1,
    day: local.getDate(),
    hour: local.getHours(),
    minute: local.getMinutes(),
    second: local.getSeconds(),
  };
}

function wallClockInTz(epochMs: number, timeZone?: string): WallClock {
  if (timeZone === undefined || isDeviceZone(timeZone)) return deviceWallClock(epochMs);
  let parts: Intl.DateTimeFormatPart[];
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    parts = formatter.formatToParts(new Date(epochMs));
  } catch {
    return deviceWallClock(epochMs); // no formatToParts (or no Intl): the device's reading, never a throw
  }
  const field = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: field('year'),
    month: field('month'),
    day: field('day'),
    hour: field('hour') % 24, // some engines render midnight as "24" with hour12: false
    minute: field('minute'),
    second: field('second'),
  };
}

/**
 * The user-local calendar date for an instant, per an IANA timezone (omitted: the device's own), with
 * the zone's UTC offset applied (DST included), so an instant near midnight resolves to the right day.
 */
export function localDateInTz(epochMs: number, timeZone?: string): IsoDate {
  const wall = wallClockInTz(epochMs, timeZone);
  return `${wall.year}-${String(wall.month).padStart(2, '0')}-${String(wall.day).padStart(2, '0')}`;
}

/** The zone's UTC offset (ms, local minus UTC) at an instant, DST included. */
function zoneOffsetMs(epochMs: number, timeZone: string): number {
  const wall = wallClockInTz(epochMs, timeZone);
  const wallAsUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return wallAsUtc - Math.floor(epochMs / 1_000) * 1_000;
}

/** The local hour (0–23) an instant shows in an IANA zone (omitted: the device's own). */
export function localHourInTz(epochMs: number, timeZone?: string): number {
  return wallClockInTz(epochMs, timeZone).hour;
}

/**
 * The instant at which the wall clock in `timeZone` (omitted: the device's own) reads `hour`:00 on the
 * local date `date` — how a local reminder time ("18:00 on the learner's phone") becomes an absolute
 * trigger. DST-aware: on the device, `Date` resolves the local time itself; for another zone the offset
 * is re-read at the candidate instant, so a date on either side of a clock change still lands on the
 * local hour.
 */
export function zonedTimeToEpoch(date: IsoDate, hour: number, timeZone?: string): number {
  const [year, month, day] = date.split('-').map(Number);
  if (timeZone === undefined || isDeviceZone(timeZone)) return new Date(year, month - 1, day, hour).getTime();
  const wallAsUtc = Date.UTC(year, month - 1, day, hour);
  const guess = wallAsUtc - zoneOffsetMs(wallAsUtc, timeZone);
  return wallAsUtc - zoneOffsetMs(guess, timeZone);
}

/** Interpret a `YYYY-MM-DD` label as a UTC midnight instant — a stable anchor for day arithmetic. */
function toUtcMidnight(date: IsoDate): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Whole calendar days from `from` to `to` (negative if `to` precedes `from`). */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMidnight(to) - toUtcMidnight(from)) / DAY_MS);
}

/** The calendar date `days` after `date` (accepts negative offsets). */
export function addDays(date: IsoDate, days: number): IsoDate {
  const shifted = new Date(toUtcMidnight(date) + days * DAY_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
