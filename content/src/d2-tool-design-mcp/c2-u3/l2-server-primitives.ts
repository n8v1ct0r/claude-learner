// content/src/d2-tool-design-mcp/c2-u3/l2-server-primitives.ts
//
// C2-U3-L2 — MCP server primitives. Task statement 2.4 (MCP RESOURCES expose content catalogs to cut
// exploratory tool calls; tools vs resources vs prompts). Confusion pair: tools (actions, model-
// controlled) vs resources (context, application-controlled) vs prompts (templates, user-controlled).
//
// Sources (verified 2026-07-14 against the cited pages):
//   MCP_SERVER — modelcontextprotocol.io "Understanding MCP servers": Tools (Model), Resources
//                (Application), Prompts (User); tools/list + tools/call; resources/list + resources/read,
//                URI-identified; prompts/list + prompts/get; prompts require explicit invocation.
//   MCP_ARCH   — "Architecture overview": the same three server primitives and their */list, */get,
//                tools/call methods.
// Re-verified 2026-09-24: both pages now serve from the versioned /docs/2026-07-28/ path (cited as
// the final URL). That revision deprecates the client primitives sampling and roots, so q02, whose
// distractor names a sampling request, says so and is volatile.

import { defineLesson } from '../../index';

const MCP_SERVER = 'https://modelcontextprotocol.io/docs/2026-07-28/learn/server-concepts';
const MCP_ARCH = 'https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture';

export const l2ServerPrimitives = defineLesson({
  id: 'c2-u3-l2',
  title: 'MCP server primitives',
  order: 1,
  concept: {
    conceptId: 'mcp-server-primitives',
    analogy:
      'An MCP server is like a well-run kitchen offering three things: tools are the appliances the chef ' +
      '(the model) operates, resources are the pantry ingredients stocked for context, and prompts are the ' +
      'recipe cards a diner picks to start a dish. Different people reach for each: chef, kitchen, diner.',
    plainExplanation:
      'MCP servers expose three primitives. Tools are functions the model invokes to take actions and are ' +
      'model-controlled (`tools/list` to discover, `tools/call` to run). Resources are read-only data sources ' +
      'that provide context and are application-controlled, each with a URI (`resources/list`, `resources/read`). ' +
      'Prompts are reusable templates that are user-controlled and require explicit invocation (`prompts/list`, ' +
      '`prompts/get`).',
    examWords: ['tools', 'resources', 'prompts', 'tools/call', 'resources/read', 'URI'],
    keyPoints: [
      { id: 'kp-mcp-server-primitives-1', text: 'Tools are model-controlled functions the model invokes to take actions, via tools/list and tools/call.' },
      { id: 'kp-mcp-server-primitives-2', text: 'Resources are application-controlled, read-only data sources that provide context, each identified by a URI.' },
      { id: 'kp-mcp-server-primitives-3', text: 'Prompts are user-controlled reusable templates that require explicit invocation, via prompts/list and prompts/get.' },
      { id: 'kp-mcp-server-primitives-4', text: 'Control differs by primitive: tools are model-controlled, resources application-controlled, and prompts user-controlled.' },
    ],
  },
  exercises: [
    {
      id: 'c2-u3-l2-q01',
      type: 'mc',
      domain: 'd2',
      conceptId: 'mcp-server-primitives',
      taskStatement: '2.4',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'Which MCP server primitive is a function the model actively decides to call in order to take an action?',
      options: [
        'A tool, which is model-controlled',
        'A resource, which is application-controlled',
        'A prompt, which is user-controlled',
        'A notification, which the server broadcasts',
      ],
      answerKey: 0,
      explanation:
        'Tools are the model-controlled primitive for taking actions, invoked with tools/call. ' +
        'Resources supply read-only context and prompts are user-invoked templates, so neither is the action primitive.',
      misconceptionTag: 'primitive-roles',
      sourceUrls: [MCP_SERVER],
    },
    {
      id: 'c2-u3-l2-q02',
      type: 'mc',
      domain: 'd2',
      conceptId: 'mcp-server-primitives',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 15,
      volatile: true,
      stem: 'An MCP server exposes your database schema as read-only context the application can supply to the model. Which primitive is that?',
      options: [
        'A resource, application-controlled and identified by a URI',
        'A tool, which the model calls to take an action',
        'A prompt, which the user invokes explicitly',
        'A sampling request back to the client',
      ],
      answerKey: 0,
      explanation:
        'Read-only context the application provides is exactly a resource, each addressed by a URI. ' +
        'A tool performs actions and a prompt is a user-invoked template, so neither matches passive schema context. ' +
        'A sampling request is a client-side primitive, not a server one, and it is deprecated as of protocol version 2026-07-28.',
      misconceptionTag: 'resource-vs-tool',
      sourceUrls: [MCP_SERVER],
    },
    {
      id: 'c2-u3-l2-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd2',
      conceptId: 'mcp-server-primitives',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Your MCP server wants to offer a "plan-vacation" template that a user explicitly picks to start a structured workflow. Which primitive fits?',
      options: [
        'A prompt, a user-controlled reusable template',
        'A tool, invoked automatically by the model',
        'A resource, read-only context with a URI',
        'A root, marking a filesystem boundary',
      ],
      answerKey: 0,
      explanation:
        'A reusable, user-invoked workflow template is a prompt. ' +
        'Tools are model-driven actions and resources are passive context, so a user-selected template belongs to prompts, not either of those.',
      misconceptionTag: 'prompt-vs-tool',
      sourceUrls: [MCP_SERVER],
    },
    {
      id: 'c2-u3-l2-q04',
      type: 'mc',
      domain: 'd2',
      conceptId: 'mcp-server-primitives',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'You discovered a tool with tools/list. Which method actually executes it?',
      options: [
        'tools/call',
        'tools/list again with the arguments',
        'resources/read',
        'prompts/get',
      ],
      answerKey: 0,
      explanation:
        'tools/call runs a discovered tool with its arguments, while tools/list only enumerates them. ' +
        'resources/read and prompts/get belong to the other primitives and do not execute a tool.',
      misconceptionTag: 'tool-methods',
      sourceUrls: [MCP_ARCH],
    },
    {
      id: 'c2-u3-l2-q05',
      type: 'match',
      domain: 'd2',
      conceptId: 'mcp-server-primitives',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 30,
      stem: 'Match each MCP server primitive to who controls it.',
      pairs: [
        { left: 'Tools', right: 'Model-controlled' },
        { left: 'Resources', right: 'Application-controlled' },
        { left: 'Prompts', right: 'User-controlled' },
      ],
      explanation:
        'Tools are invoked by the model, resources are managed by the application, and prompts are invoked by the user. ' +
        'Mixing these up leads to designing actions as passive context or expecting the model to auto-trigger user templates.',
      misconceptionTag: 'primitive-control',
      sourceUrls: [MCP_SERVER],
    },
    {
      id: 'c2-u3-l2-q06',
      type: 'multi',
      domain: 'd2',
      conceptId: 'mcp-server-primitives',
      taskStatement: '2.4',
      difficulty: 3,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'A server author is deciding what actually defines an MCP resource. Choose the two properties that apply. Select TWO.',
      options: [
        'They are read-only data sources that provide context',
        'Each resource is identified by a URI',
        'The model invokes them directly to take actions',
        'They are user-controlled templates for starting workflows',
      ],
      answerKey: [0, 1],
      explanation:
        'Resources are read-only, URI-identified context sources. ' +
        'Taking actions describes tools, and user-invoked workflow templates describe prompts, so those two options belong to other primitives.',
      misconceptionTag: 'resource-properties',
      sourceUrls: [MCP_SERVER],
    },
    {
      id: 'c2-u3-l2-q07',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd2',
      conceptId: 'mcp-server-primitives',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A developer exposes a "send_email" capability as a resource so the model can send mail through it. Why is that the wrong primitive?',
      options: [
        'Resources are read-only context; an action like sending email must be a tool',
        'Resources cannot be given a URI, so email has no address',
        'Sending email can only be done through a prompt template',
        'Resources are model-controlled and would send mail without approval',
      ],
      answerKey: 0,
      explanation:
        'Sending email is an action, and actions are tools; resources only expose read-only context. ' +
        'Resources do have URIs and are application-controlled, so the defect is modeling an action as passive data, not those details.',
      misconceptionTag: 'resource-vs-tool',
      sourceUrls: [MCP_SERVER],
    },
    {
      id: 'c2-u3-l2-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd2',
      conceptId: 'mcp-server-primitives',
      taskStatement: '2.4',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: MCP prompts are triggered automatically by the model, the same way tools are.',
      options: [
        'False, prompts are user-controlled and require explicit invocation',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Prompts are user-controlled and must be explicitly invoked. Automatic, model-driven invocation is how tools work.',
      misconceptionTag: 'prompt-vs-tool',
      sourceUrls: [MCP_SERVER],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: an MCP server offers tools, resources, and prompts. What is each one for, and who decides when it gets used?',
    conceptId: 'mcp-server-primitives',
    keyPointIds: [
      'kp-mcp-server-primitives-1',
      'kp-mcp-server-primitives-2',
      'kp-mcp-server-primitives-3',
      'kp-mcp-server-primitives-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 235,
});
