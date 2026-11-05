// Content-validator unit tests (GC-01 / GC-13 / GC-15d machinery).
//
// Each seeded-violation fixture proves ONE check fires; a fully-valid catalog proves every check is
// silent. The checks are pure functions over an in-memory catalog (content/scripts/lib/validators),
// so no filesystem or network is touched here. Typed globals via '@jest/globals' (repo convention).
import { describe, expect, it } from '@jest/globals';

import {
  checkZod,
  checkAnswerKeys,
  checkAnswerPositionBalance,
  checkCitations,
  checkBannedCopy,
  checkLessonBudget,
  checkKeyPointRoundTrip,
  checkIdRegistry,
  checkDuplicates,
  checkTimedContent,
  checkLengthCue,
  lengthCueStats,
  currentEntityEntries,
  type RegistryEntry,
} from '../../content/scripts/lib/validators';
import type {
  CatalogSnapshot,
  ClozeQuestion,
  ConceptCard,
  Course,
  ExplainBack,
  Exam,
  Lesson,
  McQuestion,
  MultiQuestion,
  Question,
  Unit,
} from '../../content/schema/types';

// A host on blueprint.json citation_allowlist.
const SRC = 'https://www.anthropic.com/engineering/building-effective-agents';
const DOCS = 'https://docs.claude.com/en/docs/build-with-claude/tool-use';

// --- valid building blocks ------------------------------------------------------------------------

const validMc: McQuestion = {
  id: 'c1-u1-l1-q01',
  type: 'mc',
  domain: 'd1',
  conceptId: 'workflows-vs-agents',
  taskStatement: '1.1',
  difficulty: 2,
  estimatedSeconds: 20,
  stem: 'A team needs a predictable fixed-stage billing pipeline. Which design fits best?',
  options: [
    'A workflow with predefined code paths',
    'An autonomous agent loop that decides each step',
    'A single prompt with no tools',
    'A multi-agent swarm with no coordinator',
  ],
  answerKey: 0,
  explanation:
    'Workflows suit predictable, fixed sequences. The autonomous loop adds nondeterminism the fixed pipeline does not need.',
  sourceUrls: [SRC],
};

const validMulti: MultiQuestion = {
  id: 'c1-u1-l1-q02',
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
    'Parsing assistant prose for the word done',
    'Random termination',
  ],
  selectCount: 2,
  answerKey: [0, 2],
  explanation: 'end_turn and a resolved tool_use with no further calls are model-driven stops.',
  sourceUrls: [DOCS],
};

const validConcept: ConceptCard = {
  conceptId: 'workflows-vs-agents',
  analogy: 'A workflow is a train on rails; an agent is a driver choosing roads.',
  plainExplanation:
    'Workflows follow predefined code paths. Agents let the model decide the next step in a loop.',
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

// exercises 20 + 30 = 50; + 30s concept + 90s explain-back = 170s (<= 300).
const validLesson: Lesson = {
  id: 'c1-u1-l1',
  title: 'Workflows vs agents',
  order: 0,
  concept: validConcept,
  exercises: [validMc, validMulti],
  explainBack: validExplainBack,
  estimatedSecondsTotal: 140,
};

const validUnit: Unit = { id: 'c1-u1', title: 'Think in Agents', order: 0, lessons: [validLesson] };

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
  questionIds: ['c1-u1-l1-q01', 'c1-u1-l1-q02'],
  timeLimitMinutes: 120,
};

function catalogOf(overrides: Partial<CatalogSnapshot>): CatalogSnapshot {
  return {
    courses: [validCourse],
    units: [validUnit],
    lessons: [validLesson],
    questions: [validMc, validMulti],
    exams: [validExam],
    ...overrides,
  };
}

// --- fully-valid catalog passes every check -------------------------------------------------------

describe('validators — a fully-valid catalog passes every check', () => {
  const catalog = catalogOf({});

  it('(a) zod: no violations', () => {
    expect(checkZod(catalog)).toEqual([]);
  });
  it('(b) answer-key: no violations', () => {
    expect(checkAnswerKeys(catalog.questions)).toEqual([]);
  });
  it('(b2) answer-position: small fixture pools are ignored', () => {
    expect(checkAnswerPositionBalance(catalog)).toEqual([]);
  });
  it('(c) citations: no violations', () => {
    expect(checkCitations(catalog.questions)).toEqual([]);
  });
  it('(d) banned-copy: no violations', () => {
    expect(checkBannedCopy(catalog)).toEqual([]);
  });
  it('(e) lesson-budget: no violations', () => {
    expect(checkLessonBudget(catalog.lessons)).toEqual([]);
  });
  it('(f) key-points round-trip: no violations', () => {
    expect(checkKeyPointRoundTrip(catalog.lessons)).toEqual([]);
  });
  it('(g) id-registry: no violations when every id is recorded', () => {
    const registry = currentEntityEntries(catalog);
    expect(checkIdRegistry(currentEntityEntries(catalog), registry, { update: false }).violations).toEqual([]);
  });
  it('(h) dupes: no violations for distinct stems', () => {
    expect(checkDuplicates(catalog.questions).violations).toEqual([]);
  });
  it('(i) timed-content: no violations when no tf-speed question is present', () => {
    expect(checkTimedContent(catalog.questions)).toEqual([]);
  });
  it('(j) length-cue: exams below the minimum size are ignored', () => {
    expect(checkLengthCue(catalog)).toEqual([]);
  });
});

// --- each seeded violation makes exactly its own check fire ----------------------------------------

describe('validators — seeded violations fire the right check', () => {
  it('(a) zod fires on a structurally-invalid question (3-option mc)', () => {
    const badMc: McQuestion = { ...validMc, options: ['only', 'three', 'options'] };
    const violations = checkZod(catalogOf({ questions: [badMc, validMulti] }));
    expect(violations.some((x) => x.check === 'zod' && x.entityId === badMc.id)).toBe(true);
  });

  it('(b) answer-key fires on an mc answerKey out of range', () => {
    const badMc: McQuestion = { ...validMc, answerKey: 9 };
    const violations = checkAnswerKeys([badMc]);
    expect(violations.some((x) => x.check === 'answer-key' && /out of range/.test(x.message))).toBe(true);
  });

  it('(b2) answer-position fires when a large pool trains the same button', () => {
    const biased = Array.from({ length: 24 }, (_, index) => ({
      ...validMc,
      id: `c1-u1-l1-q${String(index + 20).padStart(2, '0')}`,
      answerKey: 0,
    }));
    const violations = checkAnswerPositionBalance(catalogOf({ questions: biased }));
    expect(violations.some((item) => item.check === 'answer-position' && item.entityId === 'all-standard-mc')).toBe(true);
  });

  it('(b) answer-key fires on a multi whose stem omits the select count', () => {
    const badMulti: MultiQuestion = { ...validMulti, stem: 'Which are valid stop signals for an agentic loop?' };
    const violations = checkAnswerKeys([badMulti]);
    expect(violations.some((x) => /state how many to select/.test(x.message))).toBe(true);
  });

  it('(b) answer-key fires on an "all of the above" option', () => {
    const badMc: McQuestion = {
      ...validMc,
      options: ['A workflow', 'An agent loop', 'A single prompt', 'All of the above'],
    };
    const violations = checkAnswerKeys([badMc]);
    expect(violations.some((x) => /all of the above/i.test(x.message))).toBe(true);
  });

  it('(b) answer-key fires on a cloze whose blank count != stem markers', () => {
    const badCloze: ClozeQuestion = {
      id: 'c1-u1-l1-q07',
      type: 'cloze',
      domain: 'd1',
      conceptId: 'agentic-loop',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 30,
      stem: 'The loop continues while stop_reason is ___.', // one blank marker...
      blanks: [{ options: ['tool_use', 'end_turn'] }, { options: ['tool_use', 'end_turn'] }], // ...two blanks
      answerKey: [0, 1],
      explanation: 'tool_use continues the loop; end_turn ends it.',
      sourceUrls: [DOCS],
    };
    const violations = checkAnswerKeys([badCloze]);
    expect(violations.some((x) => /marker/.test(x.message))).toBe(true);
  });

  it('(c) citations fires on an off-allowlist sourceUrl', () => {
    const badMc: McQuestion = { ...validMc, sourceUrls: ['https://example.com/prep'] };
    const violations = checkCitations([badMc]);
    expect(violations.some((x) => x.check === 'citations')).toBe(true);
  });

  it('(c) citations fires when a question has no sourceUrl', () => {
    const badMc: McQuestion = { ...validMc, sourceUrls: [] };
    const violations = checkCitations([badMc]);
    expect(violations.some((x) => /no sourceUrl/.test(x.message))).toBe(true);
  });

  it('(d) banned-copy fires on shame vocabulary in any string field', () => {
    const badMc: McQuestion = { ...validMc, explanation: 'Wrong! You failed this one.' };
    const violations = checkBannedCopy(catalogOf({ questions: [badMc], lessons: [], courses: [], units: [], exams: [] }));
    expect(violations.some((x) => x.check === 'banned-copy')).toBe(true);
  });

  it('(e) lesson-budget fires on a lesson over 300s (concept 30s + explain-back 90s included)', () => {
    // exercises 120 + 90 = 210; + 30 concept + 90 explain-back = 330 > 300.
    const heavyA: McQuestion = { ...validMc, id: 'c1-u1-l1-q80', estimatedSeconds: 120 };
    const heavyB: MultiQuestion = { ...validMulti, id: 'c1-u1-l1-q81', estimatedSeconds: 90 };
    const heavyLesson: Lesson = { ...validLesson, exercises: [heavyA, heavyB], estimatedSecondsTotal: 300 };
    const violations = checkLessonBudget([heavyLesson]);
    expect(violations.some((x) => x.check === 'lesson-budget')).toBe(true);
  });

  it('(f) key-points fires when explainBack ids are not byte-identical to concept keyPoints (GC-15d)', () => {
    const badLesson: Lesson = {
      ...validLesson,
      explainBack: { ...validExplainBack, keyPointIds: ['kp-workflows-vs-agents-1', 'kp-workflows-vs-agents-2'] },
    };
    const violations = checkKeyPointRoundTrip([badLesson]);
    expect(violations.some((x) => x.check === 'key-points' && /GC-15d/.test(x.message))).toBe(true);
  });

  it('(g) id-registry fires hard on a renamed/missing recorded id (D3)', () => {
    const registry: RegistryEntry[] = [{ id: 'c1-u1-l1-q01', kind: 'question' }];
    // The catalog "renamed" q01 to q99: the recorded id vanished.
    const current: RegistryEntry[] = [{ id: 'c1-u1-l1-q99', kind: 'question' }];
    const result = checkIdRegistry(current, registry, { update: true });
    expect(result.violations.some((x) => /D3/.test(x.message) && x.entityId === 'c1-u1-l1-q01')).toBe(true);
  });

  it('(g) id-registry fires on a new id when not updating, and appends it when updating', () => {
    const registry: RegistryEntry[] = [];
    const current: RegistryEntry[] = [{ id: 'c1-u1-l1-q01', kind: 'question' }];
    expect(checkIdRegistry(current, registry, { update: false }).violations).toHaveLength(1);
    const updated = checkIdRegistry(current, registry, { update: true });
    expect(updated.violations).toEqual([]);
    expect(updated.appended.map((e) => e.id)).toEqual(['c1-u1-l1-q01']);
  });

  it('(i) timed-content passes when a tf-speed concept ALSO has a non-speed sibling (pilot shape)', () => {
    // validMc is a NON-tf-speed question on concept "workflows-vs-agents"; the tf-speed round shares it.
    const tfSpeed: McQuestion = {
      ...validMc,
      id: 'c1-u1-l1-q10',
      variant: 'tf-speed',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: wrapping an LLM call in a loop automatically makes it an agent.',
      options: ['False — predefined paths are still a workflow', 'True'],
      answerKey: 0,
    };
    expect(checkTimedContent([validMc, tfSpeed])).toEqual([]);
  });

  it('(i) timed-content fires when a concept is reachable ONLY through a tf-speed round (GC-10)', () => {
    const lonelySpeed: McQuestion = {
      ...validMc,
      id: 'c1-u1-l9-q01',
      variant: 'tf-speed',
      conceptId: 'speed-only-concept',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: an agent always beats a workflow.',
      options: ['False — pick the simplest fit', 'True'],
      answerKey: 0,
    };
    // validMulti is on a DIFFERENT concept ("agentic-loop"), so "speed-only-concept" has no
    // non-speed sibling — the reduce-time-pressure path would be its only route to that concept.
    const violations = checkTimedContent([lonelySpeed, validMulti]);
    expect(violations.some((x) => x.check === 'timed-content' && x.entityId === 'c1-u1-l9-q01')).toBe(true);
  });

  it('(h) dupes fires on a near-duplicate pair without variantOf, and clears it with variantOf', () => {
    const twin: McQuestion = {
      ...validMc,
      id: 'c1-u1-l1-q90',
      stem: 'A team needs a predictable fixed-stage billing pipeline. Which design is best?',
    };
    const withoutLink = checkDuplicates([validMc, twin]);
    expect(withoutLink.violations.some((x) => x.check === 'dupes')).toBe(true);

    const linkedTwin: McQuestion = { ...twin, variantOf: validMc.id };
    const withLink = checkDuplicates([validMc, linkedTwin]);
    expect(withLink.violations).toEqual([]);
    expect(withLink.legalVariants).toHaveLength(1);
  });
});

// --- (j) answer-length cue ------------------------------------------------------------------------

describe('validators — (j) length-cue', () => {
  const formOf = (options: (index: number) => string[], answerKey: (index: number) => number) => {
    const questions: McQuestion[] = Array.from({ length: 12 }, (_, index) => ({
      ...validMc,
      id: `c1-u1-l1-q${String(index + 40).padStart(2, '0')}`,
      options: options(index),
      answerKey: answerKey(index),
    }));
    const exam: Exam = { ...validExam, questionIds: questions.map((question) => question.id) };
    return catalogOf({ questions, exams: [exam] });
  };

  it('fires when the key is always the longest option', () => {
    const catalog = formOf(
      () => ['A workflow with predefined code paths for every stage', 'An agent', 'A prompt', 'A swarm'],
      () => 0,
    );
    const violations = checkLengthCue(catalog);
    expect(violations.filter((x) => x.check === 'length-cue' && x.entityId === 'mock-form-a')).toHaveLength(2);
    expect(violations.some((x) => /scores 100\.0%/.test(x.message))).toBe(true);
  });

  it('stays silent when option length does not point at the key', () => {
    const catalog = formOf(
      () => ['Route by a fixed workflow', 'Loop until the model says', 'Cache every tool result', 'Fan out to subagents'],
      (index) => index % 4,
    );
    expect(checkLengthCue(catalog)).toEqual([]);
  });

  it('splits credit across equal-length options and scores multi-select by the k longest', () => {
    const equal: McQuestion = { ...validMc, options: ['aaaa', 'bbbb', 'cccc', 'dddd'], answerKey: 2 };
    expect(lengthCueStats([equal]).strategyScore).toBeCloseTo(0.25);
    const multi: MultiQuestion = {
      ...validMulti,
      options: ['a much longer option one', 'a much longer option two', 'short', 'tiny'],
      answerKey: [0, 1],
      selectCount: 2,
    };
    expect(lengthCueStats([multi]).strategyScore).toBe(1);
    expect(lengthCueStats([{ ...multi, answerKey: [0, 2] }]).strategyScore).toBe(0);
  });
});
