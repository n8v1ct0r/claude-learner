// content/src/d3-claude-code-config/c3-u1/l2-path-scoped-rules.ts
//
// C3-U1-L2 — Path-scoped rules under .claude/rules/. Task statement 3.3 (YAML frontmatter `paths:`
// glob patterns; rules load only when editing matching files for token efficiency; glob rules beat
// a directory CLAUDE.md when conventions span directories). Verified 2026-07-14 against the cited
// Claude Code "memory" doc (.claude/rules section).
//
// Confusion pair targeted: always-loaded CLAUDE.md vs path-scoped rules that load only for matching
// files vs on-demand skills. The spot-bug and explain-back attack "put everything in CLAUDE.md".

import { defineLesson } from '../../index';

const MEMORY = 'https://code.claude.com/docs/en/memory';

export const l2PathScopedRules = defineLesson({
  id: 'c3-u1-l2',
  title: 'Path-scoped rules',
  order: 1,
  concept: {
    conceptId: 'path-scoped-rules',
    analogy:
      'Path-scoped rules are like signs posted only on the doors they apply to: the "wear a hard hat" ' +
      'sign hangs on the construction wing, not the whole building. Claude sees the rule only when it ' +
      'walks into files that match, so unrelated work is not cluttered with it.',
    plainExplanation:
      'For larger projects you can split instructions into topic files under .claude/rules/. A rule ' +
      'file can add YAML frontmatter with a `paths:` field of glob patterns, and then it loads into ' +
      'context only when Claude works with files matching those patterns, which saves context space. ' +
      'A rule with no `paths` field loads unconditionally, at the same priority as .claude/CLAUDE.md. ' +
      'Glob-scoped rules are the right tool when a convention spans directories, where a single ' +
      'directory CLAUDE.md would not reach.',
    examWords: [
      '.claude/rules/',
      'paths:',
      'glob patterns',
      'unconditional rule',
      'conditional rule',
      'token efficiency',
    ],
    snippet: {
      language: 'markdown',
      code: '---\npaths:\n  - "src/api/**/*.ts"\n---\n\n# API rules\n- Validate every endpoint input',
    },
    keyPoints: [
      { id: 'kp-path-scoped-rules-1', text: 'Rules live as topic files under .claude/rules/ and are discovered recursively.' },
      { id: 'kp-path-scoped-rules-2', text: 'A `paths:` glob frontmatter scopes a rule so it loads only when Claude works with matching files, saving context.' },
      { id: 'kp-path-scoped-rules-3', text: 'A rule with no `paths` field loads unconditionally, at the same priority as .claude/CLAUDE.md.' },
      { id: 'kp-path-scoped-rules-4', text: 'Glob-scoped rules beat a directory CLAUDE.md when a convention spans directories, such as **/*.test.ts.' },
    ],
  },
  exercises: [
    {
      id: 'c3-u1-l2-q01',
      type: 'mc',
      domain: 'd3',
      conceptId: 'path-scoped-rules',
      taskStatement: '3.3',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'You have testing conventions that should only apply while Claude edits test files. Which mechanism keeps them out of context the rest of the time?',
      options: [
        'A rule under .claude/rules/ with a `paths:` glob like "**/*.test.ts"',
        'A large block appended to the project CLAUDE.md',
        'An @import at the top of CLAUDE.md',
        'A managed-policy CLAUDE.md deployed org-wide',
      ],
      answerKey: 0,
      explanation:
        'A path-scoped rule loads only when Claude works with files matching its glob, so testing conventions stay out of ' +
        'context otherwise. Appending to CLAUDE.md is the trap: CLAUDE.md loads in full every session, spending tokens even ' +
        'when no test file is open.',
      misconceptionTag: 'rules-vs-always-loaded-claude-md',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u1-l2-q02',
      type: 'mc',
      domain: 'd3',
      conceptId: 'path-scoped-rules',
      taskStatement: '3.3',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'A colleague adds a rule file under .claude/rules/ with no `paths` frontmatter and assumes it will never load. What actually happens?',
      options: [
        'It loads unconditionally every session, at the same priority as .claude/CLAUDE.md',
        'It never loads because it has no path patterns',
        'It loads only when the file itself is opened',
        'It is treated as a skill and loads only when invoked',
      ],
      answerKey: 0,
      explanation:
        'A rule without a `paths` field applies to all files and loads unconditionally, alongside .claude/CLAUDE.md. ' +
        'The "never loads" answer confuses the absence of a path filter with being disabled, but no filter means it always ' +
        'applies.',
      misconceptionTag: 'unconditional-rule-loads',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u1-l2-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd3',
      conceptId: 'path-scoped-rules',
      taskStatement: '3.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Your React component conventions apply to .tsx files scattered across many directories, not one folder. Which approach fits best?',
      options: [
        'A path-scoped rule with a glob such as "**/*.tsx" under .claude/rules/',
        'A directory CLAUDE.md placed in one components folder',
        'A separate CLAUDE.local.md in each affected directory',
        'A skill the user must invoke before editing each component',
      ],
      answerKey: 0,
      explanation:
        'A glob-scoped rule matches .tsx files wherever they live, which is exactly the case a single directory CLAUDE.md ' +
        'cannot cover. The directory-CLAUDE.md answer is the trap: it only reaches files under that one folder, missing ' +
        'components elsewhere.',
      misconceptionTag: 'glob-rule-vs-directory-claude-md',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u1-l2-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd3',
      conceptId: 'path-scoped-rules',
      taskStatement: '3.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A team dumps every backend, frontend, and testing convention into one 600-line CLAUDE.md and adherence drops. What is the design flaw?',
      options: [
        'Everything loads every session and dilutes attention; scoped conventions belong in path-scoped .claude/rules/ files that load only for matching work',
        'CLAUDE.md has a hard 200-line ceiling and silently truncates the rest',
        'CLAUDE.md cannot contain more than one topic at a time',
        'The conventions should be split into imports, which reduces the loaded context',
      ],
      answerKey: 0,
      explanation:
        'One giant always-loaded file spends context and reduces adherence; moving scoped conventions into path-scoped rules ' +
        'loads each only for matching files. The imports answer is the trap: imports aid structure but still load everything ' +
        'at launch, so they would not cut the context.',
      misconceptionTag: 'rules-vs-always-loaded-claude-md',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u1-l2-q05',
      type: 'mc',
      domain: 'd3',
      conceptId: 'path-scoped-rules',
      taskStatement: '3.3',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'When does a path-scoped rule actually get pulled into context?',
      options: [
        'When Claude reads or works with a file matching the rule\'s glob patterns',
        'On every tool call regardless of which files are involved',
        'Only when the user types the rule\'s filename',
        'Only at session end during cleanup',
      ],
      answerKey: 0,
      explanation:
        'Path-scoped rules trigger when Claude reaches a file matching the pattern, not on every tool use, which is what ' +
        'makes them token-efficient. The "every tool call" answer would defeat the whole purpose of scoping.',
      misconceptionTag: 'rule-trigger-on-matching-file',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u1-l2-q06',
      type: 'multi',
      domain: 'd3',
      conceptId: 'path-scoped-rules',
      taskStatement: '3.3',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two are true of .claude/rules/ files? Select TWO.',
      options: [
        'A `paths:` glob makes a rule load only when Claude works with matching files',
        'Rules files are discovered recursively, so you can organize them in subdirectories',
        'Every rule loads on every tool call regardless of its frontmatter',
        'A rule with a `paths` field overrides the whole project CLAUDE.md',
        'Rules can only ever match files in the project root',
      ],
      answerKey: [0, 1],
      explanation:
        'A `paths:` glob scopes loading to matching work, and rule files are discovered recursively for organization. ' +
        'The other options overstate rules: they do not fire on every call, do not override CLAUDE.md, and globs like ' +
        'src/**/* reach beyond the root.',
      misconceptionTag: 'rules-vs-always-loaded-claude-md',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u1-l2-q07',
      type: 'order',
      domain: 'd3',
      conceptId: 'path-scoped-rules',
      taskStatement: '3.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Order these instruction homes from the one that costs the least context when idle to the one that always loads in full.',
      steps: [
        'A skill under .claude/skills/, whose body loads only when invoked',
        'A path-scoped rule that loads only when Claude works with matching files',
        'The project CLAUDE.md, which loads in full every session',
      ],
      answerKey: [0, 1, 2],
      explanation:
        'A skill body costs almost nothing until invoked, a path-scoped rule loads only for matching files, and CLAUDE.md ' +
        'loads in full every session. Choosing the right home is how you keep always-loaded context small.',
      misconceptionTag: 'rules-vs-always-loaded-claude-md',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u1-l2-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd3',
      conceptId: 'path-scoped-rules',
      taskStatement: '3.3',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: a rule file under .claude/rules/ with a `paths:` glob loads into context every single session no matter what files are involved.',
      options: [
        'False, it loads only when Claude works with files matching the glob',
        'True',
      ],
      answerKey: 0,
      explanation:
        'The whole point of a `paths:` glob is conditional loading: the rule enters context only for matching files. ' +
        'A rule that omits `paths` is the one that loads unconditionally.',
      misconceptionTag: 'rule-trigger-on-matching-file',
      sourceUrls: [MEMORY],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: why would you move a set of test-file conventions out of CLAUDE.md and into a path-scoped rule, and what does the `paths:` glob change?',
    conceptId: 'path-scoped-rules',
    keyPointIds: [
      'kp-path-scoped-rules-1',
      'kp-path-scoped-rules-2',
      'kp-path-scoped-rules-3',
      'kp-path-scoped-rules-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
