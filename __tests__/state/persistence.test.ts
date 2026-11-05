// Persistence hygiene for the zustand stores (PLAN-rev2 §2.4).
//
// Globals are imported explicitly from '@jest/globals' (typed, no reliance on ambient jest types).
// jest.mock is still hoisted above the imports by babel-plugin-jest-hoist, so the AsyncStorage mock
// is registered before the store modules load.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SETTINGS_STORAGE_KEY, SETTINGS_VERSION, useSettingsStore } from '../../src/state/settings';
import { useSessionMetaStore } from '../../src/state/session-meta';
import { OUTBOX_STORAGE_KEY, useOutboxStore } from '../../src/sync/outbox';

// The AsyncStorage mock is a self-contained in-memory key/value store: the backing object lives
// INSIDE the factory (no out-of-scope hazard), and every write is inspectable through the public
// getAllKeys()/getItem() API. That lets the JWT-hygiene sweep examine EVERYTHING actually
// persisted, not a stubbed subset.
jest.mock('@react-native-async-storage/async-storage', () => {
  const backing: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: (key: string): Promise<string | null> =>
        Promise.resolve(key in backing ? backing[key] : null),
      setItem: (key: string, value: string): Promise<void> => {
        backing[key] = value;
        return Promise.resolve();
      },
      removeItem: (key: string): Promise<void> => {
        delete backing[key];
        return Promise.resolve();
      },
      getAllKeys: (): Promise<string[]> => Promise.resolve(Object.keys(backing)),
      clear: (): Promise<void> => {
        for (const key of Object.keys(backing)) delete backing[key];
        return Promise.resolve();
      },
    },
  };
});

// zustand's persist middleware writes synchronously through our mock, but awaiting a macrotask is a
// cheap guarantee that any queued write has flushed before we read it back.
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

// Snapshot everything currently persisted, keyed by storage key -> raw serialized string.
async function dumpPersisted(): Promise<Record<string, string>> {
  const keys = await AsyncStorage.getAllKeys();
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) out[key] = value;
  }
  return out;
}

// Recursively collect every object key (field name) in a parsed JSON payload.
function collectFieldNames(value: unknown, acc: string[] = []): string[] {
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      acc.push(key);
      collectFieldNames(child, acc);
    }
  }
  return acc;
}

const JWT_RE = /eyJ[A-Za-z0-9_-]{8,}\./;
const AUTH_FIELD_RE = /access_token|refresh_token|session/i;

beforeEach(async () => {
  // Fresh, deterministic start: stores back to defaults, storage wiped (reset() itself persists
  // defaults synchronously, so clear AFTER it).
  useSettingsStore.getState().reset();
  useSessionMetaStore.getState().reset();
  useOutboxStore.getState().reset();
  await AsyncStorage.clear();
});

describe('settings store persistence', () => {
  it('persists preference changes and rehydrates them into the store', async () => {
    const settings = useSettingsStore.getState();
    settings.setDailyGoalMinutes(15);
    settings.setExamDate('2026-08-01T00:00:00.000Z');
    settings.setLeaderboardOptOut(true);
    await flush();

    // (a) It actually wrote to AsyncStorage in the versioned persist envelope.
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as { state: Record<string, unknown>; version: number };
    expect(parsed.version).toBe(SETTINGS_VERSION);
    expect(parsed.state.dailyGoalMinutes).toBe(15);
    expect(parsed.state.examDate).toBe('2026-08-01T00:00:00.000Z');
    expect(parsed.state.leaderboardOptOut).toBe(true);

    // (b) Simulate a fresh cold start reading a PRIOR session's blob. Seed storage out-of-band
    // (going through the store would re-persist and defeat the point), then rehydrate.
    const priorSession = JSON.stringify({
      state: {
        dailyGoalMinutes: 25,
        examDate: '2026-12-01T00:00:00.000Z',
        soundEnabled: true,
        hapticsEnabled: true,
        reduceMotionOverride: 'on',
        reduceTimePressure: true,
        leaderboardOptOut: true,
        theme: 'dark',
        notificationsPrimed: true,
      },
      version: SETTINGS_VERSION,
    });
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, priorSession);
    await useSettingsStore.persist.rehydrate();

    const rehydrated = useSettingsStore.getState();
    expect(rehydrated.dailyGoalMinutes).toBe(25);
    expect(rehydrated.examDate).toBe('2026-12-01T00:00:00.000Z');
    expect(rehydrated.reduceTimePressure).toBe(true);
    expect(rehydrated.notificationsPrimed).toBe(true);
    // Actions survive rehydration (the merge keeps the initializer's functions).
    expect(typeof rehydrated.setDailyGoalMinutes).toBe('function');
  });
});

describe('JWT hygiene sweep', () => {
  it('never persists JWT-shaped tokens or auth/session-named fields', async () => {
    // Exercise the persisted store across many fields...
    const settings = useSettingsStore.getState();
    settings.setDailyGoalMinutes(20);
    settings.setExamDate('2026-09-01T00:00:00.000Z');
    settings.setSoundEnabled(false);
    settings.setHapticsEnabled(false);
    settings.setReduceMotionOverride('off');
    settings.setReduceTimePressure(true);
    settings.setLeaderboardOptOut(true);
    settings.setNotificationsPrimed(true);

    // ...and touch the runtime-only store, which must never persist anything at all.
    useSessionMetaStore.getState().setActiveLessonId('d1-agentic-loop-l1');
    useSessionMetaStore.getState().setIsOnline(false);
    await flush();

    const persisted = await dumpPersisted();
    const keys = Object.keys(persisted);

    // The settings store did persist (proves the sweep is inspecting real writes)...
    expect(keys.length).toBeGreaterThan(0);
    // ...and the runtime-only store leaked nothing. The M9 outbox is expected because the privacy
    // preference now syncs offline-first; the same token/field sweep below covers its real payload.
    expect(keys.sort()).toEqual([OUTBOX_STORAGE_KEY, SETTINGS_STORAGE_KEY].sort());

    for (const key of keys) {
      const value = persisted[key];
      // Neither storage keys nor raw serialized values may look like a JWT.
      expect(key).not.toMatch(JWT_RE);
      expect(value).not.toMatch(JWT_RE);
      // No storage key, and no serialized field name anywhere in the payload, may be an
      // access_token / refresh_token / session field.
      expect(key).not.toMatch(AUTH_FIELD_RE);
      for (const field of collectFieldNames(JSON.parse(value))) {
        expect(field).not.toMatch(AUTH_FIELD_RE);
      }
    }
  });
});

describe('ADHD-sane defaults', () => {
  it('ships a 10-minute goal, no time pressure, and un-primed notifications', () => {
    const settings = useSettingsStore.getState();
    expect(settings.dailyGoalMinutes).toBe(10);
    expect(settings.reduceTimePressure).toBe(false);
    expect(settings.notificationsPrimed).toBe(false);
    // Remaining defaults are sane too.
    expect(settings.examDate).toBeNull();
    expect(settings.leaderboardOptOut).toBe(false);
    expect(settings.soundEnabled).toBe(true);
    expect(settings.hapticsEnabled).toBe(true);
    expect(settings.reduceMotionOverride).toBe('system');
    expect(settings.theme).toBe('dark');
  });
});
