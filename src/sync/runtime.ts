import { AppState } from 'react-native';

import { ensureSession, registerAuthAutoRefresh, type CaptchaTokenProvider } from '@/api/auth';
import { isSupabaseConfigured, supabase } from '@/api/supabase';
import { examToSyncPayload, useExamAttemptStore } from '@/state/exam-attempt';
import { useGameStore } from '@/state/game';
import { useProgressStore } from '@/state/progress';
import { useSessionMetaStore } from '@/state/session-meta';
import { useSettingsStore } from '@/state/settings';
import { useSrsStore } from '@/state/srs';
import { flushOutbox, useOutboxStore } from '@/sync/outbox';
import { applyRemoteState, fetchRemoteState } from '@/sync/pull';

let syncPromise: Promise<void> | null = null;
let runtimeCaptchaTokenProvider: CaptchaTokenProvider | undefined;

async function hydrateSyncStores(): Promise<void> {
  await Promise.all([
    useOutboxStore.persist.rehydrate(),
    useProgressStore.persist.rehydrate(),
    useSrsStore.persist.rehydrate(),
    useGameStore.persist.rehydrate(),
    useExamAttemptStore.persist.rehydrate(),
    useSettingsStore.persist.rehydrate(),
  ]);
}

/** Queue a current snapshot so pre-M9 local state gets its first safe server backup. */
export function seedLocalStateForSync(): void {
  const outbox = useOutboxStore.getState();
  const progress = useProgressStore.getState();
  for (const lessonId of progress.completedLessonIds) {
    outbox.queueProgress({ lessonId, bestScore: 100, updatedAt: progress.lessonUpdatedAt[lessonId] ?? 0 });
  }
  outbox.queueEnergy({ state: progress.energy, updatedAt: progress.energyUpdatedAt });
  outbox.queueStreak({ state: progress.streak, updatedAt: progress.streakUpdatedAt });

  const srs = useSrsStore.getState();
  for (const card of Object.values(srs.cards)) {
    outbox.queueSrs({
      card,
      lastGrade: srs.lastGradeByCard[card.id] ?? null,
      updatedAt: srs.cardUpdatedAt[card.id] ?? srs.updatedAt,
    });
  }

  const game = useGameStore.getState();
  for (const quest of game.quests) {
    outbox.queueQuest({ quest, updatedAt: game.questUpdatedAt[quest.id] ?? 0 });
  }
  for (const achievementId of game.unlockedAchievementIds) {
    const unlockedAt = game.achievementUnlockedAt[achievementId] ?? 0;
    outbox.queueAchievement({ achievementId, unlockedAt, updatedAt: unlockedAt });
  }

  const exams = useExamAttemptStore.getState();
  const attempts = new Map(exams.history.map((attempt) => [attempt.attemptId, attempt]));
  if (exams.activeAttempt) attempts.set(exams.activeAttempt.attemptId, exams.activeAttempt);
  for (const attempt of attempts.values()) outbox.queueExam(examToSyncPayload(attempt));

  const settings = useSettingsStore.getState();
  outbox.queueProfile({
    leaderboardOptOut: settings.leaderboardOptOut,
    updatedAt: settings.leaderboardOptOutUpdatedAt,
  });
}

export async function syncNow(
  captchaTokenProvider: CaptchaTokenProvider | undefined = runtimeCaptchaTokenProvider,
): Promise<void> {
  if (syncPromise) return syncPromise;
  if (!isSupabaseConfigured || !supabase) {
    useSessionMetaStore.getState().setSyncMeta({
      backendConfigured: false,
      accountState: 'local-only',
      syncState: 'local-only',
      pendingSyncCount: useOutboxStore.getState().items.length,
      syncMessage: 'Progress is stored on this device until online backup is configured.',
    });
    return;
  }

  syncPromise = (async () => {
    const meta = useSessionMetaStore.getState();
    meta.setSyncMeta({ backendConfigured: true, accountState: 'connecting', syncState: 'syncing', syncMessage: null });
    try {
      await hydrateSyncStores();
      const session = await ensureSession(captchaTokenProvider);
      seedLocalStateForSync();

      for (let pass = 0; pass < 5; pass += 1) {
        const items = useOutboxStore.getState().items;
        if (items.length === 0) break;
        const flushed = await flushOutbox(supabase, session.user.id, items);
        if (flushed.error) throw new Error(flushed.error);
      }

      const remote = await fetchRemoteState(supabase);
      applyRemoteState(remote);
      meta.setSyncMeta({
        isOnline: true,
        accountState: session.user.is_anonymous ? 'anonymous' : 'saved',
        syncState: 'synced',
        pendingSyncCount: useOutboxStore.getState().items.length,
        lastSyncedAt: Date.now(),
        syncMessage: null,
      });
    } catch {
      const current = useSessionMetaStore.getState();
      meta.setSyncMeta({
        isOnline: false,
        accountState: current.accountState,
        syncState: 'offline',
        pendingSyncCount: useOutboxStore.getState().items.length,
        syncMessage: 'Online backup will retry automatically. Your progress is safe on this device.',
      });
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}

/** Root lifecycle wiring: auth refresh, foreground retry, and debounced outbox replay. */
export function startSyncRuntime(captchaTokenProvider?: CaptchaTokenProvider): () => void {
  runtimeCaptchaTokenProvider = captchaTokenProvider;
  useSessionMetaStore.getState().setSyncMeta({
    backendConfigured: isSupabaseConfigured,
    syncState: isSupabaseConfigured ? 'idle' : 'local-only',
    accountState: isSupabaseConfigured ? 'connecting' : 'local-only',
    pendingSyncCount: useOutboxStore.getState().items.length,
  });
  if (!supabase) {
    void syncNow(captchaTokenProvider);
    return () => {
      if (runtimeCaptchaTokenProvider === captchaTokenProvider) runtimeCaptchaTokenProvider = undefined;
    };
  }

  const stopRefresh = registerAuthAutoRefresh();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void syncNow(captchaTokenProvider), 500);
  };
  const unsubscribeOutbox = useOutboxStore.subscribe((state) => {
    useSessionMetaStore.getState().setSyncMeta({ pendingSyncCount: state.items.length });
    if (state.items.length > 0) schedule();
  });
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') schedule();
  });
  const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
    useSessionMetaStore.getState().setSyncMeta({
      accountState: session ? (session.user.is_anonymous ? 'anonymous' : 'saved') : 'connecting',
    });
    if (session) schedule();
  });
  schedule();

  return () => {
    if (timer) clearTimeout(timer);
    unsubscribeOutbox();
    appState.remove();
    authListener.subscription.unsubscribe();
    stopRefresh();
    if (runtimeCaptchaTokenProvider === captchaTokenProvider) runtimeCaptchaTokenProvider = undefined;
  };
}
