// content/src/d4-prompt-engineering/c4-u4/l1-success-criteria-evals.ts
//
// C4-U4-L1 — Success criteria and empirical prompt evaluation. Task statements 4.1 (specific,
// measurable criteria) and 4.6 (empirical, automated grading at volume). Claims trace to Anthropic's
// "Define success" and "Develop tests" (empirical evals) pages, verified 2026-07-14.
//
// Confusion pair targeted: vague criteria vs specific measurable ones, and a few hand-graded evals vs
// many automated ones.
//
// Re-verified 2026-09-24: "Define success" merged into "Define success criteria and build
// evaluations" at /test-and-evaluate/develop-tests, which still lists Specific, Measurable,
// Achievable, Relevant and "Prioritize volume over quality"; SUCCESS therefore cites that final URL.

import { defineLesson } from '../../index';

const DEVTESTS = 'https://platform.claude.com/docs/en/test-and-evaluate/develop-tests';
const SUCCESS = DEVTESTS;

export const l1SuccessCriteriaEvals = defineLesson({
  id: 'c4-u4-l1',
  title: 'Success criteria and empirical evals',
  order: 0,
  concept: {
    conceptId: 'success-criteria-evals',
    analogy:
      'You cannot hit a target you cannot see. Defining measurable success criteria before you build, then ' +
      'grading against a big set of test cases, turns prompt tuning from vibes into a scoreboard.',
    plainExplanation:
      'Good success criteria are specific, measurable, achievable, and relevant, and most real cases need ' +
      'several dimensions such as accuracy, latency, and cost. Define them before building so you can measure ' +
      'against them. Then build empirical evals: many test cases that mirror real usage and edge cases, graded ' +
      'automatically where possible with exact match, code-based, or LLM-based grading. Favor a high volume of ' +
      'automated evals over a few hand-graded ones.',
    examWords: ['success criteria', 'specific, measurable, achievable, relevant', 'empirical evals', 'code-based grading', 'LLM-based grading'],
    keyPoints: [
      { id: 'kp-success-criteria-evals-1', text: 'Good success criteria are specific, measurable, achievable, and relevant, and usually multidimensional (accuracy, latency, cost).' },
      { id: 'kp-success-criteria-evals-2', text: 'Define success criteria before building so you can measure progress against them.' },
      { id: 'kp-success-criteria-evals-3', text: 'Build empirical evals from many test cases that mirror real usage and edge cases.' },
      { id: 'kp-success-criteria-evals-4', text: 'Prefer automated grading (exact match, code-based, LLM-based) at high volume over a few hand-graded cases.' },
    ],
  },
  exercises: [
    {
      id: 'c4-u4-l1-q01',
      type: 'mc',
      domain: 'd4',
      conceptId: 'success-criteria-evals',
      taskStatement: '4.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'Which of these is a well-formed success criterion?',
      options: [
        'Achieve at least an F1 of 0.85 on a held-out set of 10,000 posts',
        'Classify sentiments well',
        'Be a good model',
        'Return answers fast enough',
      ],
      answerKey: 0,
      explanation:
        'A specific, measurable target on a defined dataset is exactly what good criteria look like. "Well," "good," and "fast ' +
        'enough" are vague and cannot be measured or compared.',
      misconceptionTag: 'specific-criteria',
      sourceUrls: [SUCCESS],
    },
    {
      id: 'c4-u4-l1-q02',
      type: 'mc',
      domain: 'd4',
      conceptId: 'success-criteria-evals',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'What makes a success criterion measurable?',
      options: [
        'It uses a quantitative metric or a consistently applied qualitative scale',
        'It is written in the system prompt',
        'It deliberately avoids numbers',
        'It always targets 100% accuracy',
      ],
      answerKey: 0,
      explanation:
        'Measurability comes from quantitative metrics or consistent qualitative scales, which provide clarity and scalability. ' +
        'Where the criterion is written, avoiding numbers, or demanding perfection do not make it measurable.',
      misconceptionTag: 'measurable-criteria',
      sourceUrls: [SUCCESS],
    },
    {
      id: 'c4-u4-l1-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'success-criteria-evals',
      taskStatement: '4.6',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You have 2,000 categorical classification cases to grade. What does the eval guidance recommend?',
      options: [
        'Automate grading, for example with exact match, so you can run high volume',
        'Hand-grade each case for maximum quality',
        'Grade only 20 of them by eye',
        'Skip grading and ship',
      ],
      answerKey: 0,
      explanation:
        'Categorical answers are ideal for automated exact-match grading, which lets you evaluate at volume. Hand-grading a few ' +
        'cases gives weaker coverage than many automated ones.',
      misconceptionTag: 'automate-grading',
      sourceUrls: [DEVTESTS],
    },
    {
      id: 'c4-u4-l1-q04',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'success-criteria-evals',
      taskStatement: '4.6',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You need to grade subjective tone across thousands of replies. Which grading method fits?',
      options: [
        'LLM-based grading with a rubric or Likert scale',
        'Exact string match against one gold answer',
        'Manual review of every single reply',
        'No grading is possible for tone',
      ],
      answerKey: 0,
      explanation:
        'LLM-based grading with a rubric or scale is designed for subjective qualities like tone at scale. Exact match does not ' +
        'capture nuance, and manual review of thousands is impractical.',
      misconceptionTag: 'llm-grading',
      sourceUrls: [DEVTESTS],
    },
    {
      id: 'c4-u4-l1-q05',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd4',
      conceptId: 'success-criteria-evals',
      taskStatement: '4.6',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A team writes 15 painstakingly hand-graded evals and calls their coverage done. Per the guidance, what is the gap?',
      options: [
        'Prefer many automated test cases with slightly lower signal over a few hand-graded ones',
        'They should delete the evals and start over',
        'Every eval must be LLM-graded',
        'Fifteen evals is already too many',
      ],
      answerKey: 0,
      explanation:
        'The guidance prioritizes volume: more questions with slightly lower-signal automated grading beat a handful of ' +
        'hand-graded ones. The evals need broader automated coverage, not deletion or a single mandated grading style.',
      misconceptionTag: 'volume-over-perfection',
      sourceUrls: [DEVTESTS],
    },
    {
      id: 'c4-u4-l1-q06',
      type: 'multi',
      domain: 'd4',
      conceptId: 'success-criteria-evals',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two traits define good success criteria? Select TWO.',
      options: [
        'Specific and measurable',
        'Relevant to the application purpose',
        'Deliberately vague to stay flexible',
        'Always set to 100%',
        'Defined only after launch',
      ],
      answerKey: [0, 1],
      explanation:
        'Specific, measurable, and relevant are core traits of good criteria. Vagueness, unrealistic perfection, and defining ' +
        'criteria only after launch all undercut useful measurement.',
      misconceptionTag: 'specific-criteria',
      sourceUrls: [SUCCESS],
    },
    {
      id: 'c4-u4-l1-q07',
      type: 'mc',
      domain: 'd4',
      conceptId: 'success-criteria-evals',
      taskStatement: '4.6',
      difficulty: 3,
      estimatedSeconds: 20,
      stem: 'A FAQ bot gives different answers to reworded versions of the same question. Which eval dimension and method surface this?',
      options: [
        'Consistency, measured by semantic (cosine) similarity across paraphrased inputs',
        'Latency, measured by a timer',
        'Exact match on the answer label',
        'Cost, measured per token',
      ],
      answerKey: 0,
      explanation:
        'Consistency across paraphrased inputs is measured with semantic similarity of the responses. A timer, exact match, and ' +
        'cost tracking measure different properties and would miss the reworded-question drift.',
      misconceptionTag: 'consistency-eval',
      sourceUrls: [DEVTESTS],
    },
    {
      id: 'c4-u4-l1-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd4',
      conceptId: 'success-criteria-evals',
      taskStatement: '4.6',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: a few carefully hand-graded examples beat a large automated eval set.',
      options: [
        'False, high-volume automated grading generally beats a few hand-graded cases',
        'True',
      ],
      answerKey: 0,
      explanation:
        'The guidance favors volume: many automated test cases, even with slightly lower signal, give better coverage than a ' +
        'small hand-graded set.',
      misconceptionTag: 'volume-over-perfection',
      sourceUrls: [DEVTESTS],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: before tuning a prompt, what makes a success criterion good, and how would you build evals you can actually run at scale?',
    conceptId: 'success-criteria-evals',
    keyPointIds: [
      'kp-success-criteria-evals-1',
      'kp-success-criteria-evals-2',
      'kp-success-criteria-evals-3',
      'kp-success-criteria-evals-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 230,
});
