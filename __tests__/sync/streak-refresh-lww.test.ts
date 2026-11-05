// __tests__/sync/streak-refresh-lww.test.ts — the app-open streak settle under two-device sync.
//
// Settling a streak on app open (freezes, pause, archive) is derived state: it follows from the stored
// streak and today's date. If it were stamped as a new write, a device that sat idle would win
// last-write-wins against another device's newer, real streak — at the server (guard_lww) and in
// mergeRemote — and the learner would lose that streak everywhere. Replays the real app-open hook and
// a real sync pass (flush, then pull) against an in-memory server that applies guard_lww.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Row = Record<string, unknown>;
const mockServer: { streak: Row | null; streakUploads: Row[] } = { streak: null, streakUploads: [] };

jest.mock('@/api/auth', () => ({
  ensureSession: jest.fn(async () => ({ user: { id: 'learner-1', is_anonymous: true } })),
  registerAuthAutoRefresh: jest.fn(() => () => undefined),
}));

jest.mock('@/api/supabase', () => {
  const ok = { data: null, error: null };
  const from = (table: string) => ({
    upsert: async (row: Row) => {
      if (table === 'streaks') {
        mockServer.streakUploads.push(row);
        // guard_lww (supabase/migrations/20260715021000_0002_user_state_sync.sql): an update whose
        // updated_at is older than the stored row's keeps the stored row.
        const stored = mockServer.streak;
        if (!stored || Date.parse(String(row.updated_at)) >= Date.parse(String(stored.updated_at))) mockServer.streak = row;
      }
      return ok;
    },
    update: () => ({ eq: async () => ok }),
    select: () =>
      Object.assign(Promise.resolve({ data: [], error: null }), {
        single: async () => ({ data: { total_xp: 0, leaderboard_opt_out: false, leaderboard_opt_out_updated_at: null }, error: null }),
        maybeSingle: async () => ({ data: table === 'streaks' ? mockServer.streak : null, error: null }),
      }),
  });
  return { isSupabaseConfigured: true, supabase: { from } };
});

import { createStreakState, reduceStreak, type StreakState } from '@/engine/streak';
import { DAY_MS, localDateInTz } from '@/engine/time';
import { registerAppOpen } from '@/services/local-notifications';
import { effectiveStreak } from '@/state/live-progress';
import { resolveTimezone, useProgressStore } from '@/state/progress';
import { useOutboxStore } from '@/sync/outbox';
import { syncNow } from '@/sync/runtime';

const tz = resolveTimezone();
const NOW = Date.UTC(2026, 8, 25, 16);
const day = (offset: number): string => localDateInTz(NOW + offset * DAY_MS, tz);

/** A streak of one lesson a day from `from` to `to` (day offsets from NOW). */
function studied(from: number, to: number): StreakState {
  let streak = createStreakState();
  for (let offset = from; offset <= to; offset += 1) streak = reduceStreak(streak, { type: 'lessonCompleted' }, day(offset));
  return streak;
}

/** How the server stores a streak row (src/sync/outbox.ts flushOutbox). */
function serverRow(state: StreakState, updatedAt: number): Row {
  return {
    status: state.status,
    current: state.current,
    longest: state.longest,
    last_activity_date: state.lastActivityDate,
    settled_date: state.settledDate,
    freezes_equipped: state.freezesAvailable,
    freezes_used: state.freezesUsed,
    paused_at: state.pausedSince,
    updated_at: new Date(updatedAt).toISOString(),
  };
}

beforeEach(() => {
  mockServer.streak = null;
  mockServer.streakUploads = [];
  useProgressStore.getState().reset();
  useOutboxStore.getState().reset();
});

describe('app-open streak settle vs. a newer streak from another device (sync builds)', () => {
  it('device A, idle 14 days, ends up showing device B’s newer streak and never uploads a newer stale row', async () => {
    // Device A: lessons on days -20..-14, last written (and synced) 14 days ago.
    const lastWriteOnA = NOW - 14 * DAY_MS;
    useProgressStore.setState({ streak: studied(-20, -14), streakUpdatedAt: lastWriteOnA });
    // Device B picked the streak up and kept going through yesterday; the server holds B's row.
    const onB = studied(-20, -1);
    expect(onB.current).toBe(20);
    mockServer.streak = serverRow(onB, NOW - DAY_MS);

    // A opens: the app-open hook settles the stale streak for today (archived on this device)...
    await registerAppOpen(NOW);
    expect(useProgressStore.getState().streak.current).toBe(0);
    expect(useProgressStore.getState().streakUpdatedAt).toBe(lastWriteOnA);
    expect(useOutboxStore.getState().items.filter((item) => item.kind === 'streak')).toEqual([]);

    // ...then syncs: flush first, then pull.
    await syncNow();

    // Nothing A uploaded claims to be newer than A's last real streak change...
    expect(mockServer.streakUploads.length).toBeGreaterThan(0);
    for (const upload of mockServer.streakUploads) {
      expect(Date.parse(String(upload.updated_at))).toBeLessThanOrEqual(lastWriteOnA);
    }
    // ...so the server keeps B's streak, and A adopts it.
    expect(mockServer.streak).toMatchObject({ current: 20, updated_at: new Date(NOW - DAY_MS).toISOString() });
    const onA = useProgressStore.getState();
    expect(onA.streak).toEqual(onB);
    expect(onA.streakUpdatedAt).toBe(NOW - DAY_MS);
    expect(effectiveStreak(onA.streak, NOW, tz).current).toBe(20);
  });
});
