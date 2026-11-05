/** @jest-environment node */
//
// Source links, data path (WR-5 / FT-4 / CL-9, owner rule 2).
//
// Opens the SHIPPED content database (assets/content/content.db, the file the app bundles) read-only
// with better-sqlite3 + drizzle and drives the same createContentReader factory the app wraps around
// expo-sqlite. Proves the reader hands every question's sourceUrls to the UI unchanged — through
// getQuestion (exam player / review) and through lesson exercises (lesson Feedback) — and that every
// cited URL is openable and gets a readable link name. Runs in node because better-sqlite3 is native.

import { resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import { isOpenableSourceUrl, sourceLinkLabel } from '../../src/components/source-label';
import { createContentReader, type ContentReader } from '../../src/db/content-reader';

const SHIPPED_DB = resolve(__dirname, '../../assets/content/content.db');

describe('sourceLinkLabel', () => {
  it.each([
    ['https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools', 'Tool use: Define tools', 'platform.claude.com'],
    ['https://code.claude.com/docs/en/agent-sdk/hooks', 'Agent SDK: Hooks', 'code.claude.com'],
    ['https://code.claude.com/docs/en/hooks', 'Hooks', 'code.claude.com'],
    [
      'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#be-clear-and-direct',
      'Claude prompting best practices: Be clear and direct',
      'platform.claude.com',
    ],
    ['https://www.anthropic.com/engineering/building-effective-agents', 'Engineering: Building effective agents', 'anthropic.com'],
    ['https://www.anthropic.com/ai-fluency/overview', 'AI fluency: Overview', 'anthropic.com'],
    ['https://platform.claude.com/docs/en/api/errors', 'API: Errors', 'platform.claude.com'],
    ['https://modelcontextprotocol.io/docs/getting-started/intro', 'Getting started: Intro', 'modelcontextprotocol.io'],
    [
      'https://anthropic.skilljar.com/claude-certified-architect-foundations-certification/444989',
      'Claude certified architect foundations certification',
      'anthropic.skilljar.com',
    ],
    ['https://docs.anthropic.com/', 'docs.anthropic.com', 'docs.anthropic.com'],
    // The public exam guide: %2F-encoded folders and "+" spaces must not leak into the link name.
    [
      'https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf',
      'Claude Certified Architect – Foundations Exam Guide (PDF)',
      'everpath-course-content.s3-accelerate.amazonaws.com',
    ],
  ])('%s -> "%s"', (url, title, host) => {
    expect(sourceLinkLabel(url)).toEqual({ title, host });
  });

  it('only treats absolute https URLs as openable', () => {
    expect(isOpenableSourceUrl('https://code.claude.com/docs/en/hooks')).toBe(true);
    expect(isOpenableSourceUrl('http://code.claude.com/docs/en/hooks')).toBe(false);
    expect(isOpenableSourceUrl('javascript:alert(1)')).toBe(false);
    expect(isOpenableSourceUrl('/docs/en/hooks')).toBe(false);
  });
});

describe('shipped content DB -> content reader -> UI', () => {
  let sqlite: Database.Database;
  let reader: ContentReader;
  let rows: { id: string; source_urls: string }[];

  beforeAll(() => {
    sqlite = new Database(SHIPPED_DB, { readonly: true, fileMustExist: true });
    reader = createContentReader(drizzle(sqlite));
    rows = sqlite.prepare('SELECT id, source_urls FROM questions ORDER BY id').all() as typeof rows;
  });

  afterAll(() => {
    sqlite.close();
  });

  it('returns every question with its stored sourceUrls, each openable with a readable name', () => {
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const stored = JSON.parse(row.source_urls) as string[];
      const question = reader.getQuestion(row.id);
      expect(question?.sourceUrls).toEqual(stored);
      expect(stored.length).toBeGreaterThan(0);
      for (const url of stored) {
        expect(isOpenableSourceUrl(url)).toBe(true);
        const { title, host } = sourceLinkLabel(url);
        expect(title.length).toBeGreaterThan(0);
        expect(title).not.toMatch(/https?:|\//);
        expect(host).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/);
      }
    }
  });

  it('hands lesson exercises (the Feedback path) the same sourceUrls the questions table stores', () => {
    const stored = new Map(rows.map((row) => [row.id, JSON.parse(row.source_urls) as string[]]));
    let exercises = 0;
    for (const summary of reader.listCourses()) {
      for (const unit of reader.getCourse(summary.id)?.units ?? []) {
        for (const lesson of unit.lessons) {
          for (const question of lesson.exercises) {
            expect(question.sourceUrls).toEqual(stored.get(question.id));
            exercises += 1;
          }
        }
      }
    }
    expect(exercises).toBeGreaterThan(0);
  });
});
