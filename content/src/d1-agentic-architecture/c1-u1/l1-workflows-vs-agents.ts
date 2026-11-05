// content/src/d1-agentic-architecture/c1-u1/l1-workflows-vs-agents.ts
//
// C1-U1-L1 — Workflows vs agents (predefined code paths vs model-directed loops).
// Task statement 1.1 (model-driven decisions vs pre-configured trees). Every claim traces to
// Anthropic's "Building effective agents" (verified 2026-07-14 against the cited page).
//
// Confusion pair targeted (Feynman + distractors): workflows vs agents — the belief that any loop or
// any tool call makes a system an "agent". The explain-back and several distractors attack exactly
// that. Intentional variantOf sibling pair for dupe calibration: q03 (base) ~ q04 (harder framing).

import { defineLesson } from '../../index';

const BEA = 'https://www.anthropic.com/engineering/building-effective-agents';

export const l1WorkflowsVsAgents = defineLesson({
  id: 'c1-u1-l1',
  title: 'Workflows vs agents',
  order: 0,
  concept: {
    conceptId: 'workflows-vs-agents',
    analogy:
      'A workflow is a train on rails: it stops at the same stations, in the same order, every run. ' +
      'An agent is a driver with a map: it decides each turn from what it sees on the road.',
    plainExplanation:
      'A workflow orchestrates LLMs and tools through predefined code paths, so the sequence of steps ' +
      'is fixed before you run it. An agent lets the model dynamically direct its own process and tool ' +
      'use, keeping control over how it reaches the goal. Reach for a workflow when the steps are ' +
      'predictable, and for an agent when you cannot hardcode the path and the model must decide each step.',
    examWords: ['workflow', 'agent', 'predefined code paths', 'dynamically direct', 'agentic system'],
    keyPoints: [
      { id: 'kp-workflows-vs-agents-1', text: 'A workflow orchestrates LLMs and tools through predefined code paths.' },
      { id: 'kp-workflows-vs-agents-2', text: 'An agent lets the model dynamically direct its own process and tool use.' },
      { id: 'kp-workflows-vs-agents-3', text: 'Choose a workflow for predictable, well-defined tasks; choose an agent when the steps cannot be predicted in advance.' },
      { id: 'kp-workflows-vs-agents-4', text: 'Start with the simplest solution and add agentic complexity only when it earns its extra cost and latency.' },
    ],
  },
  exercises: [
    {
      id: 'c1-u1-l1-q01',
      type: 'mc',
      domain: 'd1',
      conceptId: 'workflows-vs-agents',
      taskStatement: '1.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'You automate invoice processing where every invoice goes through the same three stages in the same order. Which design fits best?',
      options: [
        'A workflow with predefined code paths for the three stages',
        'An autonomous agent that decides the stages at runtime',
        'A multi-agent swarm with no coordinator',
        'A single prompt with no tools or structure',
      ],
      answerKey: 0,
      explanation:
        'The stages are fixed and predictable, so a workflow orchestrates them through predefined code paths ' +
        'with consistency and no extra cost. The agent option is tempting because the task uses tools, but ' +
        'paying the model to choose steps that never change adds latency for no benefit.',
      misconceptionTag: 'workflow-vs-agent',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l1-q02',
      type: 'mc',
      domain: 'd1',
      conceptId: 'workflows-vs-agents',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'A colleague says "any system that calls an LLM in a loop is an agent." Which correction fits Anthropic\'s definitions?',
      options: [
        'An agent dynamically directs its own process and tool use; a loop of predefined code paths is still a workflow',
        'Any repeated LLM call is an agent, so the colleague is right',
        'Agents never use tools, so a looping tool-caller must be a workflow',
        'Workflows require several models while agents use exactly one',
      ],
      answerKey: 0,
      explanation:
        'The dividing line is control, not looping: an agent directs its own process and tool usage, while a ' +
        'workflow follows predefined code paths even when those paths repeat. The "any loop is an agent" answer ' +
        'confuses a mechanism (looping) with the defining trait (model-driven control).',
      misconceptionTag: 'loop-equals-agent',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l1-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd1',
      conceptId: 'workflows-vs-agents',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A support team needs a predictable, fixed-stage refund pipeline where every ticket follows the same steps in the same order. Which design fits best?',
      options: [
        'A workflow with predefined code paths',
        'An agent that decides each step dynamically',
        'An orchestrator delegating to many subagents',
        'A prompt where the model chooses whether to continue at each stage',
      ],
      answerKey: 0,
      explanation:
        'Because the stages are fixed and repeat identically, a workflow gives predictability and consistency ' +
        'without model-driven overhead. The agent option is the plausible trap: dynamic step selection buys ' +
        'nothing when the path is already known and must not vary.',
      misconceptionTag: 'workflow-vs-agent',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l1-q04',
      type: 'mc',
      variant: 'scenario',
      variantOf: 'c1-u1-l1-q03',
      domain: 'd1',
      conceptId: 'workflows-vs-agents',
      taskStatement: '1.1',
      difficulty: 3,
      estimatedSeconds: 20,
      stem: 'A support team needs a predictable, fixed-stage refund pipeline where every ticket follows the same steps in the same order, and they also want the lowest possible latency. Which design fits best?',
      options: [
        'A workflow with predefined code paths, since fixed steps and low latency both favor it',
        'An agent, because low latency requires model-driven decisions',
        'A multi-agent system so each stage runs its own model',
        'An agent capped at a maximum number of iterations to bound latency',
      ],
      answerKey: 0,
      explanation:
        'Fixed steps AND a latency goal both point to a workflow: predefined code paths skip the per-step model ' +
        'decisions an agent would add. The capped-agent option is the tempting distractor because a cap sounds ' +
        'like control, but it still pays for model-driven steps the task never needs.',
      misconceptionTag: 'workflow-vs-agent',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l1-q05',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd1',
      conceptId: 'workflows-vs-agents',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An engineer ships a service that always runs retrieve then summarize then email, in a hardcoded order, and calls it "our new agent." What is the mislabel?',
      options: [
        'It is actually a workflow: the steps are predefined code paths, not model-directed',
        'It is an agent because it performs retrieval',
        'It is an agent because it can send email',
        'It is neither a workflow nor an agent, just one LLM call',
      ],
      answerKey: 0,
      explanation:
        'Hardcoding the order makes it a workflow no matter how many tools it touches. The "it retrieves, so it is ' +
        'an agent" answer is the trap: using an augmentation does not grant the model control over the path, which ' +
        'is what would make it an agent.',
      misconceptionTag: 'loop-equals-agent',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l1-q06',
      type: 'mc',
      domain: 'd1',
      conceptId: 'workflows-vs-agents',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'When does the guidance say to reach for an agent instead of a workflow?',
      options: [
        'When the number and order of steps cannot be predicted and the model must decide the path',
        'Whenever the task calls any tool at all',
        'Whenever you want lower cost and latency',
        'Whenever more than one LLM call is required',
      ],
      answerKey: 0,
      explanation:
        'Agents fit open-ended problems where you cannot hardcode the path and need model-driven decisions at scale. ' +
        'The "lower cost and latency" answer inverts reality: agents trade cost and latency for flexibility, so that ' +
        'goal points back toward a workflow.',
      misconceptionTag: 'workflow-vs-agent',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l1-q07',
      type: 'multi',
      domain: 'd1',
      conceptId: 'workflows-vs-agents',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two traits point toward a workflow rather than an agent? Select TWO.',
      options: [
        'The steps are known and fixed in advance',
        'You need predictability and consistency across runs',
        'The path cannot be predicted before running',
        'The model must choose which tools to call at each step',
        'The task is open-ended with an unknown number of steps',
      ],
      answerKey: [0, 1],
      explanation:
        'Known, fixed steps and a need for predictable, consistent runs are exactly what predefined code paths deliver. ' +
        'The other options describe unpredictable, model-directed work, which is the signature of an agent, not a workflow.',
      misconceptionTag: 'workflow-vs-agent',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l1-q08',
      type: 'multi',
      domain: 'd1',
      conceptId: 'workflows-vs-agents',
      taskStatement: '1.1',
      difficulty: 3,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'An open-ended research task has an unpredictable number of steps and needs the model to pick tools as it goes. Which two properties make an agent the better fit? Select TWO.',
      options: [
        'The model dynamically directs its own process and tool use',
        'Flexibility and model-driven decisions are needed at scale',
        'Every run must follow identical predefined code paths',
        'Latency and cost must be minimized above all else',
        'The full sequence of steps is known before running',
      ],
      answerKey: [0, 1],
      explanation:
        'Unpredictable steps plus model-chosen tools are precisely where flexibility and model-driven control earn their ' +
        'cost. The "identical predefined paths" and "known sequence" options describe a workflow, and "minimize latency ' +
        'above all" argues against the very tradeoff an agent makes.',
      misconceptionTag: 'workflow-vs-agent',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l1-q09',
      type: 'order',
      domain: 'd1',
      conceptId: 'workflows-vs-agents',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Order these design choices from the one to try first to the one to reach for last, following the "keep it simple" guidance.',
      steps: [
        'A single LLM call with retrieval and in-context examples',
        'A workflow with predefined code paths when the steps are fixed',
        'An agent, only when the path cannot be predefined',
      ],
      answerKey: [0, 1, 2],
      explanation:
        'The guidance is to find the simplest solution first and add complexity only when needed: a single augmented ' +
        'call, then a workflow, then an agent. Jumping straight to an agent pays for flexibility the task may never use.',
      misconceptionTag: 'workflow-vs-agent',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l1-q10',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd1',
      conceptId: 'workflows-vs-agents',
      taskStatement: '1.1',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: adding a loop around an LLM call automatically makes a system an agent.',
      options: [
        'False, it is still a workflow if the paths are predefined',
        'True',
      ],
      answerKey: 0,
      explanation:
        'A loop is a mechanism, not the definition. Without the model directing its own process, predefined looping ' +
        'code paths remain a workflow.',
      misconceptionTag: 'loop-equals-agent',
      sourceUrls: [BEA],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: a task runs the same three steps in the same order every single time. Would you pick a workflow or an agent, and why?',
    conceptId: 'workflows-vs-agents',
    keyPointIds: [
      'kp-workflows-vs-agents-1',
      'kp-workflows-vs-agents-2',
      'kp-workflows-vs-agents-3',
      'kp-workflows-vs-agents-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 265,
});
