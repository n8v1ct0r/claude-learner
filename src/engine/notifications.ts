// src/engine/notifications.ts
//
// The local-reminder policy (PLAN-rev2 GC-13, §4.5), as pure functions with an injectable clock and an
// explicit IANA timezone. Nothing here reads the wall clock or the device zone; the service edge
// (src/services/local-notifications.ts) passes both in.
//
//   • Local time (FT-7): reminders fire at a LOCAL hour on the learner's calendar, and quiet hours
//     (default 21:00–07:00) are local too. The streak nudge fires at min(habitual hour, quiet start − 1);
//     quiet hours win for everything else.
//   • "Your usual study time" (V-features-4): the habitual hour is learned from when lessons are
//     actually finished (median local hour of recent completions), defaulting to 18:00.
//   • Operational "ignored" (V-features-4): no code runs while reminders are ignored, so the count is
//     settled retroactively at the next app open from the fire times that were scheduled. A reminder
//     is ignored when it fired and no session started before its answer window closed (the next
//     scheduled reminder, or a day after the last one). Any session resets the counter; five ignored
//     mutes reminders until the learner opts back in, and Profile offers that 14 days after the mute.
//     At most five reminders are ever scheduled ahead, so the mute horizon is pre-applied.

import { addDays, DAY_MS, HOUR_MS, localDateInTz, localHourInTz, zonedTimeToEpoch } from './time';

export const MAX_IGNORED_REMINDERS = 5;
export const UNMUTE_OFFER_AFTER_DAYS = 14;
/** Used until the learner has finished a lesson to learn from. */
export const DEFAULT_HABITUAL_HOUR = 18;
export const DEFAULT_QUIET_START = 21;
export const DEFAULT_QUIET_END = 7;
/** How many recent lesson completions shape the habitual hour. */
export const HABIT_SAMPLE_SIZE = 14;

export interface ReminderState { ignoredCount: number; mutedAt: number | null; lastFireAt: number | null; lastAppOpenAt: number | null }
export interface PlannedReminder { fireAt: number; kind: 'habit' | 'streak'; title: string; body: string }

/**
 * One scheduling step: a reminder that fired at `lastFireAt` with no session since counts as ignored
 * (five ignored ⇒ muted at `now`); a session after the last fire resets the counter. A mute is NOT
 * lifted by a session — only by an explicit opt-in ({@link shouldOfferUnmute}).
 */
export function reconcileReminder(state: ReminderState, now: number): ReminderState {
  if (state.lastAppOpenAt !== null && (state.lastFireAt === null || state.lastAppOpenAt >= state.lastFireAt)) {
    return { ...state, ignoredCount: 0 };
  }
  if (state.lastFireAt === null || state.lastFireAt > now) return state;
  const ignoredCount = Math.min(MAX_IGNORED_REMINDERS, state.ignoredCount + 1);
  return { ...state, ignoredCount, mutedAt: ignoredCount >= MAX_IGNORED_REMINDERS ? now : state.mutedAt };
}

/**
 * Count, at `now`, the scheduled reminders the learner let pass since their last session: each one whose
 * answer window (until the next scheduled reminder, or a day after the last) closed with no session in
 * between. A fifth ignored reminder mutes at the moment its window closed.
 */
export function settleIgnoredReminders(state: ReminderState, scheduledFireAts: readonly number[], now: number): ReminderState {
  const pending = scheduledFireAts
    .filter((fireAt) => state.lastAppOpenAt === null || fireAt > state.lastAppOpenAt)
    .sort((a, b) => a - b);
  let next = state;
  for (let i = 0; i < pending.length; i += 1) {
    const windowClosesAt = pending[i + 1] ?? pending[i] + DAY_MS;
    if (windowClosesAt > now) break; // still answerable: this session answers it
    next = reconcileReminder({ ...next, lastFireAt: pending[i] }, windowClosesAt);
  }
  return next;
}

/** An app session at `now`: settle what was ignored since the last one, then reset the counter. */
export function recordAppSession(state: ReminderState, scheduledFireAts: readonly number[], now: number): ReminderState {
  const settled = settleIgnoredReminders(state, scheduledFireAts, now);
  return { ...settled, ignoredCount: 0, lastAppOpenAt: now };
}

export function shouldOfferUnmute(state: ReminderState, now: number): boolean {
  return state.mutedAt !== null && now - state.mutedAt >= UNMUTE_OFFER_AFTER_DAYS * DAY_MS;
}

/**
 * The learner's usual study hour: the median local hour of their most recent lesson completions, or
 * {@link DEFAULT_HABITUAL_HOUR} before there are any.
 */
export function habitualHourFrom(
  completionTimes: readonly number[],
  timeZone: string,
  fallback: number = DEFAULT_HABITUAL_HOUR,
): number {
  const recent = [...completionTimes].filter((time) => time > 0).sort((a, b) => b - a).slice(0, HABIT_SAMPLE_SIZE);
  if (recent.length === 0) return fallback;
  const hours = recent.map((time) => localHourInTz(time, timeZone)).sort((a, b) => a - b);
  return hours[Math.floor((hours.length - 1) / 2)];
}

function inQuietHours(hour: number, quietStart: number, quietEnd: number): boolean {
  return quietStart > quietEnd ? hour >= quietStart || hour < quietEnd : hour >= quietStart && hour < quietEnd;
}

export function planReminders(params: {
  now: number;
  habitualHour: number;
  /** The learner's IANA zone: hours and quiet hours are local to it. */
  timeZone: string;
  quietStart?: number;
  quietEnd?: number;
  state: ReminderState;
}): PlannedReminder[] {
  if (params.state.mutedAt !== null) return [];
  const quietStart = params.quietStart ?? DEFAULT_QUIET_START;
  const quietEnd = params.quietEnd ?? DEFAULT_QUIET_END;
  const available = Math.max(0, MAX_IGNORED_REMINDERS - params.state.ignoredCount);
  const habitIsQuiet = inQuietHours(params.habitualHour, quietStart, quietEnd);
  const habitHour = habitIsQuiet ? quietEnd : params.habitualHour;
  // The streak nudge's precedence rule; an early-morning habit (inside quiet hours) nudges in the evening.
  const streakHour = habitIsQuiet ? quietStart - 1 : Math.min(params.habitualHour, quietStart - 1);
  const today = localDateInTz(params.now, params.timeZone);
  const reminders: PlannedReminder[] = [];
  for (let day = 0; reminders.length < available && day <= available + 1; day += 1) {
    const hour = day % 2 === 0 ? habitHour : streakHour;
    const fireAt = zonedTimeToEpoch(addDays(today, day), hour, params.timeZone);
    if (fireAt <= params.now) continue;
    const streak = day % 2 === 1;
    reminders.push({
      fireAt,
      kind: streak ? 'streak' : 'habit',
      title: streak ? 'Keep your build warm' : 'Your next tiny win is ready',
      body: streak ? 'Five focused minutes keeps your study rhythm warm.' : 'The agent found a short lesson for whenever you are ready.',
    });
  }
  return reminders;
}

export const FIVE_HOURS_MS = 5 * HOUR_MS;
