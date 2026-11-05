// content/src/d1-agentic-architecture/c1-u3/l1-when-not-to-agent.ts
//
// C1-U3-L1 — When NOT to build an agent (start simple, cost/latency tradeoffs). Task statement 1.1
// (model-driven decisions vs pre-configured trees; simplicity). Every claim traces to Anthropic's
// "Building effective agents" (verified 2026-07-14 against the cited page).
//
// Confusion pair targeted: reaching for an agent by default vs choosing the simplest solution that
// works. Distractors encode the over-agentic-design failure mode.

import { defineLesson } from '../../index';

const BEA = 'https://www.anthropic.com/engineering/building-effective-agents';

export const l1WhenNotToAgent = defineLesson({
  id: 'c1-u3-l1',
  title: 'When not to build an agent',
  order: 0,
  concept: {
    conceptId: 'when-not-to-agent',
    analogy:
      'Reaching for an agent first is like renting a moving truck to carry one grocery bag: it can do the ' +
      'job, but you pay for power you do not need. Start with the smallest tool that works and scale up only ' +
      'when it falls short.',
    plainExplanation:
      'The guidance is to find the simplest solution possible and add complexity only when it demonstrably ' +
      'improves outcomes, which sometimes means not building an agentic system at all. Agentic systems trade ' +
      'latency and cost for better task performance, so weigh that tradeoff. Use agents for open-ended problems ' +
      'where you cannot predict the number of steps or hardcode the path. The three core principles for any ' +
      'agent are simplicity, transparency, and a well-crafted agent-computer interface.',
    examWords: ['simplest solution', 'latency and cost', 'open-ended', 'simplicity', 'transparency'],
    keyPoints: [
      { id: 'kp-when-not-to-agent-1', text: 'Find the simplest solution first and add complexity only when it demonstrably improves outcomes.' },
      { id: 'kp-when-not-to-agent-2', text: 'The simplest solution is sometimes not an agentic system at all.' },
      { id: 'kp-when-not-to-agent-3', text: 'Agentic systems trade latency and cost for better task performance, so weigh that tradeoff.' },
      { id: 'kp-when-not-to-agent-4', text: 'Use agents for open-ended problems where you cannot predict the steps or hardcode the path.' },
    ],
  },
  exercises: [
    {
      id: 'c1-u3-l1-q01',
      type: 'mc',
      domain: 'd1',
      conceptId: 'when-not-to-agent',
      taskStatement: '1.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'What is the recommended default when building applications with LLMs?',
      options: [
        'Find the simplest solution possible and increase complexity only when needed',
        'Start with a multi-agent system for maximum flexibility',
        'Maximize the agent\'s autonomy from the very first version',
        'Add as many tools as possible up front',
      ],
      answerKey: 0,
      explanation:
        'The guidance is to start simple and add complexity only when simpler solutions fall short. Starting with a ' +
        'multi-agent system inverts that advice and pays for complexity you may never need.',
      misconceptionTag: 'over-agentic-default',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u3-l1-q02',
      type: 'mc',
      domain: 'd1',
      conceptId: 'when-not-to-agent',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'What tradeoff do agentic systems make?',
      options: [
        'They trade latency and cost for better task performance',
        'They reduce both cost and latency at the same time',
        'They remove the need for tools entirely',
        'They guarantee fully deterministic output',
      ],
      answerKey: 0,
      explanation:
        'Agentic systems often trade latency and cost for better performance, so you weigh whether that is worth it. ' +
        'The "reduce both cost and latency" answer is the trap: agents generally add both.',
      misconceptionTag: 'agent-tradeoff',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u3-l1-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd1',
      conceptId: 'when-not-to-agent',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A task is a well-defined, fixed classification handled well by a single prompt. A teammate proposes rebuilding it as an autonomous agent anyway. What is the better call?',
      options: [
        'Keep the simple single-prompt solution, since an agent adds latency and cost for no benefit here',
        'Build the agent to future-proof the system',
        'Add several subagents to divide the classification',
        'Wrap it in a voting loop for confidence',
      ],
      answerKey: 0,
      explanation:
        'A predictable, well-scoped task is exactly where the simplest solution wins; an agent buys nothing but overhead. ' +
        'Future-proofing is the trap: it pays for flexibility the fixed task will never use.',
      misconceptionTag: 'over-agentic-default',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u3-l1-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd1',
      conceptId: 'when-not-to-agent',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A team ships an autonomous multi-agent system for a task whose steps are completely predictable and identical each run, and now faces high latency and cost. What is the core mistake?',
      options: [
        'They added agentic complexity that does not improve outcomes; predictable steps fit a workflow or single call',
        'They did not use enough agents to share the load',
        'The underlying model is simply too small',
        'They forgot to add a voting step for confidence',
      ],
      answerKey: 0,
      explanation:
        'Complexity should be added only when it improves outcomes, and predictable steps gain nothing from an agent. ' +
        '"Not enough agents" is the trap: adding more agents deepens the same over-agentic mistake.',
      misconceptionTag: 'over-agentic-default',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u3-l1-q05',
      type: 'mc',
      domain: 'd1',
      conceptId: 'when-not-to-agent',
      taskStatement: '1.1',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'When does the extra cost and latency of an agent actually make sense?',
      options: [
        'For open-ended problems where you cannot predict the steps or hardcode the path, and complexity improves outcomes',
        'Whenever a task calls any tool at all',
        'Whenever you want lower latency than a single call',
        'Whenever more than one prompt is involved',
      ],
      answerKey: 0,
      explanation:
        'Agents earn their cost on open-ended work where the path cannot be predefined. Merely calling a tool or using ' +
        'multiple prompts does not justify the agentic tradeoff, and wanting lower latency argues against it.',
      misconceptionTag: 'agent-fit',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u3-l1-q06',
      type: 'multi',
      domain: 'd1',
      conceptId: 'when-not-to-agent',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two are core principles for agent design in the guidance? Select TWO.',
      options: [
        'Maintain simplicity in the agent\'s design',
        'Prioritize transparency by showing the agent\'s planning steps',
        'Maximize the number of subagents in every design',
        'Always run in a permission-bypassing mode',
        'Hardcode every step so the model never decides',
      ],
      answerKey: [0, 1],
      explanation:
        'Simplicity and transparency are two of the three core principles (the third is a well-crafted agent-computer ' +
        'interface). Maximizing subagents and hardcoding every step contradict those principles.',
      misconceptionTag: 'agent-principles',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u3-l1-q07',
      type: 'cloze',
      domain: 'd1',
      conceptId: 'when-not-to-agent',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: agentic systems trade ___ and cost for better task performance, so start with the simplest solution and add ___ only when it improves outcomes.',
      blanks: [
        { options: ['latency', 'tokens', 'accuracy'] },
        { options: ['complexity', 'tools', 'agents'] },
      ],
      answerKey: [0, 0],
      explanation:
        'The tradeoff is latency and cost for performance, and complexity is added only when it earns its keep. ' +
        '"Accuracy" and "tools" miss the specific tradeoff and the specific thing you add sparingly.',
      misconceptionTag: 'agent-tradeoff',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u3-l1-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd1',
      conceptId: 'when-not-to-agent',
      taskStatement: '1.1',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: the simplest solution is sometimes to not build an agentic system at all.',
      options: [
        'True, start simple and add agentic complexity only when it helps',
        'False',
      ],
      answerKey: 0,
      explanation:
        'The guidance explicitly says the simplest solution may mean no agentic system. Complexity is justified only ' +
        'when simpler options fall short.',
      misconceptionTag: 'over-agentic-default',
      sourceUrls: [BEA],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: a task runs the same predictable steps every time. Why might building an agent be the wrong call?',
    conceptId: 'when-not-to-agent',
    keyPointIds: [
      'kp-when-not-to-agent-1',
      'kp-when-not-to-agent-2',
      'kp-when-not-to-agent-3',
      'kp-when-not-to-agent-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
