// src/state/srs.ts
//
// The persisted spaced-repetition deck — the thin app-side edge over the pure FSRS engine
// (src/engine/srs.ts, the GC-04 oracle). It holds one FSRS card per questionId and owns the wall
// clock + the settings read at the boundary, handing both INTO the engine (which stays clock-free and
// deterministic). Mistake capture and review grading mutate cards here; presentation selection is a
// pure pass-through to selectDueForSession.
//
// ADHD / no-shame contract (PLAN-rev2 §4.7 #9), enforced at THIS layer too:
//   • This store NEVER exposes a "due count". `selectSession` returns ONLY the engine's already-capped
//     SrsSession ({ cards, mode, cap }) — there is deliberately no `dueCount`/`totalDue`/`backlogCount`
//     selector, so no UI can render an Anki-style backlog wall.
//   • All SRS review is ENERGY-FREE: this store never touches the energy/progress store.
//   • The daily presentation cap comes from the learner's daily-goal minutes, and overflow is left
//     scheduled (untouched due dates) — the engine handles that; the store just supplies the goal.
//   • After ≥5 idle days (computed from card last-review timestamps) the engine returns a gentle
//     welcome-back warmup; the store exposes the derived `mode` so the hub can greet warmly.
//
// Server sync (LWW) lands in M9. For now the deck is local-only; a single `updatedAt` high-water mark
// is persisted so the future last-write-wins merge has a comparison anchor.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  captureMistake,
  GRADE,
  gradeFromCorrect,
  review,
  selectDueForSession,
  type SessionMode,
  type SrsCard,
  type SrsSession,
} from '@/engine/srs';
import { DAY_MS } from '@/engine/time';
import { useSettingsStore } from '@/state/settings';
import { useOutboxStore } from '@/sync/outbox';
import { reportHydrationFailure } from '@/state/hydration';

/** Whole days since the learner last touched any card (drives the welcome-back warmup). 0 if fresh. */
export function computeIdleDays(cards: readonly SrsCard[], now: number): number {
  let last = -Infinity;
  for (const card of cards) {
    if (card.lastReview !== null && card.lastReview > last) last = card.lastReview;
  }
  if (last === -Infinity) return 0;
  return Math.max(0, Math.floor((now - last) / DAY_MS));
}

export interface SrsData {
  /** Every FSRS card, keyed by its questionId (D3 append-only). */
  cards: Record<string, SrsCard>;
  /** Local last-write high-water mark (epoch ms) — the anchor for the M9 LWW sync merge. */
  updatedAt: number;
  cardUpdatedAt: Record<string, number>;
  lastGradeByCard: Record<string, number | null>;
}

/**
 * Ephemeral (never persisted) review snapshot the hub reads to pick its greeting/CTA WITHOUT reading
 * the wall clock during render. It is a coarse boolean+mode, refreshed by {@link SrsActions.refreshReview}
 * from an effect. Deliberately NOT a due count — the no-shame rule (PLAN-rev2 §4.7 #9).
 */
export interface SrsReviewSnapshot {
  reviewMode: SessionMode;
  reviewHasCards: boolean;
}

/** What a caller passes to pick a review session. */
export interface SessionSelectParams {
  now: number;
  /** Overrides the learner's daily goal (tests); defaults to the settings value. */
  dailyGoalMinutes?: number;
  /**
   * Whether the caller can load a card's question (FT-1). The hub passes "resolves in the content", so
   * a card it cannot open never takes a seat in the session or makes the hub offer an empty review.
   */
  isPresentable?: (card: SrsCard) => boolean;
  /**
   * Whether a card is an exam (mock or mini) miss rather than a lesson miss. While lesson misses are
   * due, exam misses take at most half the seats, so a big mock never starves them. The hub passes
   * "not a lesson exercise".
   */
  isExamCard?: (card: SrsCard) => boolean;
}

export interface SrsActions {
  /** A WRONG path-lesson answer: create-or-lapse the card for this question (silent, no-shame). */
  recordMistake: (questionId: string, conceptId: string, now: number) => void;
  /** Grade a review of an existing card (correct → GOOD, wrong → AGAIN). No-op for unknown ids. */
  gradeReview: (questionId: string, correct: boolean, now: number) => void;
  /**
   * The review session to present — a pure pass-through to the engine. Uses the learner's daily-goal
   * minutes (from settings, overridable for tests) and idle days derived from card timestamps.
   * Returns the engine SrsSession, which by design carries NO raw due count.
   */
  selectSession: (params: SessionSelectParams) => SrsSession;
  /** Recompute the ephemeral {@link SrsReviewSnapshot} (called from a hub effect at the clock edge). */
  refreshReview: (params: SessionSelectParams) => void;
  mergeRemote: (cards: { card: SrsCard; lastGrade: number | null; updatedAt: number }[]) => void;
  /** Clear the whole deck (Settings reset / test isolation). */
  reset: () => void;
}

export type SrsState = SrsData & SrsReviewSnapshot & SrsActions;

const INITIAL_SNAPSHOT: SrsReviewSnapshot = { reviewMode: 'normal', reviewHasCards: false };

// Key deliberately avoids the substring "session" so it can never trip the auth/session persistence
// sweep in __tests__/state/persistence.test.ts.
export const SRS_STORAGE_KEY = 'cca-quest:srs-deck';
export const SRS_VERSION = 2;

export const INITIAL_SRS_DATA: SrsData = { cards: {}, updatedAt: 0, cardUpdatedAt: {}, lastGradeByCard: {} };

export const useSrsStore = create<SrsState>()(
  persist(
    (set, get) => ({
      ...INITIAL_SRS_DATA,
      ...INITIAL_SNAPSHOT,

      recordMistake: (questionId, conceptId, now) => {
        const existing = get().cards[questionId] ?? null;
        const card = captureMistake(existing, questionId, conceptId, now);
        set((state) => ({
          cards: { ...state.cards, [questionId]: card },
          updatedAt: now,
          cardUpdatedAt: { ...state.cardUpdatedAt, [questionId]: now },
          lastGradeByCard: { ...state.lastGradeByCard, [questionId]: GRADE.AGAIN },
        }));
        useOutboxStore.getState().queueSrs({ card, lastGrade: GRADE.AGAIN, updatedAt: now });
      },

      gradeReview: (questionId, correct, now) => {
        const existing = get().cards[questionId];
        if (!existing) return;
        const grade = gradeFromCorrect(correct);
        const card = review(existing, grade, now);
        set((state) => ({
          cards: { ...state.cards, [questionId]: card },
          updatedAt: now,
          cardUpdatedAt: { ...state.cardUpdatedAt, [questionId]: now },
          lastGradeByCard: { ...state.lastGradeByCard, [questionId]: grade },
        }));
        useOutboxStore.getState().queueSrs({ card, lastGrade: grade, updatedAt: now });
      },

      selectSession: ({ now, dailyGoalMinutes, isPresentable, isExamCard }) => {
        const goal = dailyGoalMinutes ?? useSettingsStore.getState().dailyGoalMinutes;
        const allCards = Object.values(get().cards);
        const idleDays = computeIdleDays(allCards, now);
        return selectDueForSession({ allCards, now, dailyGoalMinutes: goal, idleDays, isPresentable, isExamCard });
      },

      refreshReview: (params) => {
        const session = get().selectSession(params);
        set({ reviewMode: session.mode, reviewHasCards: session.cards.length > 0 });
      },

      mergeRemote: (incoming) => {
        set((state) => {
          const cards = { ...state.cards };
          const cardUpdatedAt = { ...state.cardUpdatedAt };
          const lastGradeByCard = { ...state.lastGradeByCard };
          let updatedAt = state.updatedAt;
          for (const entry of incoming) {
            if (entry.updatedAt <= (cardUpdatedAt[entry.card.id] ?? 0)) continue;
            cards[entry.card.id] = entry.card;
            cardUpdatedAt[entry.card.id] = entry.updatedAt;
            lastGradeByCard[entry.card.id] = entry.lastGrade;
            updatedAt = Math.max(updatedAt, entry.updatedAt);
          }
          return { cards, cardUpdatedAt, lastGradeByCard, updatedAt };
        });
      },

      reset: () => set({ ...INITIAL_SRS_DATA, ...INITIAL_SNAPSHOT }),
    }),
    {
      name: SRS_STORAGE_KEY,
      version: SRS_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: reportHydrationFailure(SRS_STORAGE_KEY),
      // Persist DATA only; the cards are plain serializable FSRS structs. No auth/session material is
      // ever a member of this state (see src/state/README.md).
      partialize: (state): SrsData => ({
        cards: state.cards,
        updatedAt: state.updatedAt,
        cardUpdatedAt: state.cardUpdatedAt,
        lastGradeByCard: state.lastGradeByCard,
      }),
      migrate: (persistedState) => {
        const state = persistedState as Partial<SrsData>;
        return {
          ...INITIAL_SRS_DATA,
          ...state,
          cardUpdatedAt: state.cardUpdatedAt ?? Object.fromEntries(Object.keys(state.cards ?? {}).map((id) => [id, state.updatedAt ?? 0])),
          lastGradeByCard: state.lastGradeByCard ?? {},
        } as SrsState;
      },
    },
  ),
);
