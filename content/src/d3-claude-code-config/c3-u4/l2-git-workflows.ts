// content/src/d3-claude-code-config/c3-u4/l2-git-workflows.ts
//
// C3-U4-L2 — Git workflows and team standardization. Task statements: 3.6 (commits, PRs, worktrees
// as team/automation workflows), 3.1 (team standardization via checked-in project config), and 3.5
// (iterative refinement: document testing standards in CLAUDE.md to improve generated tests).
// Verified 2026-07-14 against the cited Claude Code "common-workflows", "memory", and "settings" docs.
//
// Confusion pair targeted: shared project config (committed, standardizes the whole team) vs
// personal/local config (gitignored, private). The spot-bug attacks vague CLAUDE.md test guidance.

import { defineLesson } from '../../index';

const WORKFLOWS = 'https://code.claude.com/docs/en/common-workflows';
const MEMORY = 'https://code.claude.com/docs/en/memory';
const SETTINGS = 'https://code.claude.com/docs/en/settings';

export const l2GitWorkflows = defineLesson({
  id: 'c3-u4-l2',
  title: 'Git workflows and team standardization',
  order: 1,
  concept: {
    conceptId: 'git-workflows-team-config',
    analogy:
      'Checking config into the repo is like leaving the recipe binder in the shared kitchen instead ' +
      'of your own drawer: everyone who walks in cooks the same way. Worktrees are like having two ' +
      'identical kitchens so two cooks never bump elbows over the same counter.',
    plainExplanation:
      'Claude Code can create git commits and pull requests when you ask, and git worktrees let you ' +
      'run parallel sessions on the same repo without collisions, since each worktree is a separate ' +
      'checkout on its own branch. To standardize a team, commit shared config to the repo: a project ' +
      'CLAUDE.md and project settings (.claude/settings.json) are shared through version control, while ' +
      'personal files like CLAUDE.local.md and .claude/settings.local.json stay private and gitignored. ' +
      'To lift the quality of the tests Claude writes, document your testing standards, conventions, ' +
      'and fixtures in CLAUDE.md so generated tests match your existing patterns, then iterate by ' +
      'running them and fixing failures.',
    examWords: [
      'create a commit',
      'create a pr',
      'git worktree',
      'separate checkout on its own branch',
      'checked-in project config',
      'testing standards in CLAUDE.md',
    ],
    keyPoints: [
      { id: 'kp-git-workflows-team-config-1', text: 'Claude Code can create git commits and pull requests on request, and git worktrees run parallel sessions as separate checkouts each on its own branch.' },
      { id: 'kp-git-workflows-team-config-2', text: 'Committing a project CLAUDE.md and project settings (.claude/settings.json) standardizes the whole team through version control.' },
      { id: 'kp-git-workflows-team-config-3', text: 'Personal files like CLAUDE.local.md and .claude/settings.local.json stay private and gitignored, so they do not standardize the team.' },
      { id: 'kp-git-workflows-team-config-4', text: 'Documenting testing standards, conventions, and fixtures in CLAUDE.md improves the quality of the tests Claude generates, which you then iterate by running and fixing.' },
    ],
  },
  exercises: [
    {
      id: 'c3-u4-l2-q01',
      type: 'mc',
      domain: 'd3',
      conceptId: 'git-workflows-team-config',
      taskStatement: '3.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'You want every teammate to work under the same Claude Code standards. What is the most direct way to standardize them?',
      options: [
        'Commit a project CLAUDE.md and project settings to version control',
        'Ask each teammate to copy your ~/.claude/CLAUDE.md by hand',
        'Put the standards in your CLAUDE.local.md',
        'Rely on each person configuring their own local settings',
      ],
      answerKey: 0,
      explanation:
        'Checked-in project CLAUDE.md and project settings are shared through version control, so the whole team gets the same ' +
        'standards automatically. The CLAUDE.local.md answer is the trap: it is personal and gitignored, so it never reaches ' +
        'teammates.',
      misconceptionTag: 'checked-in-config-standardizes-team',
      sourceUrls: [MEMORY, SETTINGS],
    },
    {
      id: 'c3-u4-l2-q02',
      type: 'mc',
      domain: 'd3',
      conceptId: 'git-workflows-team-config',
      taskStatement: '3.6',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'You want to run two Claude Code sessions on the same repo at once without their edits colliding. What supports that?',
      options: [
        'Git worktrees, where each session works in a separate checkout on its own branch',
        'Two sessions in the same directory sharing one working tree',
        'Running both in bypassPermissions mode',
        'Committing after every single edit to avoid conflicts',
      ],
      answerKey: 0,
      explanation:
        'Each worktree is a separate checkout on its own branch, so parallel sessions do not collide. Sharing one working tree ' +
        'is the trap: both sessions would edit the same files and step on each other.',
      misconceptionTag: 'worktrees-isolate-parallel',
      sourceUrls: [WORKFLOWS],
    },
    {
      id: 'c3-u4-l2-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd3',
      conceptId: 'git-workflows-team-config',
      taskStatement: '3.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You have a personal sandbox URL you never want committed, plus a team coding standard everyone must follow. Where does each go?',
      options: [
        'The URL in a gitignored CLAUDE.local.md; the standard in the committed project CLAUDE.md',
        'Both in the project CLAUDE.md so nothing is lost',
        'Both in your CLAUDE.local.md to keep them together',
        'The standard in CLAUDE.local.md and the URL in the project CLAUDE.md',
      ],
      answerKey: 0,
      explanation:
        'Personal, uncommitted preferences belong in a gitignored CLAUDE.local.md, and team standards belong in the committed ' +
        'project CLAUDE.md. Putting both in the project file is the trap: your private sandbox URL would then be shared with ' +
        'the whole team.',
      misconceptionTag: 'local-vs-shared-config',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u4-l2-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd3',
      conceptId: 'git-workflows-team-config',
      taskStatement: '3.5',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A team\'s CLAUDE.md just says "write good tests," and Claude\'s generated tests keep missing their conventions. What is the fix?',
      options: [
        'Document concrete testing standards, conventions, and fixtures in CLAUDE.md so generated tests match existing patterns',
        'Stop letting Claude write tests entirely',
        'Move the phrase "write good tests" into a path-scoped rule unchanged',
        'Raise the model tier and keep the vague instruction',
      ],
      answerKey: 0,
      explanation:
        'Concrete testing standards and fixtures in CLAUDE.md let Claude match your existing patterns, unlike a vague "write ' +
        'good tests." Moving the same vague phrase into a rule is the trap: the wording, not the location, is what fails to ' +
        'guide generation.',
      misconceptionTag: 'concrete-test-standards-in-claude-md',
      sourceUrls: [MEMORY, WORKFLOWS],
    },
    {
      id: 'c3-u4-l2-q05',
      type: 'mc',
      domain: 'd3',
      conceptId: 'git-workflows-team-config',
      taskStatement: '3.6',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'What best describes a git worktree used for a parallel Claude Code session?',
      options: [
        'A separate checkout of the repo on its own branch, isolating that session\'s changes',
        'A second copy of CLAUDE.md that overrides the first',
        'A background subagent running in the same working directory',
        'A managed settings file that locks the branch',
      ],
      answerKey: 0,
      explanation:
        'A worktree is a separate checkout on its own branch, which is what keeps concurrent sessions from colliding. ' +
        'The subagent answer is the trap: a subagent isolates context, but a worktree isolates the working tree and branch.',
      misconceptionTag: 'worktrees-isolate-parallel',
      sourceUrls: [WORKFLOWS],
    },
    {
      id: 'c3-u4-l2-q06',
      type: 'multi',
      domain: 'd3',
      conceptId: 'git-workflows-team-config',
      taskStatement: '3.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two files, when committed, help standardize a team\'s Claude Code setup? Select TWO.',
      options: [
        'The project CLAUDE.md',
        'The shared project settings at .claude/settings.json',
        'Your personal CLAUDE.local.md',
        'Your .claude/settings.local.json',
        'Your ~/.claude/CLAUDE.md user file',
      ],
      answerKey: [0, 1],
      explanation:
        'Project CLAUDE.md and shared project settings are committed and reach the whole team. The other three are personal: ' +
        'CLAUDE.local.md and settings.local.json are gitignored, and the ~/.claude user file is private to one machine.',
      misconceptionTag: 'checked-in-config-standardizes-team',
      sourceUrls: [MEMORY, SETTINGS],
    },
    {
      id: 'c3-u4-l2-q07',
      type: 'order',
      domain: 'd3',
      conceptId: 'git-workflows-team-config',
      taskStatement: '3.5',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Order these steps for iteratively getting Claude to write tests that match your project.',
      steps: [
        'Identify the untested code you want covered',
        'Have Claude generate tests that follow your existing test files\' patterns',
        'Add cases for edge conditions the first pass missed',
        'Run the tests and fix any failures',
      ],
      answerKey: [0, 1, 2, 3],
      explanation:
        'You pick the target, generate tests matched to existing patterns, add edge cases, then run and fix. Iterating this ' +
        'way, grounded in your conventions, produces tests that fit the project rather than generic scaffolding.',
      misconceptionTag: 'iterative-test-refinement',
      sourceUrls: [WORKFLOWS],
    },
    {
      id: 'c3-u4-l2-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd3',
      conceptId: 'git-workflows-team-config',
      taskStatement: '3.6',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: you can ask Claude Code to create a git commit and open a pull request for your changes.',
      options: [
        'True, Claude Code can create commits and pull requests on request',
        'False',
      ],
      answerKey: 0,
      explanation:
        'Claude Code can summarize your changes, create a commit, and open a pull request when you ask. When it uses ' +
        'gh pr create, the session is even auto-linked to that PR for later.',
      misconceptionTag: 'claude-creates-commits-prs',
      sourceUrls: [WORKFLOWS],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: your team\'s standards keep drifting between people. Which config should you commit to fix that, and what stays in a personal gitignored file instead?',
    conceptId: 'git-workflows-team-config',
    keyPointIds: [
      'kp-git-workflows-team-config-1',
      'kp-git-workflows-team-config-2',
      'kp-git-workflows-team-config-3',
      'kp-git-workflows-team-config-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
