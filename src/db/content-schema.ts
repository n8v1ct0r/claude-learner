// src/db/content-schema.ts
//
// Drizzle table definitions the APP uses to READ the bundled content database
// (content/dist/content.db, produced by content/scripts/build-sqlite.ts and opened read-only via
// expo-sqlite/drizzle). This is a hand-kept MIRROR of that builder's DDL — column names, types, and
// nullability match one-to-one. It is typecheck-only in M2: nothing wires a drizzle client to these
// tables yet (that lands with the content-reader in a later milestone). Keep it in lockstep with the
// DDL string in build-sqlite.ts; a drift there is a read bug in the app.
//
// The content types below are imported TYPE-ONLY, so this file adds no runtime dependency on content/
// and Metro never bundles the authoring sources — it only borrows the shapes to type the JSON columns.

import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type {
  ClozeQuestion,
  ConceptCard,
  Difficulty,
  Domain,
  ExamDomain,
  ExplainBack,
  MatchQuestion,
  QuestionType,
  QuestionVariant,
  ScenarioCluster,
} from '../../content/schema/types';

/** Key/value build metadata: `content_version` (sha256 of the catalog), `built_at`, `db_schema_version`. */
export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const courses = sqliteTable('courses', {
  id: text('id').primaryKey(),
  domain: text('domain').$type<Domain>().notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  ord: integer('ord').notNull(),
});

export const units = sqliteTable('units', {
  id: text('id').primaryKey(),
  courseId: text('course_id'),
  title: text('title').notNull(),
  ord: integer('ord').notNull(),
});

export const lessons = sqliteTable('lessons', {
  id: text('id').primaryKey(),
  unitId: text('unit_id'),
  title: text('title').notNull(),
  ord: integer('ord').notNull(),
  conceptId: text('concept_id').notNull(),
  concept: text('concept', { mode: 'json' }).$type<ConceptCard>().notNull(),
  explainBack: text('explain_back', { mode: 'json' }).$type<ExplainBack>().notNull(),
  estimatedSecondsTotal: integer('estimated_seconds_total').notNull(),
});

export const conceptKeyPoints = sqliteTable(
  'concept_key_points',
  {
    lessonId: text('lesson_id').notNull(),
    conceptId: text('concept_id').notNull(),
    keyPointId: text('key_point_id').notNull(),
    ord: integer('ord').notNull(),
    text: text('text').notNull(),
  },
  (table) => [primaryKey({ columns: [table.lessonId, table.keyPointId] })],
);

export const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  type: text('type').$type<QuestionType>().notNull(),
  variant: text('variant').$type<QuestionVariant>(),
  domain: text('domain').$type<ExamDomain>().notNull(),
  conceptId: text('concept_id').notNull(),
  taskStatement: text('task_statement').notNull(),
  difficulty: integer('difficulty').$type<Difficulty>().notNull(),
  estimatedSeconds: integer('estimated_seconds').notNull(),
  stem: text('stem').notNull(),
  explanation: text('explanation').notNull(),
  sourceUrls: text('source_urls', { mode: 'json' }).$type<string[]>().notNull(),
  // Per-type payloads, null when not applicable to the question's type:
  options: text('options', { mode: 'json' }).$type<string[]>(), // mc | multi
  answerKey: text('answer_key', { mode: 'json' }).$type<number | number[]>(), // mc | multi | cloze | order
  selectCount: integer('select_count'), // multi
  pairs: text('pairs', { mode: 'json' }).$type<MatchQuestion['pairs']>(), // match (pairs are the key)
  blanks: text('blanks', { mode: 'json' }).$type<ClozeQuestion['blanks']>(), // cloze
  steps: text('steps', { mode: 'json' }).$type<string[]>(), // order
  volatile: integer('volatile').notNull().default(0),
  variantOf: text('variant_of'),
  misconceptionTag: text('misconception_tag'),
  scenarioId: text('scenario_id'),
});

export const exams = sqliteTable('exams', {
  id: text('id').primaryKey(),
  kind: text('kind').$type<'mock' | 'mini'>().notNull(),
  title: text('title').notNull(),
  timeLimitMinutes: integer('time_limit_minutes').notNull(),
  scenarioClusters: text('scenario_clusters', { mode: 'json' }).$type<ScenarioCluster[]>(),
});

/** Join table preserving exam question order via `ord` (0-based). */
export const examQuestions = sqliteTable(
  'exam_questions',
  {
    examId: text('exam_id').notNull(),
    questionId: text('question_id').notNull(),
    ord: integer('ord').notNull(),
  },
  (table) => [primaryKey({ columns: [table.examId, table.ord] })],
);

export type ContentDbSchema = {
  meta: typeof meta;
  courses: typeof courses;
  units: typeof units;
  lessons: typeof lessons;
  conceptKeyPoints: typeof conceptKeyPoints;
  questions: typeof questions;
  exams: typeof exams;
  examQuestions: typeof examQuestions;
};
