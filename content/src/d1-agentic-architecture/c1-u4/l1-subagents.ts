// content/src/d1-agentic-architecture/c1-u4/l1-subagents.ts
//
// C1-U4-L1 — Subagents (isolated context, restricted tools, per-agent models, specialized prompts).
// Task statement 1.3 (subagent invocation/context/spawning; AgentDefinition). Claims trace to the
// Claude Code "Create custom subagents" docs and the Agent SDK overview (verified 2026-07-14).
//
// Confusion pair targeted: subagents auto-inherit the main context (WRONG) vs subagents run in an
// ISOLATED context that must be passed explicitly. The spot-bug item attacks the inheritance myth.

import { defineLesson } from '../../index';

const SUB = 'https://code.claude.com/docs/en/sub-agents';
const SDK = 'https://code.claude.com/docs/en/agent-sdk/overview';

export const l1Subagents = defineLesson({
  id: 'c1-u4-l1',
  title: 'Subagents',
  order: 0,
  concept: {
    conceptId: 'subagents',
    analogy:
      'A subagent is like sending an intern to the archive with a specific assignment: they work in their own ' +
      'room (context), you let them use only certain tools, and they come back with a short summary instead of ' +
      'dumping every file on your desk.',
    plainExplanation:
      'A subagent runs in its own isolated context window with a custom system prompt, specific tool access, and ' +
      'independent permissions. The main agent delegates a focused task, and the subagent returns only its ' +
      'results, which keeps the main conversation clean. Subagents let you preserve context, enforce tool ' +
      'constraints, specialize behavior with focused prompts, reuse configurations, and control cost by routing ' +
      'work to a faster, cheaper model.',
    examWords: ['subagent', 'isolated context window', 'system prompt', 'tool access', 'delegation'],
    keyPoints: [
      { id: 'kp-subagents-1', text: 'A subagent runs in its own isolated context window with a custom system prompt and specific tool access.' },
      { id: 'kp-subagents-2', text: 'The main agent delegates a focused task and the subagent returns only its results, keeping the main context clean.' },
      { id: 'kp-subagents-3', text: 'Subagents preserve context, enforce tool constraints, and specialize behavior with focused prompts.' },
      { id: 'kp-subagents-4', text: 'Routing a subagent to a faster, cheaper model can control cost.' },
    ],
  },
  exercises: [
    {
      id: 'c1-u4-l1-q01',
      type: 'mc',
      domain: 'd1',
      conceptId: 'subagents',
      taskStatement: '1.3',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'What context does a subagent run in?',
      options: [
        'Its own isolated context window',
        'The same shared window as the main agent',
        'No context window at all',
        'Only the user\'s original message',
      ],
      answerKey: 0,
      explanation:
        'Each subagent runs in its own separate context window, which is what keeps its work out of the main ' +
        'conversation. Sharing the main window would defeat the context-preservation benefit.',
      misconceptionTag: 'subagent-isolated-context',
      sourceUrls: [SUB],
    },
    {
      id: 'c1-u4-l1-q02',
      type: 'mc',
      domain: 'd1',
      conceptId: 'subagents',
      taskStatement: '1.3',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'Why delegate a noisy side task, such as a large search or log scan, to a subagent?',
      options: [
        'It does the work in its own context and returns only a summary, keeping the main conversation clean',
        'It runs faster because it skips all permission checks',
        'It automatically shares memory with the main agent',
        'It removes the need for any tools',
      ],
      answerKey: 0,
      explanation:
        'A subagent absorbs the verbose work in its own window and hands back a concise result, preserving main-context ' +
        'budget. "Skips permission checks" is false: subagents have their own permissions, not none.',
      misconceptionTag: 'subagent-context-preservation',
      sourceUrls: [SUB],
    },
    {
      id: 'c1-u4-l1-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd1',
      conceptId: 'subagents',
      taskStatement: '1.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You want a code-review helper that can only Read, Glob, and Grep, never write files, and that follows its own reviewer instructions. How do you configure it?',
      options: [
        'As a subagent with a custom system prompt and a restricted tool list',
        'By giving the main agent bypassPermissions',
        'As a fixed prompt chain of review steps',
        'As a voting loop over the same review',
      ],
      answerKey: 0,
      explanation:
        'A subagent takes a focused system prompt and a specific allowed-tools list, which enforces read-only review. ' +
        'Granting the main agent bypassPermissions is the trap: it widens access instead of restricting it.',
      misconceptionTag: 'subagent-tool-constraint',
      sourceUrls: [SUB, SDK],
    },
    {
      id: 'c1-u4-l1-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd1',
      conceptId: 'subagents',
      taskStatement: '1.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An engineer expects a subagent to automatically see everything in the main agent\'s context, but it does not have that history. What is the misunderstanding?',
      options: [
        'Subagents have isolated context; the needed context must be passed explicitly, it does not auto-inherit',
        'Subagents cannot use any tools',
        'Subagents share the main window by default',
        'Subagents ignore their own system prompt',
      ],
      answerKey: 0,
      explanation:
        'Because each subagent has its own isolated context, the coordinator must pass any needed context explicitly in ' +
        'the subagent\'s prompt. "Shares the main window by default" is the exact myth that causes this bug.',
      misconceptionTag: 'subagent-isolated-context',
      sourceUrls: [SUB],
    },
    {
      id: 'c1-u4-l1-q05',
      type: 'mc',
      domain: 'd1',
      conceptId: 'subagents',
      taskStatement: '1.3',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'Which is a valid reason to route a subagent to a smaller, faster model like Haiku?',
      options: [
        'To control cost on a focused, well-scoped task',
        'To give it access to the main agent\'s context',
        'To remove its permission checks',
        'To guarantee it never returns an error',
      ],
      answerKey: 0,
      explanation:
        'Routing routine subtasks to a cheaper model is a documented way to control cost. The model choice does not ' +
        'affect context isolation or permissions, and no model guarantees error-free runs.',
      misconceptionTag: 'subagent-model-cost',
      sourceUrls: [SUB],
    },
    {
      id: 'c1-u4-l1-q06',
      type: 'multi',
      domain: 'd1',
      conceptId: 'subagents',
      taskStatement: '1.3',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 3,
      stem: 'Which THREE can you configure independently on a subagent? Select THREE.',
      options: [
        'Its system prompt',
        'Its allowed tools',
        'Its model',
        'The user\'s operating-system settings',
        'The physical CPU core it runs on',
      ],
      answerKey: [0, 1, 2],
      explanation:
        'A subagent has its own system prompt, tool access, and model. Operating-system settings and CPU cores are not ' +
        'part of a subagent\'s configuration surface.',
      misconceptionTag: 'subagent-config',
      sourceUrls: [SUB],
    },
    {
      id: 'c1-u4-l1-q07',
      type: 'cloze',
      domain: 'd1',
      conceptId: 'subagents',
      taskStatement: '1.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: a subagent runs in its own ___ context window with a custom system prompt and specific ___ access.',
      blanks: [
        { options: ['isolated', 'shared', 'global'] },
        { options: ['tool', 'network', 'memory'] },
      ],
      answerKey: [0, 0],
      explanation:
        'Subagents are defined by an isolated context window and specific tool access. "Shared" context and "network" ' +
        'access both misstate what a subagent actually controls.',
      misconceptionTag: 'subagent-isolated-context',
      sourceUrls: [SUB],
    },
    {
      id: 'c1-u4-l1-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd1',
      conceptId: 'subagents',
      taskStatement: '1.3',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: a subagent shares the main agent\'s context window by default.',
      options: [
        'False, each subagent has its own isolated context window',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Each subagent runs in a separate context window, which is why context must be passed explicitly. Sharing the ' +
        'main window would remove the context-preservation benefit entirely.',
      misconceptionTag: 'subagent-isolated-context',
      sourceUrls: [SUB],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: name two things you can configure on a subagent, and explain why its context is isolated.',
    conceptId: 'subagents',
    keyPointIds: [
      'kp-subagents-1',
      'kp-subagents-2',
      'kp-subagents-3',
      'kp-subagents-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
