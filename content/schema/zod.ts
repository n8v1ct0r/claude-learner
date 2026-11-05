// content/schema/zod.ts
//
// Runtime source of truth for CCA-Quest content. Every course, unit, lesson, question, and exam
// is validated by these zod schemas at authoring time (validate-on-definition, see content/src/index.ts)
// and at build time (content:validate, GC-01). The ergonomic TypeScript surface (content/schema/types.ts)
// is INFERRED from these schemas via z.infer, so the types and the validators can never drift.
//
// Design notes for the next authoring agents:
//   - IDs are append-only kebab-case slugs (one-way door D3). The slug regex is the mechanical guard;
//     the ID-registry in content/src/index.ts guards uniqueness. Deprecate, never rename or delete.
//   - Question is a discriminated union on `type`. Per-type collections: mc/multi -> options,
//     match -> pairs (the pairs ARE the answer key), cloze -> blanks, order -> steps.
//   - Cross-field / cross-type invariants that a plain object schema cannot express (exactly 4 options,
//     answerKey ranges, multi stem stating the select count, cloze blank count vs stem, order
//     permutation, GC-15d key-point round-trip, the <=300s lesson budget) live in superRefine blocks.
//   - The citation allowlist and the volume constants come from content/blueprint.json (single source
//     of truth). Weights were CONFIRMED at Gate 0 (official CCA-F Exam Guide v1.0).

import { z } from 'zod';

import blueprint from '../blueprint.json';

// --- constants pulled from the single-source-of-truth blueprint -----------------------------------

const CITATION_ALLOWLIST: readonly string[] = blueprint.citation_allowlist;
const [KEY_POINTS_MIN, KEY_POINTS_MAX] = blueprint.volume.concept_key_points_range;
const LESSON_TIME_BUDGET_SECONDS = blueprint.volume.lesson_time_budget_seconds;

// A single authored question can never exceed the whole-lesson budget; keep an explicit sane ceiling.
const MAX_QUESTION_SECONDS = 180;

// The Feynman explain-back is a fixed-length micro-prompt (blueprint estimated_seconds_defaults).
const EXPLAIN_BACK_SECONDS = 90;

// Blank sentinel for cloze stems: three-or-more underscores. Single underscores (`stop_reason`,
// `tool_use`, `disable_parallel_tool_use`) are code identifiers, NOT blanks, so they never collide.
const BLANK_MARKER = /_{3,}/g;

// --- small pure helpers ---------------------------------------------------------------------------

function firstDuplicate<T>(items: readonly T[]): T | undefined {
  const seen = new Set<T>();
  for (const item of items) {
    if (seen.has(item)) return item;
    seen.add(item);
  }
  return undefined;
}

function isAllowedSourceUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  return CITATION_ALLOWLIST.includes(url.hostname.toLowerCase());
}

function countBlanks(stem: string): number {
  return (stem.match(BLANK_MARKER) ?? []).length;
}

function isPermutationOf(indices: readonly number[], length: number): boolean {
  if (indices.length !== length) return false;
  const seen = new Set<number>();
  for (const i of indices) {
    if (!Number.isInteger(i) || i < 0 || i >= length || seen.has(i)) return false;
    seen.add(i);
  }
  return true;
}

const NUMBER_WORD: Record<number, string> = { 2: 'two', 3: 'three' };

function stemStatesSelectCount(stem: string, count: number): boolean {
  const word = NUMBER_WORD[count];
  // Matches the official item format "Select TWO." as well as "select 2" (case-insensitive).
  const re = new RegExp(`\\bselect\\s+(${word}|${count})\\b`, 'i');
  return re.test(stem);
}

function issue(ctx: z.RefinementCtx, message: string, path?: (string | number)[]): void {
  ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });
}

// --- shared primitives ----------------------------------------------------------------------------

/** Append-only, kebab-case content ID (one-way door D3). e.g. "c1-u1-l1-q03", "workflows-vs-agents". */
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a kebab-case slug (append-only content ID, D3)');

const orderIndex = z.number().int().nonnegative();

export const DomainSchema = z.enum(['d0', 'd1', 'd2', 'd3', 'd4', 'd5']);
/** Questions always trace to a real exam domain (d1..d5); d0 is the "Meet the Exam" course only. */
export const ExamDomainSchema = z.enum(['d1', 'd2', 'd3', 'd4', 'd5']);
export const DifficultySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export const QuestionTypeSchema = z.enum(['mc', 'multi', 'match', 'cloze', 'order']);
export const QuestionVariantSchema = z.enum(['scenario', 'spot-bug', 'tf-speed']);

/** "1.2" — domain.task, tracing to content/official-task-statements.md. */
const taskStatement = z
  .string()
  .regex(/^[1-5]\.\d+$/, 'must be a task-statement ref like "1.2" (traces to official-task-statements.md)');

const sourceUrl = z
  .string()
  .url()
  .refine(isAllowedSourceUrl, 'sourceUrl host must be https and on blueprint.json citation_allowlist');

export const SnippetSchema = z.object({
  language: z.string().min(1),
  code: z.string().min(1),
});

// --- concept card + explain-back ------------------------------------------------------------------

export const KeyPointSchema = z.object({
  id: slug, // stable, e.g. "kp-workflows-vs-agents-1" — byte-identical to the Feynman grader (GC-15d)
  text: z.string().min(1),
});

export const ConceptCardSchema = z
  .object({
    conceptId: slug,
    analogy: z.string().min(1), // the FIRST thing shown (plain-world analogy before any terminology)
    plainExplanation: z.string().min(1),
    examWords: z.array(z.string().min(1)).min(1), // canonical exam terms strip
    snippet: SnippetSchema.optional(),
    keyPoints: z.array(KeyPointSchema).min(KEY_POINTS_MIN).max(KEY_POINTS_MAX),
  })
  .superRefine((card, ctx) => {
    const dup = firstDuplicate(card.keyPoints.map((k) => k.id));
    if (dup !== undefined) issue(ctx, `duplicate keyPoint id "${dup}"`, ['keyPoints']);
  });

export const ExplainBackSchema = z.object({
  prompt: z.string().min(1), // one-sentence "teach the agent" ask
  conceptId: slug,
  keyPointIds: z.array(slug).min(1), // must byte-match concept keyPoints ids (validated at lesson level)
  estimatedSeconds: z.literal(EXPLAIN_BACK_SECONDS),
});

// --- questions (discriminated union on `type`) ----------------------------------------------------

const questionCommon = {
  id: slug,
  variant: QuestionVariantSchema.optional(),
  domain: ExamDomainSchema,
  conceptId: slug,
  taskStatement,
  difficulty: DifficultySchema,
  estimatedSeconds: z.number().int().min(1).max(MAX_QUESTION_SECONDS),
  stem: z.string().min(1),
  explanation: z.string().min(1),
  sourceUrls: z.array(sourceUrl).min(1),
  volatile: z.boolean().optional(),
  variantOf: slug.optional(),
  misconceptionTag: z.string().min(1).optional(),
  scenarioId: slug.optional(),
};

// Raw (module-private) per-type object schemas. z.discriminatedUnion requires plain ZodObjects, so
// the cross-field/per-type invariants live in refineQuestion(), applied BOTH to the standalone
// exported member schemas below AND to the union — so either entry point validates fully.

// mc: exactly 4 options (2 for a tf-speed variant), answerKey is one index.
const McQuestionBase = z.object({
  ...questionCommon,
  type: z.literal('mc'),
  options: z.array(z.string().min(1)),
  answerKey: z.number().int().nonnegative(),
});

// multi: 4-6 options, selectCount 2-3, answerKey is a set of indices whose length === selectCount.
const MultiQuestionBase = z.object({
  ...questionCommon,
  type: z.literal('multi'),
  options: z.array(z.string().min(1)).min(4).max(6),
  selectCount: z.union([z.literal(2), z.literal(3)]),
  answerKey: z.array(z.number().int().nonnegative()),
});

// match: pairs ARE the answer key (left<->right). The renderer shuffles the rights at runtime.
const MatchQuestionBase = z.object({
  ...questionCommon,
  type: z.literal('match'),
  pairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).min(3).max(6),
});

// cloze: one entry in `blanks` per "___" in the stem; answerKey[i] indexes blanks[i].options.
const ClozeQuestionBase = z.object({
  ...questionCommon,
  type: z.literal('cloze'),
  blanks: z.array(z.object({ options: z.array(z.string().min(1)).min(2) })).min(1),
  answerKey: z.array(z.number().int().nonnegative()).min(1),
});

// order: steps as authored; answerKey is a permutation of step indices giving the correct order.
const OrderQuestionBase = z.object({
  ...questionCommon,
  type: z.literal('order'),
  steps: z.array(z.string().min(1)).min(3).max(7),
  answerKey: z.array(z.number().int().nonnegative()).min(3),
});

type AnyQuestion =
  | z.infer<typeof McQuestionBase>
  | z.infer<typeof MultiQuestionBase>
  | z.infer<typeof MatchQuestionBase>
  | z.infer<typeof ClozeQuestionBase>
  | z.infer<typeof OrderQuestionBase>;

function refineQuestion(q: AnyQuestion, ctx: z.RefinementCtx): void {
  // taskStatement must belong to the question's domain: d2 -> "2.x".
  const domainDigit = q.domain.slice(1);
  if (!q.taskStatement.startsWith(`${domainDigit}.`)) {
    issue(
      ctx,
      `taskStatement "${q.taskStatement}" must belong to domain ${q.domain} (start with "${domainDigit}.")`,
      ['taskStatement'],
    );
  }

  // The tf-speed variant is a true/false speed round — only meaningful on a 2-option mc.
  if (q.variant === 'tf-speed' && q.type !== 'mc') {
    issue(ctx, 'variant "tf-speed" is only valid on type "mc"', ['variant']);
  }

  switch (q.type) {
    case 'mc': {
      const expected = q.variant === 'tf-speed' ? 2 : 4;
      if (q.options.length !== expected) {
        issue(
          ctx,
          `mc${q.variant === 'tf-speed' ? ' (tf-speed)' : ''} must have exactly ${expected} options, got ${q.options.length}`,
          ['options'],
        );
      }
      if (q.answerKey < 0 || q.answerKey >= q.options.length) {
        issue(ctx, `answerKey ${q.answerKey} is out of range for ${q.options.length} options`, ['answerKey']);
      }
      break;
    }
    case 'multi': {
      if (q.answerKey.length !== q.selectCount) {
        issue(ctx, `answerKey length (${q.answerKey.length}) must equal selectCount (${q.selectCount})`, [
          'answerKey',
        ]);
      }
      const dup = firstDuplicate(q.answerKey);
      if (dup !== undefined) issue(ctx, `answerKey has a duplicate index ${dup}`, ['answerKey']);
      for (const i of q.answerKey) {
        if (i < 0 || i >= q.options.length) {
          issue(ctx, `answerKey index ${i} is out of range for ${q.options.length} options`, ['answerKey']);
        }
      }
      if (!stemStatesSelectCount(q.stem, q.selectCount)) {
        issue(
          ctx,
          `multi stem must state how many to select (e.g. "Select ${NUMBER_WORD[q.selectCount].toUpperCase()}.")`,
          ['stem'],
        );
      }
      break;
    }
    case 'match': {
      const dupLeft = firstDuplicate(q.pairs.map((p) => p.left));
      if (dupLeft !== undefined) issue(ctx, `duplicate match prompt (left) "${dupLeft}"`, ['pairs']);
      break;
    }
    case 'cloze': {
      const blanksInStem = countBlanks(q.stem);
      if (blanksInStem !== q.blanks.length) {
        issue(ctx, `stem has ${blanksInStem} blank marker(s) ("___") but ${q.blanks.length} blank definition(s)`, [
          'blanks',
        ]);
      }
      if (q.answerKey.length !== q.blanks.length) {
        issue(ctx, `answerKey length (${q.answerKey.length}) must equal number of blanks (${q.blanks.length})`, [
          'answerKey',
        ]);
      }
      q.answerKey.forEach((ans, i) => {
        const optionCount = q.blanks[i]?.options.length ?? 0;
        if (ans < 0 || ans >= optionCount) {
          issue(ctx, `answerKey[${i}] (${ans}) is out of range for blank ${i}`, ['answerKey', i]);
        }
      });
      break;
    }
    case 'order': {
      if (!isPermutationOf(q.answerKey, q.steps.length)) {
        issue(ctx, `answerKey must be a permutation of the ${q.steps.length} step indices`, ['answerKey']);
      }
      break;
    }
  }
}

// Standalone, fully-validating per-type schemas (base shape + refineQuestion).
export const McQuestionSchema = McQuestionBase.superRefine((q, ctx) => refineQuestion(q, ctx));
export const MultiQuestionSchema = MultiQuestionBase.superRefine((q, ctx) => refineQuestion(q, ctx));
export const MatchQuestionSchema = MatchQuestionBase.superRefine((q, ctx) => refineQuestion(q, ctx));
export const ClozeQuestionSchema = ClozeQuestionBase.superRefine((q, ctx) => refineQuestion(q, ctx));
export const OrderQuestionSchema = OrderQuestionBase.superRefine((q, ctx) => refineQuestion(q, ctx));

export const QuestionSchema = z
  .discriminatedUnion('type', [
    McQuestionBase,
    MultiQuestionBase,
    MatchQuestionBase,
    ClozeQuestionBase,
    OrderQuestionBase,
  ])
  .superRefine((q, ctx) => refineQuestion(q, ctx));

// --- lesson / unit / course -----------------------------------------------------------------------

export const LessonSchema = z
  .object({
    id: slug,
    title: z.string().min(1),
    order: orderIndex,
    concept: ConceptCardSchema,
    // Per-lesson exercise counts (style guide 6-10) are a volume gate (GC-02 stats), not a shape gate,
    // so Meet-the-Exam (d0) lessons can carry zero exercises. Uniqueness IS enforced here.
    exercises: z.array(QuestionSchema),
    explainBack: ExplainBackSchema,
    estimatedSecondsTotal: z.number().int().positive(),
  })
  .superRefine((lesson, ctx) => {
    const cardKeyPointIds = new Set(lesson.concept.keyPoints.map((k) => k.id));

    // GC-15d: explain-back key-point IDs round-trip byte-identical to the concept card.
    if (lesson.explainBack.conceptId !== lesson.concept.conceptId) {
      issue(
        ctx,
        `explainBack.conceptId "${lesson.explainBack.conceptId}" must match concept.conceptId "${lesson.concept.conceptId}"`,
        ['explainBack', 'conceptId'],
      );
    }
    for (const id of lesson.explainBack.keyPointIds) {
      if (!cardKeyPointIds.has(id)) {
        issue(ctx, `explainBack keyPointId "${id}" is not a concept keyPoint id (GC-15d round-trip)`, [
          'explainBack',
          'keyPointIds',
        ]);
      }
    }

    // Duplicate exercise IDs within a lesson.
    const dup = firstDuplicate(lesson.exercises.map((e) => e.id));
    if (dup !== undefined) issue(ctx, `duplicate exercise id "${dup}"`, ['exercises']);

    // estimatedSecondsTotal is a derived value: sum of exercise seconds + the 90s explain-back.
    const derived =
      lesson.exercises.reduce((sum, q) => sum + q.estimatedSeconds, 0) + lesson.explainBack.estimatedSeconds;
    if (lesson.estimatedSecondsTotal !== derived) {
      issue(
        ctx,
        `estimatedSecondsTotal (${lesson.estimatedSecondsTotal}) must equal derived exercises+explainBack sum (${derived})`,
        ['estimatedSecondsTotal'],
      );
    }
    if (lesson.estimatedSecondsTotal > LESSON_TIME_BUDGET_SECONDS) {
      issue(
        ctx,
        `lesson exceeds the ${LESSON_TIME_BUDGET_SECONDS}s budget (GC-02): ${lesson.estimatedSecondsTotal}s`,
        ['estimatedSecondsTotal'],
      );
    }
  });

export const UnitSchema = z
  .object({
    id: slug,
    title: z.string().min(1),
    order: orderIndex,
    lessons: z.array(LessonSchema).min(1),
  })
  .superRefine((unit, ctx) => {
    const dupId = firstDuplicate(unit.lessons.map((l) => l.id));
    if (dupId !== undefined) issue(ctx, `duplicate lesson id "${dupId}"`, ['lessons']);
    const dupOrder = firstDuplicate(unit.lessons.map((l) => l.order));
    if (dupOrder !== undefined) issue(ctx, `duplicate lesson order ${dupOrder}`, ['lessons']);
  });

export const CourseSchema = z
  .object({
    id: slug,
    domain: DomainSchema,
    title: z.string().min(1),
    description: z.string().min(1),
    order: orderIndex,
    units: z.array(UnitSchema).min(1),
  })
  .superRefine((course, ctx) => {
    const dupId = firstDuplicate(course.units.map((u) => u.id));
    if (dupId !== undefined) issue(ctx, `duplicate unit id "${dupId}"`, ['units']);
    const dupOrder = firstDuplicate(course.units.map((u) => u.order));
    if (dupOrder !== undefined) issue(ctx, `duplicate unit order ${dupOrder}`, ['units']);
  });

// --- exams (questions BY REFERENCE) ---------------------------------------------------------------

export const ScenarioClusterSchema = z.object({
  scenarioId: slug,
  questionIds: z.array(slug).min(1),
});

export const ExamSchema = z
  .object({
    id: slug,
    kind: z.enum(['mock', 'mini']),
    title: z.string().min(1),
    questionIds: z.array(slug).min(1), // BY REFERENCE into the question catalog
    timeLimitMinutes: z.number().int().positive(),
    scenarioClusters: z.array(ScenarioClusterSchema).optional(),
  })
  .superRefine((exam, ctx) => {
    const dup = firstDuplicate(exam.questionIds);
    if (dup !== undefined) issue(ctx, `duplicate questionId reference "${dup}"`, ['questionIds']);
    // Every clustered question must also appear in the exam's own question list.
    const inExam = new Set(exam.questionIds);
    exam.scenarioClusters?.forEach((cluster, ci) => {
      for (const qid of cluster.questionIds) {
        if (!inExam.has(qid)) {
          issue(ctx, `scenarioCluster "${cluster.scenarioId}" references "${qid}" not in exam.questionIds`, [
            'scenarioClusters',
            ci,
          ]);
        }
      }
    });
  });

// --- inferred types (the ergonomic surface re-exported by content/schema/types.ts) ---------------

export type Domain = z.infer<typeof DomainSchema>;
export type ExamDomain = z.infer<typeof ExamDomainSchema>;
export type Difficulty = z.infer<typeof DifficultySchema>;
export type QuestionType = z.infer<typeof QuestionTypeSchema>;
export type QuestionVariant = z.infer<typeof QuestionVariantSchema>;
export type Snippet = z.infer<typeof SnippetSchema>;
export type KeyPoint = z.infer<typeof KeyPointSchema>;
export type ConceptCard = z.infer<typeof ConceptCardSchema>;
export type ExplainBack = z.infer<typeof ExplainBackSchema>;
export type McQuestion = z.infer<typeof McQuestionSchema>;
export type MultiQuestion = z.infer<typeof MultiQuestionSchema>;
export type MatchQuestion = z.infer<typeof MatchQuestionSchema>;
export type ClozeQuestion = z.infer<typeof ClozeQuestionSchema>;
export type OrderQuestion = z.infer<typeof OrderQuestionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type Unit = z.infer<typeof UnitSchema>;
export type Course = z.infer<typeof CourseSchema>;
export type ScenarioCluster = z.infer<typeof ScenarioClusterSchema>;
export type Exam = z.infer<typeof ExamSchema>;
