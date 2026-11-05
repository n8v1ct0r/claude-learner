/** @jest-environment node */
//
// content:build integration test (GC-02 machinery).
//
// Builds a tiny hand-written fixture catalog to a real SQLite file with the production builder, reopens
// it with better-sqlite3, and asserts the tables, rows, foreign keys, exam-question ordering, per-type
// payload columns, and — the load-bearing property — that content_version is deterministic: the same
// catalog (in any array order) hashes identically, and a changed catalog hashes differently.
//
// This test drives buildContentDb with an explicit fixture, so it never touches the on-disk content
// loader or the singleton registry. Runs in a node environment (docblock above) because better-sqlite3
// is a native module.

import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import Database from 'better-sqlite3';

import type { CatalogSnapshot } from '../../content/schema/types';
import type {
  ConceptCard,
  Course,
  Exam,
  ExplainBack,
  Lesson,
  McQuestion,
  OrderQuestion,
  Unit,
} from '../../content/schema/zod';
import { buildContentDb, computeContentVersion } from '../../content/scripts/build-sqlite';

const SRC = 'https://www.anthropic.com/engineering/building-effective-agents';

const mc: McQuestion = {
  id: 'c1-u1-l1-q01',
  type: 'mc',
  domain: 'd1',
  conceptId: 'workflows-vs-agents',
  taskStatement: '1.1',
  difficulty: 2,
  estimatedSeconds: 20,
  stem: 'A team needs a predictable fixed-stage pipeline. Which design fits best?',
  options: [
    'A workflow with predefined code paths',
    'An autonomous agent loop that decides each step',
    'A single prompt with no tools',
    'A multi-agent swarm with no coordinator',
  ],
  answerKey: 0,
  explanation: 'Workflows suit predictable, fixed sequences.',
  sourceUrls: [SRC],
};

const order: OrderQuestion = {
  id: 'c1-u1-l1-q06',
  type: 'order',
  domain: 'd1',
  conceptId: 'workflows-vs-agents',
  taskStatement: '1.1',
  difficulty: 3,
  estimatedSeconds: 30,
  stem: 'Put the agentic-loop steps in order.',
  steps: ['Gather context', 'Take an action', 'Observe the result', 'Decide whether to stop'],
  answerKey: [0, 1, 2, 3],
  explanation: 'Gather, act, observe, decide.',
  sourceUrls: [SRC],
};

// A standalone exam-register question (not embedded in a lesson).
const registerMc: McQuestion = {
  id: 'd2-tools-q01',
  type: 'mc',
  domain: 'd2',
  conceptId: 'tool-anatomy',
  taskStatement: '2.1',
  difficulty: 1,
  estimatedSeconds: 20,
  stem: 'What is the primary tool-selection lever?',
  options: ['The tool description', 'The tool name length', 'The order of tools', 'The model temperature'],
  answerKey: 0,
  explanation: 'Descriptions drive selection.',
  sourceUrls: [SRC],
};

const concept: ConceptCard = {
  conceptId: 'workflows-vs-agents',
  analogy: 'A workflow is a train on rails; an agent is a driver choosing roads.',
  plainExplanation: 'Workflows follow predefined paths. Agents let the model decide the next step.',
  examWords: ['workflow', 'agent', 'agentic loop'],
  keyPoints: [
    { id: 'kp-workflows-vs-agents-1', text: 'A workflow runs predefined code paths.' },
    { id: 'kp-workflows-vs-agents-2', text: 'An agent lets the model direct its own steps.' },
    { id: 'kp-workflows-vs-agents-3', text: 'Prefer the simplest option that meets the need.' },
  ],
};

const explainBack: ExplainBack = {
  prompt: 'Teach Archie: when would you choose a workflow over an agent?',
  conceptId: 'workflows-vs-agents',
  keyPointIds: [
    'kp-workflows-vs-agents-1',
    'kp-workflows-vs-agents-2',
    'kp-workflows-vs-agents-3',
  ],
  estimatedSeconds: 90,
};

const lesson: Lesson = {
  id: 'c1-u1-l1',
  title: 'Workflows vs agents',
  order: 0,
  concept,
  exercises: [mc, order],
  explainBack,
  estimatedSecondsTotal: 140,
};

const unit: Unit = { id: 'c1-u1', title: 'Think in Agents', order: 0, lessons: [lesson] };

const course: Course = {
  id: 'c1',
  domain: 'd1',
  title: 'Agentic Architecture & Orchestration',
  description: 'Workflows vs agents and the agentic loop.',
  order: 1,
  units: [unit],
};

// Mock exam references the two lesson questions in REVERSE natural-sort order, to prove exam_questions
// preserves the authored order rather than any sorted order.
const mockExam: Exam = {
  id: 'mock-form-a',
  kind: 'mock',
  title: 'Mock Exam — Form A',
  questionIds: ['c1-u1-l1-q06', 'c1-u1-l1-q01'],
  timeLimitMinutes: 120,
};

function fixtureCatalog(): CatalogSnapshot {
  return {
    courses: [course],
    units: [unit],
    lessons: [lesson],
    questions: [mc, order, registerMc],
    exams: [mockExam],
  };
}

describe('build-sqlite — fixture build', () => {
  let dir: string;
  let dbPath: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'cca-build-'));
    dbPath = join(dir, 'content.db');
    buildContentDb(fixtureCatalog(), dbPath);
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes the db file', () => {
    expect(existsSync(dbPath)).toBe(true);
  });

  it('creates exactly the expected tables', () => {
    const db = new Database(dbPath, { readonly: true });
    const names = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((r) => (r as { name: string }).name);
    db.close();
    expect(names).toEqual([
      'concept_key_points',
      'courses',
      'exam_questions',
      'exams',
      'lessons',
      'meta',
      'questions',
      'units',
    ]);
  });

  it('inserts the expected row counts', () => {
    const db = new Database(dbPath, { readonly: true });
    const count = (t: string): number =>
      (db.prepare(`SELECT count(*) AS c FROM ${t}`).get() as { c: number }).c;
    const counts = {
      courses: count('courses'),
      units: count('units'),
      lessons: count('lessons'),
      questions: count('questions'),
      exams: count('exams'),
      examQuestions: count('exam_questions'),
      keyPoints: count('concept_key_points'),
      meta: count('meta'),
    };
    db.close();
    expect(counts).toEqual({
      courses: 1,
      units: 1,
      lessons: 1,
      questions: 3,
      exams: 1,
      examQuestions: 2,
      keyPoints: 3,
      meta: 3,
    });
  });

  it('recovers course/unit foreign keys from the tree', () => {
    const db = new Database(dbPath, { readonly: true });
    const u = db.prepare('SELECT course_id FROM units WHERE id = ?').get('c1-u1') as {
      course_id: string | null;
    };
    const l = db.prepare('SELECT unit_id FROM lessons WHERE id = ?').get('c1-u1-l1') as {
      unit_id: string | null;
    };
    db.close();
    expect(u.course_id).toBe('c1');
    expect(l.unit_id).toBe('c1-u1');
  });

  it('preserves authored exam question order', () => {
    const db = new Database(dbPath, { readonly: true });
    const ids = db
      .prepare('SELECT question_id FROM exam_questions WHERE exam_id = ? ORDER BY ord')
      .all('mock-form-a')
      .map((r) => (r as { question_id: string }).question_id);
    db.close();
    expect(ids).toEqual(['c1-u1-l1-q06', 'c1-u1-l1-q01']);
  });

  it('stores per-type payloads as JSON in the right columns', () => {
    const db = new Database(dbPath, { readonly: true });
    const mcRow = db.prepare('SELECT * FROM questions WHERE id = ?').get('c1-u1-l1-q01') as Record<
      string,
      unknown
    >;
    const orderRow = db.prepare('SELECT * FROM questions WHERE id = ?').get('c1-u1-l1-q06') as Record<
      string,
      unknown
    >;
    db.close();

    expect(JSON.parse(mcRow.options as string)).toHaveLength(4);
    expect(JSON.parse(mcRow.answer_key as string)).toBe(0);
    expect(mcRow.steps).toBeNull();
    expect(mcRow.pairs).toBeNull();

    expect(JSON.parse(orderRow.steps as string)).toHaveLength(4);
    expect(JSON.parse(orderRow.answer_key as string)).toEqual([0, 1, 2, 3]);
    expect(orderRow.options).toBeNull();
    expect(orderRow.difficulty).toBe(3);
  });

  it('stores concept card JSON and ordered key points', () => {
    const db = new Database(dbPath, { readonly: true });
    const lessonRow = db.prepare('SELECT concept FROM lessons WHERE id = ?').get('c1-u1-l1') as {
      concept: string;
    };
    const kp = db
      .prepare('SELECT key_point_id FROM concept_key_points WHERE lesson_id = ? ORDER BY ord')
      .all('c1-u1-l1')
      .map((r) => (r as { key_point_id: string }).key_point_id);
    db.close();

    expect((JSON.parse(lessonRow.concept) as ConceptCard).analogy).toContain('train on rails');
    expect(kp).toEqual([
      'kp-workflows-vs-agents-1',
      'kp-workflows-vs-agents-2',
      'kp-workflows-vs-agents-3',
    ]);
  });

  it('stamps content_version in meta matching the pure hash', () => {
    const db = new Database(dbPath, { readonly: true });
    const version = (
      db.prepare('SELECT value FROM meta WHERE key = ?').get('content_version') as { value: string }
    ).value;
    const builtAt = db.prepare('SELECT value FROM meta WHERE key = ?').get('built_at') as {
      value: string;
    };
    db.close();
    expect(version).toBe(computeContentVersion(fixtureCatalog()));
    expect(version).toMatch(/^[0-9a-f]{64}$/);
    expect(Number.isNaN(Date.parse(builtAt.value))).toBe(false);
  });
});

describe('build-sqlite — content_version determinism', () => {
  it('is identical for the same catalog rebuilt to a different path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cca-det-'));
    try {
      const a = buildContentDb(fixtureCatalog(), join(dir, 'a.db'));
      const b = buildContentDb(fixtureCatalog(), join(dir, 'b.db'));
      expect(a.contentVersion).toBe(b.contentVersion);
      expect(a.builtAt).not.toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('is independent of array order in the catalog', () => {
    const ordered = fixtureCatalog();
    const shuffled: CatalogSnapshot = {
      ...ordered,
      questions: [registerMc, order, mc],
      courses: [...ordered.courses],
    };
    expect(computeContentVersion(shuffled)).toBe(computeContentVersion(ordered));
  });

  it('changes when any authored field changes', () => {
    const base = fixtureCatalog();
    const mutated: CatalogSnapshot = {
      ...base,
      questions: [{ ...mc, stem: `${mc.stem} (edited)` }, order, registerMc],
    };
    expect(computeContentVersion(mutated)).not.toBe(computeContentVersion(base));
  });
});
