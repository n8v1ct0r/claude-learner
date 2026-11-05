/** @jest-environment node */
//
// content-reader integration test.
//
// Builds the REAL pilot catalog (course C1 "Agentic Architecture" -> unit C1-U1 "Think in Agents",
// 3 lessons / 30 questions) to a real SQLite file with the production builder, reopens it with
// better-sqlite3 + drizzle, and drives src/db/content-reader.ts — the same factory the app wraps
// around expo-sqlite. Asserts the reader reconstructs the ergonomic content types byte-identically to
// the authored objects (full-lesson round-trip incl. key points), preserves lesson/unit ordering, and
// resolves the global lesson spine (getFirstLesson / getNextLesson).
//
// Runs in a node environment (docblock) because better-sqlite3 is a native module. better-sqlite3's
// drizzle driver and expo-sqlite's are both 'sync' mode, so the reader behaves identically here.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

import { QuestionSchema } from '../../content/schema/zod';
// Importing the pilot course registers its whole tree into the content singleton.
import { c1AgenticArchitecture } from '../../content/src/d1-agentic-architecture/course';
import { l1WorkflowsVsAgents } from '../../content/src/d1-agentic-architecture/c1-u1/l1-workflows-vs-agents';
// Register the production exam pool + all eight exam manifests into this integration catalog.
import '../../content/src/exams';
import { mock1 } from '../../content/src/exams/mock-1';
import { getCatalog } from '../../content/src/index';
import { buildContentDb } from '../../content/scripts/build-sqlite';
import { createContentReader, type ContentReader } from '../../src/db/content-reader';

describe('content-reader — pilot catalog round-trip', () => {
  let dir: string;
  let sqlite: Database.Database;
  let reader: ContentReader;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'cca-reader-'));
    const dbPath = join(dir, 'content.db');
    buildContentDb(getCatalog(), dbPath);
    sqlite = new Database(dbPath, { readonly: true });
    reader = createContentReader(drizzle(sqlite));
  });

  afterAll(() => {
    sqlite.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('lists the pilot course as a summary', () => {
    expect(reader.listCourses()).toEqual([
      {
        id: 'c1',
        domain: 'd1',
        title: c1AgenticArchitecture.title,
        description: c1AgenticArchitecture.description,
        order: 1,
      },
    ]);
  });

  it('hydrates the full course tree (units -> lessons -> exercises)', () => {
    const course = reader.getCourse('c1');
    expect(course).toEqual(c1AgenticArchitecture);
  });

  it('hydrates a unit with its lessons in order', () => {
    const unit = reader.getUnit('c1-u1');
    expect(unit?.id).toBe('c1-u1');
    expect(unit?.lessons.map((l) => l.id)).toEqual(['c1-u1-l1', 'c1-u1-l2', 'c1-u1-l3']);
  });

  it('reconstructs a lesson byte-identically to the authored object (key points intact)', () => {
    const lesson = reader.getLesson('c1-u1-l1');
    expect(lesson).toEqual(l1WorkflowsVsAgents);
    // Key-point round-trip called out explicitly:
    expect(lesson?.concept.keyPoints).toEqual(l1WorkflowsVsAgents.concept.keyPoints);
    expect(lesson?.concept.keyPoints).toHaveLength(4);
  });

  it('reconstructs every exercise as a schema-valid Question of the right shape', () => {
    const lesson = reader.getLesson('c1-u1-l1');
    expect(lesson?.exercises).toHaveLength(10);
    for (const exercise of lesson?.exercises ?? []) {
      // The reconstructed union member re-validates against the authoring schema.
      expect(() => QuestionSchema.parse(exercise)).not.toThrow();
    }
    const byType = new Map(lesson?.exercises.map((e) => [e.id, e.type]));
    expect(byType.get('c1-u1-l1-q01')).toBe('mc');
    expect(byType.get('c1-u1-l1-q07')).toBe('multi');
    expect(byType.get('c1-u1-l1-q09')).toBe('order');

    const multi = lesson?.exercises.find((e) => e.id === 'c1-u1-l1-q07');
    const authoredMulti = l1WorkflowsVsAgents.exercises.find((e) => e.id === 'c1-u1-l1-q07');
    expect(multi?.type === 'multi' && multi.selectCount).toBe(2);
    expect(multi?.type === 'multi' && multi.answerKey).toEqual(
      authoredMulti?.type === 'multi' ? authoredMulti.answerKey : [],
    );

    const order = lesson?.exercises.find((e) => e.id === 'c1-u1-l1-q09');
    expect(order?.type === 'order' && Array.isArray(order.steps)).toBe(true);
    expect(order?.type === 'order' && order.answerKey).toEqual([0, 1, 2]);
  });

  it('returns exercises in ascending id (authored) order', () => {
    const ids = reader.getLesson('c1-u1-l1')?.exercises.map((e) => e.id) ?? [];
    expect(ids).toEqual([...ids].sort());
    expect(ids[0]).toBe('c1-u1-l1-q01');
    expect(ids[ids.length - 1]).toBe('c1-u1-l1-q10');
  });

  it('resolves the global lesson spine for cold-open resume', () => {
    expect(reader.getFirstLesson()?.id).toBe('c1-u1-l1');
    expect(reader.getNextLesson('c1-u1-l1')?.id).toBe('c1-u1-l2');
    expect(reader.getNextLesson('c1-u1-l2')?.id).toBe('c1-u1-l3');
    expect(reader.getNextLesson('c1-u1-l3')?.id).toBe('c1-u2-l1');
    expect(reader.getNextLesson('c1-u5-l3')).toBeUndefined();
    expect(reader.getNextLesson('does-not-exist')).toBeUndefined();
  });

  it('lists and hydrates all production exams with ordered question references', () => {
    const summaries = reader.listExams();
    expect(summaries).toHaveLength(8);
    expect(summaries.filter((exam) => exam.kind === 'mock')).toHaveLength(3);
    expect(summaries.filter((exam) => exam.kind === 'mini')).toHaveLength(5);
    expect(summaries.find((exam) => exam.id === 'mock-1')).toEqual({
      id: 'mock-1',
      kind: 'mock',
      title: mock1.title,
      timeLimitMinutes: 120,
      questionCount: 60,
    });
    expect(reader.getExam('mock-1')).toEqual(mock1);
    expect(reader.getQuestion(mock1.questionIds[0])?.id).toBe(mock1.questionIds[0]);
  });

  it('resolves exam concepts back to a teaching lesson when one exists', () => {
    const question = reader.getQuestion('reg-d1-q01');
    expect(question).toBeDefined();
    expect(reader.getLessonForConcept(question?.conceptId ?? '')?.concept.conceptId).toBe(question?.conceptId);
  });

  it('returns undefined for unknown ids', () => {
    expect(reader.getLesson('nope')).toBeUndefined();
    expect(reader.getUnit('nope')).toBeUndefined();
    expect(reader.getCourse('nope')).toBeUndefined();
    expect(reader.getQuestion('nope')).toBeUndefined();
    expect(reader.getExam('nope')).toBeUndefined();
    expect(reader.getLessonForConcept('nope')).toBeUndefined();
  });
});
