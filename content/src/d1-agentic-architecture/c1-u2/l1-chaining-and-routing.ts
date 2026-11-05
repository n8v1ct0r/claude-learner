// content/src/d1-agentic-architecture/c1-u2/l1-chaining-and-routing.ts
//
// C1-U2-L1 — Prompt chaining and routing (two of the five workflow patterns). Task statement 1.6
// (task decomposition: fixed pipelines / prompt chaining for predictable multi-aspect work).
// Every claim traces to Anthropic's "Building effective agents" (verified 2026-07-14 against the
// cited page).
//
// Confusion pair targeted: prompt chaining (fixed sequence, each step consumes the previous output)
// vs routing (classify then branch to a specialized follow-up). The scenario and spot-bug items
// attack the belief that one giant prompt beats separating distinct categories.

import { defineLesson } from '../../index';

const BEA = 'https://www.anthropic.com/engineering/building-effective-agents';

export const l1ChainingAndRouting = defineLesson({
  id: 'c1-u2-l1',
  title: 'Prompt chaining and routing',
  order: 0,
  concept: {
    conceptId: 'chaining-and-routing',
    analogy:
      'Prompt chaining is an assembly line: each station works on what the last station produced, in a ' +
      'fixed order. Routing is a mailroom clerk: they read each letter and send it to the one department ' +
      'best equipped to handle it.',
    plainExplanation:
      'Prompt chaining decomposes a task into a fixed sequence of steps where each LLM call processes the ' +
      'output of the previous one, and you can add programmatic gate checks between steps. Routing classifies ' +
      'an input and directs it to a specialized follow-up task, which gives separation of concerns and more ' +
      'specialized prompts. Reach for chaining when the task cleanly splits into fixed subtasks; reach for ' +
      'routing when there are distinct categories handled better separately and classification is accurate.',
    examWords: ['prompt chaining', 'routing', 'gate', 'classification', 'separation of concerns'],
    keyPoints: [
      { id: 'kp-chaining-and-routing-1', text: 'Prompt chaining decomposes a task into a fixed sequence where each LLM call processes the previous call\'s output.' },
      { id: 'kp-chaining-and-routing-2', text: 'You can add programmatic gate checks between chained steps to catch errors before they propagate.' },
      { id: 'kp-chaining-and-routing-3', text: 'Routing classifies an input and sends it to a specialized follow-up task, enabling separation of concerns.' },
      { id: 'kp-chaining-and-routing-4', text: 'Use chaining when subtasks are fixed and sequential; use routing when distinct categories are handled better separately and classification is accurate.' },
    ],
  },
  exercises: [
    {
      id: 'c1-u2-l1-q01',
      type: 'mc',
      domain: 'd1',
      conceptId: 'chaining-and-routing',
      taskStatement: '1.6',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'What does the prompt chaining workflow do?',
      options: [
        'Decomposes a task into a sequence of steps where each call processes the previous call\'s output',
        'Runs the same task many times in parallel and votes on the result',
        'Classifies each input and sends it to a specialized follow-up',
        'Lets the model dynamically decide the steps at runtime',
      ],
      answerKey: 0,
      explanation:
        'Prompt chaining is a fixed sequence in which each LLM call consumes the output of the one before it. The ' +
        '"votes on the result" answer describes parallelization voting, a different pattern that runs one task repeatedly.',
      misconceptionTag: 'chaining-vs-parallelization',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l1-q02',
      type: 'mc',
      domain: 'd1',
      conceptId: 'chaining-and-routing',
      taskStatement: '1.6',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'A team wants to catch a bad intermediate result in a prompt chain before it flows into the next step. What does the pattern offer for this?',
      options: [
        'A programmatic gate check placed between steps',
        'Raising max_tokens on the final step',
        'Switching the whole task to an autonomous agent',
        'Adding more worker LLMs in parallel',
      ],
      answerKey: 0,
      explanation:
        'Chaining lets you add programmatic gate checks on intermediate steps to keep the process on track. Raising ' +
        'max_tokens does nothing to validate an intermediate result, so it is the tempting but irrelevant option.',
      misconceptionTag: 'chaining-gate',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l1-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd1',
      conceptId: 'chaining-and-routing',
      taskStatement: '1.6',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Incoming support tickets fall into billing, technical, and account categories, each served best by a different specialized prompt, and a classifier labels them accurately. Which workflow fits?',
      options: [
        'Routing: classify the ticket, then send it to the matching specialized prompt',
        'Prompt chaining through all three prompts in a fixed order',
        'Parallelization voting across the three prompts',
        'A single autonomous agent deciding each step',
      ],
      answerKey: 0,
      explanation:
        'Distinct categories handled better separately, with accurate classification, is exactly where routing fits. ' +
        'Chaining is the trap: forcing every ticket through all three prompts in sequence ignores that only one applies.',
      misconceptionTag: 'routing-vs-chaining',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l1-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd1',
      conceptId: 'chaining-and-routing',
      taskStatement: '1.6',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An engineer writes one giant prompt that tries to handle billing, technical, and account questions at once, and quality is poor across all three. What pattern would fix this?',
      options: [
        'Routing: classify the input first, then use a specialized prompt per category for separation of concerns',
        'Chain all three prompts one after another regardless of the question',
        'Run all three prompts in parallel and vote on the answer',
        'Convert the giant prompt into an autonomous agent',
      ],
      answerKey: 0,
      explanation:
        'Routing separates concerns so each category gets a focused, specialized prompt instead of one overloaded one. ' +
        'Chaining all three is the trap: it still runs prompts that do not apply and does not fix the overload.',
      misconceptionTag: 'routing-vs-chaining',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l1-q05',
      type: 'mc',
      domain: 'd1',
      conceptId: 'chaining-and-routing',
      taskStatement: '1.6',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'When is prompt chaining the better choice than routing?',
      options: [
        'When the task cleanly decomposes into fixed subtasks done in order, each building on the last',
        'When inputs fall into distinct categories handled better separately',
        'When you need several independent perspectives for higher confidence',
        'When the number of steps cannot be predicted in advance',
      ],
      answerKey: 0,
      explanation:
        'Chaining fits fixed, sequential subtasks where each step consumes the previous output. The "distinct categories" ' +
        'answer is the routing case, and unpredictable step counts point toward an agent, not a chain.',
      misconceptionTag: 'routing-vs-chaining',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l1-q06',
      type: 'multi',
      domain: 'd1',
      conceptId: 'chaining-and-routing',
      taskStatement: '1.6',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'A routing workflow sits in front of your support inbox. Which two things does routing itself do? Select TWO.',
      options: [
        'It classifies each incoming input and directs it to a specialized follow-up task',
        'It separates concerns so each category gets its own specialized prompt',
        'It runs the same prompt repeatedly and votes on the outputs',
        'It requires the model to dynamically break down tasks at runtime',
        'It feeds each step\'s output into the next step as input',
      ],
      answerKey: [0, 1],
      explanation:
        'Routing classifies then branches to a specialized task, which separates concerns and sharpens each prompt. ' +
        'Voting and feeding outputs forward describe parallelization and chaining, not routing.',
      misconceptionTag: 'routing-vs-chaining',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l1-q07',
      type: 'cloze',
      domain: 'd1',
      conceptId: 'chaining-and-routing',
      taskStatement: '1.6',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: prompt ___ decomposes a task into a fixed sequence where each call processes the previous output, while ___ classifies an input and sends it to a specialized follow-up.',
      blanks: [
        { options: ['chaining', 'routing', 'voting'] },
        { options: ['routing', 'chaining', 'sectioning'] },
      ],
      answerKey: [0, 0],
      explanation:
        'Chaining is the fixed sequence where output flows into the next step; routing classifies and branches. ' +
        'Swapping them would misname a sequential pipeline as a classifier and vice versa.',
      misconceptionTag: 'routing-vs-chaining',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l1-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd1',
      conceptId: 'chaining-and-routing',
      taskStatement: '1.6',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: routing is the right pattern when every input must pass through the same fixed sequence of steps.',
      options: [
        'False, a fixed sequence is prompt chaining; routing branches inputs by category',
        'True',
      ],
      answerKey: 0,
      explanation:
        'A single fixed sequence for every input is prompt chaining. Routing exists precisely to send different inputs ' +
        'down different specialized paths.',
      misconceptionTag: 'routing-vs-chaining',
      sourceUrls: [BEA],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: you have tickets that split into three distinct categories. Would you chain prompts or route them, and why?',
    conceptId: 'chaining-and-routing',
    keyPointIds: [
      'kp-chaining-and-routing-1',
      'kp-chaining-and-routing-2',
      'kp-chaining-and-routing-3',
      'kp-chaining-and-routing-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
