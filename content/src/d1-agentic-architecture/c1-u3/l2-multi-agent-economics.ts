// content/src/d1-agentic-architecture/c1-u3/l2-multi-agent-economics.ts
//
// C1-U3-L2 — Multi-agent economics (token multiplication, when single-agent wins). Task statement
// 1.2 (coordinator-subagent tradeoffs). Every claim traces to Anthropic's engineering post
// "How we built our multi-agent research system" (verified 2026-07-14 against the cited page).
//
// Confusion pair targeted: "more agents is always better" vs the token-cost tradeoff that only pays
// off on high-value, breadth-first, parallelizable work.

import { defineLesson } from '../../index';

const MAR = 'https://www.anthropic.com/engineering/multi-agent-research-system';

export const l2MultiAgentEconomics = defineLesson({
  id: 'c1-u3-l2',
  title: 'Multi-agent economics',
  order: 1,
  concept: {
    conceptId: 'multi-agent-economics',
    analogy:
      'Spinning up many agents is like hiring a big research team instead of one assistant: you get breadth ' +
      'and speed, but the payroll, measured in tokens, multiplies, so the job has to be worth it.',
    plainExplanation:
      'Multi-agent systems burn far more tokens than a single chat: agents use about 4x the tokens of a chat, ' +
      'and multi-agent systems about 15x. Token usage explains most of the variance in performance, so the ' +
      'pattern only pays off when the task value is high enough to justify the cost. Multi-agent shines on ' +
      'high-value, breadth-first work that parallelizes and exceeds a single context window, and it struggles ' +
      'when agents must share the same context or depend heavily on each other.',
    examWords: ['token multiplication', '15x tokens', 'breadth-first', 'shared context', 'task value'],
    keyPoints: [
      { id: 'kp-multi-agent-economics-1', text: 'Agents use about 4x the tokens of a chat, and multi-agent systems about 15x, so cost multiplies fast.' },
      { id: 'kp-multi-agent-economics-2', text: 'Token usage explains most of the performance variance, so multi-agent only pays off when the task value justifies the cost.' },
      { id: 'kp-multi-agent-economics-3', text: 'Multi-agent excels at high-value, breadth-first tasks that parallelize and exceed a single context window.' },
      { id: 'kp-multi-agent-economics-4', text: 'It is a poor fit when agents must share the same context or have many dependencies between them.' },
    ],
  },
  exercises: [
    {
      id: 'c1-u3-l2-q01',
      type: 'mc',
      domain: 'd1',
      conceptId: 'multi-agent-economics',
      taskStatement: '1.2',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'Roughly how many more tokens do multi-agent systems use compared with a single chat interaction?',
      options: [
        'About 15x more tokens',
        'About the same number of tokens',
        'About 2x more tokens',
        'Slightly fewer tokens',
      ],
      answerKey: 0,
      explanation:
        'The post reports agents use about 4x the tokens of a chat and multi-agent systems about 15x. Treating the cost ' +
        'as roughly equal misses the core economic constraint of multi-agent designs.',
      misconceptionTag: 'token-multiplication',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u3-l2-q02',
      type: 'mc',
      domain: 'd1',
      conceptId: 'multi-agent-economics',
      taskStatement: '1.2',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'Given the token cost, when do multi-agent systems pay off?',
      options: [
        'When the task value is high enough to justify the increased token cost',
        'Always, because more agents always beat fewer',
        'Only for trivial, low-value tasks',
        'Whenever latency is the main concern',
      ],
      answerKey: 0,
      explanation:
        'Multi-agent systems require tasks whose value justifies the extra tokens spent. "Always better" is the trap: ' +
        'the cost multiplication makes them wasteful on low-value or non-parallelizable work.',
      misconceptionTag: 'multi-agent-value',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u3-l2-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd1',
      conceptId: 'multi-agent-economics',
      taskStatement: '1.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A broad research question needs many independent directions explored at once and spans more information than one context window can hold. Setting cost aside, which approach fits?',
      options: [
        'A multi-agent system, because the work is breadth-first, parallelizable, and exceeds one context window',
        'A single-agent chat holding everything in one context',
        'A fixed prompt chain of dependent steps',
        'A routing workflow that picks one specialist',
      ],
      answerKey: 0,
      explanation:
        'Breadth-first, parallelizable work that overflows one context window is the sweet spot for multi-agent systems. ' +
        'A single-agent chat is the trap: the information simply does not fit in one context window.',
      misconceptionTag: 'multi-agent-fit',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u3-l2-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd1',
      conceptId: 'multi-agent-economics',
      taskStatement: '1.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A team puts a tightly coupled task, where every agent must share the same evolving context, onto a multi-agent system and sees errors and duplicated work. Why is this a poor fit?',
      options: [
        'Multi-agent struggles when agents must share context or depend heavily on each other; a single agent keeps shared context intact',
        'They simply used too few agents for the job',
        'The underlying model is too small for the task',
        'They forgot to add a voting step',
      ],
      answerKey: 0,
      explanation:
        'Domains that need shared context or have many inter-agent dependencies perform poorly split across agents. ' +
        '"Too few agents" is the trap: adding agents worsens the coordination problem rather than fixing it.',
      misconceptionTag: 'multi-agent-fit',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u3-l2-q05',
      type: 'mc',
      domain: 'd1',
      conceptId: 'multi-agent-economics',
      taskStatement: '1.2',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'Why is token usage central to the decision of whether to go multi-agent?',
      options: [
        'It explains most of the performance variance and multiplies cost, so it drives the value tradeoff',
        'It has no measurable effect on outcomes',
        'It affects only latency, not cost or quality',
        'It is fixed regardless of how the system is designed',
      ],
      answerKey: 0,
      explanation:
        'Token usage alone explains most of the performance variance and multiplies with more agents, so it dominates ' +
        'the cost-versus-value call. Claiming it has no effect ignores why multi-agent must be reserved for high-value work.',
      misconceptionTag: 'token-multiplication',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u3-l2-q06',
      type: 'multi',
      domain: 'd1',
      conceptId: 'multi-agent-economics',
      taskStatement: '1.2',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two tasks are good fits for a multi-agent system? Select TWO.',
      options: [
        'A high-value breadth-first search across many independent sources',
        'Work that exceeds a single context window and parallelizes cleanly',
        'A task where all agents must share one evolving context',
        'A cheap task where cost must be minimized above all',
        'A strictly sequential pipeline of dependent steps',
      ],
      answerKey: [0, 1],
      explanation:
        'Breadth-first, parallelizable work that overflows one context window justifies the token cost. Shared-context, ' +
        'cost-minimizing, and strictly sequential tasks are the poor fits.',
      misconceptionTag: 'multi-agent-fit',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u3-l2-q07',
      type: 'cloze',
      domain: 'd1',
      conceptId: 'multi-agent-economics',
      taskStatement: '1.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: multi-agent systems use about ___ the tokens of a chat, so they only pay off when the ___ of the task justifies the cost.',
      blanks: [
        { options: ['15x', '2x', 'half'] },
        { options: ['value', 'length', 'latency'] },
      ],
      answerKey: [0, 0],
      explanation:
        'Multi-agent systems use roughly 15x the tokens of a chat, and only high enough task value justifies that spend. ' +
        '"2x" understates the cost and "latency" is not the deciding factor.',
      misconceptionTag: 'token-multiplication',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u3-l2-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd1',
      conceptId: 'multi-agent-economics',
      taskStatement: '1.2',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: because more agents is always better, you should default to a multi-agent system.',
      options: [
        'False, multi-agent multiplies token cost and only fits high-value, parallelizable tasks',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Multi-agent systems cost roughly 15x a chat in tokens, so they are reserved for high-value, parallelizable work. ' +
        'Defaulting to them wastes tokens on tasks a single agent handles well.',
      misconceptionTag: 'multi-agent-value',
      sourceUrls: [MAR],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: multi-agent systems use far more tokens than a chat. What kind of task makes that cost worth paying?',
    conceptId: 'multi-agent-economics',
    keyPointIds: [
      'kp-multi-agent-economics-1',
      'kp-multi-agent-economics-2',
      'kp-multi-agent-economics-3',
      'kp-multi-agent-economics-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
