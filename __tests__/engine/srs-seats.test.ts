// __tests__/engine/srs-seats.test.ts — exam misses must not crowd lesson misses out of review.
//
// A mock can add dozens of misses at once. In most-overdue order they took whole sessions, so a lesson
// miss made later waited days for its first review (day 7 with 60 exam misses and a 5-minute goal).
// While lesson misses are due, exam misses may take at most half the session's seats (rounded up).

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { createCard, GRADE, review, selectDueForSession, WARMUP_MAX_CARDS, type SrsCard } from '@/engine/srs';
import { DAY_MS, HOUR_MS } from '@/engine/time';
import { useSrsStore } from '@/state/srs';

const T0 = Date.UTC(2026, 8, 1, 14);
const LESSON_MISS = 'c1-u1-l1-q01';
/** The caller tells them apart (the Practice hub: "not a lesson exercise"); here by the register prefix. */
const isExamCard = (card: SrsCard): boolean => card.id.startsWith('reg-');

/** The first day (1-based) a review session includes the lesson miss, reviewing every card shown. */
function firstDayLessonMissIsReviewed(examMisses: number, goalMinutes: number): number {
  useSrsStore.getState().reset();
  for (let i = 0; i < examMisses; i += 1) useSrsStore.getState().recordMistake(`reg-q${i}`, 'concept-exam', T0);
  useSrsStore.getState().recordMistake(LESSON_MISS, 'concept-lesson', T0 + 6 * HOUR_MS);
  for (let day = 1; day <= 30; day += 1) {
    const now = T0 + day * DAY_MS;
    const session = useSrsStore.getState().selectSession({ now, dailyGoalMinutes: goalMinutes, isExamCard });
    for (const card of session.cards) {
      if (card.id === LESSON_MISS) return day;
      useSrsStore.getState().gradeReview(card.id, true, now);
    }
  }
  return -1;
}

/** A card missed once at `at` (due shortly after). */
function missed(id: string, at: number): SrsCard {
  return review(createCard(id, 'concept', 'question', at), GRADE.AGAIN, at);
}

beforeEach(() => {
  useSrsStore.getState().reset();
});

describe('seats for lesson misses (review sessions)', () => {
  it('reviews a lesson miss in the first session after a 60-miss mock, even on a 5-minute goal', () => {
    expect(firstDayLessonMissIsReviewed(60, 5)).toBe(1);
  });

  it.each([
    [25, 5],
    [25, 10],
    [60, 10],
  ])('reviews it in the first session with %i exam misses and a %i-minute goal', (examMisses, goal) => {
    expect(firstDayLessonMissIsReviewed(examMisses, goal)).toBe(1);
  });

  it('gives exam misses at most half the seats (rounded up) while lesson misses are due', () => {
    const now = T0 + DAY_MS;
    const exam = Array.from({ length: 60 }, (_, i) => missed(`reg-q${i}`, T0));
    const lesson = [missed('c1-u1-l1-q01', T0 + HOUR_MS), missed('c1-u1-l1-q02', T0 + HOUR_MS), missed('c1-u1-l1-q03', T0 + HOUR_MS)];

    const tenMinutes = selectDueForSession({ allCards: [...exam, ...lesson], now, dailyGoalMinutes: 10, idleDays: 0, isExamCard });
    expect(tenMinutes.cap).toBe(20);
    expect(tenMinutes.cards.filter(isExamCard)).toHaveLength(10);
    expect(tenMinutes.cards.filter((card) => !isExamCard(card)).map((card) => card.id)).toEqual(lesson.map((card) => card.id));

    // An odd cap rounds the exam share up: 5 seats -> 3 for exam misses.
    const oddCap = selectDueForSession({ allCards: [...exam, ...lesson], now, dailyGoalMinutes: 5, cardsPerMinute: 1, idleDays: 0, isExamCard });
    expect(oddCap.cap).toBe(5);
    expect(oddCap.cards.filter(isExamCard)).toHaveLength(3);
    expect(oddCap.cards).toHaveLength(5);
  });

  it('lets exam misses take every seat when no lesson miss is due', () => {
    const now = T0 + DAY_MS;
    const exam = Array.from({ length: 60 }, (_, i) => missed(`reg-q${i}`, T0));
    const session = selectDueForSession({ allCards: exam, now, dailyGoalMinutes: 10, idleDays: 0, isExamCard });
    expect(session.cards).toHaveLength(20);
    expect(session.cards.every(isExamCard)).toBe(true);
  });

  it('applies the same seats to the welcome-back warmup', () => {
    const now = T0 + 9 * DAY_MS;
    const exam = Array.from({ length: 60 }, (_, i) => missed(`reg-q${i}`, T0));
    const lesson = missed(LESSON_MISS, T0 + HOUR_MS);
    const warmup = selectDueForSession({ allCards: [...exam, lesson], now, dailyGoalMinutes: 10, idleDays: 9, isExamCard });
    expect(warmup.mode).toBe('warmup');
    expect(warmup.cards.map((card) => card.id)).toContain(LESSON_MISS);
    expect(warmup.cards.filter(isExamCard)).toHaveLength(Math.ceil(WARMUP_MAX_CARDS / 2));
  });

  it('changes nothing for a caller that does not tell exam misses apart', () => {
    const now = T0 + DAY_MS;
    const exam = Array.from({ length: 30 }, (_, i) => missed(`reg-q${i}`, T0));
    const lesson = missed(LESSON_MISS, T0 + HOUR_MS);
    const session = selectDueForSession({ allCards: [...exam, lesson], now, dailyGoalMinutes: 10, idleDays: 0 });
    expect(session.cards).toHaveLength(20);
    expect(session.cards.map((card) => card.id)).not.toContain(LESSON_MISS);
  });
});
