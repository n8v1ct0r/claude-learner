// content/src/d3-claude-code-config/c3-u2/l3-plan-mode.ts
//
// C3-U2-L3 — Plan mode vs direct execution. Task statement 3.4 (plan mode for large-scale/
// architectural/multi-approach/multi-file work; direct execution for well-scoped changes; the Plan
// subagent isolates verbose discovery). Verified 2026-07-14 against the cited "permission-modes",
// "common-workflows", and "sub-agents" docs.
//
// Confusion pair targeted: plan mode (research-then-approve, no edits) vs jumping straight to
// editing on a large multi-file change. The explain-back and spot-bug attack "just start editing".

import { defineLesson } from '../../index';

const MODES = 'https://code.claude.com/docs/en/permission-modes';
const WORKFLOWS = 'https://code.claude.com/docs/en/common-workflows';
const SUBAGENTS = 'https://code.claude.com/docs/en/sub-agents';

export const l3PlanMode = defineLesson({
  id: 'c3-u2-l3',
  title: 'Plan mode vs direct execution',
  order: 2,
  concept: {
    conceptId: 'plan-mode',
    analogy:
      'Plan mode is scouting a hiking route before you set foot on the trail: you study the map, mark ' +
      'the turns, and only start walking once the route is agreed. For a short, obvious stroll you skip ' +
      'the scouting and just go, which is direct execution.',
    plainExplanation:
      'Plan mode tells Claude to research and propose changes without making them: it reads files and ' +
      'runs read-only commands to explore, then presents a plan and asks how to proceed, and no source ' +
      'edits happen until you approve. Enter it with Shift+Tab or by starting with --permission-mode ' +
      'plan. Reach for plan mode on large-scale, architectural, multi-approach, or multi-file work and ' +
      'in unfamiliar code, and use direct execution for well-scoped, clearly understood changes. The ' +
      'built-in Plan subagent gathers context in its own window and skips CLAUDE.md and git status to ' +
      'stay fast.',
    examWords: [
      'plan mode',
      'read-only exploration',
      'approve the plan',
      'Shift+Tab',
      'direct execution',
      'Plan subagent',
    ],
    keyPoints: [
      { id: 'kp-plan-mode-1', text: 'Plan mode has Claude research and propose changes without editing source; no edits happen until you approve the plan.' },
      { id: 'kp-plan-mode-2', text: 'Enter plan mode with Shift+Tab or --permission-mode plan; approving a plan exits plan mode and starts editing.' },
      { id: 'kp-plan-mode-3', text: 'Use plan mode for large-scale, architectural, multi-approach, or multi-file work and unfamiliar code; use direct execution for well-scoped, clear changes.' },
      { id: 'kp-plan-mode-4', text: 'The built-in Plan subagent researches in its own context window and skips CLAUDE.md and git status to keep exploration cheap.' },
    ],
  },
  exercises: [
    {
      id: 'c3-u2-l3-q01',
      type: 'mc',
      domain: 'd3',
      conceptId: 'plan-mode',
      taskStatement: '3.4',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'What does plan mode do while it is active?',
      options: [
        'Reads files and proposes a plan without editing source until you approve',
        'Applies edits immediately but logs them for review',
        'Runs only the tests and nothing else',
        'Prompts for approval before every single file read',
      ],
      answerKey: 0,
      explanation:
        'Plan mode researches and proposes but makes no source edits until you approve the plan. The "applies edits ' +
        'immediately" answer describes acceptEdits, which is the opposite of plan mode.',
      misconceptionTag: 'plan-no-edits',
      sourceUrls: [MODES],
    },
    {
      id: 'c3-u2-l3-q02',
      type: 'mc',
      domain: 'd3',
      conceptId: 'plan-mode',
      taskStatement: '3.4',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'A teammate thinks approving a plan keeps the session in plan mode so Claude still cannot edit. What is the correction?',
      options: [
        'Approving a plan exits plan mode and switches the session to an editing mode so Claude starts making changes',
        'They are right; edits still require leaving plan mode manually afterward',
        'Approving a plan deletes the plan and starts over',
        'Plans can never be approved, only refined',
      ],
      answerKey: 0,
      explanation:
        'Approving a plan exits plan mode and moves the session into an editing mode, so Claude begins the changes. ' +
        'The "still cannot edit" answer misses that approval is exactly the handoff from planning to doing.',
      misconceptionTag: 'approve-exits-plan',
      sourceUrls: [MODES],
    },
    {
      id: 'c3-u2-l3-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd3',
      conceptId: 'plan-mode',
      taskStatement: '3.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You need a broad refactor that touches many files across an unfamiliar service, with a few possible approaches. Which way of working fits best?',
      options: [
        'Plan mode, to research and agree on an approach before any file is edited',
        'Direct execution, editing files immediately to move fast',
        'bypassPermissions, so nothing interrupts the refactor',
        'acceptEdits from the first message, approving edits by diff later',
      ],
      answerKey: 0,
      explanation:
        'Large, multi-file, multi-approach work in unfamiliar code is exactly where plan mode earns its keep: you commit to a ' +
        'route before touching disk. Jumping to direct execution is the trap, since a wrong approach could scatter changes ' +
        'across many files before you notice.',
      misconceptionTag: 'plan-for-large-multifile',
      sourceUrls: [MODES, WORKFLOWS],
    },
    {
      id: 'c3-u2-l3-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd3',
      conceptId: 'plan-mode',
      taskStatement: '3.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'For a one-line, well-understood typo fix, a developer insists on a full plan-mode cycle with research and approval every time. What is the inefficiency?',
      options: [
        'Plan mode suits large or unfamiliar work; a well-scoped, clear change is faster with direct execution',
        'Plan mode cannot handle single-line changes at all',
        'Direct execution is never safe, so the overhead is required',
        'The typo fix should be done in bypassPermissions to skip planning',
      ],
      answerKey: 0,
      explanation:
        'Direct execution is the right tool for well-scoped, clearly understood changes; a plan-mode cycle adds research and ' +
        'approval overhead a one-line fix does not need. The "never safe" answer overstates direct execution, which the docs ' +
        'recommend precisely for clear changes.',
      misconceptionTag: 'direct-for-well-scoped',
      sourceUrls: [MODES],
    },
    {
      id: 'c3-u2-l3-q05',
      type: 'mc',
      domain: 'd3',
      conceptId: 'plan-mode',
      taskStatement: '3.4',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'During plan mode, how does Claude Code keep verbose codebase research out of your main context?',
      options: [
        'It delegates research to the built-in Plan subagent, which works in its own context window',
        'It disables all file reads until the plan is approved',
        'It stores research in CLAUDE.md automatically',
        'It compacts the main conversation after every file read',
      ],
      answerKey: 0,
      explanation:
        'The Plan subagent gathers context in a separate window (skipping CLAUDE.md and git status to stay cheap), so ' +
        'exploration output does not flood the main conversation. Disabling file reads would defeat the research plan mode ' +
        'depends on.',
      misconceptionTag: 'plan-subagent-isolation',
      sourceUrls: [SUBAGENTS, MODES],
    },
    {
      id: 'c3-u2-l3-q06',
      type: 'multi',
      domain: 'd3',
      conceptId: 'plan-mode',
      taskStatement: '3.4',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two situations most favor plan mode over direct execution? Select TWO.',
      options: [
        'A multi-file architectural change in an unfamiliar codebase',
        'Work where several possible approaches need to be weighed before editing',
        'A quick, well-scoped rename you fully understand',
        'A one-line fix to correct an obvious typo',
        'Any change at all, since direct execution is unsafe',
      ],
      answerKey: [0, 1],
      explanation:
        'Large, unfamiliar, multi-approach work is where planning first pays off. The well-scoped rename and one-line typo fit ' +
        'direct execution, and the "any change at all" option overstates plan mode into a blanket rule.',
      misconceptionTag: 'plan-for-large-multifile',
      sourceUrls: [MODES, WORKFLOWS],
    },
    {
      id: 'c3-u2-l3-q07',
      type: 'multi',
      domain: 'd3',
      conceptId: 'plan-mode',
      taskStatement: '3.4',
      difficulty: 3,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'You are walking a teammate through starting and finishing a plan-mode session. Which two of your points are correct? Select TWO.',
      options: [
        'You can enter plan mode by pressing Shift+Tab or by starting with --permission-mode plan',
        'Approving the presented plan exits plan mode so editing can begin',
        'Plan mode edits source files as soon as it finishes researching',
        'The only way into plan mode is to delete your settings file',
        'Once in plan mode, a session can never leave it',
      ],
      answerKey: [0, 1],
      explanation:
        'Shift+Tab or the --permission-mode plan flag enters plan mode, and approving a plan exits it into an editing mode. ' +
        'The false options contradict the read-only nature of plan mode and its normal approval-based exit.',
      misconceptionTag: 'approve-exits-plan',
      sourceUrls: [MODES],
    },
    {
      id: 'c3-u2-l3-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd3',
      conceptId: 'plan-mode',
      taskStatement: '3.4',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: plan mode is the best choice for a tiny, well-understood one-line change.',
      options: [
        'False, direct execution fits well-scoped clear changes; plan mode is for large or unfamiliar work',
        'True',
      ],
      answerKey: 0,
      explanation:
        'A tiny, clear change is faster with direct execution. Plan mode adds research and approval overhead that pays off on ' +
        'large, architectural, or unfamiliar work, not a one-liner.',
      misconceptionTag: 'direct-for-well-scoped',
      sourceUrls: [MODES],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: you are about to make a big multi-file change in code you barely know. Would you use plan mode or direct execution, and what does approving the plan do?',
    conceptId: 'plan-mode',
    keyPointIds: [
      'kp-plan-mode-1',
      'kp-plan-mode-2',
      'kp-plan-mode-3',
      'kp-plan-mode-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
