// Schema + registry unit tests for the content pipeline (GC-01 foundation).
//
// Exercises the zod schemas against VALID fixtures (parse succeeds) and INVALID fixtures (parse fails
// on the specific refinement), plus the validate-on-definition + append-only registry behavior in
// content/src/index.ts. Typed globals come from '@jest/globals' (repo convention).
import { beforeEach, describe, expect, it } from '@jest/globals';

import {
  ClozeQuestionSchema,
  ConceptCardSchema,
  CourseSchema,
  ExamSchema,
  LessonSchema,
  MatchQuestionSchema,
  McQuestionSchema,
  MultiQuestionSchema,
  OrderQuestionSchema,
  QuestionSchema,
  type ClozeQuestion,
  type ConceptCard,
  type Course,
  type Exam,
  type ExplainBack,
  type Lesson,
  type MatchQuestion,
  type McQuestion,
  type MultiQuestion,
  type OrderQuestion,
  type Unit,
} from '../../content/schema/zod';
import {
  canonicalizeQuestionOptions,
  ContentRegistryError,
  danglingExamReferences,
  defineCourse,
  defineExam,
  defineLesson,
  defineQuestion,
  getCatalog,
  resetCatalog,
} from '../../content/src/index';

// A host on blueprint.json citation_allowlist.
const SRC = 'https://www.anthropic.com/engineering/building-effective-agents';
const DOCS = 'https://docs.claude.com/en/docs/build-with-claude/tool-use';

// --- valid fixtures -------------------------------------------------------------------------------

const validMc: McQuestion = {
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
  explanation:
    'Workflows suit predictable, fixed sequences. The autonomous loop is the tempting distractor but adds nondeterminism the fixed pipeline does not need.',
  sourceUrls: [SRC],
};

const validTfSpeed: McQuestion = {
  id: 'c1-u1-l1-q02',
  type: 'mc',
  variant: 'tf-speed',
  domain: 'd1',
  conceptId: 'workflows-vs-agents',
  taskStatement: '1.1',
  difficulty: 1,
  estimatedSeconds: 10,
  stem: 'True or false: an agent lets the model direct its own steps in a loop.',
  options: ['True', 'False'],
  answerKey: 0,
  explanation: 'An agent is model-directed; a workflow is code-directed.',
  sourceUrls: [SRC],
};

const validMulti: MultiQuestion = {
  id: 'c1-u1-l1-q03',
  type: 'multi',
  domain: 'd1',
  conceptId: 'agentic-loop',
  taskStatement: '1.1',
  difficulty: 2,
  estimatedSeconds: 30,
  stem: 'Which are valid stop signals for an agentic loop? Select TWO.',
  options: [
    'stop_reason end_turn',
    'A fixed max-iteration cap as the primary stop',
    'stop_reason tool_use resolved with no further tool calls',
    'Parsing assistant prose for the word "done"',
    'Random termination',
  ],
  selectCount: 2,
  answerKey: [0, 2],
  explanation:
    'end_turn and a resolved tool_use with no further calls are model-driven stops. An iteration cap is a guardrail, not the primary stop signal.',
  sourceUrls: [DOCS],
};

const validMatch: MatchQuestion = {
  id: 'c1-u1-l1-q04',
  type: 'match',
  domain: 'd1',
  conceptId: 'augmented-llm',
  taskStatement: '1.2',
  difficulty: 1,
  estimatedSeconds: 40,
  stem: 'Match each augmented-LLM capability to its role.',
  pairs: [
    { left: 'Retrieval', right: 'Brings in external knowledge' },
    { left: 'Tools', right: 'Takes actions in the world' },
    { left: 'Memory', right: 'Persists state across turns' },
  ],
  explanation: 'The augmented LLM composes retrieval, tools, and memory.',
  sourceUrls: [SRC],
};

const validCloze: ClozeQuestion = {
  id: 'c1-u1-l1-q05',
  type: 'cloze',
  domain: 'd1',
  conceptId: 'agentic-loop',
  taskStatement: '1.1',
  difficulty: 2,
  estimatedSeconds: 30,
  stem: 'The loop continues while stop_reason is ___ and ends when it is ___.',
  blanks: [{ options: ['tool_use', 'end_turn'] }, { options: ['tool_use', 'end_turn'] }],
  answerKey: [0, 1],
  explanation: 'tool_use continues the loop; end_turn ends it.',
  sourceUrls: [DOCS],
};

const validOrder: OrderQuestion = {
  id: 'c1-u1-l1-q06',
  type: 'order',
  domain: 'd1',
  conceptId: 'agentic-loop',
  taskStatement: '1.1',
  difficulty: 2,
  estimatedSeconds: 30,
  stem: 'Put the agentic-loop steps in order.',
  steps: [
    'Gather context',
    'Take an action with a tool',
    'Observe the tool result',
    'Decide whether to stop',
  ],
  answerKey: [0, 1, 2, 3],
  explanation: 'Gather, act, observe, then decide whether to repeat.',
  sourceUrls: [SRC],
};

const validConcept: ConceptCard = {
  conceptId: 'workflows-vs-agents',
  analogy: 'A workflow is a train on rails; an agent is a driver choosing roads.',
  plainExplanation:
    'Workflows follow predefined code paths. Agents let the model decide the next step in a loop. Pick workflows when steps are known; pick agents when the path is open-ended.',
  examWords: ['workflow', 'agent', 'agentic loop', 'stop_reason'],
  keyPoints: [
    { id: 'kp-workflows-vs-agents-1', text: 'A workflow runs predefined code paths.' },
    { id: 'kp-workflows-vs-agents-2', text: 'An agent lets the model direct its own steps in a loop.' },
    { id: 'kp-workflows-vs-agents-3', text: 'Prefer the simplest option that meets the need.' },
  ],
};

const validExplainBack: ExplainBack = {
  prompt: 'Teach Archie: when would you choose a workflow over an agent?',
  conceptId: 'workflows-vs-agents',
  keyPointIds: [
    'kp-workflows-vs-agents-1',
    'kp-workflows-vs-agents-2',
    'kp-workflows-vs-agents-3',
  ],
  estimatedSeconds: 90,
};

// exercises sum 20 + 30 = 50, + 90s explain-back = 140s (<= 300).
const validLesson: Lesson = {
  id: 'c1-u1-l1',
  title: 'Workflows vs agents',
  order: 0,
  concept: validConcept,
  exercises: [validMc, validOrder],
  explainBack: validExplainBack,
  estimatedSecondsTotal: 140,
};

const validUnit: Unit = {
  id: 'c1-u1',
  title: 'Think in Agents',
  order: 0,
  lessons: [validLesson],
};

const validCourse: Course = {
  id: 'c1',
  domain: 'd1',
  title: 'Agentic Architecture & Orchestration',
  description: 'Workflows vs agents, the agentic loop, and orchestration patterns.',
  order: 1,
  units: [validUnit],
};

const validExam: Exam = {
  id: 'mock-form-a',
  kind: 'mock',
  title: 'Mock Exam — Form A',
  questionIds: ['c1-u1-l1-q01', 'c1-u1-l1-q06'],
  timeLimitMinutes: 120,
};

// --- valid parsing --------------------------------------------------------------------------------

describe('schema — valid fixtures parse', () => {
  it('parses each question type', () => {
    expect(McQuestionSchema.safeParse(validMc).success).toBe(true);
    expect(McQuestionSchema.safeParse(validTfSpeed).success).toBe(true);
    expect(MultiQuestionSchema.safeParse(validMulti).success).toBe(true);
    expect(MatchQuestionSchema.safeParse(validMatch).success).toBe(true);
    expect(ClozeQuestionSchema.safeParse(validCloze).success).toBe(true);
    expect(OrderQuestionSchema.safeParse(validOrder).success).toBe(true);
  });

  it('parses through the discriminated union', () => {
    for (const q of [validMc, validTfSpeed, validMulti, validMatch, validCloze, validOrder]) {
      expect(QuestionSchema.safeParse(q).success).toBe(true);
    }
  });

  it('parses concept card, lesson, unit, course, and exam', () => {
    expect(ConceptCardSchema.safeParse(validConcept).success).toBe(true);
    expect(LessonSchema.safeParse(validLesson).success).toBe(true);
    expect(CourseSchema.safeParse(validCourse).success).toBe(true);
    expect(ExamSchema.safeParse(validExam).success).toBe(true);
  });
});

// --- invalid parsing ------------------------------------------------------------------------------

// A structurally-typed but semantically-invalid input helper (bypasses the strict authoring types).
function bad(input: unknown): unknown {
  return input;
}

describe('schema — invalid fixtures are rejected', () => {
  it('rejects an mc with != 4 options', () => {
    const r = McQuestionSchema.safeParse(bad({ ...validMc, options: ['a', 'b', 'c'] }));
    expect(r.success).toBe(false);
  });

  it('rejects an mc answerKey out of range', () => {
    const r = McQuestionSchema.safeParse(bad({ ...validMc, answerKey: 9 }));
    expect(r.success).toBe(false);
  });

  it('rejects a tf-speed variant on a non-mc type', () => {
    const r = QuestionSchema.safeParse(bad({ ...validMulti, variant: 'tf-speed' }));
    expect(r.success).toBe(false);
  });

  it('rejects a multi whose answerKey length != selectCount', () => {
    const r = MultiQuestionSchema.safeParse(bad({ ...validMulti, answerKey: [0, 1, 2] }));
    expect(r.success).toBe(false);
  });

  it('rejects a multi whose stem does not state how many to select', () => {
    const r = MultiQuestionSchema.safeParse(
      bad({ ...validMulti, stem: 'Which are valid stop signals for an agentic loop?' }),
    );
    expect(r.success).toBe(false);
  });

  it('rejects a cloze whose blank count != stem markers', () => {
    const r = ClozeQuestionSchema.safeParse(
      bad({ ...validCloze, stem: 'Only one blank here: ___.' }),
    );
    expect(r.success).toBe(false);
  });

  it('rejects an order answerKey that is not a permutation', () => {
    const r = OrderQuestionSchema.safeParse(bad({ ...validOrder, answerKey: [0, 1, 2, 2] }));
    expect(r.success).toBe(false);
  });

  it('rejects a taskStatement that does not match the domain', () => {
    const r = QuestionSchema.safeParse(bad({ ...validMc, taskStatement: '2.1' }));
    expect(r.success).toBe(false);
  });

  it('rejects a sourceUrl off the citation allowlist', () => {
    const r = McQuestionSchema.safeParse(bad({ ...validMc, sourceUrls: ['https://example.com/x'] }));
    expect(r.success).toBe(false);
  });

  it('rejects a non-kebab-case id', () => {
    const r = McQuestionSchema.safeParse(bad({ ...validMc, id: 'C1_U1_L1_Q01' }));
    expect(r.success).toBe(false);
  });

  it('rejects a concept card with fewer than 3 key points', () => {
    const r = ConceptCardSchema.safeParse(
      bad({ ...validConcept, keyPoints: validConcept.keyPoints.slice(0, 2) }),
    );
    expect(r.success).toBe(false);
  });

  it('rejects an explain-back key-point id absent from the concept card (GC-15d)', () => {
    const r = LessonSchema.safeParse(
      bad({
        ...validLesson,
        explainBack: { ...validExplainBack, keyPointIds: ['kp-not-a-real-point'] },
      }),
    );
    expect(r.success).toBe(false);
  });

  it('rejects a lesson whose estimatedSecondsTotal does not equal the derived sum', () => {
    const r = LessonSchema.safeParse(bad({ ...validLesson, estimatedSecondsTotal: 999 }));
    expect(r.success).toBe(false);
  });

  it('rejects a lesson that exceeds the 300s budget (GC-02)', () => {
    // exercises 180 + 40 = 220, + 90 = 310 (> 300); estimatedSecondsTotal matches the derived sum,
    // so ONLY the budget refinement can reject it.
    const heavyMc: McQuestion = { ...validMc, id: 'c1-u1-l1-q90', estimatedSeconds: 180 };
    const heavyOrder: OrderQuestion = { ...validOrder, id: 'c1-u1-l1-q91', estimatedSeconds: 40 };
    const r = LessonSchema.safeParse(
      bad({ ...validLesson, exercises: [heavyMc, heavyOrder], estimatedSecondsTotal: 310 }),
    );
    expect(r.success).toBe(false);
  });
});

// --- registry -------------------------------------------------------------------------------------

describe('registry — validate-on-definition + append-only IDs', () => {
  beforeEach(() => {
    resetCatalog();
  });

  it('defineLesson cascade-registers the lesson and its embedded questions', () => {
    defineLesson(validLesson);
    const catalog = getCatalog();
    expect(catalog.lessons.map((l) => l.id)).toEqual(['c1-u1-l1']);
    expect(catalog.questions.map((q) => q.id).sort()).toEqual(['c1-u1-l1-q01', 'c1-u1-l1-q06']);
  });

  it('canonicalizes selectable options without changing the correct answer', () => {
    const normalizedMc = canonicalizeQuestionOptions(validMc);
    expect(normalizedMc.type).toBe('mc');
    if (normalizedMc.type !== 'mc') throw new Error('expected mc');
    expect(normalizedMc.options[normalizedMc.answerKey]).toBe(validMc.options[validMc.answerKey]);
    expect(normalizedMc).toEqual(canonicalizeQuestionOptions(normalizedMc));

    const normalizedMulti = canonicalizeQuestionOptions(validMulti);
    expect(normalizedMulti.type).toBe('multi');
    if (normalizedMulti.type !== 'multi') throw new Error('expected multi');
    expect(normalizedMulti.answerKey.map((index) => normalizedMulti.options[index]).sort()).toEqual(
      validMulti.answerKey.map((index) => validMulti.options[index]).sort(),
    );
    expect(normalizedMulti).toEqual(canonicalizeQuestionOptions(normalizedMulti));

    const normalizedCloze = canonicalizeQuestionOptions(validCloze);
    expect(normalizedCloze.type).toBe('cloze');
    if (normalizedCloze.type !== 'cloze') throw new Error('expected cloze');
    expect(normalizedCloze.answerKey.map((key, index) => normalizedCloze.blanks[index].options[key])).toEqual(
      validCloze.answerKey.map((key, index) => validCloze.blanks[index].options[key]),
    );
    expect(normalizedCloze).toEqual(canonicalizeQuestionOptions(normalizedCloze));
  });

  it('defineCourse cascade-registers units, lessons, and questions', () => {
    defineCourse(validCourse);
    const catalog = getCatalog();
    expect(catalog.courses).toHaveLength(1);
    expect(catalog.units).toHaveLength(1);
    expect(catalog.lessons).toHaveLength(1);
    expect(catalog.questions).toHaveLength(2);
  });

  it('re-registering the identical entity is idempotent', () => {
    defineQuestion(validMc);
    expect(() => defineQuestion(validMc)).not.toThrow();
    expect(getCatalog().questions).toHaveLength(1);
  });

  it('re-registering a different entity under the same ID throws (D3)', () => {
    defineQuestion(validMc);
    expect(() => defineQuestion({ ...validMc, answerKey: 1 })).toThrow(ContentRegistryError);
  });

  it('throws at definition time on an invalid entity', () => {
    expect(() => defineQuestion(bad({ ...validMc, options: ['only', 'two'] }) as McQuestion)).toThrow();
  });

  it('reports dangling exam references', () => {
    defineQuestion(validMc);
    defineExam({ ...validExam, questionIds: ['c1-u1-l1-q01', 'does-not-exist'] });
    expect(danglingExamReferences()).toEqual([
      { examId: 'mock-form-a', missing: ['does-not-exist'] },
    ]);
  });
});
