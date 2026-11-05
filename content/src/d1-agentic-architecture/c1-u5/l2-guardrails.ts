// content/src/d1-agentic-architecture/c1-u5/l2-guardrails.ts
//
// C1-U5-L2 — Guardrails (permission modes, canUseTool HITL, deny rules / PreToolUse hooks). Task
// statements 1.5 (Agent SDK hooks give deterministic guarantees; prompts are probabilistic) and
// 1.4 (programmatic enforcement / human approval gates). Claims trace to the Agent SDK "Configure
// permissions" docs (verified 2026-07-14 against the cited page):
//   PERM — default/acceptEdits/plan/bypassPermissions modes; canUseTool callback; deny rules and
//          PreToolUse hooks block even in bypassPermissions.

import { defineLesson } from '../../index';

const PERM = 'https://code.claude.com/docs/en/agent-sdk/permissions';

export const l2Guardrails = defineLesson({
  id: 'c1-u5-l2',
  title: 'Guardrails and permission modes',
  order: 1,
  concept: {
    conceptId: 'agent-guardrails',
    analogy:
      'Guardrails are the safety systems on a factory robot: preset limits on how far it can reach (permission ' +
      'modes), a supervisor who must approve risky moves (an approval callback), and a hard interlock that stops ' +
      'a forbidden action every time (a deny hook).',
    plainExplanation:
      'Guardrails keep an autonomous agent inside safe bounds. Permission modes set the default: default prompts ' +
      'for anything unapproved, acceptEdits auto-approves file edits, plan lets the agent explore without editing ' +
      'your files, and bypassPermissions approves everything (use with caution). A canUseTool callback adds ' +
      'human-in-the-loop approval at runtime, while deny rules and PreToolUse hooks give deterministic blocks that ' +
      'hold even under bypassPermissions, because prompt instructions alone are only probabilistic.',
    examWords: ['permission mode', 'acceptEdits', 'plan', 'bypassPermissions', 'canUseTool'],
    keyPoints: [
      { id: 'kp-agent-guardrails-1', text: 'Permission modes set default tool behavior: default prompts, acceptEdits auto-approves edits, plan forbids edits, bypassPermissions approves all.' },
      { id: 'kp-agent-guardrails-2', text: 'A canUseTool callback provides runtime human-in-the-loop approval for calls no rule resolves.' },
      { id: 'kp-agent-guardrails-3', text: 'Deny rules and PreToolUse hooks block a call deterministically, even under bypassPermissions.' },
      { id: 'kp-agent-guardrails-4', text: 'Hooks give deterministic guarantees; prompt instructions alone are only probabilistic.' },
    ],
  },
  exercises: [
    {
      id: 'c1-u5-l2-q01',
      type: 'mc',
      domain: 'd1',
      conceptId: 'agent-guardrails',
      taskStatement: '1.5',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'Which permission mode auto-approves file edits so Claude can edit without prompting?',
      options: [
        'acceptEdits',
        'plan',
        'default',
        'dontAsk',
      ],
      answerKey: 0,
      explanation:
        'acceptEdits auto-approves file edits and filesystem operations inside the working directory. plan forbids edits, ' +
        'default prompts for them, and dontAsk denies anything not pre-approved.',
      misconceptionTag: 'permission-modes',
      sourceUrls: [PERM],
    },
    {
      id: 'c1-u5-l2-q02',
      type: 'mc',
      domain: 'd1',
      conceptId: 'agent-guardrails',
      taskStatement: '1.5',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'In plan mode, what happens to file edits?',
      options: [
        'They are never auto-approved; the agent explores and plans without editing your source files',
        'They run immediately with no checks',
        'They are silently discarded after running',
        'They require raising max_tokens first',
      ],
      answerKey: 0,
      explanation:
        'Plan mode keeps the agent read-only for source files: edits are never auto-approved and prompt through your ' +
        'callback. "Run immediately" is the trap: that is closer to bypassPermissions, not plan.',
      misconceptionTag: 'plan-mode',
      sourceUrls: [PERM],
    },
    {
      id: 'c1-u5-l2-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd1',
      conceptId: 'agent-guardrails',
      taskStatement: '1.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A refund tool must never run without a human approving each individual call at runtime. Which mechanism enforces that?',
      options: [
        'A canUseTool callback that prompts a human for approval on the call',
        'Running the agent in bypassPermissions mode',
        'Running the agent in acceptEdits mode',
        'Adding "please confirm first" to the system prompt',
      ],
      answerKey: 0,
      explanation:
        'The canUseTool callback intercepts a tool call at runtime so a human can approve or deny it. A prompt request ' +
        'to "please confirm" is the trap: prompts are probabilistic and can be skipped, so they are not enforcement.',
      misconceptionTag: 'canusetool-hitl',
      sourceUrls: [PERM],
    },
    {
      id: 'c1-u5-l2-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd1',
      conceptId: 'agent-guardrails',
      taskStatement: '1.5',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A team relies only on a system-prompt instruction "never delete files," but the agent occasionally deletes anyway. What gives a deterministic guarantee instead?',
      options: [
        'A deny rule or PreToolUse hook that blocks the delete, since prompts are only probabilistic',
        'A longer, more emphatic system prompt',
        'Switching to acceptEdits mode',
        'Adding more examples of not deleting to the prompt',
      ],
      answerKey: 0,
      explanation:
        'Deny rules and PreToolUse hooks block an action deterministically; prompt instructions have a non-zero failure ' +
        'rate. A longer prompt is the trap: it is still probabilistic and can be overridden.',
      misconceptionTag: 'hooks-deterministic',
      sourceUrls: [PERM],
    },
    {
      id: 'c1-u5-l2-q05',
      type: 'mc',
      domain: 'd1',
      conceptId: 'agent-guardrails',
      taskStatement: '1.5',
      difficulty: 3,
      estimatedSeconds: 20,
      stem: 'You must run in bypassPermissions but still guarantee a destructive rm command is never executed. What still holds in that mode?',
      options: [
        'A matching deny rule or a PreToolUse hook blocks the call even under bypassPermissions',
        'Nothing can block a call once bypassPermissions is set',
        'Only switching to acceptEdits can stop it',
        'An allow rule will stop the destructive command',
      ],
      answerKey: 0,
      explanation:
        'Deny rules and hooks are evaluated before the permission mode, so they block a call even in bypassPermissions. ' +
        '"Nothing can block it" is the trap: bypass approves what reaches it, but deny rules and hooks run first.',
      misconceptionTag: 'hooks-deterministic',
      sourceUrls: [PERM],
    },
    {
      id: 'c1-u5-l2-q06',
      type: 'mc',
      domain: 'd1',
      conceptId: 'agent-guardrails',
      taskStatement: '1.5',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'In the default permission mode, what happens to a tool call that no rule pre-approves?',
      options: [
        'It falls through to your canUseTool callback for a decision',
        'It is auto-approved without any check',
        'It is silently denied with no callback',
        'The tool is removed from the request',
      ],
      answerKey: 0,
      explanation:
        'Default mode does not auto-approve; unmatched calls reach your canUseTool callback. Silent denial without a ' +
        'callback describes dontAsk mode, not default.',
      misconceptionTag: 'default-mode',
      sourceUrls: [PERM],
    },
    {
      id: 'c1-u5-l2-q07',
      type: 'multi',
      domain: 'd1',
      conceptId: 'agent-guardrails',
      taskStatement: '1.5',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two mechanisms block a tool call even when the agent runs in bypassPermissions? Select TWO.',
      options: [
        'A matching deny rule',
        'A PreToolUse hook that denies the call',
        'An allow rule for the tool',
        'Switching to acceptEdits mode',
        'A longer system prompt',
      ],
      answerKey: [0, 1],
      explanation:
        'Deny rules and PreToolUse hooks run before the mode check, so they block even under bypassPermissions. Allow ' +
        'rules approve rather than block, and prompts and acceptEdits do not create hard blocks.',
      misconceptionTag: 'hooks-deterministic',
      sourceUrls: [PERM],
    },
    {
      id: 'c1-u5-l2-q08',
      type: 'cloze',
      domain: 'd1',
      conceptId: 'agent-guardrails',
      taskStatement: '1.5',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: in ___ mode the agent explores and plans without editing your files, while ___ mode auto-approves file edits.',
      blanks: [
        { options: ['plan', 'default', 'bypass'] },
        { options: ['acceptEdits', 'plan', 'dontAsk'] },
      ],
      answerKey: [0, 0],
      explanation:
        'Plan mode is read-only for source files; acceptEdits auto-approves file edits. Swapping them would either block ' +
        'the edits you want or allow the edits you were trying to avoid.',
      misconceptionTag: 'permission-modes',
      sourceUrls: [PERM],
    },
    {
      id: 'c1-u5-l2-q09',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd1',
      conceptId: 'agent-guardrails',
      taskStatement: '1.5',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: a system-prompt instruction gives the same deterministic guarantee as a PreToolUse deny hook.',
      options: [
        'False, prompts are probabilistic while hooks and deny rules are deterministic',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Prompt instructions have a non-zero failure rate, so they cannot guarantee a block. Hooks and deny rules enforce ' +
        'the rule deterministically on every matching call.',
      misconceptionTag: 'hooks-deterministic',
      sourceUrls: [PERM],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: you need to guarantee an agent never runs a destructive command, even in bypassPermissions. Why is a hook or deny rule better than a strong system-prompt instruction?',
    conceptId: 'agent-guardrails',
    keyPointIds: [
      'kp-agent-guardrails-1',
      'kp-agent-guardrails-2',
      'kp-agent-guardrails-3',
      'kp-agent-guardrails-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 245,
});
