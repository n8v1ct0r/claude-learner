/** @jest-environment node */
//
// FT-1 regression, end to end over the REAL bundled content: exam misses must not starve spaced review.
//
// Before FT-1 the Practice hub indexed only lesson exercises, so none of the exam-register questions a
// mock captures as misses could be loaded. Those cards sorted first (most overdue), filled the session
// cap, resolved to zero questions, and were never graded — so "Start review" opened an empty session on
// every later day and a lesson miss never reached review.
//
// This builds the production catalog (pilot course + the full exam pool) into a real SQLite file,
// reads it through the production content reader, captures a mock's misses exactly as ExamReport does,
// then replays one "Start review" session per day the way the hub launches it.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import '../../content/src/d1-agentic-architecture/course';
import '../../content/src/exams';
import { buildContentDb } from '../../content/scripts/build-sqlite';
import { getCatalog } from '../../content/src/index';
import type { Course } from '../../content/schema/types';
import { createContentReader, type ContentReader } from '../../src/db/content-reader';
import type { SrsCard } from '../../src/engine/srs';
import { DAY_MS, HOUR_MS } from '../../src/engine/time';
import {
  collectPracticeContent,
  indexDeckQuestions,
  resolveSessionQuestions,
  type PracticeContent,
} from '../../src/features/practice/practice-content';
import { useSrsStore } from '../../src/state/srs';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const T0 = Date.UTC(2026, 8, 1, 14);
const GOAL_MINUTES = 10; // → a 20-card session cap

describe('FT-1: exam misses and lesson misses share spaced review', () => {
  let dir: string;
  let sqlite: Database.Database;
  let reader: ContentReader;
  let content: PracticeContent;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'cca-ft1-'));
    const dbPath = join(dir, 'content.db');
    buildContentDb(getCatalog(), dbPath);
    sqlite = new Database(dbPath, { readonly: true });
    reader = createContentReader(drizzle(sqlite));
    const courses = reader
      .listCourses()
      .map((summary) => reader.getCourse(summary.id))
      .filter((course): course is Course => course !== undefined);
    content = collectPracticeContent(courses);
  });

  afterAll(() => {
    sqlite.close();
    rmSync(dir, { recursive: true, force: true });
  });

  beforeEach(() => {
    useSrsStore.getState().reset();
  });

  /** What the hub does: index the deck's questions, then treat "resolves" as "can be presented". */
  function deckView() {
    const index = indexDeckQuestions(content.byId, Object.keys(useSrsStore.getState().cards), (id) =>
      reader.getQuestion(id),
    );
    return { index, isPresentable: (card: SrsCard) => index.has(card.id) };
  }

  it('loads every question a full mock can capture as a miss', () => {
    const mock = reader.getExam('mock-1');
    expect(mock?.questionIds.length).toBeGreaterThanOrEqual(25);
    const ids = mock?.questionIds ?? [];
    // The lesson-only index (the pre-FT-1 behaviour) could load none of them…
    expect(ids.filter((id) => content.byId.has(id))).toEqual([]);
    // …the deck index loads all of them.
    const index = indexDeckQuestions(content.byId, ids, (id) => reader.getQuestion(id));
    expect(ids.filter((id) => !index.has(id))).toEqual([]);
  });

  it('after a mock with 25 misses, a later lesson miss still reaches review and no session is empty', () => {
    const mock = reader.getExam('mock-1');
    const examMisses = (mock?.questionIds ?? []).slice(0, 25).map((id) => reader.getQuestion(id));
    expect(examMisses.every((question) => question !== undefined)).toBe(true);
    // ExamReport's capture: every miss goes into the FSRS deck at submit time.
    for (const question of examMisses) {
      if (question) useSrsStore.getState().recordMistake(question.id, question.conceptId, T0);
    }
    // A few hours later the learner misses a normal lesson question.
    const [lessonQuestion] = content.byId.values();
    useSrsStore.getState().recordMistake(lessonQuestion.id, lessonQuestion.conceptId, T0 + 6 * HOUR_MS);

    const reviewedOn = new Map<string, number>();
    for (const day of [1, 2, 3, 7, 30]) {
      const now = T0 + day * DAY_MS;
      const { index, isPresentable } = deckView();
      useSrsStore.getState().refreshReview({ now, dailyGoalMinutes: GOAL_MINUTES, isPresentable });
      const offersReview = useSrsStore.getState().reviewHasCards;
      const session = useSrsStore.getState().selectSession({ now, dailyGoalMinutes: GOAL_MINUTES, isPresentable });
      const questions = resolveSessionQuestions(session.cards, index);
      const anyDue = Object.values(useSrsStore.getState().cards).some((card) => card.due <= now);

      // Every selected card loads, "Start review" shows exactly when there is something to review,
      // and whenever a card is due the launched session is not empty.
      expect(questions).toHaveLength(session.cards.length);
      expect(offersReview).toBe(questions.length > 0);
      expect(questions.length > 0).toBe(anyDue);

      // The learner answers the whole session (one "Start review" per day).
      for (const question of questions) {
        if (!reviewedOn.has(question.id)) reviewedOn.set(question.id, day);
        useSrsStore.getState().gradeReview(question.id, true, now);
      }
    }

    // The lesson miss is reached on day 2 at the latest, and the exam misses are reviewed (graded),
    // not parked at the head of the queue forever.
    expect(reviewedOn.get(lessonQuestion.id)).toBeLessThanOrEqual(2);
    for (const question of examMisses) {
      if (question) expect(reviewedOn.get(question.id)).toBeLessThanOrEqual(2);
    }
  });

  it('a card nothing can load (a retired id) never fills the session ahead of a lesson miss', () => {
    for (let i = 0; i < 30; i += 1) useSrsStore.getState().recordMistake(`retired-q${i}`, 'retired', T0);
    const [lessonQuestion] = content.byId.values();
    useSrsStore.getState().recordMistake(lessonQuestion.id, lessonQuestion.conceptId, T0 + 6 * HOUR_MS);

    const now = T0 + DAY_MS;
    const { index, isPresentable } = deckView();
    const session = useSrsStore.getState().selectSession({ now, dailyGoalMinutes: GOAL_MINUTES, isPresentable });
    expect(resolveSessionQuestions(session.cards, index).map((question) => question.id)).toEqual([lessonQuestion.id]);
  });
});
