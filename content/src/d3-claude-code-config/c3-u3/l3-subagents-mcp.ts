// content/src/d3-claude-code-config/c3-u3/l3-subagents-mcp.ts
//
// C3-U3-L3 — Claude Code subagents and adding MCP servers. Task statement 3.2 (subagents in
// .claude/agents; adding MCP servers with scopes and transports). Verified 2026-07-14 against the
// cited Claude Code "sub-agents" and "mcp" docs.
//
// Confusion pair targeted: a subagent (an isolated worker with its own context window) vs an MCP
// server (an external connection that provides tools and data). Two related mechanisms, one card.

import { defineLesson } from '../../index';

const SUBAGENTS = 'https://code.claude.com/docs/en/sub-agents';
const MCP = 'https://code.claude.com/docs/en/mcp';

export const l3SubagentsMcp = defineLesson({
  id: 'c3-u3-l3',
  title: 'Subagents and MCP servers',
  order: 2,
  concept: {
    conceptId: 'subagents-and-mcp',
    analogy:
      'A subagent is a specialist teammate you send off to research in another room and report back a ' +
      'summary, so your own desk stays clear. An MCP server is more like a phone line to an outside ' +
      'service: it does not think for you, it plugs in tools and data the outside system provides.',
    plainExplanation:
      'Subagents are specialized assistants defined as markdown files with YAML frontmatter (name, ' +
      'description, tools, model) in .claude/agents/ for a project or ~/.claude/agents/ for you. Each ' +
      'runs in its own context window with a custom system prompt and restricted tools, and Claude ' +
      'delegates to one based on its description, keeping verbose work out of the main conversation. ' +
      'MCP servers instead connect Claude Code to external tools and data. You add them at local ' +
      '(default, private), project (.mcp.json, shared and committed), or user (all your projects) ' +
      'scope, choosing a transport such as stdio or HTTP, and ${VAR} expansion in .mcp.json keeps ' +
      'secrets like tokens out of version control.',
    examWords: [
      '.claude/agents/',
      'isolated context window',
      'subagent delegation',
      'MCP server',
      '.mcp.json',
      'local vs project vs user scope',
      '${VAR} expansion',
    ],
    keyPoints: [
      { id: 'kp-subagents-and-mcp-1', text: 'A subagent is a markdown file with YAML frontmatter (name, description, tools, model) in .claude/agents/ or ~/.claude/agents/, running in its own context window with a custom prompt and restricted tools.' },
      { id: 'kp-subagents-and-mcp-2', text: 'An MCP server connects Claude Code to external tools and data, rather than being an isolated worker like a subagent.' },
      { id: 'kp-subagents-and-mcp-3', text: 'MCP scopes are local (default, private), project (.mcp.json, shared and committed to version control), and user (all your projects), with local taking precedence over project over user.' },
      { id: 'kp-subagents-and-mcp-4', text: 'Environment-variable expansion like ${GITHUB_TOKEN} in .mcp.json keeps secrets out of version control while sharing the config.' },
    ],
  },
  exercises: [
    {
      id: 'c3-u3-l3-q01',
      type: 'mc',
      domain: 'd3',
      conceptId: 'subagents-and-mcp',
      taskStatement: '3.2',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'You want codebase research done in a separate context so its file reads do not flood your main conversation. Which mechanism fits?',
      options: [
        'A subagent, which runs in its own context window and returns a summary',
        'An MCP server, which connects external tools',
        'A path-scoped rule in .claude/rules/',
        'A managed-policy CLAUDE.md',
      ],
      answerKey: 0,
      explanation:
        'A subagent works in its own context window and returns only a summary, keeping exploration out of the main thread. ' +
        'An MCP server is the trap: it connects external tools and data, but it is not an isolated worker.',
      misconceptionTag: 'subagent-vs-mcp',
      sourceUrls: [SUBAGENTS],
    },
    {
      id: 'c3-u3-l3-q02',
      type: 'mc',
      domain: 'd3',
      conceptId: 'subagents-and-mcp',
      taskStatement: '3.2',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'A colleague says a subagent and an MCP server are basically the same thing. What is the distinction?',
      options: [
        'A subagent is an isolated worker with its own context; an MCP server is a connection that provides external tools and data',
        'They are identical, so the colleague is right',
        'A subagent provides external tools while an MCP server runs research',
        'Both are just entries in CLAUDE.md',
      ],
      answerKey: 0,
      explanation:
        'A subagent is a delegated worker with its own context window, while an MCP server plugs in tools and data from an ' +
        'outside system. The swapped answer reverses their roles, which is the exact confusion to avoid.',
      misconceptionTag: 'subagent-vs-mcp',
      sourceUrls: [SUBAGENTS, MCP],
    },
    {
      id: 'c3-u3-l3-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd3',
      conceptId: 'subagents-and-mcp',
      taskStatement: '3.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Your team wants everyone who clones the repo to get the same MCP server configuration, checked into version control. Which scope do you use?',
      options: [
        'Project scope, stored in .mcp.json at the repo root',
        'Local scope, the default private configuration',
        'User scope, available across all your projects',
        'A subagent definition in .claude/agents/',
      ],
      answerKey: 0,
      explanation:
        'Project scope stores the server in .mcp.json at the repo root, which is designed to be committed and shared with the ' +
        'team. Local scope is the trap: it is the default but stays private to you and is not shared through version control.',
      misconceptionTag: 'mcp-project-scope-shared',
      sourceUrls: [MCP],
    },
    {
      id: 'c3-u3-l3-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd3',
      conceptId: 'subagents-and-mcp',
      taskStatement: '3.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A developer commits a project .mcp.json with a hardcoded API token so teammates get the server. What is the flaw and the fix?',
      options: [
        'The secret is now in version control; use ${VAR} expansion in .mcp.json so the token is read from the environment instead',
        'Project .mcp.json cannot hold tokens at all, so it will not work',
        'MCP servers never need authentication, so the token should be deleted',
        'The token belongs in the subagent frontmatter instead',
      ],
      answerKey: 0,
      explanation:
        'Committing a raw token leaks a secret; ${VAR} expansion lets the shared .mcp.json reference an environment variable ' +
        'so the value stays out of git. Claiming .mcp.json cannot hold tokens is the trap, since it can, and the real fix is ' +
        'to reference them by variable.',
      misconceptionTag: 'mcp-env-var-expansion',
      sourceUrls: [MCP],
    },
    {
      id: 'c3-u3-l3-q05',
      type: 'mc',
      domain: 'd3',
      conceptId: 'subagents-and-mcp',
      taskStatement: '3.2',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'Which frontmatter fields let a subagent restrict its tools and pick a cheaper model?',
      options: [
        'tools and model in the subagent\'s YAML frontmatter',
        'permissions.allow and defaultMode in settings.json',
        'allowed-tools and context in a SKILL.md',
        'paths and description in a rule file',
      ],
      answerKey: 0,
      explanation:
        'A subagent file uses tools to restrict its tool access and model to select which model it runs, alongside name and ' +
        'description. The SKILL.md answer is the trap: those fields configure a skill, not a subagent definition.',
      misconceptionTag: 'subagent-frontmatter-fields',
      sourceUrls: [SUBAGENTS],
    },
    {
      id: 'c3-u3-l3-q06',
      type: 'multi',
      domain: 'd3',
      conceptId: 'subagents-and-mcp',
      taskStatement: '3.2',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'A teammate keeps mixing up subagents and MCP servers. Which two of your clarifications are accurate? Select TWO.',
      options: [
        'Each subagent runs in its own context window with a custom system prompt and restricted tools',
        'A project-scoped MCP server is stored in .mcp.json and shared with the team via version control',
        'Local MCP scope shares the server with everyone who clones the repo',
        'Subagents and MCP servers are the same mechanism with two names',
        'MCP servers must always store secrets as plaintext in .mcp.json',
      ],
      answerKey: [0, 1],
      explanation:
        'Subagents have their own context and tool limits, and project MCP servers live in a shared .mcp.json. The false ' +
        'options misstate local scope (which is private), conflate subagents with MCP servers, and ignore ${VAR} expansion ' +
        'for secrets.',
      misconceptionTag: 'subagent-vs-mcp',
      sourceUrls: [SUBAGENTS, MCP],
    },
    {
      id: 'c3-u3-l3-q07',
      type: 'multi',
      domain: 'd3',
      conceptId: 'subagents-and-mcp',
      taskStatement: '3.2',
      difficulty: 3,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'You are deciding where to store an MCP server so the right people can use it. Which two facts about local, project, and user scopes apply? Select TWO.',
      options: [
        'Local scope is the default and keeps the server private to you in the current project',
        'When the same server is defined at multiple scopes, local takes precedence over project and user',
        'User scope loads the server only in the single project where it was added',
        'Project scope keeps the configuration private and out of version control',
        'All three scopes always merge their fields together for one server',
      ],
      answerKey: [0, 1],
      explanation:
        'Local is the default private scope, and local outranks project which outranks user, with the whole entry from the ' +
        'highest scope used. The false options invert user scope (it spans all projects), project scope (it is shared), and ' +
        'claim merging where the highest scope\'s entry is used instead.',
      misconceptionTag: 'mcp-scope-precedence',
      sourceUrls: [MCP],
    },
    {
      id: 'c3-u3-l3-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd3',
      conceptId: 'subagents-and-mcp',
      taskStatement: '3.2',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: an MCP server is an isolated worker that runs research in its own context window.',
      options: [
        'False, that describes a subagent; an MCP server connects external tools and data',
        'True',
      ],
      answerKey: 0,
      explanation:
        'The isolated-worker description belongs to a subagent. An MCP server is a connection that provides tools and data ' +
        'from an outside system.',
      misconceptionTag: 'subagent-vs-mcp',
      sourceUrls: [SUBAGENTS, MCP],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: how is a subagent different from an MCP server, and which MCP scope would you use so your whole team gets the same server from version control?',
    conceptId: 'subagents-and-mcp',
    keyPointIds: [
      'kp-subagents-and-mcp-1',
      'kp-subagents-and-mcp-2',
      'kp-subagents-and-mcp-3',
      'kp-subagents-and-mcp-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
