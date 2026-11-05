// content/scripts/build-sqlite.ts — content:build (GC-02 machinery)
//
// Compiles the typed content catalog into a plain, bundle-ready SQLite database at
// content/dist/content.db (opened read-only by the app later via expo-sqlite/drizzle — see
// src/db/content-schema.ts for the mirror), plus content/dist/manifest.json. content/dist/ is
// gitignored: the DB is a build artifact rebuilt in CI, never committed.
//
// Design:
//   - `buildContentDb(catalog, dbPath)` is a PURE function of its inputs: given the same catalog it
//     writes the same rows and stamps the same `content_version` (sha256 of the canonical JSON of the
//     whole catalog). Only `built_at` is wall-clock and it is stored SEPARATELY in the meta table, so
//     it never perturbs the version hash. This is what the build test pins for determinism.
//   - Tables are plain SQL (no extensions, no JSON1 functions required): scalar columns for the fields
//     the app filters on (domain, type, difficulty, concept_id, …) and TEXT columns holding JSON for
//     the per-type payloads (options, answerKey, pairs, blanks, steps, sourceUrls, concept card).
//   - The CLI entry (main) loads the real catalog off disk; the builder itself takes a catalog so it
//     is testable with a fixture. main only runs when this file is the process entrypoint (tsx), never
//     when the build test imports the builder.
//
// better-sqlite3 is a build-time-only devDependency and is never referenced from app/ or src/ runtime
// code, so Metro cannot bundle it.

import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import Database from 'better-sqlite3';

import type { CatalogSnapshot } from '../schema/types';
import type { Course, ExamDomain, Question, QuestionType } from '../schema/zod';

// Bumped only when the DB SHAPE (this DDL) changes — distinct from content_version (which tracks the
// authored content). Lets the app detect an incompatible bundled schema.
const DB_SCHEMA_VERSION = 1;

const EXAM_DOMAINS: readonly ExamDomain[] = ['d1', 'd2', 'd3', 'd4', 'd5'];
const QUESTION_TYPES: readonly QuestionType[] = ['mc', 'multi', 'match', 'cloze', 'order'];

// --- canonicalization + content hash --------------------------------------------------------------

/** Recursively sort object keys (arrays keep order — order is meaningful for options/steps/questionIds). */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) sorted[key] = canonicalize(source[key]);
    return sorted;
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function byId<T extends { id: string }>(a: T, b: T): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Catalog with every collection sorted by id — a stable, order-independent view for hashing + writes. */
function normalizeCatalog(catalog: CatalogSnapshot): CatalogSnapshot {
  return {
    courses: [...catalog.courses].sort(byId),
    units: [...catalog.units].sort(byId),
    lessons: [...catalog.lessons].sort(byId),
    questions: [...catalog.questions].sort(byId),
    exams: [...catalog.exams].sort(byId),
  };
}

/** content_version = sha256 of the canonical JSON of the whole catalog (order-independent). */
export function computeContentVersion(catalog: CatalogSnapshot): string {
  return createHash('sha256').update(canonicalJson(normalizeCatalog(catalog)), 'utf8').digest('hex');
}

// --- counts (manifest + build result) -------------------------------------------------------------

export interface ContentCounts {
  courses: number;
  units: number;
  lessons: number;
  questions: number;
  exams: number;
  mockForms: number;
  miniExams: number;
  questionsByDomain: Record<ExamDomain, number>;
  questionsByType: Record<QuestionType, number>;
}

function zeroBy<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

export function computeCounts(catalog: CatalogSnapshot): ContentCounts {
  const questionsByDomain = zeroBy(EXAM_DOMAINS);
  const questionsByType = zeroBy(QUESTION_TYPES);
  for (const q of catalog.questions) {
    questionsByDomain[q.domain] += 1;
    questionsByType[q.type] += 1;
  }
  return {
    courses: catalog.courses.length,
    units: catalog.units.length,
    lessons: catalog.lessons.length,
    questions: catalog.questions.length,
    exams: catalog.exams.length,
    mockForms: catalog.exams.filter((e) => e.kind === 'mock').length,
    miniExams: catalog.exams.filter((e) => e.kind === 'mini').length,
    questionsByDomain,
    questionsByType,
  };
}

// --- DDL ------------------------------------------------------------------------------------------

const DDL = `
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE courses (
  id          TEXT PRIMARY KEY,
  domain      TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  ord         INTEGER NOT NULL
);

CREATE TABLE units (
  id        TEXT PRIMARY KEY,
  course_id TEXT,
  title     TEXT NOT NULL,
  ord       INTEGER NOT NULL
);

CREATE TABLE lessons (
  id                      TEXT PRIMARY KEY,
  unit_id                 TEXT,
  title                   TEXT NOT NULL,
  ord                     INTEGER NOT NULL,
  concept_id              TEXT NOT NULL,
  concept                 TEXT NOT NULL,
  explain_back            TEXT NOT NULL,
  estimated_seconds_total INTEGER NOT NULL
);

CREATE TABLE concept_key_points (
  lesson_id    TEXT NOT NULL,
  concept_id   TEXT NOT NULL,
  key_point_id TEXT NOT NULL,
  ord          INTEGER NOT NULL,
  text         TEXT NOT NULL,
  PRIMARY KEY (lesson_id, key_point_id)
);

CREATE TABLE questions (
  id                TEXT PRIMARY KEY,
  type              TEXT NOT NULL,
  variant           TEXT,
  domain            TEXT NOT NULL,
  concept_id        TEXT NOT NULL,
  task_statement    TEXT NOT NULL,
  difficulty        INTEGER NOT NULL,
  estimated_seconds INTEGER NOT NULL,
  stem              TEXT NOT NULL,
  explanation       TEXT NOT NULL,
  source_urls       TEXT NOT NULL,
  options           TEXT,
  answer_key        TEXT,
  select_count      INTEGER,
  pairs             TEXT,
  blanks            TEXT,
  steps             TEXT,
  volatile          INTEGER NOT NULL DEFAULT 0,
  variant_of        TEXT,
  misconception_tag TEXT,
  scenario_id       TEXT
);

CREATE TABLE exams (
  id                 TEXT PRIMARY KEY,
  kind               TEXT NOT NULL,
  title              TEXT NOT NULL,
  time_limit_minutes INTEGER NOT NULL,
  scenario_clusters  TEXT
);

CREATE TABLE exam_questions (
  exam_id     TEXT NOT NULL,
  question_id TEXT NOT NULL,
  ord         INTEGER NOT NULL,
  PRIMARY KEY (exam_id, ord)
);

CREATE INDEX idx_questions_domain ON questions (domain);
CREATE INDEX idx_questions_concept ON questions (concept_id);
CREATE INDEX idx_units_course ON units (course_id);
CREATE INDEX idx_lessons_unit ON lessons (unit_id);
CREATE INDEX idx_exam_questions_exam ON exam_questions (exam_id);
`;

// --- row shaping ----------------------------------------------------------------------------------

interface QuestionRow {
  id: string;
  type: string;
  variant: string | null;
  domain: string;
  concept_id: string;
  task_statement: string;
  difficulty: number;
  estimated_seconds: number;
  stem: string;
  explanation: string;
  source_urls: string;
  options: string | null;
  answer_key: string | null;
  select_count: number | null;
  pairs: string | null;
  blanks: string | null;
  steps: string | null;
  volatile: number;
  variant_of: string | null;
  misconception_tag: string | null;
  scenario_id: string | null;
}

function toQuestionRow(q: Question): QuestionRow {
  const row: QuestionRow = {
    id: q.id,
    type: q.type,
    variant: q.variant ?? null,
    domain: q.domain,
    concept_id: q.conceptId,
    task_statement: q.taskStatement,
    difficulty: q.difficulty,
    estimated_seconds: q.estimatedSeconds,
    stem: q.stem,
    explanation: q.explanation,
    source_urls: JSON.stringify(q.sourceUrls),
    options: null,
    answer_key: null,
    select_count: null,
    pairs: null,
    blanks: null,
    steps: null,
    volatile: q.volatile ? 1 : 0,
    variant_of: q.variantOf ?? null,
    misconception_tag: q.misconceptionTag ?? null,
    scenario_id: q.scenarioId ?? null,
  };
  switch (q.type) {
    case 'mc':
      row.options = JSON.stringify(q.options);
      row.answer_key = JSON.stringify(q.answerKey);
      break;
    case 'multi':
      row.options = JSON.stringify(q.options);
      row.answer_key = JSON.stringify(q.answerKey);
      row.select_count = q.selectCount;
      break;
    case 'match':
      // The pairs ARE the answer key (left<->right); no separate answer_key column for match.
      row.pairs = JSON.stringify(q.pairs);
      break;
    case 'cloze':
      row.blanks = JSON.stringify(q.blanks);
      row.answer_key = JSON.stringify(q.answerKey);
      break;
    case 'order':
      row.steps = JSON.stringify(q.steps);
      row.answer_key = JSON.stringify(q.answerKey);
      break;
  }
  return row;
}

// Parent-link maps: units/lessons live nested inside courses, but the flat catalog arrays lose the
// foreign keys, so recover them by walking the course tree. Orphans (an entity authored standalone,
// not under a course) keep a null FK rather than being dropped.
function buildParentMaps(courses: readonly Course[]): {
  unitToCourse: Map<string, string>;
  lessonToUnit: Map<string, string>;
} {
  const unitToCourse = new Map<string, string>();
  const lessonToUnit = new Map<string, string>();
  for (const course of courses) {
    for (const unit of course.units) {
      unitToCourse.set(unit.id, course.id);
      for (const lesson of unit.lessons) lessonToUnit.set(lesson.id, unit.id);
    }
  }
  return { unitToCourse, lessonToUnit };
}

// --- builder --------------------------------------------------------------------------------------

export interface BuildResult {
  dbPath: string;
  contentVersion: string;
  builtAt: string;
  counts: ContentCounts;
}

/**
 * Compile `catalog` into a fresh SQLite database at `dbPath` (overwriting any existing file) and
 * return the manifest data. Pure with respect to content_version: identical catalog in => identical
 * hash out, regardless of authoring/import order.
 */
export function buildContentDb(catalog: CatalogSnapshot, dbPath: string): BuildResult {
  const normalized = normalizeCatalog(catalog);
  const contentVersion = computeContentVersion(normalized);
  const builtAt = new Date().toISOString();
  const counts = computeCounts(normalized);
  const { unitToCourse, lessonToUnit } = buildParentMaps(normalized.courses);

  // Fresh build every time: remove a stale DB (and any rollback-journal sidecar) before writing.
  rmSync(dbPath, { force: true });
  rmSync(`${dbPath}-journal`, { force: true });

  const db = new Database(dbPath);
  try {
    db.exec(DDL);

    const insertMeta = db.prepare('INSERT INTO meta (key, value) VALUES (@key, @value)');
    const insertCourse = db.prepare(
      'INSERT INTO courses (id, domain, title, description, ord) VALUES (@id, @domain, @title, @description, @ord)',
    );
    const insertUnit = db.prepare(
      'INSERT INTO units (id, course_id, title, ord) VALUES (@id, @course_id, @title, @ord)',
    );
    const insertLesson = db.prepare(
      `INSERT INTO lessons (id, unit_id, title, ord, concept_id, concept, explain_back, estimated_seconds_total)
       VALUES (@id, @unit_id, @title, @ord, @concept_id, @concept, @explain_back, @estimated_seconds_total)`,
    );
    const insertKeyPoint = db.prepare(
      `INSERT INTO concept_key_points (lesson_id, concept_id, key_point_id, ord, text)
       VALUES (@lesson_id, @concept_id, @key_point_id, @ord, @text)`,
    );
    const insertQuestion = db.prepare(
      `INSERT INTO questions
         (id, type, variant, domain, concept_id, task_statement, difficulty, estimated_seconds, stem,
          explanation, source_urls, options, answer_key, select_count, pairs, blanks, steps, volatile,
          variant_of, misconception_tag, scenario_id)
       VALUES
         (@id, @type, @variant, @domain, @concept_id, @task_statement, @difficulty, @estimated_seconds,
          @stem, @explanation, @source_urls, @options, @answer_key, @select_count, @pairs, @blanks,
          @steps, @volatile, @variant_of, @misconception_tag, @scenario_id)`,
    );
    const insertExam = db.prepare(
      `INSERT INTO exams (id, kind, title, time_limit_minutes, scenario_clusters)
       VALUES (@id, @kind, @title, @time_limit_minutes, @scenario_clusters)`,
    );
    const insertExamQuestion = db.prepare(
      'INSERT INTO exam_questions (exam_id, question_id, ord) VALUES (@exam_id, @question_id, @ord)',
    );

    const writeAll = db.transaction(() => {
      insertMeta.run({ key: 'content_version', value: contentVersion });
      insertMeta.run({ key: 'built_at', value: builtAt });
      insertMeta.run({ key: 'db_schema_version', value: String(DB_SCHEMA_VERSION) });

      for (const course of normalized.courses) {
        insertCourse.run({
          id: course.id,
          domain: course.domain,
          title: course.title,
          description: course.description,
          ord: course.order,
        });
      }

      for (const unit of normalized.units) {
        insertUnit.run({
          id: unit.id,
          course_id: unitToCourse.get(unit.id) ?? null,
          title: unit.title,
          ord: unit.order,
        });
      }

      for (const lesson of normalized.lessons) {
        insertLesson.run({
          id: lesson.id,
          unit_id: lessonToUnit.get(lesson.id) ?? null,
          title: lesson.title,
          ord: lesson.order,
          concept_id: lesson.concept.conceptId,
          concept: JSON.stringify(lesson.concept),
          explain_back: JSON.stringify(lesson.explainBack),
          estimated_seconds_total: lesson.estimatedSecondsTotal,
        });
        lesson.concept.keyPoints.forEach((kp, index) => {
          insertKeyPoint.run({
            lesson_id: lesson.id,
            concept_id: lesson.concept.conceptId,
            key_point_id: kp.id,
            ord: index,
            text: kp.text,
          });
        });
      }

      for (const q of normalized.questions) insertQuestion.run(toQuestionRow(q));

      for (const exam of normalized.exams) {
        insertExam.run({
          id: exam.id,
          kind: exam.kind,
          title: exam.title,
          time_limit_minutes: exam.timeLimitMinutes,
          scenario_clusters: exam.scenarioClusters ? JSON.stringify(exam.scenarioClusters) : null,
        });
        exam.questionIds.forEach((questionId, index) => {
          insertExamQuestion.run({ exam_id: exam.id, question_id: questionId, ord: index });
        });
      }
    });
    writeAll();
  } finally {
    db.close();
  }

  return { dbPath, contentVersion, builtAt, counts };
}

// --- manifest -------------------------------------------------------------------------------------

export interface ContentManifest {
  content_version: string;
  counts: ContentCounts;
}

export function toManifest(result: BuildResult): ContentManifest {
  return { content_version: result.contentVersion, counts: result.counts };
}

// --- CLI entry ------------------------------------------------------------------------------------

async function main(): Promise<void> {
  // Reuse the shared content loader (also used by content:validate) so build/validate/stats read one
  // authoritative catalog. A module that throws at import yields a partial catalog — abort rather than
  // silently ship an incomplete DB (validate is the primary gate for this; build fails closed too).
  const { loadCatalog } = await import('./lib/load-catalog');
  const { catalog, loadErrors, moduleCount } = await loadCatalog();
  if (loadErrors.length > 0) {
    console.error(
      `content:build — ${loadErrors.length} content module(s) failed to import; aborting (no DB written):`,
    );
    for (const e of loadErrors) console.error(`  - ${e.file}: ${e.error}`);
    process.exit(1);
  }

  const distDir = join(__dirname, '..', 'dist');
  mkdirSync(distDir, { recursive: true });
  const dbPath = join(distDir, 'content.db');

  const result = buildContentDb(catalog, dbPath);
  writeFileSync(
    join(distDir, 'manifest.json'),
    `${JSON.stringify(toManifest(result), null, 2)}\n`,
    'utf8',
  );

  const { counts } = result;
  console.error(`content:build -> ${dbPath}  (${moduleCount} module(s) loaded)`);
  console.error(`  content_version ${result.contentVersion}`);
  console.error(
    `  courses ${counts.courses} · units ${counts.units} · lessons ${counts.lessons} · ` +
      `questions ${counts.questions} (mock forms ${counts.mockForms}, minis ${counts.miniExams})`,
  );
  if (counts.questions === 0) {
    console.error('  note: empty catalog (no content authored yet) — built an empty, valid DB.');
  }
}

const invokedPath = process.argv[1] ?? '';
if (/build-sqlite\.[cm]?[jt]s$/.test(invokedPath)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  });
}
