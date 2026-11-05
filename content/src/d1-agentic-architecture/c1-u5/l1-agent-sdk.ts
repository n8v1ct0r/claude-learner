// content/src/d1-agentic-architecture/c1-u5/l1-agent-sdk.ts
//
// C1-U5-L1 — Claude Agent SDK (query loop, sessions, resume/fork). Task statement 1.7 (session
// state, resumption, forking). Claims trace to the Agent SDK overview docs and the engineering post
// "Building agents with the Claude Agent SDK" (verified 2026-07-14 against the cited pages):
//   SDK      — query() runs the agent loop and executes tools for you; Client SDK you write the loop;
//              sessions resume with full context or fork to explore a different approach.
//   SDKBLOG  — the agent loop is "gather context, take action, verify work, repeat".
//              Re-verified 2026-09-24: the post moved to claude.com/blog (same title and text), cited
//              as the final URL.

import { defineLesson } from '../../index';

const SDK = 'https://code.claude.com/docs/en/agent-sdk/overview';
const SDKBLOG = 'https://claude.com/blog/building-agents-with-the-claude-agent-sdk';

export const l1AgentSdk = defineLesson({
  id: 'c1-u5-l1',
  title: 'The Claude Agent SDK',
  order: 0,
  concept: {
    conceptId: 'agent-sdk',
    analogy:
      'The Agent SDK is like hiring a contractor instead of buying raw lumber: with the base API you build the ' +
      'tool-calling loop yourself, but the Agent SDK hands you the same loop, tools, and context management that ' +
      'power Claude Code, ready to run.',
    plainExplanation:
      'The Claude Agent SDK gives you Claude Code\'s agent loop, built-in tools, and context management as a ' +
      'library in Python and TypeScript. You call query() with a prompt and options, and the SDK runs the loop ' +
      '(gather context, take action, verify work, repeat) and executes tools for you, unlike the base Client SDK ' +
      'where you write the tool loop yourself. Sessions let you resume a run later with full context or fork it ' +
      'to explore a different approach.',
    examWords: ['Agent SDK', 'query()', 'agent loop', 'session', 'resume'],
    keyPoints: [
      { id: 'kp-agent-sdk-1', text: 'The Agent SDK provides Claude Code\'s agent loop, built-in tools, and context management as a Python and TypeScript library.' },
      { id: 'kp-agent-sdk-2', text: 'You call query() with a prompt and options, and the SDK runs the loop and executes tools for you.' },
      { id: 'kp-agent-sdk-3', text: 'With the base Client SDK you implement the tool loop yourself; the Agent SDK handles it autonomously.' },
      { id: 'kp-agent-sdk-4', text: 'Sessions let you resume a run with full context or fork it to explore a different approach.' },
    ],
  },
  exercises: [
    {
      id: 'c1-u5-l1-q01',
      type: 'mc',
      domain: 'd1',
      conceptId: 'agent-sdk',
      taskStatement: '1.7',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'What does the Claude Agent SDK give you?',
      options: [
        'Claude Code\'s agent loop, built-in tools, and context management as a library',
        'Only a hosted chat user interface',
        'A model fine-tuning service',
        'A standalone vector database',
      ],
      answerKey: 0,
      explanation:
        'The Agent SDK exposes the same agent loop, tools, and context management that power Claude Code, programmable ' +
        'in Python and TypeScript. It is not a chat UI, a fine-tuning service, or a database.',
      misconceptionTag: 'agent-sdk-scope',
      sourceUrls: [SDK],
    },
    {
      id: 'c1-u5-l1-q02',
      type: 'mc',
      domain: 'd1',
      conceptId: 'agent-sdk',
      taskStatement: '1.7',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'How does the Agent SDK differ from the base Client SDK for tool use?',
      options: [
        'The Agent SDK runs the tool loop for you; with the Client SDK you implement the loop yourself',
        'The Client SDK is autonomous while the Agent SDK is fully manual',
        'They are identical in how tools are executed',
        'Neither one supports tool use',
      ],
      answerKey: 0,
      explanation:
        'With the Client SDK you write the while-loop that executes tools; the Agent SDK handles tool execution ' +
        'autonomously. The "Client SDK is autonomous" answer reverses the two.',
      misconceptionTag: 'agent-vs-client-sdk',
      sourceUrls: [SDK],
    },
    {
      id: 'c1-u5-l1-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd1',
      conceptId: 'agent-sdk',
      taskStatement: '1.7',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You finished a query where Claude read the authentication module, and now you want a new prompt to continue with that full context. Which session feature do you use?',
      options: [
        'Resume the session by its id so the new prompt keeps the prior context',
        'Fork the session and discard the prior context',
        'Start a brand-new session with no context',
        'Raise max_tokens on the new prompt',
      ],
      answerKey: 0,
      explanation:
        'Resuming a session by id continues with everything Claude already read and did. Forking to discard context is ' +
        'the trap: forking preserves a shared baseline, it does not throw the context away.',
      misconceptionTag: 'resume-session',
      sourceUrls: [SDK],
    },
    {
      id: 'c1-u5-l1-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd1',
      conceptId: 'agent-sdk',
      taskStatement: '1.7',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A developer wants to try two different refactor approaches from the same starting point without one polluting the other, but keeps resuming the same session, so the branches interfere. What should they use instead?',
      options: [
        'Fork the session so each approach explores independently from a shared baseline',
        'Resume the same session for both approaches',
        'Delete the session between the two tries',
        'Set bypassPermissions to keep them separate',
      ],
      answerKey: 0,
      explanation:
        'Forking creates independent branches from a shared baseline, so the two approaches do not interfere. Resuming ' +
        'the same session is exactly the mistake that let one branch pollute the other.',
      misconceptionTag: 'fork-session',
      sourceUrls: [SDK],
    },
    {
      id: 'c1-u5-l1-q05',
      type: 'mc',
      domain: 'd1',
      conceptId: 'agent-sdk',
      taskStatement: '1.7',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'In the SDK\'s agent loop, what is the repeating cycle?',
      options: [
        'Gather context, take action, verify work, and repeat',
        'Classify, route, and stop',
        'Draft, vote, and publish',
        'Generate text once and return',
      ],
      answerKey: 0,
      explanation:
        'The Agent SDK loop is gather context, take action, verify work, repeat. Classify-route-stop and draft-vote ' +
        'describe other workflow patterns, not the SDK\'s core loop.',
      misconceptionTag: 'agent-loop-cycle',
      sourceUrls: [SDKBLOG],
    },
    {
      id: 'c1-u5-l1-q06',
      type: 'multi',
      domain: 'd1',
      conceptId: 'agent-sdk',
      taskStatement: '1.7',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two statements about the Agent SDK query() function are true? Select TWO.',
      options: [
        'It runs the agent loop and executes built-in tools for you',
        'It exposes the same tools and context management that power Claude Code',
        'It requires you to hand-write the tool-execution loop',
        'It only works with a custom fine-tuned model',
        'It cannot connect to any MCP servers',
      ],
      answerKey: [0, 1],
      explanation:
        'query() runs the loop, executes tools, and brings Claude Code\'s tools and context management. It does not make ' +
        'you write the tool loop, require a fine-tuned model, or forbid MCP servers.',
      misconceptionTag: 'agent-sdk-scope',
      sourceUrls: [SDK],
    },
    {
      id: 'c1-u5-l1-q07',
      type: 'cloze',
      domain: 'd1',
      conceptId: 'agent-sdk',
      taskStatement: '1.7',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: the Agent SDK runs the agent loop for you, and sessions let you ___ a run with full context or ___ it to explore a different approach.',
      blanks: [
        { options: ['resume', 'delete', 'shrink'] },
        { options: ['fork', 'freeze', 'merge'] },
      ],
      answerKey: [0, 0],
      explanation:
        'Sessions support resuming with full context and forking to branch a new approach. "Delete" loses the context ' +
        'and "merge" is not how you start a divergent branch.',
      misconceptionTag: 'resume-session',
      sourceUrls: [SDK],
    },
    {
      id: 'c1-u5-l1-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd1',
      conceptId: 'agent-sdk',
      taskStatement: '1.7',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: with the Agent SDK you must implement the tool-calling loop yourself.',
      options: [
        'False, the Agent SDK runs the loop and executes tools for you',
        'True',
      ],
      answerKey: 0,
      explanation:
        'The Agent SDK handles the tool loop autonomously; writing the loop by hand is the base Client SDK\'s job. ' +
        'That autonomy is the main reason to choose the Agent SDK.',
      misconceptionTag: 'agent-vs-client-sdk',
      sourceUrls: [SDK],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: what does the Agent SDK do that the base Client SDK does not, and when would you fork a session instead of resuming one?',
    conceptId: 'agent-sdk',
    keyPointIds: [
      'kp-agent-sdk-1',
      'kp-agent-sdk-2',
      'kp-agent-sdk-3',
      'kp-agent-sdk-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
