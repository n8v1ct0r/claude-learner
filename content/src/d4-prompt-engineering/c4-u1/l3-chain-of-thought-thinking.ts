// content/src/d4-prompt-engineering/c4-u1/l3-chain-of-thought-thinking.ts
//
// C4-U1-L3 — Chain-of-thought and extended/adaptive thinking. Task statement 4.1 (guide the model's
// reasoning; effort/latency tradeoffs). Claims trace to Anthropic's "Prompting best practices"
// (Thinking and reasoning section) and the Extended thinking / Effort / Adaptive thinking pages,
// verified 2026-07-14.
//
// Confusion pair targeted: reasoning that is not output gives no benefit, and the deprecated
// budget_tokens vs the effort setting on current models.

import { defineLesson } from '../../index';

const PBP = 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices';
const THINK = `${PBP}#leverage-thinking-and-interleaved-thinking-capabilities`;
const EXTENDED = 'https://platform.claude.com/docs/en/build-with-claude/extended-thinking';
const EFFORT = 'https://platform.claude.com/docs/en/build-with-claude/effort';

export const l3ChainOfThoughtThinking = defineLesson({
  id: 'c4-u1-l3',
  title: 'Chain of thought and extended thinking',
  order: 2,
  concept: {
    conceptId: 'chain-of-thought-thinking',
    analogy:
      'Ask someone to show their working, not just the answer. Giving Claude room to reason step by step ' +
      'catches mistakes a snap judgment would miss, but the reasoning only helps if it is actually written out.',
    plainExplanation:
      'Chain-of-thought (CoT) prompting asks Claude to reason step by step before answering, which improves ' +
      'accuracy on multi-step problems at the cost of longer output and higher latency. Claude has to output ' +
      'its reasoning to benefit, so use thinking or answer tags to keep reasoning separate from the final ' +
      'result. Current models use adaptive thinking and you control depth with the effort setting; the older ' +
      'manual budget_tokens control is deprecated.',
    examWords: ['chain-of-thought', 'extended thinking', 'adaptive thinking', 'effort', '<thinking> tags', 'budget_tokens'],
    keyPoints: [
      { id: 'kp-chain-of-thought-thinking-1', text: 'Chain-of-thought asks Claude to reason step by step before answering, improving accuracy on complex multi-step tasks.' },
      { id: 'kp-chain-of-thought-thinking-2', text: 'The tradeoff is longer output and higher latency, so reserve extended reasoning for problems that need multi-step reasoning.' },
      { id: 'kp-chain-of-thought-thinking-3', text: 'Claude must output its reasoning to benefit; use <thinking> and <answer> tags to separate reasoning from the final answer.' },
      { id: 'kp-chain-of-thought-thinking-4', text: 'Current models use adaptive thinking with the effort setting to control depth; manual budget_tokens is deprecated.' },
    ],
  },
  exercises: [
    {
      id: 'c4-u1-l3-q01',
      type: 'mc',
      domain: 'd4',
      conceptId: 'chain-of-thought-thinking',
      taskStatement: '4.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'When is chain-of-thought prompting most worth the extra latency?',
      options: [
        'On complex, multi-step problems such as analysis or math',
        'On every prompt regardless of difficulty',
        'Only on one-word classification tasks',
        'Never, because it always hurts accuracy',
      ],
      answerKey: 0,
      explanation:
        'Reasoning earns its added output and latency on multi-step problems where step-by-step work catches errors. Applying it ' +
        'to trivial lookups just adds cost, and it does not hurt accuracy on the problems it suits.',
      misconceptionTag: 'cot-when',
      sourceUrls: [THINK],
    },
    {
      id: 'c4-u1-l3-q02',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'chain-of-thought-thinking',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A model gives a wrong final number on a multi-step finance calculation. Which prompting change most directly helps?',
      options: [
        'Ask it to work through the steps and show its reasoning before giving the final answer',
        'Tell it to answer faster',
        'Remove all of the context',
        'Lower max_tokens',
      ],
      answerKey: 0,
      explanation:
        'Letting the model reason step by step and show the work exposes where a multi-step calculation goes wrong. Speeding it up, ' +
        'stripping context, or cutting max_tokens all reduce the room it needs to reason correctly.',
      misconceptionTag: 'cot-when',
      sourceUrls: [THINK],
    },
    {
      id: 'c4-u1-l3-q03',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd4',
      conceptId: 'chain-of-thought-thinking',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An engineer adds "think silently, then output only the final label" and sees no accuracy gain from reasoning. What is the flaw?',
      options: [
        'Claude must output its thinking to benefit; reasoning that is never written out gives no gain',
        'The label should have been returned as JSON',
        'The prompt is too polite',
        'Thinking only works when placed in the system prompt',
      ],
      answerKey: 0,
      explanation:
        'The benefit of chain-of-thought comes from the model actually producing the reasoning tokens; suppressing them removes the ' +
        'gain. The output format and tone are not the issue here.',
      misconceptionTag: 'reasoning-must-be-output',
      sourceUrls: [THINK],
    },
    {
      id: 'c4-u1-l3-q04',
      type: 'mc',
      domain: 'd4',
      conceptId: 'chain-of-thought-thinking',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'On current models, how do you control how much Claude thinks?',
      options: [
        'The effort setting, with adaptive thinking',
        'The deprecated budget_tokens field',
        'The temperature field',
        'The stop_sequences field',
      ],
      answerKey: 0,
      explanation:
        'Current models use adaptive thinking, and depth is controlled by the effort setting. Manual budget_tokens is deprecated ' +
        'and returns a 400 error on the newest models, so it is the trap answer.',
      misconceptionTag: 'effort-vs-budget-tokens',
      sourceUrls: [EFFORT, EXTENDED],
    },
    {
      id: 'c4-u1-l3-q05',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'chain-of-thought-thinking',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Your agent thinks too much on trivial queries, inflating latency. Which change matches the guidance?',
      options: [
        'Lower the effort setting so easy queries get a direct answer',
        'Force maximum thinking on every call',
        'Parse the reasoning text to stop it early',
        'Remove the answer tags from the prompt',
      ],
      answerKey: 0,
      explanation:
        'Adaptive thinking calibrates on the effort setting and query complexity, so lowering effort reduces thinking on easy ' +
        'queries. Forcing maximum thinking is the opposite fix, and parsing reasoning text to interrupt it is brittle.',
      misconceptionTag: 'effort-vs-budget-tokens',
      sourceUrls: [EFFORT],
    },
    {
      id: 'c4-u1-l3-q06',
      type: 'multi',
      domain: 'd4',
      conceptId: 'chain-of-thought-thinking',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'A teammate is unsure how chain-of-thought behaves. Which two claims about it hold up? Select TWO.',
      options: [
        'It trades longer output and higher latency for better multi-step reasoning',
        'Claude must output the reasoning for it to help',
        'It should be used on every prompt including simple lookups',
        'It guarantees a schema-valid JSON answer',
        'It works only when no examples are present',
      ],
      answerKey: [0, 1],
      explanation:
        'The real tradeoff is latency for reasoning quality, and the reasoning must be produced to help. It is not a universal ' +
        'default, does not guarantee JSON, and is compatible with examples, so the other options are false.',
      misconceptionTag: 'reasoning-must-be-output',
      sourceUrls: [THINK],
    },
    {
      id: 'c4-u1-l3-q07',
      type: 'order',
      domain: 'd4',
      conceptId: 'chain-of-thought-thinking',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Order these to build a manual chain-of-thought prompt that separates reasoning from the answer.',
      steps: [
        'Ask Claude to reason step by step inside <thinking> tags',
        'Have it place the final result inside <answer> tags',
        'Parse only the <answer> content in your downstream code',
      ],
      answerKey: [0, 1, 2],
      explanation:
        'Reason first in thinking tags, put the result in answer tags, then read only the answer downstream. Parsing before the ' +
        'model has reasoned, or mixing reasoning into the answer, defeats the separation.',
      misconceptionTag: 'reasoning-must-be-output',
      sourceUrls: [THINK],
    },
    {
      id: 'c4-u1-l3-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd4',
      conceptId: 'chain-of-thought-thinking',
      taskStatement: '4.1',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: on the newest models you set budget_tokens to control thinking depth.',
      options: [
        'False, budget_tokens is deprecated; use the effort setting',
        'True',
      ],
      answerKey: 0,
      explanation:
        'On current models budget_tokens is deprecated and can return a 400 error; the effort setting controls thinking depth ' +
        'with adaptive thinking.',
      misconceptionTag: 'effort-vs-budget-tokens',
      sourceUrls: [THINK, EXTENDED],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: a teammate wants better reasoning but hides the model output. Explain why the reasoning has to be visible and how you would control how much it thinks.',
    conceptId: 'chain-of-thought-thinking',
    keyPointIds: [
      'kp-chain-of-thought-thinking-1',
      'kp-chain-of-thought-thinking-2',
      'kp-chain-of-thought-thinking-3',
      'kp-chain-of-thought-thinking-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 230,
});
