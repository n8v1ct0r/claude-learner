// content/src/d1-agentic-architecture/c1-u2/l3-orchestrator-evaluator.ts
//
// C1-U2-L3 — Orchestrator-workers and evaluator-optimizer (the last two of the five patterns).
// Task statement 1.2 (coordinator dynamically decomposes/delegates/synthesizes; iterative
// refinement loops). Every claim traces to Anthropic's "Building effective agents" (verified
// 2026-07-14 against the cited page).
//
// Confusion pair targeted: orchestrator-workers (subtasks decided at RUNTIME by the orchestrator)
// vs parallelization (predefined subtasks); plus when evaluator-optimizer actually fits.

import { defineLesson } from '../../index';

const BEA = 'https://www.anthropic.com/engineering/building-effective-agents';

export const l3OrchestratorEvaluator = defineLesson({
  id: 'c1-u2-l3',
  title: 'Orchestrator-workers and evaluator-optimizer',
  order: 2,
  concept: {
    conceptId: 'orchestrator-and-evaluator',
    analogy:
      'Orchestrator-workers is a general contractor who looks at each specific job and decides on the spot ' +
      'which subcontractors to hire, then combines their work. Evaluator-optimizer is a writer and an editor: ' +
      'one drafts, the other gives feedback, and they iterate until it is good.',
    plainExplanation:
      'In orchestrator-workers a central LLM dynamically breaks down a task, delegates the subtasks to worker ' +
      'LLMs, and synthesizes their results. Unlike parallelization, the subtasks are not predefined; the ' +
      'orchestrator decides them at runtime based on the input. In evaluator-optimizer one LLM generates a ' +
      'response while another evaluates and gives feedback in a loop, which fits when you have clear evaluation ' +
      'criteria and iterative refinement provides measurable value.',
    examWords: ['orchestrator-workers', 'worker LLMs', 'synthesize', 'evaluator-optimizer', 'iterative refinement'],
    keyPoints: [
      { id: 'kp-orchestrator-and-evaluator-1', text: 'Orchestrator-workers uses a central LLM that dynamically breaks down a task, delegates to workers, and synthesizes results.' },
      { id: 'kp-orchestrator-and-evaluator-2', text: 'The key difference from parallelization is that subtasks are determined by the orchestrator at runtime, not predefined.' },
      { id: 'kp-orchestrator-and-evaluator-3', text: 'Evaluator-optimizer has one LLM generate a response while another evaluates and gives feedback in a loop.' },
      { id: 'kp-orchestrator-and-evaluator-4', text: 'Use evaluator-optimizer when you have clear evaluation criteria and iterative refinement provides measurable value.' },
    ],
  },
  exercises: [
    {
      id: 'c1-u2-l3-q01',
      type: 'mc',
      domain: 'd1',
      conceptId: 'orchestrator-and-evaluator',
      taskStatement: '1.2',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'What defines the orchestrator-workers workflow?',
      options: [
        'A central LLM dynamically breaks down tasks, delegates them to worker LLMs, and synthesizes their results',
        'The same task is run repeatedly and the outputs are voted on',
        'A fixed sequence where each call processes the previous output',
        'One LLM generates while another critiques it in a loop',
      ],
      answerKey: 0,
      explanation:
        'Orchestrator-workers centers on a lead LLM that decomposes, delegates, and synthesizes. The generate-then-critique ' +
        'option describes evaluator-optimizer, a different pattern.',
      misconceptionTag: 'orchestrator-vs-evaluator',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l3-q02',
      type: 'mc',
      domain: 'd1',
      conceptId: 'orchestrator-and-evaluator',
      taskStatement: '1.2',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'What is the key difference between orchestrator-workers and parallelization?',
      options: [
        'In orchestrator-workers the subtasks are determined at runtime by the orchestrator, not predefined',
        'Orchestrator-workers never uses more than one model',
        'Parallelization always includes an evaluation loop',
        'Orchestrator-workers can only run its subtasks sequentially',
      ],
      answerKey: 0,
      explanation:
        'They look topographically similar, but orchestrator-workers decides subtasks dynamically from the input, while ' +
        'parallelization uses predefined splits. The "only one model" answer is false: workers are separate LLM calls.',
      misconceptionTag: 'orchestrator-vs-parallelization',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l3-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd1',
      conceptId: 'orchestrator-and-evaluator',
      taskStatement: '1.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A coding task must change an unpredictable set of files that depends on the request, so a central model decides which files and edits are needed, delegates them, then merges the results. Which pattern is this?',
      options: [
        'Orchestrator-workers',
        'Parallelization sectioning with predefined subtasks',
        'Prompt chaining',
        'Evaluator-optimizer',
      ],
      answerKey: 0,
      explanation:
        'The subtasks cannot be predicted and are chosen at runtime by the central model, which is orchestrator-workers. ' +
        'Sectioning is the trap: it requires the subtasks to be defined in advance, which they are not here.',
      misconceptionTag: 'orchestrator-vs-parallelization',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l3-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd1',
      conceptId: 'orchestrator-and-evaluator',
      taskStatement: '1.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A literary translation keeps missing nuance, so an engineer wants one model to critique each draft against clear criteria and feed notes back for revision, looping until it passes. Which pattern fits and why?',
      options: [
        'Evaluator-optimizer, because there are clear evaluation criteria and iterative refinement adds measurable value',
        'Voting, because running the translation many times raises confidence',
        'Routing, because translations fall into distinct categories',
        'Orchestrator-workers, because the subtasks are unpredictable',
      ],
      answerKey: 0,
      explanation:
        'Clear criteria plus valuable iteration is the signature of evaluator-optimizer: generate, evaluate, refine. ' +
        'Voting is the trap: it gathers diverse outputs but does not refine a single draft against feedback.',
      misconceptionTag: 'evaluator-fit',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l3-q05',
      type: 'mc',
      domain: 'd1',
      conceptId: 'orchestrator-and-evaluator',
      taskStatement: '1.2',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'When is evaluator-optimizer a poor fit?',
      options: [
        'When you lack clear evaluation criteria or iteration does not measurably improve the output',
        'When the LLM\'s responses demonstrably improve with feedback',
        'When the LLM can articulate useful feedback itself',
        'When output quality varies and refinement helps',
      ],
      answerKey: 0,
      explanation:
        'Without clear criteria or measurable gains from iterating, the evaluate-and-refine loop adds cost for nothing. ' +
        'The other three describe exactly the conditions where evaluator-optimizer does fit.',
      misconceptionTag: 'evaluator-fit',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l3-q06',
      type: 'multi',
      domain: 'd1',
      conceptId: 'orchestrator-and-evaluator',
      taskStatement: '1.2',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two signs indicate a good fit for evaluator-optimizer? Select TWO.',
      options: [
        'LLM responses demonstrably improve with feedback',
        'The LLM can provide useful evaluation feedback itself',
        'The subtasks must all be fixed in advance',
        'You need only a single pass with no evaluation criteria',
        'You want the same task run in parallel and voted on',
      ],
      answerKey: [0, 1],
      explanation:
        'Evaluator-optimizer fits when feedback measurably improves responses and the model can supply that feedback. ' +
        'Fixed subtasks, single-pass work, and voting all describe other patterns.',
      misconceptionTag: 'evaluator-fit',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l3-q07',
      type: 'cloze',
      domain: 'd1',
      conceptId: 'orchestrator-and-evaluator',
      taskStatement: '1.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: in ___-workers a central LLM decides subtasks at runtime and synthesizes results, while in evaluator-___ one model generates and another gives feedback in a loop.',
      blanks: [
        { options: ['orchestrator', 'evaluator', 'routing'] },
        { options: ['optimizer', 'worker', 'voter'] },
      ],
      answerKey: [0, 0],
      explanation:
        'Orchestrator-workers dynamically decomposes and synthesizes; evaluator-optimizer loops generation against ' +
        'feedback. Mixing the names would confuse a delegation pattern with a refinement loop.',
      misconceptionTag: 'orchestrator-vs-evaluator',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l3-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd1',
      conceptId: 'orchestrator-and-evaluator',
      taskStatement: '1.2',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: in orchestrator-workers the subtasks are fixed and defined before the run.',
      options: [
        'False, the orchestrator determines the subtasks at runtime from the input',
        'True',
      ],
      answerKey: 0,
      explanation:
        'The defining trait of orchestrator-workers is runtime-determined subtasks. Predefining them would make it ' +
        'parallelization instead.',
      misconceptionTag: 'orchestrator-vs-parallelization',
      sourceUrls: [BEA],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: how is orchestrator-workers different from parallelization, and when would you reach for evaluator-optimizer?',
    conceptId: 'orchestrator-and-evaluator',
    keyPointIds: [
      'kp-orchestrator-and-evaluator-1',
      'kp-orchestrator-and-evaluator-2',
      'kp-orchestrator-and-evaluator-3',
      'kp-orchestrator-and-evaluator-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
