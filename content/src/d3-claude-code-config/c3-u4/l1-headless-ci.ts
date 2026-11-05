// content/src/d3-claude-code-config/c3-u4/l1-headless-ci.ts
//
// C3-U4-L1 — Headless mode and CI. Task statement 3.6 (claude -p non-interactive; --output-format
// json + --json-schema for machine-parseable output; CLAUDE.md provides CI review context;
// independent review instance beats self-review). Verified 2026-07-14 against the cited Claude Code
// "headless" and "github-actions" docs.
//
// Confusion pair targeted: an independent review instance (fresh context) catches more than
// self-review (which retains its own generation reasoning). Also json/stream-json output formats.

import { defineLesson } from '../../index';

const HEADLESS = 'https://code.claude.com/docs/en/headless';
const GHA = 'https://code.claude.com/docs/en/github-actions';

export const l1HeadlessCi = defineLesson({
  id: 'c3-u4-l1',
  title: 'Headless mode and CI',
  order: 0,
  concept: {
    conceptId: 'headless-ci',
    analogy:
      'Headless mode is Claude Code as a command-line tool in an assembly line: no chat window, just ' +
      'input in and a result out, ready to wire into a script. For a fair code review you bring in a ' +
      'fresh reviewer who never saw the code being written, not the same person who wrote it.',
    plainExplanation:
      'Add -p (or --print) to run Claude Code non-interactively, reading stdin and printing a result, ' +
      'which is how it fits into scripts, pre-commit hooks, and CI. Use --output-format json for a ' +
      'structured payload (result, session id, cost) or stream-json for streaming, and add --json-schema ' +
      'to constrain the output shape into a structured_output field. In CI, CLAUDE.md supplies the ' +
      'project review context, and a separate, independent review instance catches more than ' +
      'self-review, because the generating session still carries its own reasoning. The GitHub Actions ' +
      'integration responds to @claude mentions and reads ANTHROPIC_API_KEY from repository secrets.',
    examWords: [
      'claude -p / --print',
      '--output-format json',
      'stream-json',
      '--json-schema',
      'independent review instance',
      '@claude',
    ],
    keyPoints: [
      { id: 'kp-headless-ci-1', text: 'claude -p (--print) runs non-interactively, reading stdin and printing a result, so it fits scripts, pre-commit hooks, and CI.' },
      { id: 'kp-headless-ci-2', text: '--output-format json returns a structured payload, and --json-schema constrains the output into a structured_output field for machine parsing.' },
      { id: 'kp-headless-ci-3', text: 'A separate, independent review instance catches more than self-review, because the generating session retains its own reasoning context.' },
      { id: 'kp-headless-ci-4', text: 'The GitHub Actions integration responds to @claude mentions and reads ANTHROPIC_API_KEY from repository secrets, with CLAUDE.md providing project context.' },
    ],
  },
  exercises: [
    {
      id: 'c3-u4-l1-q01',
      type: 'mc',
      domain: 'd3',
      conceptId: 'headless-ci',
      taskStatement: '3.6',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'Which flag runs Claude Code non-interactively so you can wire it into a CI script?',
      options: [
        '-p (or --print)',
        '--interactive',
        '--plan',
        '--memory',
      ],
      answerKey: 0,
      explanation:
        '-p / --print runs Claude Code in non-interactive mode, reading stdin and printing a result for scripts and CI. ' +
        'There is no --interactive flag for this purpose; the default terminal session is already interactive.',
      misconceptionTag: 'print-flag-headless',
      sourceUrls: [HEADLESS],
    },
    {
      id: 'c3-u4-l1-q02',
      type: 'mc',
      domain: 'd3',
      conceptId: 'headless-ci',
      taskStatement: '3.6',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'You need a CI step to parse Claude\'s output against a fixed shape. Which combination gives machine-parseable structured output?',
      options: [
        '--output-format json with --json-schema, reading the structured_output field',
        '--output-format text and grepping the prose',
        '--permission-mode plan',
        '--continue with no output flags',
      ],
      answerKey: 0,
      explanation:
        '--output-format json plus --json-schema returns output conforming to your schema in a structured_output field, ideal ' +
        'for parsing. Grepping plain text is the trap: it is brittle and not guaranteed to match a shape.',
      misconceptionTag: 'json-schema-structured-output',
      sourceUrls: [HEADLESS],
    },
    {
      id: 'c3-u4-l1-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd3',
      conceptId: 'headless-ci',
      taskStatement: '3.6',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You want the most thorough automated review of a pull request Claude just generated in the same session. What gives better coverage?',
      options: [
        'Run the review in a separate, independent instance without the generation context',
        'Ask the same session that wrote the code to review its own work',
        'Skip review because generated code is already validated',
        'Lower the model tier for the review to save cost',
      ],
      answerKey: 0,
      explanation:
        'An independent instance without the prior reasoning catches more, since a generating session retains its own ' +
        'justifications. Self-review is the trap: the same context that produced the code tends to defend it.',
      misconceptionTag: 'independent-review-beats-self',
      sourceUrls: [HEADLESS],
    },
    {
      id: 'c3-u4-l1-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd3',
      conceptId: 'headless-ci',
      taskStatement: '3.6',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A workflow hardcodes the Claude API key directly in the .github/workflows YAML file. What is the flaw?',
      options: [
        'Secrets must not be committed; store ANTHROPIC_API_KEY in repository secrets and reference it in the workflow',
        'The GitHub Action does not need an API key at all',
        'The key belongs in the project CLAUDE.md instead',
        'API keys can only be passed on the command line, never in CI',
      ],
      answerKey: 0,
      explanation:
        'Committing a key exposes it; the integration expects ANTHROPIC_API_KEY in repository secrets, referenced from the ' +
        'workflow. The "does not need a key" answer is the trap, since the direct-API integration authenticates with exactly ' +
        'that secret.',
      misconceptionTag: 'api-key-in-secrets',
      sourceUrls: [GHA],
    },
    {
      id: 'c3-u4-l1-q05',
      type: 'mc',
      domain: 'd3',
      conceptId: 'headless-ci',
      taskStatement: '3.6',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'In the GitHub Actions integration, how do you ask Claude to act on an issue or pull request?',
      options: [
        'Mention @claude in an issue or PR comment',
        'Push a commit whose message contains the word claude',
        'Open the Claude desktop app and select the repo',
        'Rename the branch to include claude',
      ],
      answerKey: 0,
      explanation:
        'The action responds to @claude mentions in issue and PR comments. The commit-message and branch-name options are ' +
        'traps: the integration keys off the mention trigger, not repository naming.',
      misconceptionTag: 'claude-mention-trigger',
      sourceUrls: [GHA],
    },
    {
      id: 'c3-u4-l1-q06',
      type: 'multi',
      domain: 'd3',
      conceptId: 'headless-ci',
      taskStatement: '3.6',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'You are scripting Claude Code into a pre-merge CI job. Which two points about headless runs and automated review hold? Select TWO.',
      options: [
        'claude -p reads stdin and prints a result, so you can pipe a diff into it',
        'CLAUDE.md provides project context that guides Claude in CI reviews',
        '--output-format text guarantees schema-valid structured output',
        'Self-review by the generating session catches more than an independent instance',
        'The GitHub Action stores the API key in CLAUDE.md',
      ],
      answerKey: [0, 1],
      explanation:
        'You can pipe input into claude -p, and CLAUDE.md supplies review context. The false options misstate text output ' +
        '(only json plus a schema is structured), self-review (weaker than an independent instance), and secret storage ' +
        '(repository secrets, not CLAUDE.md).',
      misconceptionTag: 'independent-review-beats-self',
      sourceUrls: [HEADLESS, GHA],
    },
    {
      id: 'c3-u4-l1-q07',
      type: 'cloze',
      domain: 'd3',
      conceptId: 'headless-ci',
      taskStatement: '3.6',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: run Claude Code non-interactively with the ___ flag, and add ___ to constrain the output to a machine-parseable shape.',
      blanks: [
        { options: ['-p', '--plan', '--memory'] },
        { options: ['--json-schema', '--verbose', '--continue'] },
      ],
      answerKey: [0, 0],
      explanation:
        'The -p flag runs headless, and --json-schema (with --output-format json) constrains the output into a ' +
        'structured_output field. --verbose and --continue affect streaming and session continuation, not the output shape.',
      misconceptionTag: 'json-schema-structured-output',
      sourceUrls: [HEADLESS],
    },
    {
      id: 'c3-u4-l1-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd3',
      conceptId: 'headless-ci',
      taskStatement: '3.6',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: the session that wrote the code is the best choice to review it, because it understands its own reasoning.',
      options: [
        'False, an independent instance without that reasoning catches more issues',
        'True',
      ],
      answerKey: 0,
      explanation:
        'The generating session retains its own justifications and tends to defend its work. A fresh, independent review ' +
        'instance catches more problems.',
      misconceptionTag: 'independent-review-beats-self',
      sourceUrls: [HEADLESS],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: your CI needs Claude to review a PR and emit output your script can parse. Which flags do you reach for, and why run the review in a separate instance from the one that wrote the code?',
    conceptId: 'headless-ci',
    keyPointIds: [
      'kp-headless-ci-1',
      'kp-headless-ci-2',
      'kp-headless-ci-3',
      'kp-headless-ci-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
