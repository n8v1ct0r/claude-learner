// content/scripts/lib/validators.ts
//
// The GC-01 / GC-13 / GC-15d content checks, as PURE functions over an in-memory catalog. Nothing
// here touches the filesystem or the network (that lives in load-catalog.ts and liveness.ts), so the
// jest suite can feed each check a seeded-violation fixture and assert exactly which check fires.
//
// Every check returns Violation[] (empty === pass). The CLI (validate.ts) runs them in the contract
// order a→h, prints per-check counts, and turns a non-empty total into a non-zero exit. The schema
// itself (content/schema/zod.ts) already enforces most of these at define time; these checks are the
// independent, catalog-level re-derivation the goal contract verifies against — plus the rules a plain
// schema cannot express (no "all of the above", full key-point round-trip, cross-question dupes, the
// append-only ID ledger).

import { z } from 'zod';

import blueprint from '../../blueprint.json';
import bannedCopy from '../../../evals/banned-copy.json';
import {
  CourseSchema,
  ExamSchema,
  LessonSchema,
  QuestionSchema,
  UnitSchema,
} from '../../schema/zod';
import type { CatalogSnapshot, Lesson, Question } from '../../schema/types';
import { areVariantSiblings, stemFingerprint, jaccard } from './dupes';

// --- constants from the single source of truth ----------------------------------------------------

const CITATION_ALLOWLIST: readonly string[] = blueprint.citation_allowlist;
const DUPE_THRESHOLD: number = blueprint.dupe_detection.threshold;
const LESSON_TIME_BUDGET_SECONDS: number = blueprint.volume.lesson_time_budget_seconds;
const BANNED_PHRASES: readonly string[] = bannedCopy.banned;

// The concept card carries no per-card estimatedSeconds field, but the ADHD ≤5-min gate (GC-02) must
// account for reading it. 30s is the fixed allowance the task specifies for the LEARN step.
// NOTE (flagged for ruling): the zod LessonSchema derives estimatedSecondsTotal = Σexercises + 90s
// explain-back WITHOUT this 30s. This budget check is therefore intentionally stricter by 30s. If the
// pilot author budgeted to the schema's 300s edge, reconcile by setting this to 0.
const CONCEPT_READ_SECONDS = 30;

const BLANK_MARKER = /_{3,}/g;
const ALL_OF_THE_ABOVE = /\ball of the above\b/i;

// --- violation shape -------------------------------------------------------------------------------

export type CheckName =
  | 'zod'
  | 'answer-key'
  | 'answer-position'
  | 'citations'
  | 'banned-copy'
  | 'lesson-budget'
  | 'key-points'
  | 'id-registry'
  | 'dupes'
  | 'timed-content'
  | 'length-cue';

export interface Violation {
  check: CheckName;
  entityKind: string;
  entityId: string;
  message: string;
  path?: string;
}

function v(
  check: CheckName,
  entityKind: string,
  entityId: string,
  message: string,
  path?: string,
): Violation {
  return { check, entityKind, entityId, message, path };
}

// --- small helpers ---------------------------------------------------------------------------------

function firstDuplicate<T>(items: readonly T[]): T | undefined {
  const seen = new Set<T>();
  for (const item of items) {
    if (seen.has(item)) return item;
    seen.add(item);
  }
  return undefined;
}

function isAllowedUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  return url.protocol === 'https:' && CITATION_ALLOWLIST.includes(url.hostname.toLowerCase());
}

function collectStrings(value: unknown, path: string, out: { path: string; value: string }[]): void {
  if (typeof value === 'string') {
    out.push({ path, value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectStrings(item, `${path}[${i}]`, out));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      collectStrings(child, path === '' ? key : `${path}.${key}`, out);
    }
  }
}

// --- (a) zod: every entity re-validates against its schema -----------------------------------------

export function checkZod(catalog: CatalogSnapshot): Violation[] {
  const violations: Violation[] = [];
  const parse = (kind: string, schema: z.ZodTypeAny, entities: readonly { id: string }[]): void => {
    for (const entity of entities) {
      const result = schema.safeParse(entity);
      if (!result.success) {
        const issue = result.error.issues[0];
        const where = issue?.path.join('.') || '(root)';
        violations.push(v('zod', kind, entity.id ?? '(no id)', `${issue?.message ?? 'invalid'} at ${where}`, where));
      }
    }
  };
  parse('course', CourseSchema, catalog.courses);
  parse('unit', UnitSchema, catalog.units);
  parse('lesson', LessonSchema, catalog.lessons);
  parse('question', QuestionSchema, catalog.questions);
  parse('exam', ExamSchema, catalog.exams);
  return violations;
}

// --- (b) answer-key structural checks --------------------------------------------------------------

export function checkAnswerKeys(questions: readonly Question[]): Violation[] {
  const violations: Violation[] = [];
  for (const q of questions) {
    switch (q.type) {
      case 'mc': {
        const expected = q.variant === 'tf-speed' ? 2 : 4;
        if (q.options.length !== expected) {
          violations.push(v('answer-key', 'question', q.id, `mc must have exactly ${expected} options, got ${q.options.length}`, 'options'));
        }
        if (!Number.isInteger(q.answerKey) || q.answerKey < 0 || q.answerKey >= q.options.length) {
          violations.push(v('answer-key', 'question', q.id, `mc answerKey ${q.answerKey} is out of range for ${q.options.length} options`, 'answerKey'));
        }
        break;
      }
      case 'multi': {
        if (!stemStatesSelectCount(q.stem, q.selectCount)) {
          violations.push(v('answer-key', 'question', q.id, `multi stem must state how many to select (e.g. "Select ${q.selectCount === 2 ? 'TWO' : 'THREE'}.")`, 'stem'));
        }
        if (q.answerKey.length !== q.selectCount) {
          violations.push(v('answer-key', 'question', q.id, `multi answerKey length (${q.answerKey.length}) must equal selectCount (${q.selectCount})`, 'answerKey'));
        }
        const dup = firstDuplicate(q.answerKey);
        if (dup !== undefined) {
          violations.push(v('answer-key', 'question', q.id, `multi answerKey has a duplicate index ${dup}`, 'answerKey'));
        }
        for (const i of q.answerKey) {
          if (i < 0 || i >= q.options.length) {
            violations.push(v('answer-key', 'question', q.id, `multi answerKey index ${i} out of range for ${q.options.length} options`, 'answerKey'));
          }
        }
        break;
      }
      case 'match': {
        const dupLeft = firstDuplicate(q.pairs.map((p) => p.left));
        if (dupLeft !== undefined) {
          violations.push(v('answer-key', 'question', q.id, `match has a duplicate prompt (left) "${dupLeft}"`, 'pairs'));
        }
        break;
      }
      case 'cloze': {
        const blanksInStem = (q.stem.match(BLANK_MARKER) ?? []).length;
        if (blanksInStem !== q.blanks.length) {
          violations.push(v('answer-key', 'question', q.id, `cloze stem has ${blanksInStem} "___" marker(s) but ${q.blanks.length} blank definition(s)`, 'blanks'));
        }
        if (q.answerKey.length !== q.blanks.length) {
          violations.push(v('answer-key', 'question', q.id, `cloze answerKey length (${q.answerKey.length}) must equal blank count (${q.blanks.length})`, 'answerKey'));
        }
        q.answerKey.forEach((ans, i) => {
          const optionCount = q.blanks[i]?.options.length ?? 0;
          if (ans < 0 || ans >= optionCount) {
            violations.push(v('answer-key', 'question', q.id, `cloze answerKey[${i}] (${ans}) out of range for blank ${i}`, `answerKey[${i}]`));
          }
        });
        break;
      }
      case 'order': {
        if (!isPermutation(q.answerKey, q.steps.length)) {
          violations.push(v('answer-key', 'question', q.id, `order answerKey must be a permutation of the ${q.steps.length} step indices`, 'answerKey'));
        }
        break;
      }
    }

    // "all of the above" is banned in every option-bearing type (style guide + the exam tests
    // decisions, not pick-everything shortcuts).
    const optionBearing =
      q.type === 'mc' || q.type === 'multi'
        ? q.options
        : q.type === 'cloze'
          ? q.blanks.flatMap((b) => b.options)
          : [];
    for (const option of optionBearing) {
      if (ALL_OF_THE_ABOVE.test(option)) {
        violations.push(v('answer-key', 'question', q.id, `option "${option}" uses a banned "all of the above" shortcut`, 'options'));
      }
    }
  }
  return violations;
}

// --- (b2) answer-position balance ----------------------------------------------------------------

const ANSWER_POSITION_MAX_FRACTION = 0.35;
const ANSWER_POSITION_MIN_POOL = 20;

/**
 * Catch an invisible but devastating curriculum defect: if one button position is correct too
 * often, learners can score by UI pattern instead of architectural judgment. Check both the guided
 * lesson bank and the harder standalone exam register so a healthy aggregate cannot hide a biased
 * sub-pool. tf-speed is excluded because it has two options rather than four.
 */
export function checkAnswerPositionBalance(catalog: CatalogSnapshot): Violation[] {
  const lessonIds = new Set(catalog.lessons.flatMap((lesson) => lesson.exercises.map((question) => question.id)));
  const standardMc = catalog.questions.filter(
    (question): question is Extract<Question, { type: 'mc' }> => question.type === 'mc' && question.variant !== 'tf-speed',
  );
  const pools = [
    { id: 'all-standard-mc', questions: standardMc },
    { id: 'lesson-bank', questions: standardMc.filter((question) => lessonIds.has(question.id)) },
    { id: 'exam-register', questions: standardMc.filter((question) => !lessonIds.has(question.id)) },
  ];

  const violations: Violation[] = [];
  for (const pool of pools) {
    if (pool.questions.length < ANSWER_POSITION_MIN_POOL) continue;
    const counts = [0, 0, 0, 0];
    for (const question of pool.questions) counts[question.answerKey] += 1;
    const highest = Math.max(...counts);
    const fraction = highest / pool.questions.length;
    if (fraction > ANSWER_POSITION_MAX_FRACTION) {
      violations.push(
        v(
          'answer-position',
          'question-pool',
          pool.id,
          `one answer position is correct for ${(fraction * 100).toFixed(1)}% of ${pool.questions.length} standard MC items (counts ${counts.join('/')}; max ${(ANSWER_POSITION_MAX_FRACTION * 100).toFixed(0)}%)`,
          'answerKey',
        ),
      );
    }
  }
  return violations;
}

function stemStatesSelectCount(stem: string, count: number): boolean {
  const word = count === 2 ? 'two' : 'three';
  return new RegExp(`\\bselect\\s+(${word}|${count})\\b`, 'i').test(stem);
}

function isPermutation(indices: readonly number[], length: number): boolean {
  if (indices.length !== length) return false;
  const seen = new Set<number>();
  for (const i of indices) {
    if (!Number.isInteger(i) || i < 0 || i >= length || seen.has(i)) return false;
    seen.add(i);
  }
  return true;
}

// --- (c) citation STRUCTURE (host allowlist + https). Liveness lives in liveness.ts ----------------

export function checkCitations(questions: readonly Question[]): Violation[] {
  const violations: Violation[] = [];
  for (const q of questions) {
    if (q.sourceUrls.length === 0) {
      violations.push(v('citations', 'question', q.id, 'question has no sourceUrl (>=1 official-docs citation required)', 'sourceUrls'));
      continue;
    }
    q.sourceUrls.forEach((url, i) => {
      if (!isAllowedUrl(url)) {
        violations.push(v('citations', 'question', q.id, `sourceUrl "${url}" is not https on the blueprint citation_allowlist`, `sourceUrls[${i}]`));
      }
    });
  }
  return violations;
}

// --- (d) banned-copy: no string field contains a banned phrase (case-insensitive) ------------------

export function checkBannedCopy(catalog: CatalogSnapshot): Violation[] {
  const violations: Violation[] = [];
  const lowerBanned = BANNED_PHRASES.map((p) => p.toLowerCase());

  const scan = (kind: string, id: string, subject: unknown): void => {
    const strings: { path: string; value: string }[] = [];
    collectStrings(subject, '', strings);
    for (const { path, value } of strings) {
      const lower = value.toLowerCase();
      lowerBanned.forEach((phrase, i) => {
        if (lower.includes(phrase)) {
          violations.push(v('banned-copy', kind, id, `contains banned phrase "${BANNED_PHRASES[i]}"`, path));
        }
      });
    }
  };

  // Questions are scanned whole. Lessons scan only their own copy (title/concept/explainBack); their
  // exercises are scanned once, as questions, to avoid double-reporting the same string.
  for (const q of catalog.questions) scan('question', q.id, q);
  for (const l of catalog.lessons) scan('lesson', l.id, { title: l.title, concept: l.concept, explainBack: l.explainBack });
  for (const u of catalog.units) scan('unit', u.id, { title: u.title });
  for (const c of catalog.courses) scan('course', c.id, { title: c.title, description: c.description });
  for (const e of catalog.exams) scan('exam', e.id, { title: e.title });

  return violations;
}

// --- (e) lesson time budget (GC-02 ADHD ≤5-min gate) -----------------------------------------------

export function checkLessonBudget(lessons: readonly Lesson[]): Violation[] {
  const violations: Violation[] = [];
  for (const lesson of lessons) {
    const exerciseSeconds = lesson.exercises.reduce((sum, q) => sum + q.estimatedSeconds, 0);
    const total = exerciseSeconds + CONCEPT_READ_SECONDS + lesson.explainBack.estimatedSeconds;
    if (total > LESSON_TIME_BUDGET_SECONDS) {
      violations.push(
        v(
          'lesson-budget',
          'lesson',
          lesson.id,
          `lesson is ${total}s (>${LESSON_TIME_BUDGET_SECONDS}s): ${exerciseSeconds}s exercises + ${CONCEPT_READ_SECONDS}s concept + ${lesson.explainBack.estimatedSeconds}s explain-back`,
          'estimatedSecondsTotal',
        ),
      );
    }
  }
  return violations;
}

// --- (f) key-point round-trip (GC-15d): explainBack ids === concept keyPoint ids (byte-identical) --

export function checkKeyPointRoundTrip(lessons: readonly Lesson[]): Violation[] {
  const violations: Violation[] = [];
  for (const lesson of lessons) {
    if (lesson.explainBack.conceptId !== lesson.concept.conceptId) {
      violations.push(v('key-points', 'lesson', lesson.id, `explainBack.conceptId "${lesson.explainBack.conceptId}" must match concept.conceptId "${lesson.concept.conceptId}"`, 'explainBack.conceptId'));
    }
    const conceptIds = lesson.concept.keyPoints.map((k) => k.id);
    const explainIds = lesson.explainBack.keyPointIds;
    const conceptSorted = [...conceptIds].sort();
    const explainSorted = [...explainIds].sort();
    const identical =
      conceptSorted.length === explainSorted.length &&
      conceptSorted.every((id, i) => id === explainSorted[i]);
    if (!identical) {
      const missing = conceptIds.filter((id) => !explainIds.includes(id));
      const extra = explainIds.filter((id) => !conceptIds.includes(id));
      const detail = [
        missing.length ? `missing from explainBack: ${missing.join(', ')}` : '',
        extra.length ? `not a concept keyPoint: ${extra.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('; ');
      violations.push(v('key-points', 'lesson', lesson.id, `explainBack.keyPointIds must be byte-identical to concept.keyPoints ids (GC-15d) — ${detail}`, 'explainBack.keyPointIds'));
    }
  }
  return violations;
}

// --- (g) ID registry (append-only ledger, D3) ------------------------------------------------------

export interface RegistryEntry {
  id: string;
  kind: string;
}

export interface IdRegistryResult {
  violations: Violation[];
  appended: RegistryEntry[];
  nextEntries: RegistryEntry[];
}

/** Every current entity id (course/unit/lesson/question/exam) — the D3-guarded content slugs. */
export function currentEntityEntries(catalog: CatalogSnapshot): RegistryEntry[] {
  const entries: RegistryEntry[] = [];
  for (const c of catalog.courses) entries.push({ id: c.id, kind: 'course' });
  for (const u of catalog.units) entries.push({ id: u.id, kind: 'unit' });
  for (const l of catalog.lessons) entries.push({ id: l.id, kind: 'lesson' });
  for (const q of catalog.questions) entries.push({ id: q.id, kind: 'question' });
  for (const e of catalog.exams) entries.push({ id: e.id, kind: 'exam' });
  return entries;
}

/**
 * Compares the current catalog ids against the append-only ledger.
 *   - a registered id absent from the catalog → hard fail (deleted or renamed; D3 forbids both)
 *   - a catalog id absent from the ledger → fail, UNLESS `update` (then it is appended)
 * `update` never forgives a missing id: you cannot rename by re-registering under a new slug.
 */
export function checkIdRegistry(
  current: readonly RegistryEntry[],
  registry: readonly RegistryEntry[],
  opts: { update: boolean },
): IdRegistryResult {
  const violations: Violation[] = [];
  const currentIds = new Set(current.map((e) => e.id));
  const registryIds = new Set(registry.map((e) => e.id));

  for (const entry of registry) {
    if (!currentIds.has(entry.id)) {
      violations.push(v('id-registry', entry.kind, entry.id, `id "${entry.id}" is in id-registry.json but not in the catalog — content slugs are append-only; deprecate, never rename or delete (D3)`, 'id'));
    }
  }

  const appended: RegistryEntry[] = [];
  for (const entry of current) {
    if (!registryIds.has(entry.id)) {
      if (opts.update) {
        appended.push(entry);
      } else {
        violations.push(v('id-registry', entry.kind, entry.id, `new id "${entry.id}" is not in id-registry.json — run \`content:validate --update-registry\` to record it (append-only, D3)`, 'id'));
      }
    }
  }

  const nextEntries = [...registry, ...appended].sort((a, b) => a.id.localeCompare(b.id));
  return { violations, appended, nextEntries };
}

// --- (h) duplicate detection (normalized-stem trigram Jaccard) -------------------------------------

export interface DuplicateResult {
  violations: Violation[];
  legalVariants: { a: string; b: string; similarity: number }[];
}

export function checkDuplicates(
  questions: readonly Question[],
  threshold: number = DUPE_THRESHOLD,
): DuplicateResult {
  const violations: Violation[] = [];
  const legalVariants: { a: string; b: string; similarity: number }[] = [];
  const fingerprints = questions.map((q) => stemFingerprint(q.stem));

  for (let i = 0; i < questions.length; i += 1) {
    for (let j = i + 1; j < questions.length; j += 1) {
      const similarity = jaccard(fingerprints[i], fingerprints[j]);
      if (similarity < threshold) continue;
      const a = questions[i];
      const b = questions[j];
      if (areVariantSiblings(a, b)) {
        legalVariants.push({ a: a.id, b: b.id, similarity });
      } else {
        violations.push(
          v(
            'dupes',
            'question',
            a.id,
            `near-duplicate of "${b.id}" (stem similarity ${similarity.toFixed(3)} >= threshold ${threshold}). If intentional, link them with variantOf; otherwise rewrite one stem.`,
            'stem',
          ),
        );
      }
    }
  }
  return { violations, legalVariants };
}

// --- (i) timed-content: no concept is reachable ONLY through a tf-speed round ----------------------
//
// WCAG 2.2.1 / GC-10 intent: the reduce-time-pressure path must never deny content. At runtime a
// tf-speed question is rendered UNTIMED when the setting is on, so the timer never gates access — but
// this check enforces the same guarantee at the CONTENT level: a concept must never be assessed by a
// speed round ALONE. Every conceptId that carries a tf-speed question must ALSO carry at least one
// non-tf-speed question, so the concept is always reachable in a form that has no clock at all.
// (A tf-speed variant is only valid on an `mc`; a non-tf-speed sibling is any question whose variant
// is not 'tf-speed', including a plain mc, multi, match, cloze, or order.)

export function checkTimedContent(questions: readonly Question[]): Violation[] {
  const violations: Violation[] = [];

  // Concepts that have at least one NON-tf-speed (i.e. untimed-by-nature) question.
  const untimedConcepts = new Set<string>();
  for (const q of questions) {
    if (q.variant !== 'tf-speed') untimedConcepts.add(q.conceptId);
  }

  for (const q of questions) {
    if (q.variant === 'tf-speed' && !untimedConcepts.has(q.conceptId)) {
      violations.push(
        v(
          'timed-content',
          'question',
          q.id,
          `concept "${q.conceptId}" is assessed only by a tf-speed (timed) round — every concept with a tf-speed question must also have a non-tf-speed sibling, so it is reachable untimed (WCAG 2.2.1 / GC-10)`,
          'variant',
        ),
      );
    }
  }
  return violations;
}

// --- (j) answer-length cue (CS-1): option length must not give away an exam's answers -------------
//
// A learner who knows nothing and always picks the longest option (the k longest for a select-k
// item) must not score well on any exam form, and the key must not be the strictly longest option
// on most of a form's 4-option MC items. Ties split credit evenly, so a form of equal-length options
// scores a guess. Item types the strategy cannot answer (cloze, order, match) count as misses.

const LENGTH_CUE_MAX_STRATEGY = 0.35;
const LENGTH_CUE_MAX_KEY_LONGEST = 0.35;
const LENGTH_CUE_MIN_ITEMS = 10;

export interface LengthCueStats {
  items: number;
  /** Expected fraction correct for "always pick the longest option(s)". */
  strategyScore: number;
  /** Standard 4-option MC items (tf-speed excluded). */
  standardMc: number;
  /** Standard MC items whose key is strictly longer than every distractor. */
  keyStrictlyLongest: number;
}

function longestPickCredit(question: Question): number {
  if (question.type === 'mc') {
    const lengths = question.options.map((option) => option.length);
    const longest = Math.max(...lengths);
    const tied = lengths.flatMap((length, index) => (length === longest ? [index] : []));
    return tied.includes(question.answerKey) ? 1 / tied.length : 0;
  }
  if (question.type === 'multi') {
    const byLength = question.options
      .map((option, index) => ({ index, length: option.length }))
      .sort((a, b) => b.length - a.length || a.index - b.index);
    const picked = new Set(byLength.slice(0, question.selectCount).map((entry) => entry.index));
    return question.answerKey.every((index) => picked.has(index)) ? 1 : 0;
  }
  return 0;
}

export function lengthCueStats(questions: readonly Question[]): LengthCueStats {
  let credit = 0;
  let standardMc = 0;
  let keyStrictlyLongest = 0;
  for (const question of questions) {
    credit += longestPickCredit(question);
    if (question.type === 'mc' && question.variant !== 'tf-speed') {
      standardMc += 1;
      const key = question.options[question.answerKey] ?? '';
      const longestDistractor = Math.max(
        ...question.options.filter((_, index) => index !== question.answerKey).map((option) => option.length),
      );
      if (key.length > longestDistractor) keyStrictlyLongest += 1;
    }
  }
  return {
    items: questions.length,
    strategyScore: questions.length === 0 ? 0 : credit / questions.length,
    standardMc,
    keyStrictlyLongest,
  };
}

export function checkLengthCue(catalog: CatalogSnapshot): Violation[] {
  const byId = new Map(catalog.questions.map((question) => [question.id, question] as const));
  const violations: Violation[] = [];
  for (const exam of catalog.exams) {
    const questions = exam.questionIds.flatMap((id) => {
      const question = byId.get(id);
      return question ? [question] : [];
    });
    if (questions.length < LENGTH_CUE_MIN_ITEMS) continue;
    const stats = lengthCueStats(questions);
    if (stats.strategyScore > LENGTH_CUE_MAX_STRATEGY) {
      violations.push(
        v(
          'length-cue',
          'exam',
          exam.id,
          `always picking the longest option scores ${(stats.strategyScore * 100).toFixed(1)}% on ${stats.items} items (max ${(LENGTH_CUE_MAX_STRATEGY * 100).toFixed(0)}%)`,
          'questionIds',
        ),
      );
    }
    if (stats.standardMc >= LENGTH_CUE_MIN_ITEMS) {
      const share = stats.keyStrictlyLongest / stats.standardMc;
      if (share > LENGTH_CUE_MAX_KEY_LONGEST) {
        violations.push(
          v(
            'length-cue',
            'exam',
            exam.id,
            `the key is strictly the longest option on ${stats.keyStrictlyLongest} of ${stats.standardMc} standard MC items (${(share * 100).toFixed(1)}%; max ${(LENGTH_CUE_MAX_KEY_LONGEST * 100).toFixed(0)}%)`,
            'questionIds',
          ),
        );
      }
    }
  }
  return violations;
}

// The constants the CLI prints — one source for the checks and their reporting.
export const constants = {
  DUPE_THRESHOLD,
  LESSON_TIME_BUDGET_SECONDS,
  CONCEPT_READ_SECONDS,
  CITATION_ALLOWLIST,
  ANSWER_POSITION_MAX_FRACTION,
  LENGTH_CUE_MAX_STRATEGY,
  LENGTH_CUE_MAX_KEY_LONGEST,
};
