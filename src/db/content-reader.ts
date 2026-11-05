// src/db/content-reader.ts
//
// The typed, read-only API the app uses to read the bundled content database (content/dist/content.db
// copied to assets/content/content.db — see content-provider.tsx). It reconstructs the ergonomic
// content/schema types (Lesson, Question, Unit, Course) from the normalized rows built by
// content/scripts/build-sqlite.ts, parsing the JSON columns back into their typed payloads.
//
// Design:
//   - This module is a PURE FACTORY over a drizzle SQLite client: `createContentReader(db)`. It has
//     ZERO react-native / expo imports and no I/O of its own, so it runs unchanged both in the app
//     (drizzle over expo-sqlite) and in Node tests (drizzle over better-sqlite3). Both drizzle SQLite
//     drivers are 'sync' mode, so every query returns synchronously.
//   - The content types are imported TYPE-ONLY (via src/db/content-schema.ts and content/schema), so
//     Metro never bundles the authoring sources or zod — only the row shapes are borrowed.
//   - The database is trusted (it was validated at authoring time by content:validate / GC-01), so the
//     reader does not re-validate with zod; it reconstructs the discriminated Question union directly
//     from the columns.
//
// Lesson <-> exercises association: the builder stores a lesson's concept_id and stores each question's
// concept_id, but there is no per-question lesson foreign key. A lesson's exercises are therefore the
// questions sharing its concept_id (the builder even indexes questions.concept_id for exactly this).
// Within a lesson, questions are returned in ascending id order, which is the zero-padded authored
// order (q01..q10). See the reader test for the round-trip proof.

import { and, eq, like } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type { Course, Exam, Lesson, Question, Unit } from '../../content/schema/types';

import { courses, examQuestions, exams, lessons, questions, units } from './content-schema';

/**
 * A drizzle SQLite client in 'sync' mode. Satisfied by both `drizzle-orm/expo-sqlite` (the app) and
 * `drizzle-orm/better-sqlite3` (Node tests) — both extend `BaseSQLiteDatabase<'sync', ...>`.
 */
export type ContentDrizzleDb = BaseSQLiteDatabase<'sync', unknown>;

/** Lightweight course row for a course-list screen (no nested units hydrated). */
export type CourseSummary = Pick<Course, 'id' | 'domain' | 'title' | 'description' | 'order'>;
export type ExamSummary = Pick<Exam, 'id' | 'kind' | 'title' | 'timeLimitMinutes'> & { questionCount: number };

export interface ContentReader {
  /** Every course, lightweight (id/domain/title/description/order), ordered by course order. */
  listCourses(): CourseSummary[];
  /** A fully-hydrated course (units -> lessons -> exercises), or undefined if the id is unknown. */
  getCourse(id: string): Course | undefined;
  /** A fully-hydrated unit (lessons -> exercises), or undefined if the id is unknown. */
  getUnit(id: string): Unit | undefined;
  /** A fully-hydrated lesson (concept card, exercises, explain-back), or undefined if unknown. */
  getLesson(id: string): Lesson | undefined;
  /** The first lesson in the global spine (course order -> unit order -> lesson order). */
  getFirstLesson(): Lesson | undefined;
  /** The lesson immediately after `afterLessonId` in the global spine, or undefined at the end. */
  getNextLesson(afterLessonId: string): Lesson | undefined;
  /** A question by its append-only id, including standalone mock-register questions. */
  getQuestion(id: string): Question | undefined;
  /** Every bundled mock/mini exam with its question count. */
  listExams(): ExamSummary[];
  /** A bundled exam with ordered question references, or undefined when unknown. */
  getExam(id: string): Exam | undefined;
  /** Resolve a question concept back to its teaching lesson for report relearn links. */
  getLessonForConcept(conceptId: string): Lesson | undefined;
}

type QuestionRow = typeof questions.$inferSelect;

// Rebuild the discriminated Question union from a flat row. Optional fields are OMITTED when null so
// the reconstruction is byte-identical to the zod-parsed authored object (round-trip fidelity).
function rowToQuestion(row: QuestionRow): Question {
  const base = {
    id: row.id,
    domain: row.domain,
    conceptId: row.conceptId,
    taskStatement: row.taskStatement,
    difficulty: row.difficulty,
    estimatedSeconds: row.estimatedSeconds,
    stem: row.stem,
    explanation: row.explanation,
    sourceUrls: row.sourceUrls,
    ...(row.variant ? { variant: row.variant } : {}),
    ...(row.volatile ? { volatile: true } : {}),
    ...(row.variantOf ? { variantOf: row.variantOf } : {}),
    ...(row.misconceptionTag ? { misconceptionTag: row.misconceptionTag } : {}),
    ...(row.scenarioId ? { scenarioId: row.scenarioId } : {}),
  };

  switch (row.type) {
    case 'mc':
      return { ...base, type: 'mc', options: row.options ?? [], answerKey: row.answerKey as number };
    case 'multi':
      return {
        ...base,
        type: 'multi',
        options: row.options ?? [],
        selectCount: row.selectCount as 2 | 3,
        answerKey: row.answerKey as number[],
      };
    case 'match':
      return { ...base, type: 'match', pairs: row.pairs ?? [] };
    case 'cloze':
      return { ...base, type: 'cloze', blanks: row.blanks ?? [], answerKey: row.answerKey as number[] };
    case 'order':
      return { ...base, type: 'order', steps: row.steps ?? [], answerKey: row.answerKey as number[] };
  }
}

export function createContentReader(db: ContentDrizzleDb): ContentReader {
  // Content is immutable for the lifetime of an open db, so memoize the hydrated trees. `undefined`
  // (a genuine miss) is cached too, via a sentinel wrapper, to avoid re-querying unknown ids.
  const lessonCache = new Map<string, Lesson | undefined>();
  const unitCache = new Map<string, Unit | undefined>();
  const courseCache = new Map<string, Course | undefined>();
  const questionCache = new Map<string, Question | undefined>();
  const examCache = new Map<string, Exam | undefined>();
  let orderedLessonIdsCache: string[] | undefined;

  function exercisesForLesson(lessonId: string, conceptId: string): Question[] {
    // Exam-register questions deliberately reuse teaching concept IDs so reports can deep-link back
    // to instruction. They are NOT lesson exercises. Authored lesson question IDs are namespaced by
    // the lesson ID, so constrain both fields to prevent the standalone exam pool from leaking into
    // normal lessons (153 questions would otherwise be duplicated across the path).
    const rows = db
      .select()
      .from(questions)
      .where(and(eq(questions.conceptId, conceptId), like(questions.id, `${lessonId}-q%`)))
      .orderBy(questions.id)
      .all();
    return rows.map(rowToQuestion);
  }

  function getQuestion(id: string): Question | undefined {
    if (questionCache.has(id)) return questionCache.get(id);
    const row = db.select().from(questions).where(eq(questions.id, id)).get();
    const question = row ? rowToQuestion(row) : undefined;
    questionCache.set(id, question);
    return question;
  }

  function getLesson(id: string): Lesson | undefined {
    if (lessonCache.has(id)) return lessonCache.get(id);
    const row = db.select().from(lessons).where(eq(lessons.id, id)).get();
    const lesson: Lesson | undefined = row
      ? {
          id: row.id,
          title: row.title,
          order: row.ord,
          concept: row.concept,
          exercises: exercisesForLesson(row.id, row.conceptId),
          explainBack: row.explainBack,
          estimatedSecondsTotal: row.estimatedSecondsTotal,
        }
      : undefined;
    lessonCache.set(id, lesson);
    return lesson;
  }

  function getUnit(id: string): Unit | undefined {
    if (unitCache.has(id)) return unitCache.get(id);
    const row = db.select().from(units).where(eq(units.id, id)).get();
    let unit: Unit | undefined;
    if (row) {
      const lessonRows = db
        .select({ id: lessons.id })
        .from(lessons)
        .where(eq(lessons.unitId, id))
        .orderBy(lessons.ord)
        .all();
      const hydrated = lessonRows
        .map((r) => getLesson(r.id))
        .filter((l): l is Lesson => l !== undefined);
      unit = { id: row.id, title: row.title, order: row.ord, lessons: hydrated };
    }
    unitCache.set(id, unit);
    return unit;
  }

  function getCourse(id: string): Course | undefined {
    if (courseCache.has(id)) return courseCache.get(id);
    const row = db.select().from(courses).where(eq(courses.id, id)).get();
    let course: Course | undefined;
    if (row) {
      const unitRows = db
        .select({ id: units.id })
        .from(units)
        .where(eq(units.courseId, id))
        .orderBy(units.ord)
        .all();
      const hydrated = unitRows
        .map((r) => getUnit(r.id))
        .filter((u): u is Unit => u !== undefined);
      course = {
        id: row.id,
        domain: row.domain,
        title: row.title,
        description: row.description,
        order: row.ord,
        units: hydrated,
      };
    }
    courseCache.set(id, course);
    return course;
  }

  function listCourses(): CourseSummary[] {
    return db
      .select({
        id: courses.id,
        domain: courses.domain,
        title: courses.title,
        description: courses.description,
        order: courses.ord,
      })
      .from(courses)
      .orderBy(courses.ord)
      .all();
  }

  // The global lesson spine: every lesson ordered by course order, then unit order, then lesson order.
  // Orphan lessons (null unit/course FK) sort first under SQLite's ASC null ordering.
  function orderedLessonIds(): string[] {
    if (orderedLessonIdsCache) return orderedLessonIdsCache;
    const rows = db
      .select({ id: lessons.id, courseOrd: courses.ord, unitOrd: units.ord, lessonOrd: lessons.ord })
      .from(lessons)
      .leftJoin(units, eq(lessons.unitId, units.id))
      .leftJoin(courses, eq(units.courseId, courses.id))
      .orderBy(courses.ord, units.ord, lessons.ord)
      .all();
    orderedLessonIdsCache = rows.map((r) => r.id);
    return orderedLessonIdsCache;
  }

  function getFirstLesson(): Lesson | undefined {
    const [first] = orderedLessonIds();
    return first ? getLesson(first) : undefined;
  }

  function getNextLesson(afterLessonId: string): Lesson | undefined {
    const ids = orderedLessonIds();
    const index = ids.indexOf(afterLessonId);
    if (index < 0 || index + 1 >= ids.length) return undefined;
    return getLesson(ids[index + 1]);
  }

  function listExams(): ExamSummary[] {
    return db
      .select({
        id: exams.id,
        kind: exams.kind,
        title: exams.title,
        timeLimitMinutes: exams.timeLimitMinutes,
      })
      .from(exams)
      .orderBy(exams.kind, exams.id)
      .all()
      .map((exam) => ({
        ...exam,
        questionCount: db
          .select({ id: examQuestions.questionId })
          .from(examQuestions)
          .where(eq(examQuestions.examId, exam.id))
          .all().length,
      }));
  }

  function getExam(id: string): Exam | undefined {
    if (examCache.has(id)) return examCache.get(id);
    const row = db.select().from(exams).where(eq(exams.id, id)).get();
    const exam: Exam | undefined = row
      ? {
          id: row.id,
          kind: row.kind,
          title: row.title,
          timeLimitMinutes: row.timeLimitMinutes,
          questionIds: db
            .select({ id: examQuestions.questionId })
            .from(examQuestions)
            .where(eq(examQuestions.examId, id))
            .orderBy(examQuestions.ord)
            .all()
            .map((ref) => ref.id),
          ...(row.scenarioClusters ? { scenarioClusters: row.scenarioClusters } : {}),
        }
      : undefined;
    examCache.set(id, exam);
    return exam;
  }

  function getLessonForConcept(conceptId: string): Lesson | undefined {
    const row = db.select({ id: lessons.id }).from(lessons).where(eq(lessons.conceptId, conceptId)).get();
    return row ? getLesson(row.id) : undefined;
  }

  // Key points are read from the lesson's concept JSON column (getLesson above); the normalized
  // concept_key_points table is a query/round-trip mirror and is not part of the reconstruction path.
  return {
    listCourses,
    getCourse,
    getUnit,
    getLesson,
    getFirstLesson,
    getNextLesson,
    getQuestion,
    listExams,
    getExam,
    getLessonForConcept,
  };
}
