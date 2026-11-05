// content/src/d3-claude-code-config/c3-u1/l1-claude-md-hierarchy.ts
//
// C3-U1-L1 — CLAUDE.md hierarchy and imports. Task statement 3.1 (user vs project vs directory
// CLAUDE.md; @import; .claude/rules as an alternative; /memory to diagnose what is loaded).
// Every claim verified 2026-07-14 against the cited Claude Code "memory" doc.
//
// Current-docs note (re-verified 2026-09-24, code.claude.com/docs/en/memory): "To check which
// CLAUDE.md and rules files loaded into the current session, run /context"; /memory lists the memory
// file locations and opens them for editing. The exam guide v1.0 (task 3.1) still names /memory for
// that check, so the card keeps the exam framing and states both.
//
// Confusion pair targeted: CLAUDE.md files are CONCATENATED across levels, not overridden the way
// settings are (see C3-U2-L1). The explain-back and spot-bug attack the "more specific overrides"
// mental model.

import { defineLesson } from '../../index';

const MEMORY = 'https://code.claude.com/docs/en/memory';

export const l1ClaudeMdHierarchy = defineLesson({
  id: 'c3-u1-l1',
  title: 'CLAUDE.md hierarchy and imports',
  order: 0,
  concept: {
    conceptId: 'claude-md-hierarchy',
    analogy:
      'CLAUDE.md files are like layers of house rules: the building posts rules in the lobby, you ' +
      'add your own on the fridge, and a roommate tapes a note to one room\'s door. Nobody erases ' +
      'anyone else\'s note; Claude reads them all, top of the building down to the room you are in.',
    plainExplanation:
      'CLAUDE.md files give Claude persistent instructions, and they can live at several scopes: ' +
      'managed policy (org-wide), user (~/.claude/CLAUDE.md, personal, not shared through version ' +
      'control), and project (./CLAUDE.md or ./.claude/CLAUDE.md, shared with the team). All ' +
      'discovered files are concatenated into context in load order, from broadest scope down to ' +
      'your working directory, rather than overriding each other. Use @path imports to pull in other ' +
      'files. To verify which files loaded, the exam guide names /memory; current Claude Code docs say ' +
      '/context shows what loaded this session, while /memory lists and opens the files.',
    examWords: [
      'CLAUDE.md',
      'managed policy',
      'user memory',
      'project memory',
      '@path import',
      'concatenated',
      '/memory',
      '/context',
    ],
    snippet: {
      language: 'markdown',
      code: 'See @README for the project overview and @docs/git-instructions.md for the git workflow.',
    },
    keyPoints: [
      { id: 'kp-claude-md-hierarchy-1', text: 'CLAUDE.md can live at managed-policy, user (~/.claude/CLAUDE.md), and project (./CLAUDE.md) scopes, loaded broadest first down to your working directory.' },
      { id: 'kp-claude-md-hierarchy-2', text: 'User CLAUDE.md is personal and not shared through version control; project CLAUDE.md is committed and shared with the team.' },
      { id: 'kp-claude-md-hierarchy-3', text: 'Discovered CLAUDE.md files are concatenated into context, not overridden, so an instruction closer to your working directory is read last but does not erase the others.' },
      { id: 'kp-claude-md-hierarchy-4', text: 'The @path syntax imports other files (recursively, up to four hops); to verify which memory files loaded, the exam guide names /memory and current Claude Code docs say /context.' },
    ],
  },
  exercises: [
    {
      id: 'c3-u1-l1-q01',
      type: 'mc',
      domain: 'd3',
      conceptId: 'claude-md-hierarchy',
      taskStatement: '3.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'You want a coding-standards instruction to apply to every teammate who clones this repo. Where should it go?',
      options: [
        'The project CLAUDE.md (./CLAUDE.md or ./.claude/CLAUDE.md), committed to version control',
        'Your user CLAUDE.md at ~/.claude/CLAUDE.md',
        'A CLAUDE.local.md that is added to .gitignore',
        'A one-off message typed into the current session',
      ],
      answerKey: 0,
      explanation:
        'Project CLAUDE.md is shared with the team through source control, so it reaches everyone who clones the repo. ' +
        'The user CLAUDE.md is the trap: it is personal and never shared through version control, so teammates would ' +
        'never see the rule.',
      misconceptionTag: 'claude-md-user-vs-project',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u1-l1-q02',
      type: 'mc',
      domain: 'd3',
      conceptId: 'claude-md-hierarchy',
      taskStatement: '3.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'A teammate says "when a project CLAUDE.md and my user CLAUDE.md both have instructions, the project one replaces mine." What is the correction?',
      options: [
        'Both files are concatenated into context; neither replaces the other, though the project file is read after the user file',
        'The teammate is right: the more specific project file overrides the user file',
        'Only one CLAUDE.md is ever loaded, whichever is closest to the working directory',
        'User instructions always win because they load last',
      ],
      answerKey: 0,
      explanation:
        'Discovered CLAUDE.md files are concatenated in load order from broadest scope down, so both stay in context. ' +
        'The "project overrides user" answer borrows the override behavior of settings files, but CLAUDE.md instructions ' +
        'stack rather than replace.',
      misconceptionTag: 'claude-md-concatenate-vs-override',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u1-l1-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd3',
      conceptId: 'claude-md-hierarchy',
      taskStatement: '3.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You keep personal shortcuts you want in every project on your machine, but never committed to any repo. Where do they belong?',
      options: [
        'Your user CLAUDE.md at ~/.claude/CLAUDE.md',
        'The project CLAUDE.md at ./.claude/CLAUDE.md',
        'A managed-policy CLAUDE.md deployed by your organization',
        'A path-scoped rule under the repo\'s .claude/rules/',
      ],
      answerKey: 0,
      explanation:
        'User CLAUDE.md applies across all your projects and stays private to you, which fits personal shortcuts exactly. ' +
        'The project CLAUDE.md is the tempting distractor, but it is committed and shared, so it would leak your shortcuts ' +
        'to the whole team.',
      misconceptionTag: 'claude-md-user-vs-project',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u1-l1-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd3',
      conceptId: 'claude-md-hierarchy',
      taskStatement: '3.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An engineer expects a subdirectory CLAUDE.md deep inside the repo to load automatically at launch, but it never appears in context until later. What did they miss?',
      options: [
        'Only CLAUDE.md files in the directory hierarchy above the working directory load at launch; subdirectory files load on demand when Claude reads files there',
        'Subdirectory CLAUDE.md files are never loaded at all',
        'CLAUDE.md must be named CLAUDE.local.md to load in subdirectories',
        'A subdirectory CLAUDE.md overrides the root file, so the root one was used instead',
      ],
      answerKey: 0,
      explanation:
        'Files above the working directory load in full at launch, while files in subdirectories load on demand when Claude ' +
        'reads files in those directories. The "never loaded" answer is the trap: they do load, just lazily rather than at ' +
        'startup.',
      misconceptionTag: 'claude-md-subdir-load-timing',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u1-l1-q05',
      type: 'mc',
      domain: 'd3',
      conceptId: 'claude-md-hierarchy',
      taskStatement: '3.1',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'Your CLAUDE.md is growing long. You want to keep it organized by referencing other files with @path imports. What is the tradeoff to remember?',
      options: [
        'Imported files are expanded and loaded into context at launch, so imports help organization but do not reduce context usage',
        'Imported files load only when Claude reads a matching file, so imports cut startup context',
        'Imports are limited to a single file with no nesting allowed',
        'Imported files replace the CLAUDE.md that references them',
      ],
      answerKey: 0,
      explanation:
        'Imports pull other files into context at launch (recursively, up to four hops), so they aid structure but still ' +
        'spend the same tokens. The "cut startup context" answer describes path-scoped rules instead, which is a different ' +
        'mechanism.',
      misconceptionTag: 'imports-vs-path-rules',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u1-l1-q06',
      type: 'multi',
      domain: 'd3',
      conceptId: 'claude-md-hierarchy',
      taskStatement: '3.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'A new hire asks how instructions from managed-policy, user, and project CLAUDE.md files combine. Which two of your answers are accurate? Select TWO.',
      options: [
        'A managed-policy CLAUDE.md applies org-wide and cannot be excluded by individual settings',
        'User CLAUDE.md lives at ~/.claude/CLAUDE.md and is not shared through version control',
        'Project CLAUDE.md is private to each developer and never committed',
        'Only the single most-specific CLAUDE.md is loaded per session',
        'CLAUDE.md files override one another so lower levels are discarded',
      ],
      answerKey: [0, 1],
      explanation:
        'Managed-policy CLAUDE.md is org-wide and cannot be excluded, and user CLAUDE.md is personal and unshared. ' +
        'The remaining options invert reality: project CLAUDE.md is committed and shared, and all discovered files are ' +
        'concatenated rather than overriding each other.',
      misconceptionTag: 'claude-md-concatenate-vs-override',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u1-l1-q07',
      type: 'cloze',
      domain: 'd3',
      conceptId: 'claude-md-hierarchy',
      taskStatement: '3.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: a ___ CLAUDE.md is shared with the team through version control, while a ___ CLAUDE.md at ~/.claude/CLAUDE.md stays personal to you.',
      blanks: [
        { options: ['project', 'managed-policy', 'directory'] },
        { options: ['user', 'project', 'local'] },
      ],
      answerKey: [0, 0],
      explanation:
        'Project CLAUDE.md is committed and shared with the team, and user CLAUDE.md is personal and not shared through ' +
        'version control. Managed-policy is org-wide rather than team-committed, and "local" refers to per-project personal ' +
        'files, not the ~/.claude path.',
      misconceptionTag: 'claude-md-user-vs-project',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u1-l1-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd3',
      conceptId: 'claude-md-hierarchy',
      taskStatement: '3.1',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: when both a user and a project CLAUDE.md exist, only one of them is loaded.',
      options: [
        'False, both are concatenated into context in load order',
        'True',
      ],
      answerKey: 0,
      explanation:
        'CLAUDE.md files are concatenated, not chosen between, so both the user and project files load. The broadest scope ' +
        'is read first and the file closest to your working directory is read last.',
      misconceptionTag: 'claude-md-concatenate-vs-override',
      sourceUrls: [MEMORY],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: you have a user CLAUDE.md and a project CLAUDE.md with different instructions. Are they combined or does one replace the other, and where does each one belong?',
    conceptId: 'claude-md-hierarchy',
    keyPointIds: [
      'kp-claude-md-hierarchy-1',
      'kp-claude-md-hierarchy-2',
      'kp-claude-md-hierarchy-3',
      'kp-claude-md-hierarchy-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
