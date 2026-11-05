// content/src/d3-claude-code-config/c3-u3/l1-hooks.ts
//
// C3-U3-L1 — Hooks: events and exit-code semantics. Task statement 3.2 (extending Claude Code with
// configured automation). Verified 2026-07-14 against the cited Claude Code "hooks" doc.
//
// Confusion pair targeted: hooks are deterministic (a PreToolUse hook exiting 2 blocks the tool
// call) versus CLAUDE.md instructions which only shape behavior probabilistically. Also exit-code
// semantics: 0 success, 2 blocking (stderr to Claude), other non-zero non-blocking.

import { defineLesson } from '../../index';

const HOOKS = 'https://code.claude.com/docs/en/hooks';
const MEMORY = 'https://code.claude.com/docs/en/memory';

export const l1Hooks = defineLesson({
  id: 'c3-u3-l1',
  title: 'Hooks and exit-code semantics',
  order: 0,
  concept: {
    conceptId: 'claude-code-hooks',
    analogy:
      'A hook is a turnstile wired to a fixed lifecycle event: when a tool call tries to pass, the ' +
      'turnstile runs your script and can physically block it. That is different from CLAUDE.md, which ' +
      'is more like a posted sign asking people to behave a certain way but never locking the gate.',
    plainExplanation:
      'Hooks are shell commands Claude Code runs at fixed lifecycle events such as PreToolUse (before ' +
      'a tool runs), PostToolUse (after it succeeds), UserPromptSubmit, and Stop. Their power is ' +
      'deterministic control through exit codes: exit 0 is success, exit 2 is a blocking error whose ' +
      'stderr is fed back to Claude (for PreToolUse this blocks the tool call), and any other non-zero ' +
      'code is a non-blocking error. Because hooks enforce regardless of what Claude decides, use a ' +
      'PreToolUse hook when you must block an action every time, rather than trusting a CLAUDE.md ' +
      'instruction.',
    examWords: [
      'PreToolUse',
      'PostToolUse',
      'exit code 0',
      'exit code 2 (blocking)',
      'stderr fed back to Claude',
      'deterministic enforcement',
    ],
    keyPoints: [
      { id: 'kp-claude-code-hooks-1', text: 'Hooks run at fixed lifecycle events such as PreToolUse, PostToolUse, UserPromptSubmit, and Stop.' },
      { id: 'kp-claude-code-hooks-2', text: 'Exit code 0 is success; exit code 2 is a blocking error whose stderr is fed back to Claude; any other non-zero code is a non-blocking error.' },
      { id: 'kp-claude-code-hooks-3', text: 'A PreToolUse hook that exits 2 blocks the tool call before it runs.' },
      { id: 'kp-claude-code-hooks-4', text: 'Hooks enforce deterministically regardless of what Claude decides, so use one when an action must be blocked every time, unlike a probabilistic CLAUDE.md instruction.' },
    ],
  },
  exercises: [
    {
      id: 'c3-u3-l1-q01',
      type: 'mc',
      domain: 'd3',
      conceptId: 'claude-code-hooks',
      taskStatement: '3.2',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'Which hook event fires before a tool call runs and can stop it?',
      options: [
        'PreToolUse',
        'PostToolUse',
        'Stop',
        'SessionEnd',
      ],
      answerKey: 0,
      explanation:
        'PreToolUse runs before the tool executes and can block it. PostToolUse is the trap: it fires after the tool has ' +
        'already succeeded, too late to prevent the call.',
      misconceptionTag: 'pretooluse-blocks',
      sourceUrls: [HOOKS],
    },
    {
      id: 'c3-u3-l1-q02',
      type: 'mc',
      domain: 'd3',
      conceptId: 'claude-code-hooks',
      taskStatement: '3.2',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'What does a hook communicate by exiting with code 2?',
      options: [
        'A blocking error, and its stderr text is fed back to Claude',
        'Ordinary success, with stdout shown to the user',
        'A silent no-op that Claude never sees',
        'A request to restart the session',
      ],
      answerKey: 0,
      explanation:
        'Exit code 2 signals a blocking error and Claude Code feeds the hook\'s stderr back to Claude as the message. ' +
        'The "ordinary success" answer describes exit code 0, which is the opposite outcome.',
      misconceptionTag: 'exit-2-blocking',
      sourceUrls: [HOOKS],
    },
    {
      id: 'c3-u3-l1-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd3',
      conceptId: 'claude-code-hooks',
      taskStatement: '3.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Your team must guarantee that edits to a protected config file are blocked every time, not just usually. What should you use?',
      options: [
        'A PreToolUse hook that inspects the tool input and exits 2 to block matching edits',
        'A firmly worded rule in CLAUDE.md telling Claude never to edit the file',
        'A PostToolUse hook that reverts the edit afterward',
        'A note in the session asking Claude to avoid the file',
      ],
      answerKey: 0,
      explanation:
        'A PreToolUse hook enforces deterministically, blocking the call before it happens regardless of what Claude decides. ' +
        'The CLAUDE.md answer is the trap: it only shapes behavior probabilistically and cannot guarantee the block.',
      misconceptionTag: 'hook-deterministic-vs-claude-md',
      sourceUrls: [HOOKS, MEMORY],
    },
    {
      id: 'c3-u3-l1-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd3',
      conceptId: 'claude-code-hooks',
      taskStatement: '3.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An engineer tries to prevent a risky command by having a PostToolUse hook exit 2. The command still runs. Why?',
      options: [
        'PostToolUse fires after the tool has already succeeded, so blocking there is too late; use PreToolUse to block before execution',
        'Exit code 2 never blocks anything under any event',
        'Hooks cannot inspect tool inputs, so the match failed',
        'The hook needed to exit 0 to block the command',
      ],
      answerKey: 0,
      explanation:
        'A blocking decision has to come from PreToolUse, which runs before the tool; PostToolUse only fires after success. ' +
        'The "exit 2 never blocks" answer is the trap, since exit 2 does block, but only on events like PreToolUse.',
      misconceptionTag: 'pretooluse-blocks',
      sourceUrls: [HOOKS],
    },
    {
      id: 'c3-u3-l1-q05',
      type: 'mc',
      domain: 'd3',
      conceptId: 'claude-code-hooks',
      taskStatement: '3.2',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'A hook exits with code 1 (neither 0 nor 2). How does Claude Code treat it?',
      options: [
        'As a non-blocking error that shows a notice but does not stop the action',
        'As a blocking error identical to exit code 2',
        'As success identical to exit code 0',
        'As a request to compact the conversation',
      ],
      answerKey: 0,
      explanation:
        'Any non-zero code other than 2 is a non-blocking error: it surfaces a notice but does not stop the action. ' +
        'Treating it like exit 2 is the trap, since only exit 2 carries the blocking, stderr-fed-back behavior.',
      misconceptionTag: 'other-nonzero-nonblocking',
      sourceUrls: [HOOKS],
    },
    {
      id: 'c3-u3-l1-q06',
      type: 'multi',
      domain: 'd3',
      conceptId: 'claude-code-hooks',
      taskStatement: '3.2',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'You are reviewing a teammate\'s PreToolUse hook and its exit codes. Which two review notes are accurate? Select TWO.',
      options: [
        'A PreToolUse hook that exits 2 blocks the tool call before it runs',
        'Hooks enforce deterministically regardless of what Claude decides',
        'Exit code 0 always blocks the pending tool call',
        'CLAUDE.md instructions block actions as reliably as a hook',
        'Hooks only run once, at session end',
      ],
      answerKey: [0, 1],
      explanation:
        'A PreToolUse exit-2 blocks before execution, and hooks enforce deterministically. The false options invert reality: ' +
        'exit 0 is success not a block, CLAUDE.md is probabilistic, and hooks fire at many lifecycle events, not only at exit.',
      misconceptionTag: 'hook-deterministic-vs-claude-md',
      sourceUrls: [HOOKS],
    },
    {
      id: 'c3-u3-l1-q07',
      type: 'cloze',
      domain: 'd3',
      conceptId: 'claude-code-hooks',
      taskStatement: '3.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: a hook exit code of ___ is success, while an exit code of ___ is a blocking error whose stderr is fed back to Claude.',
      blanks: [
        { options: ['0', '2', '1'] },
        { options: ['2', '0', '1'] },
      ],
      answerKey: [0, 0],
      explanation:
        'Exit 0 is success and exit 2 is the blocking error that feeds stderr back to Claude. Exit 1 (or any other non-zero) ' +
        'is a non-blocking error, so it is not the blocking code.',
      misconceptionTag: 'exit-2-blocking',
      sourceUrls: [HOOKS],
    },
    {
      id: 'c3-u3-l1-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd3',
      conceptId: 'claude-code-hooks',
      taskStatement: '3.2',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: a CLAUDE.md instruction blocks a tool call as reliably as a PreToolUse hook that exits 2.',
      options: [
        'False, CLAUDE.md only shapes behavior; a PreToolUse hook enforces the block deterministically',
        'True',
      ],
      answerKey: 0,
      explanation:
        'CLAUDE.md content is context that guides Claude but cannot guarantee an action is blocked. A PreToolUse hook exiting 2 ' +
        'is the deterministic enforcement layer.',
      misconceptionTag: 'hook-deterministic-vs-claude-md',
      sourceUrls: [HOOKS, MEMORY],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: you must guarantee a certain edit is blocked every time. Why is a PreToolUse hook the right tool instead of a CLAUDE.md rule, and what does exiting 2 do?',
    conceptId: 'claude-code-hooks',
    keyPointIds: [
      'kp-claude-code-hooks-1',
      'kp-claude-code-hooks-2',
      'kp-claude-code-hooks-3',
      'kp-claude-code-hooks-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
