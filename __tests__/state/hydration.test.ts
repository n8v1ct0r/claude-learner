// __tests__/state/hydration.test.ts — waiting for a persisted store to load, whatever the outcome.
//
// zustand (v5) calls finish-hydration listeners only when a load succeeds. whenHydrated must also
// resolve when the load throws (storage read error, corrupt blob, failed migration), or the app-open
// session would wait forever; and it must still wait while a load is in flight.

import { describe, expect, it } from '@jest/globals';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { reportHydrationFailure, whenHydrated } from '@/state/hydration';

interface Counter {
  count: number;
}

/** An in-memory storage whose reads can be made to fail or wait. */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  let failReads = false;
  let gate: Promise<void> | null = null;
  const storage: StateStorage = {
    getItem: async (key) => {
      if (gate) await gate;
      if (failReads) throw new Error('storage read failed');
      return data[key] ?? null;
    },
    setItem: async (key, value) => {
      data[key] = value;
    },
    removeItem: async (key) => {
      delete data[key];
    },
  };
  return {
    storage,
    data,
    failReads: (fail: boolean) => {
      failReads = fail;
    },
    holdReads: () => {
      let release: () => void = () => {};
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      return () => {
        gate = null;
        release();
      };
    },
  };
}

function counterStore(memory: ReturnType<typeof memoryStorage>, name: string, migrate?: () => Counter) {
  return create<Counter>()(
    persist(() => ({ count: 0 }), {
      name,
      version: 2,
      storage: createJSONStorage(() => memory.storage),
      onRehydrateStorage: reportHydrationFailure(name),
      migrate,
    }),
  );
}

/** 'loaded' when the promise settles within `ms`, otherwise 'still waiting'. */
async function within(promise: Promise<void>, ms = 200): Promise<'loaded' | 'still waiting'> {
  return Promise.race([
    promise.then(() => 'loaded' as const),
    new Promise<'still waiting'>((resolve) => setTimeout(() => resolve('still waiting'), ms)),
  ]);
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('whenHydrated', () => {
  it('resolves after a normal load, with the saved state in place', async () => {
    const memory = memoryStorage({ 'test:ok': JSON.stringify({ state: { count: 7 }, version: 2 }) });
    const store = counterStore(memory, 'test:ok');
    expect(await within(whenHydrated(store))).toBe('loaded');
    expect(store.persist.hasHydrated()).toBe(true);
    expect(store.getState().count).toBe(7);
  });

  it('resolves when the storage read throws', async () => {
    const memory = memoryStorage();
    memory.failReads(true);
    const store = counterStore(memory, 'test:read-error');
    expect(await within(whenHydrated(store))).toBe('loaded');
    expect(store.persist.hasHydrated()).toBe(false); // it kept its defaults
    expect(store.getState().count).toBe(0);
  });

  it('resolves when the saved blob is corrupt, also for a waiter that arrives after the failure', async () => {
    const memory = memoryStorage({ 'test:corrupt': '{not json' });
    const store = counterStore(memory, 'test:corrupt');
    const early = whenHydrated(store);
    await tick();
    expect(await within(early)).toBe('loaded');
    expect(await within(whenHydrated(store))).toBe('loaded');
  });

  it('resolves when the migration throws', async () => {
    const memory = memoryStorage({ 'test:migrate': JSON.stringify({ state: { count: 1 }, version: 1 }) });
    const store = counterStore(memory, 'test:migrate', () => {
      throw new Error('migration failed');
    });
    expect(await within(whenHydrated(store))).toBe('loaded');
    expect(store.persist.hasHydrated()).toBe(false);
  });

  it('still waits while a load is in flight, and a later good load clears an earlier failure', async () => {
    const memory = memoryStorage({ 'test:retry': '{not json' });
    const store = counterStore(memory, 'test:retry');
    expect(await within(whenHydrated(store))).toBe('loaded'); // the first load failed

    memory.data['test:retry'] = JSON.stringify({ state: { count: 3 }, version: 2 });
    const release = memory.holdReads();
    const reload = store.persist.rehydrate();
    expect(await within(whenHydrated(store), 50)).toBe('still waiting'); // not fooled by the old failure
    release();
    await reload;
    expect(await within(whenHydrated(store))).toBe('loaded');
    expect(store.getState().count).toBe(3);
    expect(store.persist.hasHydrated()).toBe(true);
  });
});
