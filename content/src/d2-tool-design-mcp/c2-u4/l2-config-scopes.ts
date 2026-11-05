// content/src/d2-tool-design-mcp/c2-u4/l2-config-scopes.ts
//
// C2-U4-L2 — MCP config scopes in Claude Code + tools vs MCP servers vs Agent Skills. Task statement
// 2.4 (project .mcp.json shared/version-controlled vs user-level ~/.claude.json personal; env-var
// expansion keeps secrets out of git). Confusion pair: local vs project vs user scope and precedence.
//
// Sources (verified 2026-07-14 against the cited pages):
//   CC_MCP   — code.claude.com "Connect Claude Code to tools via MCP": three scopes — Local (default,
//              private, ~/.claude.json), Project (.mcp.json in project root, shared via version
//              control), User (all your projects). Precedence: local > project > user (entry not merged
//              across scopes). ${VAR} and ${VAR:-default} expansion keeps secrets out of version control.
//   CC_TOOLS — Claude Code "Tools reference": add custom tools by connecting an MCP server; add
//              reusable prompt-based workflows by writing a skill, which runs through the Skill tool.

import { defineLesson } from '../../index';

const CC_MCP = 'https://code.claude.com/docs/en/mcp';
const CC_TOOLS = 'https://code.claude.com/docs/en/tools-reference';

export const l2ConfigScopes = defineLesson({
  id: 'c2-u4-l2',
  title: 'MCP config scopes',
  order: 1,
  concept: {
    conceptId: 'mcp-config-scopes',
    analogy:
      'MCP scopes are like where you keep a key. Local scope is a key in your own desk drawer: just you, this ' +
      'project. Project scope is a key hung by the shared front door in `.mcp.json`, checked into version control ' +
      'for the whole team. User scope is a master key on your keyring that opens every project you work in.',
    plainExplanation:
      'Claude Code configures MCP servers at three scopes. Local (the default) is private to you in the current ' +
      'project, stored in `~/.claude.json`. Project is shared with the team through a `.mcp.json` file checked ' +
      'into version control. User makes a server available across all your projects. When the same server name ' +
      'exists at more than one scope, precedence is local, then project, then user, and the entry is not merged. ' +
      'Use `${VAR}` environment-variable expansion in `.mcp.json` to keep secrets like tokens out of version control.',
    examWords: ['local scope', 'project scope', 'user scope', '.mcp.json', '${VAR}'],
    keyPoints: [
      { id: 'kp-mcp-config-scopes-1', text: 'Local scope is the default, private to you in the current project, stored in ~/.claude.json.' },
      { id: 'kp-mcp-config-scopes-2', text: 'Project scope is shared with the team via a .mcp.json file checked into version control.' },
      { id: 'kp-mcp-config-scopes-3', text: 'User scope makes a server available across all your projects.' },
      { id: 'kp-mcp-config-scopes-4', text: 'When a name exists at multiple scopes, precedence is local, then project, then user; use ${VAR} expansion to keep secrets out of version control.' },
    ],
  },
  exercises: [
    {
      id: 'c2-u4-l2-q01',
      type: 'mc',
      domain: 'd2',
      conceptId: 'mcp-config-scopes',
      taskStatement: '2.4',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'You want an MCP server that every teammate gets automatically when they clone the repository. Which scope should you use?',
      options: [
        'Project scope, stored in a .mcp.json file checked into version control',
        'Local scope, private to you in this project',
        'User scope, available only across your own projects',
        'No scope; MCP servers cannot be shared',
      ],
      answerKey: 0,
      explanation:
        'Project scope stores the server in .mcp.json, which is designed to be committed so the whole team shares it. ' +
        'Local and user scopes are both private to you, so neither propagates the server to teammates through the repo.',
      misconceptionTag: 'project-scope',
      sourceUrls: [CC_MCP],
    },
    {
      id: 'c2-u4-l2-q02',
      type: 'mc',
      domain: 'd2',
      conceptId: 'mcp-config-scopes',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'Where is a local-scoped MCP server stored, and who can see it?',
      options: [
        'In ~/.claude.json, private to you in the current project',
        'In .mcp.json, shared with the whole team',
        'In ~/.claude.json, available in all your projects',
        'In a managed enterprise policy file for the org',
      ],
      answerKey: 0,
      explanation:
        'Local scope keeps the server in ~/.claude.json under the current project\'s path, private to you. ' +
        'The team-shared .mcp.json is project scope, and cross-project availability from ~/.claude.json is user scope.',
      misconceptionTag: 'local-vs-project',
      sourceUrls: [CC_MCP],
    },
    {
      id: 'c2-u4-l2-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd2',
      conceptId: 'mcp-config-scopes',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A developer commits their personal API token directly into .mcp.json so a project-scoped server works for teammates. What is the recommended approach instead?',
      options: [
        'Reference the token with ${VAR} environment-variable expansion so the secret stays out of version control',
        'Leave the token in the file but delete it before each commit',
        'Move the token into the tool description so it is documented',
        'Switch the server to user scope and paste the token there',
      ],
      answerKey: 0,
      explanation:
        'Environment-variable expansion like ${VAR} lets the shared config reference a secret without committing its value. ' +
        'Hand-editing before commits is error-prone, descriptions are not for secrets, and user scope would not share the server with the team.',
      misconceptionTag: 'env-var-secrets',
      sourceUrls: [CC_MCP],
    },
    {
      id: 'c2-u4-l2-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd2',
      conceptId: 'mcp-config-scopes',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'The same server name is defined at local, project, and user scope with different commands, and a teammate is unsure which one actually runs. Which wins?',
      options: [
        'Local takes precedence, then project, then user, and the entry is not merged across scopes',
        'User scope always wins because it is broadest',
        'The three definitions are merged field by field into one server',
        'Project scope wins because it is in version control',
      ],
      answerKey: 0,
      explanation:
        'Claude Code connects once using the highest-precedence definition: local, then project, then user, with no merging. ' +
        'User scope is lowest here, and fields are never combined across scopes, so the whole entry comes from one source.',
      misconceptionTag: 'scope-precedence',
      sourceUrls: [CC_MCP],
    },
    {
      id: 'c2-u4-l2-q05',
      type: 'multi',
      domain: 'd2',
      conceptId: 'mcp-config-scopes',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'A teammate keeps mixing up the three MCP config scopes in Claude Code. Pick the two claims that hold. Select TWO.',
      options: [
        'Project-scoped servers live in .mcp.json intended for version control',
        'User-scoped servers are available across all your projects',
        'Local scope shares the server with your whole team',
        'Project scope is private to you only',
      ],
      answerKey: [0, 1],
      explanation:
        'Project scope uses a committed .mcp.json, and user scope spans all of your projects. ' +
        'Local scope is private rather than team-shared, and project scope is the shared one, so those two options invert the scopes.',
      misconceptionTag: 'scope-properties',
      sourceUrls: [CC_MCP],
    },
    {
      id: 'c2-u4-l2-q06',
      type: 'order',
      domain: 'd2',
      conceptId: 'mcp-config-scopes',
      taskStatement: '2.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Order these MCP server scopes from highest to lowest precedence when the same server name is defined at each.',
      steps: [
        'Local scope',
        'Project scope',
        'User scope',
      ],
      answerKey: [0, 1, 2],
      explanation:
        'Claude Code resolves a duplicate name in the order local, then project, then user. ' +
        'Assuming user scope or project scope wins would connect to the wrong definition when a name is defined more than once.',
      misconceptionTag: 'scope-precedence',
      sourceUrls: [CC_MCP],
    },
    {
      id: 'c2-u4-l2-q07',
      type: 'multi',
      domain: 'd2',
      conceptId: 'mcp-config-scopes',
      taskStatement: '2.4',
      difficulty: 3,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'You want a reusable prompt-based workflow, not a new external tool. Which two statements are correct? Select TWO.',
      options: [
        'To add custom external tools, you connect an MCP server',
        'To add a reusable prompt-based workflow, you write a skill, which runs through the Skill tool',
        'MCP servers and skills are the same mechanism under different names',
        'A skill adds new low-level entries to the tools array',
      ],
      answerKey: [0, 1],
      explanation:
        'External tools come from MCP servers, while reusable prompt-based workflows are skills invoked through the Skill tool. ' +
        'They are distinct mechanisms, and a skill is a workflow rather than a new low-level tool entry, so those two options are wrong.',
      misconceptionTag: 'tools-vs-servers-vs-skills',
      sourceUrls: [CC_TOOLS],
    },
    {
      id: 'c2-u4-l2-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd2',
      conceptId: 'mcp-config-scopes',
      taskStatement: '2.4',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: a project-scoped MCP server in .mcp.json is private to you and never shared.',
      options: [
        'False, project scope is shared with the team via version control',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Project scope stores the server in a committed .mcp.json so the whole team shares it. The private scope is local.',
      misconceptionTag: 'local-vs-project',
      sourceUrls: [CC_MCP],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: you added the same MCP server at local, project, and user scope. Which one runs, and which scope would you use to share a server with your team without leaking your API token?',
    conceptId: 'mcp-config-scopes',
    keyPointIds: [
      'kp-mcp-config-scopes-1',
      'kp-mcp-config-scopes-2',
      'kp-mcp-config-scopes-3',
      'kp-mcp-config-scopes-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 230,
});
