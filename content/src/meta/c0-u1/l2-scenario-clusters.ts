// content/src/meta/c0-u1/l2-scenario-clusters.ts
//
// C0-U1-L2 — Scenario-clustered questions: the 6 published scenarios, decisions-not-definitions,
// and distractor anatomy. A Meet-the-Exam (d0) lesson; questions carry a real exam domain (d1..d5)
// for tracing, spotlighting the domain each scenario/idea belongs to.
//
// Sources verified 2026-07-14, URLs re-verified 2026-09-24:
//   - Certification landing page ("informed decisions about tradeoffs"; covered technologies). The
//     original anthropic.skilljar.com/.../444989 link now 302-redirects here, so this is the final URL:
//     https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
//   - Building effective agents (design-tradeoff framing behind scenario items):
//     https://www.anthropic.com/engineering/building-effective-agents
// The item format ("Multiple-choice and multiple-response items; each item states how many responses
// to select"; "4 scenarios drawn from a bank of 6", "picked at random") and the six scenarios come
// from the official CCA-F Exam Guide v1.0 (public PDF linked from the landing page, cited directly as
// EXAM_GUIDE; its S3 path may change on re-upload) / content/official-task-statements.md +
// content/blueprint.json.

import { defineLesson } from '../../index';

const SKILLJAR = 'https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification';
const EXAM_GUIDE =
  'https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf';
const BEA = 'https://www.anthropic.com/engineering/building-effective-agents';

export const l2ScenarioClusters = defineLesson({
  id: 'c0-u1-l2',
  title: 'Scenario questions: decisions, not definitions',
  order: 1,
  concept: {
    conceptId: 'cca-scenario-clusters',
    analogy:
      'The exam is a driving test, not a vocabulary quiz: the examiner watches how you handle real ' +
      'situations on the road, not whether you can recite the traffic code.',
    plainExplanation:
      'Many items are grouped into scenario clusters. Each sitting draws 4 scenarios from a published ' +
      'bank of 6, and every item states how many answers to select. The questions ask which design fits ' +
      'a situation, and the wrong options are plausible but flawed architectures, so you eliminate by ' +
      'tradeoff rather than by matching a keyword.',
    examWords: [
      'scenario cluster',
      '4 of 6 scenarios',
      'multiple response',
      'states how many to select',
      'plausible-but-flawed distractor',
    ],
    keyPoints: [
      {
        id: 'kp-cca-scenario-clusters-1',
        text: 'Items are scenario-first: they ask which design fits a situation, not what a term means.',
      },
      {
        id: 'kp-cca-scenario-clusters-2',
        text: 'Each sitting draws 4 scenario clusters from a published bank of 6.',
      },
      {
        id: 'kp-cca-scenario-clusters-3',
        text: 'The six scenarios span a customer-support agent, Claude Code code generation, a multi-agent research system, developer productivity tools, Claude Code CI/CD, and structured data extraction.',
      },
      {
        id: 'kp-cca-scenario-clusters-4',
        text: 'Items are multiple choice or multiple response, and each item tells you how many answers to select.',
      },
      {
        id: 'kp-cca-scenario-clusters-5',
        text: 'Distractors are plausible but flawed architectures, so you eliminate by tradeoff, not by keyword.',
      },
    ],
  },
  exercises: [
    {
      id: 'c0-u1-l2-q01',
      type: 'mc',
      variant: 'scenario',
      domain: 'd1',
      conceptId: 'cca-scenario-clusters',
      taskStatement: '1.4',
      difficulty: 2,
      estimatedSeconds: 20,
      scenarioId: 'customer-support-resolution-agent',
      stem: 'A scenario item describes a customer-support agent and offers four system designs. What is the item really asking you to do?',
      options: [
        'Choose the design whose tradeoffs best fit the situation',
        'Define what a support agent is',
        'Recall the exact wording of the documentation',
        'Pick the design that uses the most tools',
      ],
      answerKey: 0,
      explanation:
        'Scenario items test decisions: they reward the design whose tradeoffs fit the described situation. ' +
        'Reciting a definition or the docs misses the point, and "most tools" is a plausible-but-flawed ' +
        'heuristic the incorrect options are built from.',
      misconceptionTag: 'definition-not-decision',
      sourceUrls: [SKILLJAR, BEA],
    },
    {
      id: 'c0-u1-l2-q02',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd2',
      conceptId: 'cca-scenario-clusters',
      taskStatement: '2.1',
      difficulty: 3,
      estimatedSeconds: 20,
      stem: 'A test taker\'s rule is: "Pick the option that repeats the most keywords from the scenario." Why is this strategy flawed?',
      options: [
        "Distractors are written to look plausible and often echo the stem's words; the right answer is the one with sound tradeoffs",
        'The scenario never shares any words with the correct option',
        'Keyword matching always finds the correct answer',
        'The exam forbids re-reading the scenario',
      ],
      answerKey: 0,
      explanation:
        "Plausible-but-flawed distractors are engineered to mirror the stem's vocabulary, so keyword echo is " +
        'a trap, not a signal. You have to reason about which architecture fits, since the correct option will ' +
        'not announce itself by word overlap.',
      misconceptionTag: 'keyword-matching',
      sourceUrls: [SKILLJAR, EXAM_GUIDE],
    },
    {
      id: 'c0-u1-l2-q03',
      type: 'mc',
      domain: 'd3',
      conceptId: 'cca-scenario-clusters',
      taskStatement: '3.4',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'Why might two people who take the exam on different days get different scenario questions?',
      options: [
        'Because each attempt uses 4 of the 6, so the selection rotates',
        'Because the exam is fully randomized with no fixed pool',
        'Because everyone always gets all 6',
        'Because each test taker chooses their own scenarios',
      ],
      answerKey: 0,
      explanation:
        'Each attempt uses 4 of the 6 scenarios, so different attempts can surface different subsets. The pool ' +
        'is fixed at 6, not unlimited, and no attempt shows all 6 or lets the test taker choose.',
      sourceUrls: [SKILLJAR, EXAM_GUIDE],
    },
    {
      id: 'c0-u1-l2-q04',
      type: 'multi',
      domain: 'd4',
      conceptId: 'cca-scenario-clusters',
      taskStatement: '4.3',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two things are true about how exam items ask for answers? Select TWO.',
      options: [
        'Items may be multiple choice or multiple response',
        'Each item states how many answers to select',
        'Every item always has exactly one correct answer',
        'You are told to select all that apply with no count',
        'Multiple-response items are never used',
      ],
      answerKey: [0, 1],
      explanation:
        'The exam mixes single-answer and multiple-response items, and every item tells you how many responses ' +
        'to choose. That is why "always exactly one answer" and vague "select all that apply" phrasings are ' +
        'inaccurate.',
      sourceUrls: [SKILLJAR, EXAM_GUIDE],
    },
    {
      id: 'c0-u1-l2-q05',
      type: 'cloze',
      domain: 'd1',
      conceptId: 'cca-scenario-clusters',
      taskStatement: '1.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A single sitting draws ____ scenario clusters from a published bank of ____ scenarios.',
      blanks: [{ options: ['4', '3', '5'] }, { options: ['6', '5', '8'] }],
      answerKey: [0, 0],
      explanation:
        'Four clusters are chosen each sitting from the pool of six, which is what makes scenario coverage ' +
        'rotate between attempts.',
      sourceUrls: [SKILLJAR, EXAM_GUIDE],
    },
    {
      id: 'c0-u1-l2-q06',
      type: 'mc',
      variant: 'scenario',
      domain: 'd1',
      conceptId: 'cca-scenario-clusters',
      taskStatement: '1.2',
      difficulty: 2,
      estimatedSeconds: 20,
      scenarioId: 'multi-agent-research-system',
      stem: 'You are reviewing the six published scenarios to prepare. Which of these is one of them?',
      options: [
        'A multi-agent research system',
        'A blockchain trading bot',
        'A mobile game leaderboard',
        'A payroll tax calculator',
      ],
      answerKey: 0,
      explanation:
        'A multi-agent research system is one of the six published scenarios, alongside a support agent, ' +
        'Claude Code code generation, developer productivity tools, Claude Code CI/CD, and structured data ' +
        'extraction. The others are not on the published list.',
      sourceUrls: [SKILLJAR, EXAM_GUIDE],
    },
    {
      id: 'c0-u1-l2-q07',
      type: 'mc',
      domain: 'd2',
      conceptId: 'cca-scenario-clusters',
      taskStatement: '2.3',
      difficulty: 3,
      estimatedSeconds: 20,
      stem: 'On a hard scenario item, two of the four designs look reasonable. What is the most reliable way to choose?',
      options: [
        'Find the option whose architecture is flawed for this failure mode, rule it out, and keep the one with sound tradeoffs',
        'Choose the longer, more detailed option',
        'Choose the option that names the newest feature',
        'Guess at random to save time',
      ],
      answerKey: 0,
      explanation:
        'Because distractors are plausible-but-flawed, the winning move is to find the flaw that makes one ' +
        'design wrong for this situation and keep the design whose tradeoffs fit. Length, buzzwords, and random ' +
        'guessing are surface signals the distractors exploit.',
      misconceptionTag: 'plausible-but-flawed',
      sourceUrls: [SKILLJAR, EXAM_GUIDE],
    },
    {
      id: 'c0-u1-l2-q08',
      type: 'mc',
      domain: 'd3',
      conceptId: 'cca-scenario-clusters',
      taskStatement: '3.2',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'An item ends with "Select TWO." What does that tell you about the item?',
      options: [
        'It is a multiple-response item expecting exactly two correct choices',
        'It is a trick and only one answer is correct',
        'You may pick any number of options you like',
        'The two easiest-looking options are correct',
      ],
      answerKey: 0,
      explanation:
        'A stated count like "Select TWO." marks a multiple-response item with exactly that many correct ' +
        'choices, which the exam always tells you. It is not a trick, an open-ended pick, or a hint about ' +
        'which options look easy.',
      sourceUrls: [SKILLJAR, EXAM_GUIDE],
    },
  ],
  explainBack: {
    prompt:
      "Teach the agent: how are the exam's scenario questions different from plain definition questions, and how would you approach one?",
    conceptId: 'cca-scenario-clusters',
    keyPointIds: [
      'kp-cca-scenario-clusters-1',
      'kp-cca-scenario-clusters-2',
      'kp-cca-scenario-clusters-3',
      'kp-cca-scenario-clusters-4',
      'kp-cca-scenario-clusters-5',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 240,
});
