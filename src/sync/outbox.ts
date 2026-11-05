import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { EnergyState } from '@/engine/energy';
import type { DailyQuest } from '@/engine/quests';
import type { SrsCard } from '@/engine/srs';
import type { StreakState } from '@/engine/streak';
import { reportHydrationFailure } from '@/state/hydration';

type XpPayload = {
  amount: number;
  source: 'lesson' | 'exam' | 'quest' | 'achievement' | 'practice';
  sourceId: string;
  occurredAt: number;
};
type ProgressPayload = { lessonId: string; bestScore: number; updatedAt: number };
type SrsPayload = { card: SrsCard; lastGrade: number | null; updatedAt: number };
type StreakPayload = { state: StreakState; updatedAt: number };
type EnergyPayload = { state: EnergyState; updatedAt: number };
type QuestPayload = { quest: DailyQuest; updatedAt: number };
type AchievementPayload = { achievementId: string; unlockedAt: number; updatedAt: number };
export interface ExamSyncPayload {
  attemptId: string;
  examId: string;
  mode: 'simulation' | 'practice';
  questionIds: string[];
  timeLimitMinutes: number;
  deadlineAt: number | null;
  cursor: number;
  answers: Record<string, unknown>;
  flaggedQuestionIds: string[];
  rawScore: number | null;
  scaledScore: number | null;
  passed: boolean | null;
  domainScores: Record<string, unknown>;
  durationSeconds: number | null;
  completedAt: number | null;
  submittedReason: 'completed' | 'time-expired' | 'manual' | null;
  mistakesCapturedAt: number | null;
  createdAt: number;
  updatedAt: number;
}
type ProfilePayload = { leaderboardOptOut: boolean; updatedAt: number };

export type OutboxItem =
  | { id: string; kind: 'xp'; payload: XpPayload }
  | { id: string; kind: 'progress'; payload: ProgressPayload }
  | { id: string; kind: 'srs'; payload: SrsPayload }
  | { id: string; kind: 'streak'; payload: StreakPayload }
  | { id: string; kind: 'energy'; payload: EnergyPayload }
  | { id: string; kind: 'quest'; payload: QuestPayload }
  | { id: string; kind: 'achievement'; payload: AchievementPayload }
  | { id: string; kind: 'exam'; payload: ExamSyncPayload }
  | { id: string; kind: 'profile'; payload: ProfilePayload };

type PayloadFor<K extends OutboxItem['kind']> = Extract<OutboxItem, { kind: K }>['payload'];

export interface OutboxState {
  items: OutboxItem[];
  queueXp: (payload: XpPayload) => string;
  queueProgress: (payload: ProgressPayload) => string;
  queueSrs: (payload: SrsPayload) => string;
  queueStreak: (payload: StreakPayload) => string;
  queueEnergy: (payload: EnergyPayload) => string;
  queueQuest: (payload: QuestPayload) => string;
  queueAchievement: (payload: AchievementPayload) => string;
  queueExam: (payload: ExamSyncPayload) => string;
  queueProfile: (payload: ProfilePayload) => string;
  remove: (ids: string[]) => void;
  reset: () => void;
}

export const OUTBOX_STORAGE_KEY = 'cca-quest:outbox';
export const OUTBOX_VERSION = 2;
let sequence = 0;

export function createClientEventId(now: number = Date.now(), random: number = Math.random()): string {
  sequence = (sequence + 1) & 0xffff;
  const hex = `${Math.floor(random * 0xffffffff).toString(16).padStart(8, '0')}${now.toString(16).padStart(12, '0')}${sequence.toString(16).padStart(4, '0')}`.slice(-24);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(12, 24)}`;
}

/** LWW snapshots replace older unsent snapshots for the same row. XP events always append. */
function rowKey(item: OutboxItem): string | null {
  switch (item.kind) {
    case 'xp': return null;
    case 'progress': return `progress:${item.payload.lessonId}`;
    case 'srs': return `srs:${item.payload.card.id}`;
    case 'quest': return `quest:${item.payload.quest.id}`;
    case 'achievement': return `achievement:${item.payload.achievementId}`;
    case 'exam': return `exam:${item.payload.attemptId}`;
    default: return item.kind;
  }
}

export const useOutboxStore = create<OutboxState>()(
  persist(
    (set) => {
      const enqueue = <K extends OutboxItem['kind']>(kind: K, payload: PayloadFor<K>): string => {
        const id = createClientEventId();
        const next = { id, kind, payload } as Extract<OutboxItem, { kind: K }>;
        const key = rowKey(next);
        set((state) => ({
          items: [...(key ? state.items.filter((item) => rowKey(item) !== key) : state.items), next],
        }));
        return id;
      };
      return {
        items: [],
        queueXp: (payload) => enqueue('xp', payload),
        queueProgress: (payload) => enqueue('progress', payload),
        queueSrs: (payload) => enqueue('srs', payload),
        queueStreak: (payload) => enqueue('streak', payload),
        queueEnergy: (payload) => enqueue('energy', payload),
        queueQuest: (payload) => enqueue('quest', payload),
        queueAchievement: (payload) => enqueue('achievement', payload),
        queueExam: (payload) => enqueue('exam', payload),
        queueProfile: (payload) => enqueue('profile', payload),
        remove: (ids) => {
          const sent = new Set(ids);
          set((state) => ({ items: state.items.filter((item) => !sent.has(item.id)) }));
        },
        reset: () => set({ items: [] }),
      };
    },
    {
      name: OUTBOX_STORAGE_KEY,
      version: OUTBOX_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: reportHydrationFailure(OUTBOX_STORAGE_KEY),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export async function flushOutbox(
  client: SupabaseClient,
  userId: string,
  items: readonly OutboxItem[] = useOutboxStore.getState().items,
): Promise<{ sent: number; error: string | null }> {
  const sent: string[] = [];
  for (const item of items) {
    let result: { error: { message: string } | null };
    if (item.kind === 'xp') {
      result = await client.from('xp_events').upsert({
        user_id: userId,
        amount: item.payload.amount,
        source: item.payload.source,
        source_id: item.payload.sourceId,
        client_event_id: item.id,
        occurred_at: new Date(item.payload.occurredAt).toISOString(),
      }, { onConflict: 'client_event_id', ignoreDuplicates: true });
    } else if (item.kind === 'progress') {
      result = await client.from('user_progress').upsert({
        user_id: userId,
        lesson_id: item.payload.lessonId,
        status: 'completed',
        best_score: item.payload.bestScore,
        updated_at: new Date(item.payload.updatedAt).toISOString(),
      }, { onConflict: 'user_id,lesson_id' });
    } else if (item.kind === 'srs') {
      const card = item.payload.card;
      result = await client.from('srs_reviews').upsert({
        user_id: userId,
        question_id: card.id,
        concept_id: card.conceptId,
        item_type: card.itemType,
        card_state: card.state,
        due_at: new Date(card.due).toISOString(),
        stability: card.stability,
        difficulty: card.difficulty,
        reps: card.reps,
        lapses: card.lapses,
        last_grade: item.payload.lastGrade,
        last_review_at: card.lastReview === null ? null : new Date(card.lastReview).toISOString(),
        updated_at: new Date(item.payload.updatedAt).toISOString(),
      }, { onConflict: 'user_id,question_id' });
    } else if (item.kind === 'streak') {
      const streak = item.payload.state;
      result = await client.from('streaks').upsert({
        user_id: userId,
        status: streak.status,
        current: streak.current,
        longest: streak.longest,
        last_activity_date: streak.lastActivityDate,
        settled_date: streak.settledDate,
        freezes_equipped: streak.freezesAvailable,
        freezes_used: streak.freezesUsed,
        paused_at: streak.pausedSince,
        updated_at: new Date(item.payload.updatedAt).toISOString(),
      }, { onConflict: 'user_id' });
    } else if (item.kind === 'energy') {
      const energy = item.payload.state;
      result = await client.from('energy_state').upsert({
        user_id: userId,
        energy: energy.energy,
        max_energy: energy.maxEnergy,
        last_refill_at: new Date(energy.lastRefillAt).toISOString(),
        updated_at: new Date(item.payload.updatedAt).toISOString(),
      }, { onConflict: 'user_id' });
    } else if (item.kind === 'quest') {
      result = await client.from('user_quests').upsert({
        user_id: userId,
        quest_id: item.payload.quest.id,
        progress: item.payload.quest.progress,
        claimed: item.payload.quest.claimed,
        updated_at: new Date(item.payload.updatedAt).toISOString(),
      }, { onConflict: 'user_id,quest_id' });
    } else if (item.kind === 'achievement') {
      result = await client.from('user_achievements').upsert({
        user_id: userId,
        achievement_id: item.payload.achievementId,
        unlocked_at: new Date(item.payload.unlockedAt).toISOString(),
        updated_at: new Date(item.payload.updatedAt).toISOString(),
      }, { onConflict: 'user_id,achievement_id' });
    } else if (item.kind === 'exam') {
      const exam = item.payload;
      result = await client.from('exam_attempts').upsert({
        user_id: userId,
        id: exam.attemptId,
        exam_id: exam.examId,
        mode: exam.mode === 'simulation' ? 'sim' : 'practice',
        question_ids: exam.questionIds,
        time_limit_minutes: exam.timeLimitMinutes,
        deadline_at: exam.deadlineAt === null ? null : new Date(exam.deadlineAt).toISOString(),
        cursor: exam.cursor,
        answers: exam.answers,
        flagged_question_ids: exam.flaggedQuestionIds,
        raw_score: exam.rawScore,
        scaled_score: exam.scaledScore,
        passed: exam.passed,
        domain_scores: exam.domainScores,
        duration_s: exam.durationSeconds,
        completed_at: exam.completedAt === null ? null : new Date(exam.completedAt).toISOString(),
        submitted_reason: exam.submittedReason,
        mistakes_captured_at: exam.mistakesCapturedAt === null ? null : new Date(exam.mistakesCapturedAt).toISOString(),
        created_at: new Date(exam.createdAt).toISOString(),
        updated_at: new Date(exam.updatedAt).toISOString(),
      }, { onConflict: 'user_id,id' });
    } else {
      result = await client.from('profiles').update({
        leaderboard_opt_out: item.payload.leaderboardOptOut,
        leaderboard_opt_out_updated_at: new Date(item.payload.updatedAt).toISOString(),
        updated_at: new Date(item.payload.updatedAt).toISOString(),
      }).eq('id', userId);
    }
    if (result.error) {
      useOutboxStore.getState().remove(sent);
      return { sent: sent.length, error: result.error.message };
    }
    sent.push(item.id);
  }
  useOutboxStore.getState().remove(sent);
  return { sent: sent.length, error: null };
}
