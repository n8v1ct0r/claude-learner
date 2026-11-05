import type { SupabaseClient } from '@supabase/supabase-js';

import type { EnergyState } from '@/engine/energy';
import type { SrsCard } from '@/engine/srs';
import type { StreakState } from '@/engine/streak';
import { useExamAttemptStore, type ExamAnswer, type ExamAttempt } from '@/state/exam-attempt';
import { useGameStore } from '@/state/game';
import { useProgressStore, type RemoteProgressSnapshot } from '@/state/progress';
import { useSettingsStore } from '@/state/settings';
import { useSrsStore } from '@/state/srs';

type Row = Record<string, unknown>;

export interface RemoteStateSnapshot {
  progress: RemoteProgressSnapshot;
  srs: { card: SrsCard; lastGrade: number | null; updatedAt: number }[];
  quests: { questId: string; progress: number; claimed: boolean; updatedAt: number }[];
  achievements: { achievementId: string; unlockedAt: number }[];
  exams: ExamAttempt[];
  leaderboard: { optOut: boolean; updatedAt: number };
}

function time(value: unknown): number {
  const parsed = typeof value === 'string' ? Date.parse(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function requireRows(result: { data: unknown; error: { message: string } | null }, label: string): Row[] {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return Array.isArray(result.data) ? result.data as Row[] : [];
}

export async function fetchRemoteState(client: SupabaseClient): Promise<RemoteStateSnapshot> {
  const [profileResult, progressResult, streakResult, energyResult, srsResult, questsResult, achievementsResult, examsResult] = await Promise.all([
    client.from('profiles').select('total_xp,leaderboard_opt_out,leaderboard_opt_out_updated_at').single(),
    client.from('user_progress').select('lesson_id,updated_at'),
    client.from('streaks').select('status,current,longest,last_activity_date,settled_date,freezes_equipped,freezes_used,paused_at,updated_at').maybeSingle(),
    client.from('energy_state').select('energy,max_energy,last_refill_at,updated_at').maybeSingle(),
    client.from('srs_reviews').select('question_id,concept_id,item_type,card_state,due_at,stability,difficulty,reps,lapses,last_grade,last_review_at,updated_at'),
    client.from('user_quests').select('quest_id,progress,claimed,updated_at'),
    client.from('user_achievements').select('achievement_id,unlocked_at'),
    client.from('exam_attempts').select('id,exam_id,mode,question_ids,time_limit_minutes,deadline_at,cursor,answers,flagged_question_ids,raw_score,scaled_score,passed,domain_scores,duration_s,completed_at,submitted_reason,mistakes_captured_at,created_at,updated_at'),
  ]);

  if (profileResult.error) throw new Error(`profiles: ${profileResult.error.message}`);
  if (streakResult.error) throw new Error(`streaks: ${streakResult.error.message}`);
  if (energyResult.error) throw new Error(`energy: ${energyResult.error.message}`);
  const profile = (profileResult.data ?? {}) as Row;
  const streakRow = streakResult.data as Row | null;
  const energyRow = energyResult.data as Row | null;

  const streak: RemoteProgressSnapshot['streak'] = streakRow ? {
    state: {
      status: streakRow.status === 'paused' ? 'paused' : 'active',
      current: Number(streakRow.current ?? 0),
      longest: Number(streakRow.longest ?? 0),
      lastActivityDate: typeof streakRow.last_activity_date === 'string' ? streakRow.last_activity_date : null,
      settledDate: typeof streakRow.settled_date === 'string' ? streakRow.settled_date : null,
      freezesAvailable: Number(streakRow.freezes_equipped ?? 0),
      freezesUsed: Number(streakRow.freezes_used ?? 0),
      pausedSince: typeof streakRow.paused_at === 'string' ? streakRow.paused_at : null,
    } satisfies StreakState,
    updatedAt: time(streakRow.updated_at),
  } : null;

  const energy: RemoteProgressSnapshot['energy'] = energyRow ? {
    state: {
      energy: Number(energyRow.energy ?? 0),
      maxEnergy: Number(energyRow.max_energy ?? 5),
      lastRefillAt: time(energyRow.last_refill_at),
    } satisfies EnergyState,
    updatedAt: time(energyRow.updated_at),
  } : null;

  const srs = requireRows(srsResult, 'srs').map((row) => ({
    card: {
      id: String(row.question_id),
      conceptId: String(row.concept_id),
      itemType: row.item_type === 'feynman' ? 'feynman' as const : 'question' as const,
      state: ['learning', 'review', 'relearning'].includes(String(row.card_state))
        ? row.card_state as SrsCard['state']
        : 'new',
      due: time(row.due_at),
      stability: Number(row.stability ?? 0),
      difficulty: Number(row.difficulty ?? 0),
      reps: Number(row.reps ?? 0),
      lapses: Number(row.lapses ?? 0),
      lastReview: row.last_review_at ? time(row.last_review_at) : null,
    },
    lastGrade: row.last_grade === null ? null : Number(row.last_grade),
    updatedAt: time(row.updated_at),
  }));

  const exams = requireRows(examsResult, 'exams').map((row): ExamAttempt => {
    const completedAt = row.completed_at ? time(row.completed_at) : null;
    const rawScore = row.raw_score === null ? null : Number(row.raw_score);
    const scaledScore = row.scaled_score === null ? null : Number(row.scaled_score);
    return {
      attemptId: String(row.id),
      examId: String(row.exam_id),
      mode: row.mode === 'sim' ? 'simulation' : 'practice',
      questionIds: stringArray(row.question_ids),
      timeLimitMinutes: Number(row.time_limit_minutes ?? 1),
      startedAt: time(row.created_at),
      deadlineAt: row.deadline_at ? time(row.deadline_at) : null,
      cursor: Number(row.cursor ?? 0),
      answers: object(row.answers) as Record<string, ExamAnswer>,
      flaggedQuestionIds: stringArray(row.flagged_question_ids),
      completedAt,
      submittedReason: ['completed', 'time-expired', 'manual'].includes(String(row.submitted_reason))
        ? row.submitted_reason as ExamAttempt['submittedReason']
        : null,
      mistakesCapturedAt: row.mistakes_captured_at ? time(row.mistakes_captured_at) : null,
      result: rawScore !== null && scaledScore !== null ? {
        rawScore,
        scaledScore,
        passed: Boolean(row.passed),
        domainScores: object(row.domain_scores),
        durationSeconds: Number(row.duration_s ?? 0),
      } : null,
      updatedAt: time(row.updated_at),
    };
  });

  return {
    progress: {
      lessons: requireRows(progressResult, 'progress').map((row) => ({ lessonId: String(row.lesson_id), updatedAt: time(row.updated_at) })),
      totalXp: Number(profile.total_xp ?? 0),
      streak,
      energy,
    },
    srs,
    quests: requireRows(questsResult, 'quests').map((row) => ({
      questId: String(row.quest_id),
      progress: Number(row.progress ?? 0),
      claimed: Boolean(row.claimed),
      updatedAt: time(row.updated_at),
    })),
    achievements: requireRows(achievementsResult, 'achievements').map((row) => ({
      achievementId: String(row.achievement_id),
      unlockedAt: time(row.unlocked_at),
    })),
    exams,
    leaderboard: {
      optOut: Boolean(profile.leaderboard_opt_out),
      updatedAt: time(profile.leaderboard_opt_out_updated_at),
    },
  };
}

export function applyRemoteState(snapshot: RemoteStateSnapshot): void {
  useProgressStore.getState().mergeRemote(snapshot.progress);
  useSrsStore.getState().mergeRemote(snapshot.srs);
  useGameStore.getState().mergeRemote({ quests: snapshot.quests, achievements: snapshot.achievements });
  useExamAttemptStore.getState().mergeRemote(snapshot.exams);
  useSettingsStore.getState().mergeRemoteLeaderboardPreference(snapshot.leaderboard.optOut, snapshot.leaderboard.updatedAt);
}
