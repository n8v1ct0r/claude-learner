/** @jest-environment node */
//
// Web content parity. The web build serves content from a JSON snapshot (src/db/content-snapshot.ts)
// instead of opening content.db with expo-sqlite. This test builds the snapshot from the SHIPPED
// database exactly as scripts/build-web-content.ts does, round-trips it through JSON, and proves the
// snapshot reader gives the same answer as the sqlite reader for every course, unit, lesson, question,
// exam, concept and spine step.

import { resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import { createContentReader, type ContentReader } from '../../src/db/content-reader';
import { buildContentSnapshot, createSnapshotReader, type ContentSnapshot } from '../../src/db/content-snapshot';

const SHIPPED_DB = resolve(__dirname, '../../assets/content/content.db');

describe('web content snapshot matches the sqlite reader', () => {
  let sqlite: Database.Database;
  let reader: ContentReader;
  let web: ContentReader;
  let questionIds: string[];
  let conceptIds: string[];
  let spine: string[];

  beforeAll(() => {
    sqlite = new Database(SHIPPED_DB, { readonly: true, fileMustExist: true });
    reader = createContentReader(drizzle(sqlite));
    questionIds = (sqlite.prepare('SELECT id FROM questions ORDER BY id').all() as { id: string }[]).map((r) => r.id);
    conceptIds = (
      sqlite
        .prepare('SELECT DISTINCT concept_id AS id FROM lessons UNION SELECT DISTINCT concept_id AS id FROM questions')
        .all() as { id: string }[]
    ).map((r) => r.id);
    spine = (
      sqlite
        .prepare(
          `SELECT l.id AS id FROM lessons l
           LEFT JOIN units u ON l.unit_id = u.id
           LEFT JOIN courses c ON u.course_id = c.id
           ORDER BY c.ord, u.ord, l.ord`,
        )
        .all() as { id: string }[]
    ).map((r) => r.id);
    const snapshot = JSON.parse(
      JSON.stringify(buildContentSnapshot(reader, questionIds, conceptIds, spine)),
    ) as ContentSnapshot;
    web = createSnapshotReader(snapshot);
  });

  afterAll(() => {
    sqlite.close();
  });

  it('covers the whole bank', () => {
    expect(questionIds).toHaveLength(649);
    expect(spine.length).toBeGreaterThan(0);
  });

  it('lists the same courses and exams', () => {
    expect(web.listCourses()).toEqual(reader.listCourses());
    expect(web.listExams()).toEqual(reader.listExams());
  });

  it('hydrates every course, unit and lesson identically', () => {
    for (const { id } of reader.listCourses()) {
      const course = reader.getCourse(id);
      expect(web.getCourse(id)).toEqual(course);
      for (const unit of course?.units ?? []) {
        expect(web.getUnit(unit.id)).toEqual(reader.getUnit(unit.id));
        for (const lesson of unit.lessons) expect(web.getLesson(lesson.id)).toEqual(reader.getLesson(lesson.id));
      }
    }
  });

  it('returns every question and exam identically', () => {
    for (const id of questionIds) expect(web.getQuestion(id)).toEqual(reader.getQuestion(id));
    for (const { id } of reader.listExams()) expect(web.getExam(id)).toEqual(reader.getExam(id));
  });

  it('walks the same spine and resolves the same concepts', () => {
    expect(web.getFirstLesson()).toEqual(reader.getFirstLesson());
    for (const id of spine) expect(web.getNextLesson(id)?.id).toEqual(reader.getNextLesson(id)?.id);
    for (const id of conceptIds) expect(web.getLessonForConcept(id)?.id).toEqual(reader.getLessonForConcept(id)?.id);
  });

  it('misses the same way on unknown ids', () => {
    expect(web.getLesson('nope')).toBeUndefined();
    expect(web.getQuestion('nope')).toBeUndefined();
    expect(web.getNextLesson('nope')).toBeUndefined();
  });
});
