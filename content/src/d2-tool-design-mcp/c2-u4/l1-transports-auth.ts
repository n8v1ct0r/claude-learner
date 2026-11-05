// content/src/d2-tool-design-mcp/c2-u4/l1-transports-auth.ts
//
// C2-U4-L1 — MCP transports and authentication. Task statement 2.4 (MCP servers in Claude Code).
// Confusion pair targeted: stdio (local, same-machine) vs Streamable HTTP (remote, authenticated).
//
// Sources (verified 2026-07-14 against the cited pages):
//   MCP_ARCH — modelcontextprotocol.io "Architecture overview": stdio transport uses standard input/
//              output for local same-machine processes with no network overhead; Streamable HTTP uses
//              HTTP POST with optional Server-Sent Events for remote servers and supports bearer tokens,
//              API keys, and custom headers; MCP recommends OAuth to obtain tokens.
//   CC_MCP   — code.claude.com "Connect Claude Code to tools via MCP": HTTP is the recommended remote
//              transport; use /mcp to authenticate with servers that require OAuth 2.0.
// Re-verified 2026-09-24: the MCP page now serves from the versioned /docs/2026-07-28/ path, cited
// as the final URL.

import { defineLesson } from '../../index';

const MCP_ARCH = 'https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture';
const CC_MCP = 'https://code.claude.com/docs/en/mcp';

export const l1TransportsAuth = defineLesson({
  id: 'c2-u4-l1',
  title: 'MCP transports and auth',
  order: 0,
  concept: {
    conceptId: 'mcp-transports',
    analogy:
      'A transport is how the client and server talk. `stdio` is two programs sharing a desk, passing notes ' +
      'directly on the same machine. Streamable HTTP is a phone line to a remote office, which needs a way to ' +
      'prove who is calling before it hands over anything sensitive.',
    plainExplanation:
      'MCP supports two transports. The `stdio` transport uses standard input/output for direct communication ' +
      'between local processes on the same machine, with no network overhead. The Streamable HTTP transport ' +
      'uses HTTP POST with optional Server-Sent Events for remote servers and supports standard HTTP auth such ' +
      'as bearer tokens and API keys; MCP recommends OAuth to obtain tokens. Local stdio servers typically ' +
      'serve one client, while remote HTTP servers can serve many.',
    examWords: ['stdio transport', 'Streamable HTTP', 'Server-Sent Events', 'bearer token', 'OAuth'],
    keyPoints: [
      { id: 'kp-mcp-transports-1', text: 'The stdio transport uses standard input/output for local, same-machine processes with no network overhead.' },
      { id: 'kp-mcp-transports-2', text: 'The Streamable HTTP transport uses HTTP POST with optional Server-Sent Events and enables remote servers.' },
      { id: 'kp-mcp-transports-3', text: 'HTTP transport supports standard auth like bearer tokens and API keys; MCP recommends OAuth to obtain tokens.' },
      { id: 'kp-mcp-transports-4', text: 'Local stdio servers typically serve one client; remote HTTP servers can serve many clients.' },
    ],
  },
  exercises: [
    {
      id: 'c2-u4-l1-q01',
      type: 'mc',
      domain: 'd2',
      conceptId: 'mcp-transports',
      taskStatement: '2.4',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'An MCP server runs as a local process on the same machine and communicates over standard input/output. Which transport is that?',
      options: [
        'The stdio transport',
        'The Streamable HTTP transport',
        'A remote Server-Sent Events endpoint',
        'A cloud webhook transport',
      ],
      answerKey: 0,
      explanation:
        'Standard input/output between local processes on one machine is exactly the stdio transport. ' +
        'Streamable HTTP and remote SSE are for network communication with servers that are not on the same machine.',
      misconceptionTag: 'stdio-vs-http',
      sourceUrls: [MCP_ARCH],
    },
    {
      id: 'c2-u4-l1-q02',
      type: 'mc',
      domain: 'd2',
      conceptId: 'mcp-transports',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'You need to connect to a remote MCP server hosted by a third-party platform. Which transport applies, and what does MCP recommend for auth?',
      options: [
        'Streamable HTTP, with OAuth recommended to obtain tokens',
        'stdio, with no authentication needed',
        'stdio, secured with OAuth bearer tokens',
        'Streamable HTTP, but authentication is not supported',
      ],
      answerKey: 0,
      explanation:
        'Remote servers use the Streamable HTTP transport, which supports bearer tokens and API keys, and MCP recommends OAuth to obtain tokens. ' +
        'stdio is a local transport, and HTTP does support auth, so the stdio and no-auth options do not fit a remote server.',
      misconceptionTag: 'remote-transport-auth',
      sourceUrls: [MCP_ARCH, CC_MCP],
    },
    {
      id: 'c2-u4-l1-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd2',
      conceptId: 'mcp-transports',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A local filesystem MCP server needs the lowest possible overhead and runs on the same machine as the host. Which transport fits best?',
      options: [
        'The stdio transport, direct process I/O with no network overhead',
        'The Streamable HTTP transport over localhost',
        'A remote Server-Sent Events endpoint',
        'A WebSocket connection to a cloud server',
      ],
      answerKey: 0,
      explanation:
        'For a same-machine server, stdio gives direct input/output with no network overhead, which is the lowest-cost path. ' +
        'HTTP, remote SSE, and cloud WebSockets all add network machinery this local server does not need.',
      misconceptionTag: 'stdio-vs-http',
      sourceUrls: [MCP_ARCH],
    },
    {
      id: 'c2-u4-l1-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd2',
      conceptId: 'mcp-transports',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A config points a remote MCP server at an HTTPS URL but supplies no authentication and expects it to just work securely. What is missing?',
      options: [
        'Remote HTTP servers use standard auth like bearer tokens, with OAuth recommended to obtain them',
        'Remote MCP servers cannot use authentication at all',
        'The server must be switched to stdio to be reachable',
        'HTTPS servers reject any request that includes headers',
      ],
      answerKey: 0,
      explanation:
        'A remote HTTP server needs credentials, such as a bearer token, and MCP recommends OAuth to obtain them. ' +
        'Remote servers do support auth and can accept headers, and switching to stdio would not reach a remote host, so those are not the gap.',
      misconceptionTag: 'remote-transport-auth',
      sourceUrls: [MCP_ARCH, CC_MCP],
    },
    {
      id: 'c2-u4-l1-q05',
      type: 'multi',
      domain: 'd2',
      conceptId: 'mcp-transports',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'You are documenting the stdio transport for a teammate. Pick the two facts that are accurate. Select TWO.',
      options: [
        'It runs local server processes on the same machine',
        'It communicates over standard input/output with no network overhead',
        'It is the standard way to reach remote cloud-hosted servers',
        'It requires OAuth bearer tokens to connect',
      ],
      answerKey: [0, 1],
      explanation:
        'stdio is a local, same-machine transport that uses standard input/output with no network cost. ' +
        'Reaching remote cloud servers and OAuth bearer tokens belong to the HTTP transport, not stdio.',
      misconceptionTag: 'stdio-properties',
      sourceUrls: [MCP_ARCH],
    },
    {
      id: 'c2-u4-l1-q06',
      type: 'cloze',
      domain: 'd2',
      conceptId: 'mcp-transports',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: the ___ transport suits a local same-machine server, while the ___ transport suits a remote server and supports bearer-token and OAuth authentication.',
      blanks: [
        { options: ['stdio', 'Streamable HTTP', 'SSE'] },
        { options: ['Streamable HTTP', 'stdio', 'WebSocket'] },
      ],
      answerKey: [0, 0],
      explanation:
        'stdio is the local transport; Streamable HTTP is the remote one that carries HTTP authentication. ' +
        'Swapping them would try to run a local process over the network or reach a remote host with same-machine I/O.',
      misconceptionTag: 'stdio-vs-http',
      sourceUrls: [MCP_ARCH],
    },
    {
      id: 'c2-u4-l1-q07',
      type: 'mc',
      domain: 'd2',
      conceptId: 'mcp-transports',
      taskStatement: '2.4',
      difficulty: 3,
      estimatedSeconds: 20,
      stem: 'In Claude Code you add a remote MCP server that requires OAuth 2.0. How do you authenticate with it?',
      options: [
        'Run /mcp to complete the OAuth flow for that server',
        'Paste your account password directly into .mcp.json',
        'Turn off authentication for that server in settings',
        'Reconfigure the server to use the stdio transport',
      ],
      answerKey: 0,
      explanation:
        'Claude Code uses the /mcp command to authenticate with remote servers that require OAuth 2.0. ' +
        'Pasting a password into config, disabling auth, or switching to stdio would either leak secrets or fail to reach the remote server.',
      misconceptionTag: 'oauth-flow',
      sourceUrls: [CC_MCP],
    },
    {
      id: 'c2-u4-l1-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd2',
      conceptId: 'mcp-transports',
      taskStatement: '2.4',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: the stdio transport is the standard way to connect to a remote cloud-hosted MCP server.',
      options: [
        'False, stdio is for local same-machine servers; remote servers use Streamable HTTP',
        'True',
      ],
      answerKey: 0,
      explanation:
        'stdio serves local, same-machine processes. Remote cloud servers are reached over the Streamable HTTP transport.',
      misconceptionTag: 'stdio-vs-http',
      sourceUrls: [MCP_ARCH],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: when would you pick the stdio transport over Streamable HTTP for an MCP server, and what does the remote choice add that the local one does not need?',
    conceptId: 'mcp-transports',
    keyPointIds: [
      'kp-mcp-transports-1',
      'kp-mcp-transports-2',
      'kp-mcp-transports-3',
      'kp-mcp-transports-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 230,
});
