// scripts/build-web-content.ts
//
// Writes public/content.json: the web build's content snapshot (see src/db/content-snapshot.ts),
// read from the shipped assets/content/content.db through the same createContentReader the native
// app uses. Run by `npm run web:build` before `expo export`; the output is generated and gitignored.

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import { createContentReader } from '../src/db/content-reader';
import { buildContentSnapshot } from '../src/db/content-snapshot';

const root = resolve(__dirname, '..');
const sqlite = new Database(resolve(root, 'assets/content/content.db'), { readonly: true, fileMustExist: true });
const reader = createContentReader(drizzle(sqlite));

const questionIds = (sqlite.prepare('SELECT id FROM questions ORDER BY id').all() as { id: string }[]).map((r) => r.id);
const conceptIds = (
  sqlite.prepare('SELECT DISTINCT concept_id AS id FROM lessons UNION SELECT DISTINCT concept_id AS id FROM questions').all() as {
    id: string;
  }[]
).map((r) => r.id);
const spine = (
  sqlite
    .prepare(
      `SELECT l.id AS id FROM lessons l
       LEFT JOIN units u ON l.unit_id = u.id
       LEFT JOIN courses c ON u.course_id = c.id
       ORDER BY c.ord, u.ord, l.ord`,
    )
    .all() as { id: string }[]
).map((r) => r.id);

const snapshot = buildContentSnapshot(reader, questionIds, conceptIds, spine);
mkdirSync(resolve(root, 'public'), { recursive: true });
const out = resolve(root, 'public/content.json');
writeFileSync(out, JSON.stringify(snapshot));
console.log(
  `web content: ${Object.keys(snapshot.courseById).length} courses, ${spine.length} lessons, ` +
    `${questionIds.length} questions, ${snapshot.exams.length} exams -> ${out}`,
);
