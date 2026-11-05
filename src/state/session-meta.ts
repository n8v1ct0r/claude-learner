import { create } from 'zustand';

// NON-persisted runtime flags. This store is deliberately in-memory only: it holds transient
// session state (connectivity, the in-progress lesson) that must NOT survive an app restart and,
// like every store here, must never hold auth/session material (see src/state/README.md). There
// is no persist() wrapper by design — nothing in this store is written to AsyncStorage.

export interface SessionMetaState {
  /** Best-effort connectivity flag; drives offline-mode UX and outbox flush scheduling. */
  isOnline: boolean;
  /** Id of the lesson currently in progress this session (stub; wired up in the M3 player). */
  activeLessonId: string | null;
  /** Whether this build has a Supabase URL + publishable key. No credential is stored here. */
  backendConfigured: boolean;
  /** Account lifecycle state without retaining a user id, email, JWT, or Supabase session object. */
  accountState: 'local-only' | 'connecting' | 'anonymous' | 'saved';
  syncState: 'local-only' | 'idle' | 'syncing' | 'synced' | 'offline';
  pendingSyncCount: number;
  lastSyncedAt: number | null;
  syncMessage: string | null;
  setIsOnline: (online: boolean) => void;
  setActiveLessonId: (lessonId: string | null) => void;
  setSyncMeta: (meta: Partial<Pick<SessionMetaState, 'backendConfigured' | 'accountState' | 'syncState' | 'pendingSyncCount' | 'lastSyncedAt' | 'syncMessage' | 'isOnline'>>) => void;
  reset: () => void;
}

const initialSessionMeta: Pick<SessionMetaState, 'isOnline' | 'activeLessonId' | 'backendConfigured' | 'accountState' | 'syncState' | 'pendingSyncCount' | 'lastSyncedAt' | 'syncMessage'> = {
  isOnline: true,
  activeLessonId: null,
  backendConfigured: false,
  accountState: 'local-only',
  syncState: 'local-only',
  pendingSyncCount: 0,
  lastSyncedAt: null,
  syncMessage: null,
};

export const useSessionMetaStore = create<SessionMetaState>((set) => ({
  ...initialSessionMeta,
  setIsOnline: (online) => set({ isOnline: online }),
  setActiveLessonId: (lessonId) => set({ activeLessonId: lessonId }),
  setSyncMeta: (meta) => set(meta),
  reset: () => set({ ...initialSessionMeta }),
}));
