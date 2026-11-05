// content/src/d2-tool-design-mcp/c2-u3/l1-mcp-architecture.ts
//
// C2-U3-L1 — MCP architecture. Task statement 2.4 (MCP fundamentals underpinning Claude Code
// integration). Confusion pair targeted: MCP host vs client vs server.
//
// Sources (verified 2026-07-14 against the cited page):
//   MCP_ARCH — modelcontextprotocol.io "Architecture overview": host is the AI application (e.g.
//              Claude Code, Claude Desktop) that coordinates one or more clients; the host creates
//              one client per server; each client keeps a dedicated one-to-one connection; the server
//              provides context to clients; two layers (data layer on JSON-RPC 2.0, transport layer).
//              Re-verified 2026-09-24: the page now serves from the versioned /docs/2026-07-28/ path,
//              cited as the final URL; the host/client/server claims are unchanged there.

import { defineLesson } from '../../index';

const MCP_ARCH = 'https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture';

export const l1McpArchitecture = defineLesson({
  id: 'c2-u3-l1',
  title: 'MCP architecture',
  order: 0,
  concept: {
    conceptId: 'mcp-architecture',
    analogy:
      'MCP is like USB for AI applications. The host is your laptop, each client is a port, and each ' +
      'server is a device that plugs into exactly one port. One standard plug lets any device connect to ' +
      'any laptop without custom wiring for each pairing.',
    plainExplanation:
      'MCP follows a client-server architecture. The host is the AI application, like Claude Code or Claude ' +
      'Desktop, that coordinates one or more clients. The host creates one client per server, and each client ' +
      'keeps a dedicated, one-to-one connection to its server, which provides context and capabilities. MCP ' +
      'has two layers: a data layer built on `JSON-RPC 2.0` (lifecycle, primitives, notifications) and a ' +
      'transport layer that carries the messages.',
    examWords: ['MCP host', 'MCP client', 'MCP server', 'JSON-RPC 2.0', 'data layer', 'transport layer'],
    keyPoints: [
      { id: 'kp-mcp-architecture-1', text: 'MCP has three participants: a host (the AI application), clients, and servers.' },
      { id: 'kp-mcp-architecture-2', text: 'The host creates one client per server, and each client keeps a dedicated one-to-one connection.' },
      { id: 'kp-mcp-architecture-3', text: 'The server is the program that provides context and capabilities to a client.' },
      { id: 'kp-mcp-architecture-4', text: 'The data layer uses JSON-RPC 2.0 for messages; the transport layer carries them.' },
    ],
  },
  exercises: [
    {
      id: 'c2-u3-l1-q01',
      type: 'mc',
      domain: 'd2',
      conceptId: 'mcp-architecture',
      taskStatement: '2.4',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'In MCP, what is the host?',
      options: [
        'The AI application that coordinates one or more clients, such as Claude Code',
        'The remote database the tools query',
        'A single JSON-RPC message on the wire',
        'The network transport carrying the bytes',
      ],
      answerKey: 0,
      explanation:
        'The host is the AI application that manages the clients and connects to servers. ' +
        'A database is something a server exposes, and a message or transport is machinery beneath the host, not the host itself.',
      misconceptionTag: 'host-vs-client',
      sourceUrls: [MCP_ARCH],
    },
    {
      id: 'c2-u3-l1-q02',
      type: 'mc',
      domain: 'd2',
      conceptId: 'mcp-architecture',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'An MCP host connects to three servers. How many clients does it create?',
      options: [
        'One client per server, so three dedicated connections',
        'One client shared across all three servers',
        'Three hosts, one per server',
        'Zero, because servers connect to each other directly',
      ],
      answerKey: 0,
      explanation:
        'The host instantiates one client per server, each maintaining its own dedicated connection. ' +
        'A single shared client does not match MCP\'s one-to-one model, and there is still only one host.',
      misconceptionTag: 'one-client-per-server',
      sourceUrls: [MCP_ARCH],
    },
    {
      id: 'c2-u3-l1-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd2',
      conceptId: 'mcp-architecture',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A teammate says "the MCP server is the AI app the user talks to." What is the correction?',
      options: [
        'The host is the AI application; the server is the program that provides context and capabilities to a client',
        'The server is the transport layer moving the messages',
        'The server and host are the same component with two names',
        'The client is the AI application, not the host',
      ],
      answerKey: 0,
      explanation:
        'The AI application is the host; a server is a separate program that supplies context and capabilities. ' +
        'The server is not the transport, and the host and server are distinct roles, so conflating them is the error.',
      misconceptionTag: 'host-vs-server',
      sourceUrls: [MCP_ARCH],
    },
    {
      id: 'c2-u3-l1-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd2',
      conceptId: 'mcp-architecture',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A design doc claims MCP invents its own proprietary binary message format. What is inaccurate?',
      options: [
        'MCP\'s data layer uses JSON-RPC 2.0 as its message protocol',
        'MCP defines no message format at all',
        'MCP messages must always be plain REST calls',
        'MCP only works when messages are XML',
      ],
      answerKey: 0,
      explanation:
        'The data layer is a JSON-RPC 2.0 exchange, not a proprietary binary format. ' +
        'MCP does define a message format, and it is JSON-RPC rather than REST or XML, so the other claims are also wrong.',
      misconceptionTag: 'jsonrpc',
      sourceUrls: [MCP_ARCH],
    },
    {
      id: 'c2-u3-l1-q05',
      type: 'multi',
      domain: 'd2',
      conceptId: 'mcp-architecture',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'A diagram splits MCP into a data layer and a transport layer. Pick the two labels placed on the correct layer. Select TWO.',
      options: [
        'The data layer defines a JSON-RPC 2.0 protocol including lifecycle and primitives',
        'The transport layer handles connection establishment, message framing, and authentication',
        'The transport layer is where the tools and resources primitives are defined',
        'JSON-RPC is only used when the transport is stdio',
      ],
      answerKey: [0, 1],
      explanation:
        'The data layer carries the JSON-RPC protocol and primitives; the transport layer moves messages and handles auth. ' +
        'Primitives live in the data layer, not the transport, and the same JSON-RPC format is used across all transports.',
      misconceptionTag: 'mcp-layers',
      sourceUrls: [MCP_ARCH],
    },
    {
      id: 'c2-u3-l1-q06',
      type: 'multi',
      domain: 'd2',
      conceptId: 'mcp-architecture',
      taskStatement: '2.4',
      difficulty: 3,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two are true about the client-server relationship in MCP? Select TWO.',
      options: [
        'Each client maintains a dedicated connection to one server',
        'The host coordinates and manages multiple clients',
        'A single client multiplexes connections to every server',
        'Servers coordinate and manage the host\'s clients',
      ],
      answerKey: [0, 1],
      explanation:
        'One client keeps one dedicated connection, and the host coordinates those clients. ' +
        'MCP does not multiplex all servers through one client, and servers do not manage the host, so those options invert the roles.',
      misconceptionTag: 'client-server-relationship',
      sourceUrls: [MCP_ARCH],
    },
    {
      id: 'c2-u3-l1-q07',
      type: 'cloze',
      domain: 'd2',
      conceptId: 'mcp-architecture',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: the MCP ___ is the AI application that creates one ___ for each server it connects to.',
      blanks: [
        { options: ['host', 'client', 'server'] },
        { options: ['client', 'host', 'server'] },
      ],
      answerKey: [0, 0],
      explanation:
        'The host is the AI application, and it creates one client per server. ' +
        'Reversing the terms would make the app a client or a server, which misstates the architecture.',
      misconceptionTag: 'host-vs-client',
      sourceUrls: [MCP_ARCH],
    },
    {
      id: 'c2-u3-l1-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd2',
      conceptId: 'mcp-architecture',
      taskStatement: '2.4',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: in MCP, the server is the AI application the user interacts with.',
      options: [
        'False, that is the host; the server provides context to a client',
        'True',
      ],
      answerKey: 0,
      explanation:
        'The AI application is the host. A server is a separate program that provides context and capabilities to a client.',
      misconceptionTag: 'host-vs-server',
      sourceUrls: [MCP_ARCH],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: name the three MCP participants and explain how the host, its clients, and the servers connect to each other.',
    conceptId: 'mcp-architecture',
    keyPointIds: [
      'kp-mcp-architecture-1',
      'kp-mcp-architecture-2',
      'kp-mcp-architecture-3',
      'kp-mcp-architecture-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 230,
});
