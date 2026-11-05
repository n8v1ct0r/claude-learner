// content/src/d3-claude-code-config/c3-u2/l2-permission-modes.ts
//
// C3-U2-L2 — Permission modes and the deny/ask/allow order. Task statement 3.4 (permission modes
// governing execution). Verified 2026-07-14 against the cited Claude Code "permission-modes" and
// "permissions" docs.
//
// Confusion pair targeted: acceptEdits (auto-approves edits) vs plan (read-only, no edits) vs
// bypassPermissions (skips prompts, isolated containers only). Rule order deny -> ask -> allow.
// Copy deliberately avoids the banned no-shame substrings (GC-13); bypass is described as skipping
// permission checks.

import { defineLesson } from '../../index';

const MODES = 'https://code.claude.com/docs/en/permission-modes';
const PERMISSIONS = 'https://code.claude.com/docs/en/permissions';

export const l2PermissionModes = defineLesson({
  id: 'c3-u2-l2',
  title: 'Permission modes',
  order: 1,
  concept: {
    conceptId: 'permission-modes',
    analogy:
      'Permission modes are how tightly you hold the leash. Manual asks before each step, acceptEdits ' +
      'lets Claude write files on its own, plan mode keeps it on a look-but-do-not-touch walk, and ' +
      'bypassPermissions drops the leash entirely, which you only do in a fenced yard like a container.',
    plainExplanation:
      'Permission modes set the baseline for how often Claude Code pauses to ask. default (Manual) ' +
      'prompts on first use of each tool; acceptEdits auto-approves file edits and common filesystem ' +
      'commands in your working directory; plan reads only and makes no edits; bypassPermissions skips ' +
      'permission prompts and is meant only for isolated containers or virtual machines. On top of the ' +
      'mode, individual permission rules are evaluated in the fixed order deny, then ask, then allow: ' +
      'the first match wins, so a deny beats an allow regardless of how specific the allow is.',
    examWords: [
      'default (Manual)',
      'acceptEdits',
      'plan',
      'bypassPermissions',
      'deny then ask then allow',
      'Shift+Tab',
    ],
    keyPoints: [
      { id: 'kp-permission-modes-1', text: 'default (Manual) prompts on first use of each tool; acceptEdits auto-approves file edits and common filesystem commands in the working directory.' },
      { id: 'kp-permission-modes-2', text: 'plan mode reads only and makes no edits to source files; bypassPermissions skips permission prompts and is for isolated containers or VMs only.' },
      { id: 'kp-permission-modes-3', text: 'Permission rules are evaluated deny, then ask, then allow, and the first match wins.' },
      { id: 'kp-permission-modes-4', text: 'A deny rule beats a matching allow rule regardless of specificity, and explicit ask rules still prompt even under bypassPermissions.' },
    ],
  },
  exercises: [
    {
      id: 'c3-u2-l2-q01',
      type: 'mc',
      domain: 'd3',
      conceptId: 'permission-modes',
      taskStatement: '3.4',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'You want Claude to write and edit files without prompting on each change, while you review with git diff afterward. Which mode fits?',
      options: [
        'acceptEdits',
        'plan',
        'default (Manual)',
        'dontAsk',
      ],
      answerKey: 0,
      explanation:
        'acceptEdits auto-approves file edits and common filesystem commands in your working directory, which is exactly the ' +
        'review-after-the-fact flow. plan mode is the trap: it is read-only and would make no edits at all.',
      misconceptionTag: 'acceptedits-vs-plan',
      sourceUrls: [MODES],
    },
    {
      id: 'c3-u2-l2-q02',
      type: 'mc',
      domain: 'd3',
      conceptId: 'permission-modes',
      taskStatement: '3.4',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'In what order are permission rules evaluated when several could match a tool call?',
      options: [
        'Deny first, then ask, then allow, with the first match deciding',
        'Allow first, then ask, then deny',
        'Whichever rule is most specific wins regardless of type',
        'The rule from the highest settings scope always wins',
      ],
      answerKey: 0,
      explanation:
        'Rules are evaluated deny, then ask, then allow, and the first match in that order decides. The "most specific wins" ' +
        'answer is the trap: specificity does not change the order, so a broad deny still beats a narrow allow.',
      misconceptionTag: 'deny-ask-allow-order',
      sourceUrls: [PERMISSIONS],
    },
    {
      id: 'c3-u2-l2-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd3',
      conceptId: 'permission-modes',
      taskStatement: '3.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You are about to explore an unfamiliar codebase and want Claude to research and propose changes without touching any source files yet. Which mode is correct?',
      options: [
        'plan mode, which reads only and makes no edits until you approve',
        'acceptEdits, so changes are applied quickly',
        'bypassPermissions, to avoid all prompts',
        'default (Manual), approving each edit as it comes',
      ],
      answerKey: 0,
      explanation:
        'plan mode lets Claude read and propose without editing source, which is exactly right for safe exploration first. ' +
        'acceptEdits is the trap: it would start writing files, the opposite of look-before-you-touch.',
      misconceptionTag: 'plan-read-only',
      sourceUrls: [MODES],
    },
    {
      id: 'c3-u2-l2-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd3',
      conceptId: 'permission-modes',
      taskStatement: '3.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A developer adds an allow rule for a specific command, but it still prompts because a broad deny rule also matches it. They expected the more specific allow to win. What is the rule?',
      options: [
        'Deny is evaluated before allow, and specificity does not change the order, so the deny blocks the call',
        'The more specific rule always wins, so this must be a bug in Claude Code',
        'Allow rules only work in acceptEdits mode',
        'The allow rule must be duplicated in three files to take effect',
      ],
      answerKey: 0,
      explanation:
        'The fixed order is deny, then ask, then allow, and specificity does not reorder it, so a matching deny wins over any ' +
        'allow. The "most specific wins" expectation is the exact misconception this behavior corrects.',
      misconceptionTag: 'deny-ask-allow-order',
      sourceUrls: [PERMISSIONS],
    },
    {
      id: 'c3-u2-l2-q05',
      type: 'mc',
      domain: 'd3',
      conceptId: 'permission-modes',
      taskStatement: '3.4',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'For which situation is bypassPermissions mode intended?',
      options: [
        'Isolated environments like containers or VMs, where Claude Code cannot harm your host',
        'Everyday work on your primary development machine',
        'Any time you want slightly fewer prompts than Manual mode',
        'Running Claude Code as root on a shared server',
      ],
      answerKey: 0,
      explanation:
        'bypassPermissions skips permission prompts and is meant only for isolated containers or VMs. Using it on your primary ' +
        'machine is the trap: it removes the checks that protect your host, which is why the docs restrict it to sandboxes.',
      misconceptionTag: 'bypass-isolated-only',
      sourceUrls: [MODES],
    },
    {
      id: 'c3-u2-l2-q06',
      type: 'multi',
      domain: 'd3',
      conceptId: 'permission-modes',
      taskStatement: '3.4',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'You are labeling the acceptEdits and plan modes on a quick-reference card. Which two descriptions are accurate? Select TWO.',
      options: [
        'plan mode reads only and does not edit source files',
        'acceptEdits auto-approves file edits and common filesystem commands in the working directory',
        'default (Manual) mode skips all permission prompts',
        'bypassPermissions is the recommended mode for everyday host machine use',
        'plan mode auto-applies edits once a plan is written',
      ],
      answerKey: [0, 1],
      explanation:
        'plan mode is read-only and acceptEdits auto-approves edits and common filesystem commands. The false options invert ' +
        'the modes: Manual prompts rather than skips, bypass is for sandboxes only, and plan never auto-applies edits.',
      misconceptionTag: 'acceptedits-vs-plan',
      sourceUrls: [MODES],
    },
    {
      id: 'c3-u2-l2-q07',
      type: 'cloze',
      domain: 'd3',
      conceptId: 'permission-modes',
      taskStatement: '3.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: permission rules are evaluated in the order ___, then ask, then ___, and the first match wins.',
      blanks: [
        { options: ['deny', 'allow', 'ask'] },
        { options: ['allow', 'deny', 'prompt'] },
      ],
      answerKey: [0, 0],
      explanation:
        'The fixed order is deny, then ask, then allow. Putting allow first would let a narrow allow slip past a broad deny, ' +
        'which is exactly what the deny-first order prevents.',
      misconceptionTag: 'deny-ask-allow-order',
      sourceUrls: [PERMISSIONS],
    },
    {
      id: 'c3-u2-l2-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd3',
      conceptId: 'permission-modes',
      taskStatement: '3.4',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: plan mode lets Claude edit your source files as long as it writes a plan first.',
      options: [
        'False, plan mode reads only and makes no edits until you approve',
        'True',
      ],
      answerKey: 0,
      explanation:
        'plan mode is read-only: Claude explores and proposes but does not touch source files. Edits begin only after you ' +
        'approve the plan and the session switches out of plan mode.',
      misconceptionTag: 'plan-read-only',
      sourceUrls: [MODES],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: you want Claude to edit files without asking each time, but never to run a command you explicitly denied. Which mode picks that up, and why does the deny still hold?',
    conceptId: 'permission-modes',
    keyPointIds: [
      'kp-permission-modes-1',
      'kp-permission-modes-2',
      'kp-permission-modes-3',
      'kp-permission-modes-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
