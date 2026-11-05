// src/state/hydration.ts
//
// zustand's persist middleware saves the whole store on every set — including a set made before the
// saved blob has finished loading, which would overwrite that blob with fresh defaults. App-start code
// that writes to persisted stores (the app-open hook) awaits this first.
//
// zustand (v5) tells finish-hydration listeners only about a load that SUCCEEDED. A load that throws
// (a corrupt blob, a failed migration, a storage read error) leaves the store on its defaults and
// signals nothing, so a waiter would wait forever: no streak settle and no reminders, on every open.
// A store awaited here therefore passes `reportHydrationFailure(name)` as its `onRehydrateStorage`
// option, and `whenHydrated` resolves on either outcome. After a failed load the store keeps its
// defaults, and its next write replaces the unreadable blob.

type FailureListener = () => void;

/** Storage names whose latest load failed. */
const failedLoads = new Set<string>();
/** Waiters to tell when a load fails, by storage name. */
const failureListeners = new Map<string, Set<FailureListener>>();

/**
 * The `onRehydrateStorage` persist option for the store saved under `name`: records a load that
 * throws, so `whenHydrated` stops waiting for it.
 */
export function reportHydrationFailure<S>(name: string): (state: S) => (state?: S, error?: unknown) => void {
  return () => {
    failedLoads.delete(name); // a new load is starting
    return (_state, error) => {
      if (error === undefined) return; // loaded
      failedLoads.add(name);
      failureListeners.get(name)?.forEach((listener) => listener());
    };
  };
}

export interface PersistedStore {
  persist: {
    getOptions: () => { name?: string };
    hasHydrated: () => boolean;
    onFinishHydration: (listener: (state: unknown) => void) => () => void;
  };
}

/**
 * Resolves once `store` has loaded its saved state, or once its load has failed (immediately when
 * either already happened). The store must report failures with {@link reportHydrationFailure}.
 */
export function whenHydrated(store: PersistedStore): Promise<void> {
  const name = store.persist.getOptions().name ?? '';
  if (store.persist.hasHydrated() || failedLoads.has(name)) return Promise.resolve();
  return new Promise((resolve) => {
    const waiters = failureListeners.get(name) ?? new Set<FailureListener>();
    failureListeners.set(name, waiters);
    const settle = (): void => {
      unsubscribe();
      waiters.delete(settle);
      resolve();
    };
    const unsubscribe = store.persist.onFinishHydration(settle);
    waiters.add(settle);
  });
}

/** True once `store` has loaded its saved state or its load has failed (see reportHydrationFailure). */
export function isHydrationSettled(store: PersistedStore): boolean {
  return store.persist.hasHydrated() || failedLoads.has(store.persist.getOptions().name ?? '');
}

/**
 * Calls `onChange` when `store`'s load finishes, whether it succeeded or failed; returns the
 * unsubscribe. Pairs with {@link isHydrationSettled} as a useSyncExternalStore subscription.
 */
export function subscribeHydrationSettled(store: PersistedStore, onChange: () => void): () => void {
  const name = store.persist.getOptions().name ?? '';
  const listeners = failureListeners.get(name) ?? new Set<FailureListener>();
  failureListeners.set(name, listeners);
  const onFailure = (): void => onChange();
  listeners.add(onFailure);
  const unsubscribe = store.persist.onFinishHydration(() => onChange());
  return () => {
    unsubscribe();
    listeners.delete(onFailure);
  };
}
