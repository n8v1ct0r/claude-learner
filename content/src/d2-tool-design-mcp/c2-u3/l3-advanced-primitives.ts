// content/src/d2-tool-design-mcp/c2-u3/l3-advanced-primitives.ts
//
// C2-U3-L3 — Advanced MCP primitives: sampling, elicitation, roots, notifications. Task statement 2.4
// (MCP fundamentals). Confusion pair targeted: sampling (server borrows the client's model) vs
// elicitation (server asks the user) vs roots (client scopes the filesystem, not a security boundary).
//
// Sources (verified 2026-07-14 against the cited pages):
//   MCP_CLIENT — modelcontextprotocol.io "Understanding MCP clients": Sampling (sampling/createMessage,
//                model-independent servers, human-in-the-loop review); Elicitation (elicitation/create,
//                request info/confirmation from users); Roots (filesystem boundaries via roots/list,
//                "coordination mechanism, not a security boundary"; OS-level enforcement required).
//   MCP_ARCH   — "Architecture overview": notifications are JSON-RPC 2.0 messages sent without a
//                response (e.g. notifications/tools/list_changed).
//
// Deprecation note (re-verified 2026-09-24; both pages now serve from the versioned /docs/2026-07-28/
// path, so the constants cite that final URL): "Sampling is deprecated as of protocol version
// 2026-07-28 and scheduled for removal. New implementations should integrate directly with LLM
// provider APIs instead." and "Roots are deprecated as of protocol version 2026-07-28 and scheduled
// for removal. New implementations should pass directories or files via tool parameters, resource
// URIs, or server configuration instead." Elicitation and notifications are current. The exam guide
// v1.0 never mentions sampling or roots, so every item that touches them says so and carries
// volatile: true; q03 now tests the migration decision instead of recommending sampling.

import { defineLesson } from '../../index';

const MCP_CLIENT = 'https://modelcontextprotocol.io/docs/2026-07-28/learn/client-concepts';
const MCP_ARCH = 'https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture';

export const l3AdvancedPrimitives = defineLesson({
  id: 'c2-u3-l3',
  title: 'Advanced MCP primitives',
  order: 2,
  concept: {
    conceptId: 'mcp-advanced-primitives',
    analogy:
      'Beyond the basics, an MCP server can ask the client for help like a contractor on site: sampling is ' +
      'borrowing the client\'s brain (its model), elicitation is asking the homeowner a question, roots are ' +
      'the client marking which rooms are in scope, and notifications are a bell that rings when something changes. ' +
      'Two of those, sampling and roots, are being retired from the protocol.',
    plainExplanation:
      'MCP also defines client-exposed primitives. Elicitation lets a server request information or confirmation ' +
      'from the user via `elicitation/create`. Notifications, such as `tools/list_changed`, tell the client about ' +
      'changes and expect no response. Two older primitives are deprecated as of protocol version 2026-07-28 and ' +
      'scheduled for removal: sampling, which let a server request an LLM completion from the client via ' +
      '`sampling/createMessage` so the server stayed model-independent (new implementations should integrate ' +
      'directly with LLM provider APIs), and roots, which let the client tell the server which filesystem ' +
      'directories were in scope via `roots/list` without ever enforcing security (new implementations pass ' +
      'directories via tool parameters, resource URIs, or server configuration).',
    examWords: ['sampling/createMessage', 'elicitation/create', 'roots', 'notifications', 'list_changed', 'deprecated as of 2026-07-28'],
    keyPoints: [
      { id: 'kp-mcp-advanced-primitives-1', text: 'Sampling let a server request an LLM completion from the client (sampling/createMessage); it is deprecated as of protocol 2026-07-28, and new servers should call LLM provider APIs directly.' },
      { id: 'kp-mcp-advanced-primitives-2', text: 'Elicitation lets a server request additional information or confirmation from the user (elicitation/create).' },
      { id: 'kp-mcp-advanced-primitives-3', text: 'Roots let the client tell the server which filesystem directories are in scope, coordinating boundaries without enforcing security; they are deprecated as of protocol 2026-07-28.' },
      { id: 'kp-mcp-advanced-primitives-4', text: 'Notifications, such as tools/list_changed, inform the client of changes and expect no response.' },
    ],
  },
  exercises: [
    {
      id: 'c2-u3-l3-q01',
      type: 'mc',
      domain: 'd2',
      conceptId: 'mcp-advanced-primitives',
      taskStatement: '2.4',
      difficulty: 1,
      estimatedSeconds: 15,
      volatile: true,
      stem: 'What does MCP sampling let a server do?',
      options: [
        'Request an LLM completion from the client, so the server needs no model SDK of its own',
        'Run arbitrary shell commands on the client machine',
        'Read any file on the user\'s disk without limits',
        'Permanently store data inside the client',
      ],
      answerKey: 0,
      explanation:
        'Sampling routes an LLM completion request through the client, letting the server stay model-independent. ' +
        'It is not a shell, a filesystem read, or storage; those are different capabilities entirely. Note that ' +
        'sampling is deprecated as of protocol version 2026-07-28 and scheduled for removal; new implementations ' +
        'should integrate directly with LLM provider APIs.',
      misconceptionTag: 'sampling',
      sourceUrls: [MCP_CLIENT],
    },
    {
      id: 'c2-u3-l3-q02',
      type: 'mc',
      domain: 'd2',
      conceptId: 'mcp-advanced-primitives',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 15,
      volatile: true,
      stem: 'A booking MCP server needs the user to confirm a $3,000 charge before it proceeds. Which client primitive fits?',
      options: [
        'Elicitation, using elicitation/create to request confirmation from the user',
        'Sampling, using sampling/createMessage',
        'Roots, to scope the filesystem',
        'A tools/list_changed notification',
      ],
      answerKey: 0,
      explanation:
        'Elicitation is the primitive for requesting information or confirmation from the user. ' +
        'Sampling asks the model, roots scope directories, and a notification just announces a change, so none of those collect user confirmation. ' +
        'Elicitation remains current; sampling and roots are deprecated as of protocol version 2026-07-28.',
      misconceptionTag: 'elicitation-vs-sampling',
      sourceUrls: [MCP_CLIENT],
    },
    {
      id: 'c2-u3-l3-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd2',
      conceptId: 'mcp-advanced-primitives',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 20,
      volatile: true,
      stem: 'A legacy MCP server generates summaries during tool calls with sampling/createMessage so it bundles no LLM SDK. As of protocol version 2026-07-28, what does the spec tell a new implementation to do instead?',
      options: [
        'Integrate directly with an LLM provider API, because sampling is deprecated and scheduled for removal',
        'Keep using sampling, since it is still the recommended way to stay model-independent',
        'Switch to elicitation so the user writes the summary',
        'Use roots to point the client\'s model at the right folder',
      ],
      answerKey: 0,
      explanation:
        'Sampling is deprecated as of protocol version 2026-07-28 and scheduled for removal, and the spec says new ' +
        'implementations should integrate directly with LLM provider APIs. Keeping sampling as the recommended path is ' +
        'the trap: it still works with older clients but is on its way out. Elicitation asks the user rather than a ' +
        'model, and roots (also deprecated) only communicated filesystem scope.',
      misconceptionTag: 'sampling-deprecated',
      sourceUrls: [MCP_CLIENT],
    },
    {
      id: 'c2-u3-l3-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd2',
      conceptId: 'mcp-advanced-primitives',
      taskStatement: '2.4',
      difficulty: 3,
      estimatedSeconds: 20,
      volatile: true,
      stem: 'A team relies on MCP roots as a hard security boundary that stops a server from reading files outside a directory. Why is that unsafe?',
      options: [
        'Roots communicate intended scope but do not enforce security; enforcement must be at the OS level',
        'Roots apply only to prompts, never to files',
        'Roots block all filesystem access, so nothing would work',
        'Roots are model-controlled and change without the client',
      ],
      answerKey: 0,
      explanation:
        'Roots are a coordination mechanism that well-behaved servers should respect, but real security needs OS-level enforcement. ' +
        'Roots do apply to filesystem scope and are client-managed, so the flaw is trusting an advisory boundary as if it were enforced. ' +
        'Roots are also deprecated as of protocol version 2026-07-28; new implementations pass directories via tool parameters, ' +
        'resource URIs, or server configuration, and the same OS-level enforcement rule applies to those.',
      misconceptionTag: 'roots-not-security',
      sourceUrls: [MCP_CLIENT],
    },
    {
      id: 'c2-u3-l3-q05',
      type: 'multi',
      domain: 'd2',
      conceptId: 'mcp-advanced-primitives',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two statements describe MCP notifications? Select TWO.',
      options: [
        'They inform the client of changes, such as tools/list_changed',
        'They are sent without expecting a response',
        'They require the client to reply with a result object',
        'They are how the model executes a tool call',
      ],
      answerKey: [0, 1],
      explanation:
        'Notifications announce changes like an updated tool list and, per JSON-RPC, carry no id and expect no response. ' +
        'Requiring a reply or executing a tool describes request/response calls, not notifications.',
      misconceptionTag: 'notifications',
      sourceUrls: [MCP_ARCH],
    },
    {
      id: 'c2-u3-l3-q06',
      type: 'order',
      domain: 'd2',
      conceptId: 'mcp-advanced-primitives',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 20,
      volatile: true,
      stem: 'Sampling is deprecated as of protocol version 2026-07-28, but older servers still use it. Order the steps of a legacy MCP sampling request with human-in-the-loop review, from first to last.',
      steps: [
        'The server sends sampling/createMessage to the client',
        'The client presents the request to the user for approval',
        'The client forwards the approved request to the LLM',
        'The client returns the approved completion to the server',
      ],
      answerKey: [0, 1, 2, 3],
      explanation:
        'The server asks, the user approves, the client calls the model, and the approved result returns to the server. ' +
        'Skipping the approval step would let a server-initiated model call run without the human oversight sampling is designed for. ' +
        'New implementations should integrate directly with LLM provider APIs instead of relying on this flow.',
      misconceptionTag: 'sampling-flow',
      sourceUrls: [MCP_CLIENT],
    },
    {
      id: 'c2-u3-l3-q07',
      type: 'cloze',
      domain: 'd2',
      conceptId: 'mcp-advanced-primitives',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 20,
      volatile: true,
      stem: 'Fill the blanks: a server uses ___ to ask the user for information, and ___ to request an LLM completion through the client.',
      blanks: [
        { options: ['elicitation', 'sampling', 'roots'] },
        { options: ['sampling', 'elicitation', 'notifications'] },
      ],
      answerKey: [0, 0],
      explanation:
        'Elicitation gathers information from the user; sampling requests a model completion via the client. ' +
        'Swapping them would ask the user to act as the model or ask the model for user-only input. ' +
        'Elicitation is current; sampling is deprecated as of protocol version 2026-07-28.',
      misconceptionTag: 'elicitation-vs-sampling',
      sourceUrls: [MCP_CLIENT],
    },
    {
      id: 'c2-u3-l3-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd2',
      conceptId: 'mcp-advanced-primitives',
      taskStatement: '2.4',
      difficulty: 1,
      estimatedSeconds: 10,
      volatile: true,
      stem: 'True or false: MCP roots strictly enforce which files a server is allowed to access.',
      options: [
        'False, roots communicate intended scope but do not enforce security',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Roots are a coordination mechanism, not a security boundary. Actual enforcement must happen at the operating-system level. ' +
        'Roots are deprecated as of protocol version 2026-07-28 and scheduled for removal.',
      misconceptionTag: 'roots-not-security',
      sourceUrls: [MCP_CLIENT],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: a server needs the user to confirm a purchase, and an older server borrowed the client\'s model to summarize text. Which primitive covered each need, which one is deprecated as of 2026-07-28, and why are they not the same?',
    conceptId: 'mcp-advanced-primitives',
    keyPointIds: [
      'kp-mcp-advanced-primitives-1',
      'kp-mcp-advanced-primitives-2',
      'kp-mcp-advanced-primitives-3',
      'kp-mcp-advanced-primitives-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 230,
});
