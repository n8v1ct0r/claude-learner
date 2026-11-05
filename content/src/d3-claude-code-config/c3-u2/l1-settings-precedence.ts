// content/src/d3-claude-code-config/c3-u2/l1-settings-precedence.ts
//
// C3-U2-L1 — Settings precedence and merging permission rules. Task statement 3.4 (configuration
// that governs what Claude Code may execute). Verified 2026-07-14 against the cited Claude Code
// "settings" and "permissions" docs.
//
// Confusion pair targeted: ordinary settings OVERRIDE across scopes (managed > CLI > local >
// project > user), but permission rules MERGE across scopes with deny winning. The spot-bug and
// explain-back attack "a project allow can loosen a user or managed deny".

import { defineLesson } from '../../index';

const SETTINGS = 'https://code.claude.com/docs/en/settings';
const PERMISSIONS = 'https://code.claude.com/docs/en/permissions';

export const l1SettingsPrecedence = defineLesson({
  id: 'c3-u2-l1',
  title: 'Settings precedence and merging rules',
  order: 0,
  concept: {
    conceptId: 'settings-precedence',
    analogy:
      'Ordinary settings work like a manager overruling a clerk: the higher authority\'s value wins ' +
      'and the lower one is set aside. Permission rules work like building fire codes instead: every ' +
      'level\'s "no" stacks, and any single "no" shuts the door no matter how many "yes" votes exist.',
    plainExplanation:
      'When the same setting appears at multiple scopes, Claude Code applies them in priority order: ' +
      'managed (highest, cannot be overridden), then command-line arguments, then local ' +
      '(.claude/settings.local.json), then project (.claude/settings.json), then user ' +
      '(~/.claude/settings.json). Permission rules are the exception: instead of overriding, allow, ' +
      'ask, and deny rules from every scope merge together, and a deny at any level cannot be ' +
      'overridden by an allow at another. So a project allow never loosens a user or managed deny.',
    examWords: [
      'settings precedence',
      'managed',
      'command-line arguments',
      'local',
      'project',
      'user',
      'permission rules merge',
      'deny wins',
    ],
    keyPoints: [
      { id: 'kp-settings-precedence-1', text: 'Ordinary settings resolve by precedence: managed, then command-line args, then local, then project, then user.' },
      { id: 'kp-settings-precedence-2', text: 'Managed (enterprise) settings are highest and cannot be overridden by any other level, including command-line arguments.' },
      { id: 'kp-settings-precedence-3', text: 'Permission rules do not override across scopes; allow, ask, and deny rules merge from every scope.' },
      { id: 'kp-settings-precedence-4', text: 'A deny rule at any scope beats an allow at another, so if a tool is denied anywhere no other level can allow it.' },
    ],
  },
  exercises: [
    {
      id: 'c3-u2-l1-q01',
      type: 'mc',
      domain: 'd3',
      conceptId: 'settings-precedence',
      taskStatement: '3.4',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'Which settings source can no other level override, not even a command-line argument?',
      options: [
        'Managed (enterprise policy) settings',
        'Local settings in .claude/settings.local.json',
        'Project settings in .claude/settings.json',
        'User settings in ~/.claude/settings.json',
      ],
      answerKey: 0,
      explanation:
        'Managed settings sit at the top of precedence and cannot be overridden by anything, including CLI arguments. ' +
        'Local settings are the trap: they beat project and user settings, but a command-line argument and managed policy ' +
        'both outrank them.',
      misconceptionTag: 'managed-settings-top',
      sourceUrls: [SETTINGS],
    },
    {
      id: 'c3-u2-l1-q02',
      type: 'mc',
      domain: 'd3',
      conceptId: 'settings-precedence',
      taskStatement: '3.4',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'A developer assumes a project allow rule will override a user deny rule for the same command. What actually happens?',
      options: [
        'The deny wins; permission rules merge across scopes and a deny at any level cannot be overridden by an allow',
        'The project allow wins because project settings outrank user settings',
        'Whichever file was edited most recently wins',
        'The rules cancel out and the tool prompts every time',
      ],
      answerKey: 0,
      explanation:
        'Permission rules merge rather than override, and deny is evaluated before allow at every scope, so the user deny ' +
        'blocks it. The "project outranks user" answer applies the override behavior of ordinary settings, but permission ' +
        'rules are the deliberate exception.',
      misconceptionTag: 'permission-rules-merge-deny-wins',
      sourceUrls: [PERMISSIONS],
    },
    {
      id: 'c3-u2-l1-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd3',
      conceptId: 'settings-precedence',
      taskStatement: '3.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Your organization deploys a managed deny rule for a risky command. A team lead wants to allow it just for one repo via project settings. Can they?',
      options: [
        'No; a managed deny cannot be overridden by a project allow, since deny beats allow across scopes',
        'Yes, project settings override managed settings for that repo',
        'Yes, but only if the allow is also added to the user settings',
        'Only if the team lead deletes the managed settings file',
      ],
      answerKey: 0,
      explanation:
        'Managed policy is the highest scope and deny always wins when rules merge, so a project allow cannot re-enable it. ' +
        'The "project overrides managed" answer is the trap: managed settings exist precisely so a repo cannot loosen them.',
      misconceptionTag: 'managed-deny-cannot-be-loosened',
      sourceUrls: [PERMISSIONS, SETTINGS],
    },
    {
      id: 'c3-u2-l1-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd3',
      conceptId: 'settings-precedence',
      taskStatement: '3.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An engineer adds an allow rule in local settings to "cancel out" a deny rule in project settings, and is surprised the command is still blocked. What did they misunderstand?',
      options: [
        'Deny and allow rules merge across scopes and deny is evaluated first, so a local allow cannot cancel a project deny',
        'Local settings never contain permission rules',
        'The allow rule was written in the wrong file and should go in managed settings',
        'Permission rules follow the same override order as ordinary settings, so local should have won',
      ],
      answerKey: 0,
      explanation:
        'Permission rules merge, and a deny at any scope wins over an allow at another, so the local allow can never cancel ' +
        'the project deny. The "same override order as ordinary settings" answer is exactly the misconception: permission ' +
        'rules are the exception to override behavior.',
      misconceptionTag: 'permission-rules-merge-deny-wins',
      sourceUrls: [PERMISSIONS],
    },
    {
      id: 'c3-u2-l1-q05',
      type: 'mc',
      domain: 'd3',
      conceptId: 'settings-precedence',
      taskStatement: '3.4',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'Between local project settings and shared project settings, which value wins for an ordinary (non-permission) setting?',
      options: [
        'Local settings (.claude/settings.local.json) override shared project settings (.claude/settings.json)',
        'Shared project settings always override local settings',
        'They merge and both apply simultaneously',
        'User settings override both of them',
      ],
      answerKey: 0,
      explanation:
        'In precedence order, local project settings sit above shared project settings, which sit above user settings. ' +
        'The "shared overrides local" answer inverts the order; and only permission rules merge, not ordinary settings.',
      misconceptionTag: 'local-over-project-over-user',
      sourceUrls: [SETTINGS],
    },
    {
      id: 'c3-u2-l1-q06',
      type: 'multi',
      domain: 'd3',
      conceptId: 'settings-precedence',
      taskStatement: '3.4',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'You are writing a short runbook on how Claude Code resolves configuration across scopes. Which two lines about settings precedence and permission-rule merging are correct? Select TWO.',
      options: [
        'Managed settings are highest priority and cannot be overridden by CLI arguments',
        'Permission allow, ask, and deny rules merge across scopes rather than overriding',
        'User settings override project and local settings',
        'A project allow rule can override a managed deny rule',
        'Command-line arguments are ignored entirely',
      ],
      answerKey: [0, 1],
      explanation:
        'Managed settings top the precedence order and permission rules merge across scopes. The other options are false: ' +
        'user settings are the lowest scope, a managed deny cannot be loosened, and CLI arguments are a real override level ' +
        'just below managed.',
      misconceptionTag: 'permission-rules-merge-deny-wins',
      sourceUrls: [SETTINGS, PERMISSIONS],
    },
    {
      id: 'c3-u2-l1-q07',
      type: 'order',
      domain: 'd3',
      conceptId: 'settings-precedence',
      taskStatement: '3.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Order these settings sources from highest precedence to lowest.',
      steps: [
        'Managed (enterprise policy) settings',
        'Local project settings (.claude/settings.local.json)',
        'Shared project settings (.claude/settings.json)',
        'User settings (~/.claude/settings.json)',
      ],
      answerKey: [0, 1, 2, 3],
      explanation:
        'Precedence runs managed, then command-line arguments, then local, then project, then user. Among the files listed ' +
        'here, managed is highest and user is lowest, with local above shared project.',
      misconceptionTag: 'local-over-project-over-user',
      sourceUrls: [SETTINGS],
    },
    {
      id: 'c3-u2-l1-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd3',
      conceptId: 'settings-precedence',
      taskStatement: '3.4',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: if a tool is denied by a permission rule at any settings scope, an allow rule at another scope can still re-enable it.',
      options: [
        'False, a deny at any scope cannot be overridden by an allow',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Permission rules merge and deny is evaluated before allow at every scope, so a deny anywhere blocks the tool. ' +
        'No allow at another level can re-enable it.',
      misconceptionTag: 'permission-rules-merge-deny-wins',
      sourceUrls: [PERMISSIONS],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: ordinary settings override across scopes, but permission rules behave differently. What happens when a user deny and a project allow name the same command, and why?',
    conceptId: 'settings-precedence',
    keyPointIds: [
      'kp-settings-precedence-1',
      'kp-settings-precedence-2',
      'kp-settings-precedence-3',
      'kp-settings-precedence-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
