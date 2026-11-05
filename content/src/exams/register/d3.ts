// content/src/exams/register/d3.ts
//
// Exam-register questions for Domain 3 — Claude Code Configuration & Workflows (20%).
// 36 scenario-clustered, exam-style items authored FRESH from official Claude Code docs and
// registered by reference via defineQuestion() (NOT embedded in a lesson). Clustered under the
// three published scenarios where D3 is a primary domain: code generation with Claude Code,
// Claude Code in CI/CD, and developer productivity tools.
//
// Every answer key was re-derived from the cited page (WebFetch-verified 2026-07-14):
//   memory        https://code.claude.com/docs/en/memory          (CLAUDE.md hierarchy, rules, /memory)
//   skills        https://code.claude.com/docs/en/skills           (SKILL.md frontmatter, invocation, scopes)
//   workflows     https://code.claude.com/docs/en/common-workflows (plan mode, subagent delegation, tests)
//   headless      https://code.claude.com/docs/en/headless         (-p, output formats, --bare, perm modes)
//   github-actions https://code.claude.com/docs/en/github-actions  (@claude, secrets, claude_args)
//   code-review   https://code.claude.com/docs/en/code-review      (independent multi-agent review, REVIEW.md)
//
// 2026-09-24 (launch audit CS-1): distractors rewritten so option length and specificity no longer
// reveal the key. Every distractor names a real Claude Code mechanism and is wrong per the cited
// page; correct options were only tightened, except reg-d3-q07, whose key was re-derived from the
// current memory page ("Neither set overrides the other").
//
// These are DISTINCT from the D3 lesson bank (dupe detection runs across the whole catalog): each
// stem is a fresh production scenario, and none restates a bank question. IDs are append-only (D3).

import { defineQuestion } from '../../index';

const MEM = 'https://code.claude.com/docs/en/memory';
const SKILLS = 'https://code.claude.com/docs/en/skills';
const WORKFLOWS = 'https://code.claude.com/docs/en/common-workflows';
const HEADLESS = 'https://code.claude.com/docs/en/headless';
const GHA = 'https://code.claude.com/docs/en/github-actions';
const REVIEW = 'https://code.claude.com/docs/en/code-review';

// =====================================================================================
// SCENARIO A — Code Generation with Claude Code (13 items: reg-d3-q01..q13)
// A team uses Claude Code to generate and refactor application code; they are tuning
// memory files, skills, rules, plan mode, and iterative-refinement habits.
// =====================================================================================

defineQuestion({
  id: 'reg-d3-q01',
  type: 'mc',
  variant: 'scenario',
  domain: 'd3',
  conceptId: 'claude-md-hierarchy',
  taskStatement: '3.1',
  difficulty: 2,
  estimatedSeconds: 30,
  scenarioId: 'code-generation-claude-code',
  stem: 'A developer on a shared repo wants Claude to always use their personal scratch database URL when generating code, but that URL must never be committed or seen by teammates. Where should this instruction live?',
  options: [
    'In a `CLAUDE.local.md` at the project root, added to `.gitignore`',
    'In the team `./CLAUDE.md`, inside an HTML comment so teammates cannot see it',
    'In the managed-policy `CLAUDE.md` deployed to every developer machine',
    'In a committed `.claude/rules/db.md` with a `paths` glob',
  ],
  answerKey: 0,
  explanation:
    'A `CLAUDE.local.md` at the project root loads alongside `CLAUDE.md` but is meant for personal project-specific preferences you add to `.gitignore`, so it stays out of version control. A committed `./CLAUDE.md` or `.claude/rules/` file is shared with the whole team (and HTML comments are stripped before Claude even sees them), and managed policy is org-wide, not per-developer.',
  misconceptionTag: 'claude-local-vs-project-claude-md',
  sourceUrls: [MEM],
});

defineQuestion({
  id: 'reg-d3-q02',
  type: 'mc',
  variant: 'scenario',
  domain: 'd3',
  conceptId: 'claude-md-hierarchy',
  taskStatement: '3.1',
  difficulty: 2,
  estimatedSeconds: 30,
  scenarioId: 'code-generation-claude-code',
  stem: 'Your project ships a team `./CLAUDE.md` with naming conventions, and you also keep a `~/.claude/CLAUDE.md` with personal formatting habits. A teammate worries the two will conflict and only one will apply. What actually happens?',
  options: [
    'Both load and are concatenated; the user file appears first, then the project file',
    'Both load, but the project file replaces any user instruction on the same topic',
    'Only the project file loads; a user `CLAUDE.md` is skipped whenever a project one exists',
    'Both load, and the project file appears first because it is closer to the working directory',
  ],
  answerKey: 0,
  explanation:
    'Discovered CLAUDE.md files are concatenated into context rather than overriding each other, ordered from broadest to most specific, so the user file loads first and the project file loads after it. Nothing is skipped or replaced on a shared topic, and "closer is read later" is the directory-tree order, which still puts the user file before the project file.',
  misconceptionTag: 'claude-md-concatenate-vs-override',
  sourceUrls: [MEM],
});

defineQuestion({
  id: 'reg-d3-q03',
  type: 'mc',
  variant: 'spot-bug',
  domain: 'd3',
  conceptId: 'claude-md-hierarchy',
  taskStatement: '3.1',
  difficulty: 3,
  estimatedSeconds: 30,
  scenarioId: 'code-generation-claude-code',
  stem: 'A team wrote "never edit files under `src/generated/`" in their `CLAUDE.md`, but Claude still occasionally edits generated files during codegen tasks. What is the real problem with their approach?',
  options: [
    'CLAUDE.md is guidance, not enforcement; a `PreToolUse` hook is what blocks the edit every time',
    'The rule is in the root file; it only binds once moved into `src/generated/CLAUDE.md`',
    'The rule is phrased as a prohibition; CLAUDE.md rules must say what to do instead',
    'The rule is dropped at auto-compaction; re-adding it after each `/compact` fixes it',
  ],
  answerKey: 0,
  explanation:
    'CLAUDE.md is delivered as context that shapes behavior with no guarantee of strict compliance, so to block an action regardless of what Claude decides you use a `PreToolUse` hook. Moving or rephrasing the rule keeps it guidance, and a project-root CLAUDE.md survives compaction, so none of those changes turns it into a hard gate.',
  misconceptionTag: 'claude-md-guidance-vs-hook-enforcement',
  sourceUrls: [MEM],
});

defineQuestion({
  id: 'reg-d3-q04',
  type: 'mc',
  domain: 'd3',
  conceptId: 'slash-commands-skills',
  taskStatement: '3.2',
  difficulty: 3,
  estimatedSeconds: 20,
  scenarioId: 'code-generation-claude-code',
  stem: 'You have a `legacy-billing-context` skill that explains how an old subsystem works. You want Claude to load it automatically when relevant, but it is background knowledge, not an action a user should ever type as a command. Which frontmatter fits?',
  options: [
    '`user-invocable: false`',
    '`disable-model-invocation: true`',
    '`context: fork`',
    '`allowed-tools: Read`',
  ],
  answerKey: 0,
  explanation:
    '`user-invocable: false` hides a skill from the `/` menu so only Claude invokes it, which is exactly right for background knowledge that is not a meaningful user command. `disable-model-invocation: true` is the mirror image (only you can invoke it), used for side-effecting workflows like `/deploy`, so it would prevent the automatic loading you want here.',
  misconceptionTag: 'user-invocable-vs-disable-model-invocation',
  sourceUrls: [SKILLS],
});

defineQuestion({
  id: 'reg-d3-q05',
  type: 'mc',
  variant: 'spot-bug',
  domain: 'd3',
  conceptId: 'slash-commands-skills',
  taskStatement: '3.2',
  difficulty: 3,
  estimatedSeconds: 25,
  scenarioId: 'code-generation-claude-code',
  stem: 'An autonomous refactor skill must never call `AskUserQuestion` while it runs. The author added `allowed-tools: Read Edit` expecting that to remove every other tool. `AskUserQuestion` still gets called. What is the fix?',
  options: [
    'List `AskUserQuestion` in `disallowed-tools`; that removes it from the pool while the skill runs',
    'Set `disable-model-invocation: true`, which stops Claude from calling tools the frontmatter omits',
    'Rewrite it as `allowed-tools: Read, Edit`; a space-separated list is ignored',
    'Set `user-invocable: false`, which keeps the skill out of the `/` menu and blocks interactive tools',
  ],
  answerKey: 0,
  explanation:
    '`allowed-tools` only grants no-prompt permission for the listed tools; it does not restrict the pool, so every other tool stays callable whichever separator you use. `disallowed-tools` is the field that removes specific tools from Claude\'s available pool while the skill is active, which is what blocks `AskUserQuestion` here; the invocation-control fields decide who can start the skill, not which tools it may call.',
  misconceptionTag: 'allowed-tools-grant-vs-disallowed-tools-restrict',
  sourceUrls: [SKILLS],
});

defineQuestion({
  id: 'reg-d3-q06',
  type: 'mc',
  domain: 'd3',
  conceptId: 'slash-commands-skills',
  taskStatement: '3.2',
  difficulty: 1,
  estimatedSeconds: 20,
  scenarioId: 'code-generation-claude-code',
  stem: 'A repo has both a `.claude/commands/deploy.md` file and a `.claude/skills/deploy/SKILL.md`. Both would create `/deploy`. Which one takes precedence when you invoke `/deploy`?',
  options: [
    'The skill takes precedence; `/deploy` runs `.claude/skills/deploy/SKILL.md`',
    'The command runs, because `.claude/commands/` is scanned before `.claude/skills/`',
    'Both stay available: the command as `/deploy` and the skill as `/skills:deploy`',
    'Whichever of the two files was modified most recently runs, and the other is ignored',
  ],
  answerKey: 0,
  explanation:
    'Custom commands were merged into skills, and when a skill and a command share the same name the skill takes precedence. There is no scan order that favors commands, no `/skills:` namespace (only plugin and nested skills get prefixes), and no modification-time rule.',
  misconceptionTag: 'skill-vs-command-precedence',
  sourceUrls: [SKILLS],
});

defineQuestion({
  id: 'reg-d3-q07',
  type: 'mc',
  variant: 'scenario',
  domain: 'd3',
  conceptId: 'path-scoped-rules',
  taskStatement: '3.3',
  difficulty: 3,
  estimatedSeconds: 30,
  scenarioId: 'code-generation-claude-code',
  stem: 'You keep the same personal linting preferences across every repo you touch, and you never want to commit them. You also have a project rule for the same topic. Where do your personal rules go, and which set wins on a clash?',
  options: [
    'In `~/.claude/rules/`; they load before project rules, and neither set overrides the other',
    'In `~/.claude/rules/`; they load after project rules, so the personal rule overrides the project rule',
    'In the project `.claude/rules/` with `paths` unset, so they load every session and take priority',
    'In `~/.claude/CLAUDE.md`, which loads last and therefore wins every conflict',
  ],
  answerKey: 0,
  explanation:
    'User-level rules in `~/.claude/rules/` apply to every project and load before project rules, so a project rule appears later in context, but neither set overrides the other: on a conflict Claude may follow either one, which is why the docs say to keep the two consistent. The other options invert the load order, invent a winner, or put personal preferences into shared project files.',
  misconceptionTag: 'user-rules-vs-project-rules-precedence',
  sourceUrls: [MEM],
});

defineQuestion({
  id: 'reg-d3-q08',
  type: 'mc',
  variant: 'scenario',
  domain: 'd3',
  conceptId: 'slash-commands-skills',
  taskStatement: '3.2',
  difficulty: 1,
  estimatedSeconds: 20,
  scenarioId: 'code-generation-claude-code',
  stem: 'Your release runbook is a long multi-step procedure you only need a few times a month. You want it available on demand without paying its token cost in every session. Which home fits best?',
  options: [
    'A skill in `.claude/skills/`, since a skill\'s body loads only when it is invoked',
    'The project `CLAUDE.md`, split into `@docs/release.md` imports to defer loading',
    'A `.claude/rules/release.md` without `paths`, which loads only when referenced',
    'A `CLAUDE.local.md` file, which loads on demand because it is gitignored',
  ],
  answerKey: 0,
  explanation:
    'A skill\'s body loads only when it is used, so long reference material costs almost nothing until you invoke it, which is the point of moving a procedure out of always-loaded memory. CLAUDE.md, its `@` imports, an unscoped rule, and CLAUDE.local.md all load into context at launch, so they would spend tokens on a runbook you rarely need.',
  misconceptionTag: 'skill-on-demand-vs-claude-md-always-loaded',
  sourceUrls: [SKILLS, MEM],
});

defineQuestion({
  id: 'reg-d3-q09',
  type: 'mc',
  variant: 'scenario',
  domain: 'd3',
  conceptId: 'plan-mode',
  taskStatement: '3.4',
  difficulty: 2,
  estimatedSeconds: 30,
  scenarioId: 'code-generation-claude-code',
  stem: 'Before letting Claude generate changes across an unfamiliar service, you want it to read the code and propose an approach without touching any files until you approve. How do you set that up?',
  options: [
    'Start in plan mode with `claude --permission-mode plan`, or press Shift+Tab mid-session',
    'Start with `claude --permission-mode dontAsk`, which holds edits until you approve them',
    'Run `claude -p "propose an approach"` first, since print mode is read-only by design',
    'Start with `claude --permission-mode acceptEdits`, which stages edits for your review before writing',
  ],
  answerKey: 0,
  explanation:
    'Plan mode makes Claude read files and propose a plan while making no edits until you approve, and you enter it with `--permission-mode plan` or by pressing Shift+Tab. `dontAsk` auto-denies instead of proposing anything for approval, `-p` is non-interactive printing rather than a read-only guarantee, and `acceptEdits` writes files without prompting.',
  misconceptionTag: 'plan-mode-vs-print-vs-acceptedits',
  sourceUrls: [WORKFLOWS],
});

defineQuestion({
  id: 'reg-d3-q10',
  type: 'mc',
  variant: 'scenario',
  domain: 'd3',
  conceptId: 'plan-mode',
  taskStatement: '3.4',
  difficulty: 2,
  estimatedSeconds: 30,
  scenarioId: 'code-generation-claude-code',
  stem: 'While generating a fix, you need to understand how token refresh works across a large auth module, but you do not want dozens of file reads flooding your main conversation. What keeps the exploration out of your context?',
  options: [
    'Hand it to a subagent, which reads the files in its own context window and reports a summary',
    'Ask Claude to read the files, then run `/compact` so the reads collapse into a short summary',
    'Reference the files with `@src/auth/*.ts`, since @-mentions are summarized before entering context',
    'Run the exploration under `--bare` so file reads are not persisted into the conversation',
  ],
  answerKey: 0,
  explanation:
    'A subagent explores in its own context window and reports back only a summary, so the verbose file reads never enter your main conversation. Reading everything then compacting still fills and churns your main context first, `@` references pull full file contents in, and `--bare` only skips auto-discovery of configuration.',
  misconceptionTag: 'subagent-delegation-context-isolation',
  sourceUrls: [WORKFLOWS],
});

defineQuestion({
  id: 'reg-d3-q11',
  type: 'mc',
  variant: 'scenario',
  domain: 'd3',
  conceptId: 'git-workflows-team-config',
  taskStatement: '3.5',
  difficulty: 2,
  estimatedSeconds: 30,
  scenarioId: 'code-generation-claude-code',
  stem: 'Claude generates helper functions in an inconsistent style from run to run, even after you described the format in prose. What is the most effective way to lock the output format?',
  options: [
    'Show a few concrete input/output examples that demonstrate the exact format you want',
    'Add "consistent" and "always" to the prompt, repeating the format rule at the start and end',
    'Ask Claude to restate the format rules back to you before it generates anything',
    'Lower the effort level with `/effort low`, which limits how much the output varies',
  ],
  answerKey: 0,
  explanation:
    'A few concrete input/output examples pin down a format far more reliably than prose, because they demonstrate the target rather than describe it. Repeating an adjective, asking for a description, or lowering the effort level does not show the concrete shape the examples make unambiguous.',
  misconceptionTag: 'examples-beat-prose',
  sourceUrls: [WORKFLOWS],
});

defineQuestion({
  id: 'reg-d3-q12',
  type: 'multi',
  domain: 'd3',
  conceptId: 'git-workflows-team-config',
  taskStatement: '3.5',
  difficulty: 2,
  estimatedSeconds: 30,
  scenarioId: 'code-generation-claude-code',
  selectCount: 2,
  stem: 'You want Claude to generate tests that match your project\'s existing conventions and cover the cases you care about. Which two habits improve the result most? Select TWO.',
  options: [
    'Point Claude at existing test files so it matches their style, framework, and assertion patterns',
    'Be specific about the behavior and edge cases you want each test to verify',
    'Ask for full coverage in a single pass so Claude does not anchor on any one existing file',
    'Generate the tests in plan mode so Claude proposes cases without reading the existing suite',
    'Have Claude choose the assertion library it prefers so the new tests read idiomatically',
  ],
  answerKey: [0, 1],
  explanation:
    'Claude examines existing test files to match the style, frameworks, and assertion patterns already in use, and being specific about the behavior to verify is what produces meaningful cases. Asking for coverage without naming behaviors, hiding the existing suite, or letting the assertion style drift all work against consistency.',
  misconceptionTag: 'test-conventions-from-examples',
  sourceUrls: [WORKFLOWS],
});

defineQuestion({
  id: 'reg-d3-q13',
  type: 'multi',
  domain: 'd3',
  conceptId: 'slash-commands-skills',
  taskStatement: '3.2',
  difficulty: 2,
  estimatedSeconds: 30,
  scenarioId: 'code-generation-claude-code',
  selectCount: 2,
  stem: 'A teammate is fuzzy on how Claude Code skills consume context and grant tool access. Which two of your clarifications are accurate? Select TWO.',
  options: [
    'A skill\'s description stays in context; its full body loads only when the skill is invoked',
    '`allowed-tools` pre-approves the listed tools for that turn without removing any other tool',
    'A skill\'s full body loads at session start, in the same pass as `CLAUDE.md` and unscoped rules',
    '`allowed-tools` removes every unlisted tool from the pool until you send your next message',
    'A skill runs only when the user types `/name`; Claude never loads one on its own',
  ],
  answerKey: [0, 1],
  explanation:
    'Skill descriptions are loaded so Claude knows what is available while full content loads only on invocation, and `allowed-tools` grants permission without narrowing the pool. The wrong options confuse skills with always-loaded CLAUDE.md, misread `allowed-tools` as a restriction (that is `disallowed-tools`), and ignore that Claude can auto-invoke skills by default.',
  misconceptionTag: 'skill-progressive-disclosure',
  sourceUrls: [SKILLS],
});

// =====================================================================================
// SCENARIO B — Claude Code in CI/CD (13 items: reg-d3-q14..q26)
// A platform team wires Claude Code into pipelines and GitHub Actions for automated
// linting, review, and structured output.
// =====================================================================================

defineQuestion({
  id: 'reg-d3-q14',
  type: 'mc',
  domain: 'd3',
  conceptId: 'headless-ci',
  taskStatement: '3.6',
  difficulty: 1,
  estimatedSeconds: 20,
  scenarioId: 'claude-code-ci-cd',
  stem: 'A CI job needs Claude to return a list of changed function names as a machine-parseable object your script can read from a known field. Which combination produces that?',
  options: [
    '`--output-format json` plus `--json-schema`, then read the `structured_output` field',
    '`--output-format json` alone, then parse the `result` string, which is always valid JSON',
    '`--output-format stream-json`, reading `structured_output` from each `stream_event` line',
    '`--output-format text` with `--json-schema`, since text mode prints the validated object',
  ],
  answerKey: 0,
  explanation:
    'Pairing `--output-format json` with `--json-schema` returns output conforming to your schema, placed in the `structured_output` field for scripts to read. Without the schema flag the `result` field is free text, stream events do not carry a structured object, and `--json-schema` needs the JSON output format rather than plain text.',
  misconceptionTag: 'json-schema-structured-output',
  sourceUrls: [HEADLESS],
});

defineQuestion({
  id: 'reg-d3-q15',
  type: 'mc',
  variant: 'scenario',
  domain: 'd3',
  conceptId: 'headless-ci',
  taskStatement: '3.6',
  difficulty: 3,
  estimatedSeconds: 30,
  scenarioId: 'claude-code-ci-cd',
  stem: 'Your CI runs must produce the same result on every machine and must not pick up whatever hooks, MCP servers, or CLAUDE.md happen to be configured locally. Which flag gives you that reproducibility?',
  options: [
    '`--bare`, which skips auto-discovery of hooks, MCP servers, plugins, and CLAUDE.md',
    '`--permission-mode dontAsk`, which denies local hooks and MCP servers instead of loading them',
    '`--settings \'{}\'`, which replaces the discovered configuration with an empty one',
    '`--continue`, which pins the run to the last session so the same configuration is reused',
  ],
  answerKey: 0,
  explanation:
    '`--bare` reduces startup by skipping auto-discovery of hooks, skills, plugins, MCP servers, auto memory, and CLAUDE.md, so only flags you pass explicitly take effect, which is exactly the reproducibility CI needs. `dontAsk` governs permission prompts (hooks and servers still load), `--settings` layers one more settings source on top of discovery, and `--continue` resumes a conversation without changing what loads.',
  misconceptionTag: 'bare-mode-reproducible-ci',
  sourceUrls: [HEADLESS],
});

defineQuestion({
  id: 'reg-d3-q16',
  type: 'mc',
  variant: 'scenario',
  domain: 'd3',
  conceptId: 'headless-ci',
  taskStatement: '3.6',
  difficulty: 3,
  estimatedSeconds: 30,
  scenarioId: 'claude-code-ci-cd',
  stem: 'For a locked-down CI run you want Claude to deny anything not already in your `permissions.allow` rules or the read-only command set, rather than listing tools one by one. Which permission mode fits?',
  options: [
    '`dontAsk`, which denies anything not covered by allow rules or the read-only set',
    '`acceptEdits`, which auto-approves file writes plus common filesystem commands',
    '`bypassPermissions`, which skips every prompt except the actions no mode auto-approves',
    '`plan`, which blocks edits to source but lets Claude run read-only commands freely',
  ],
  answerKey: 0,
  explanation:
    '`dontAsk` denies anything not in your `permissions.allow` rules or the read-only command set, which is the intended baseline for locked-down CI. `acceptEdits` and `bypassPermissions` loosen rather than tighten access, and `plan` is about deferring edits, not enforcing an allowlist.',
  misconceptionTag: 'dontask-vs-acceptedits-ci',
  sourceUrls: [HEADLESS],
});

defineQuestion({
  id: 'reg-d3-q17',
  type: 'mc',
  variant: 'scenario',
  domain: 'd3',
  conceptId: 'headless-ci',
  taskStatement: '3.6',
  difficulty: 3,
  estimatedSeconds: 30,
  scenarioId: 'claude-code-ci-cd',
  stem: 'Your org runs Claude Code GitHub Actions through Amazon Bedrock and wants no long-lived AWS access keys stored as GitHub secrets. What is the recommended authentication approach?',
  options: [
    'Use GitHub OIDC to assume an IAM role, so the workflow gets temporary, rotated credentials',
    'Store an access key and secret as repository secrets and pass them with `use_bedrock: "true"`',
    'Generate a long-lived token with `claude setup-token` and store it as `CLAUDE_CODE_OAUTH_TOKEN`',
    'Install the Claude GitHub App at the organization level; it carries the AWS credentials itself',
  ],
  answerKey: 0,
  explanation:
    'The docs configure GitHub OIDC with an IAM role so GitHub Actions authenticate without storing credentials, and OIDC is more secure than static keys because credentials are temporary and automatically rotated. Static AWS keys are exactly what OIDC replaces, a `setup-token` OAuth token authenticates a Claude subscription rather than AWS, and the GitHub App carries no cloud credentials.',
  misconceptionTag: 'oidc-vs-static-keys',
  sourceUrls: [GHA],
});

defineQuestion({
  id: 'reg-d3-q18',
  type: 'mc',
  domain: 'd3',
  conceptId: 'headless-ci',
  taskStatement: '3.6',
  difficulty: 1,
  estimatedSeconds: 20,
  scenarioId: 'claude-code-ci-cd',
  stem: 'With Claude Code GitHub Actions installed, how does a developer ask Claude to implement a feature described in an issue?',
  options: [
    'Comment `@claude implement this feature based on the issue description` on the issue',
    'Open a PR whose title starts with `[claude]` and reference the issue number in its body',
    'Mention `@claude-bot` in the issue body, which is the app\'s registered trigger phrase',
    'Convert the issue into a draft PR so the review workflow implements the missing code',
  ],
  answerKey: 0,
  explanation:
    'A simple `@claude` mention in any PR or issue triggers Claude to analyze context and act, for example implementing a feature from the issue description. PR titles and draft PRs are not triggers, and the mention must be `@claude` as a complete word rather than `@claude-bot` or `/claude`.',
  misconceptionTag: 'claude-mention-trigger',
  sourceUrls: [GHA],
});

defineQuestion({
  id: 'reg-d3-q19',
  type: 'mc',
  domain: 'd3',
  conceptId: 'headless-ci',
  taskStatement: '3.6',
  difficulty: 2,
  estimatedSeconds: 20,
  scenarioId: 'claude-code-ci-cd',
  stem: 'In a Claude Code Action v1 workflow, you want to cap the run at 5 turns and pin a specific model. Where do those options go?',
  options: [
    'In `claude_args`, for example `--max-turns 5 --model claude-sonnet-5`',
    'In dedicated `max_turns` and `model` inputs on the `claude-code-action@v1` step',
    'At the top of the `prompt` input, as `--max-turns 5 --model claude-sonnet-5`',
    'In the job\'s `env` block, which the action forwards to the CLI as flags',
  ],
  answerKey: 0,
  explanation:
    'The v1 action passes any Claude Code CLI argument through `claude_args`, so `--max-turns` and `--model` belong there. The dedicated `max_turns`/`model` inputs were the beta form that was removed, prompt text is not parsed for flags, and environment variables are not translated into CLI arguments.',
  misconceptionTag: 'claude-args-vs-beta-inputs',
  sourceUrls: [GHA],
});

defineQuestion({
  id: 'reg-d3-q20',
  type: 'mc',
  variant: 'scenario',
  domain: 'd3',
  conceptId: 'headless-ci',
  taskStatement: '3.6',
  difficulty: 2,
  estimatedSeconds: 30,
  scenarioId: 'claude-code-ci-cd',
  stem: 'You want the most thorough automated review of a pull request, with false positives filtered out before findings are posted. Which approach fits best?',
  options: [
    'An independent multi-agent review of the diff, verified against real code behavior before posting',
    'A follow-up turn in the authoring session, asking Claude to list every bug in the code it wrote',
    'A single reviewer agent with a `REVIEW.md` rule that posts only findings it is fully certain of',
    'Two review passes in the same session, keeping only the findings that appear in both',
  ],
  answerKey: 0,
  explanation:
    'Code Review runs multiple specialized agents over the diff in parallel, then a verification step checks candidates against actual code behavior to filter false positives, which is more thorough and better calibrated than self-review. A generating session retains its own reasoning and tends to miss its own mistakes, and a single agent or a repeated pass in that same session adds neither independence nor verification.',
  misconceptionTag: 'independent-review-vs-self-review',
  sourceUrls: [REVIEW],
});

defineQuestion({
  id: 'reg-d3-q21',
  type: 'mc',
  variant: 'scenario',
  domain: 'd3',
  conceptId: 'headless-ci',
  taskStatement: '3.6',
  difficulty: 3,
  estimatedSeconds: 30,
  scenarioId: 'claude-code-ci-cd',
  stem: 'On a long-running PR, every push re-reviews and re-posts the same low-priority nits, drowning the important findings. How do you make re-reviews converge without disabling review?',
  options: [
    'A `REVIEW.md` rule to suppress new nits after the first review and post Important findings only',
    'A `CLAUDE.md` rule capping nits, since Code Review treats `CLAUDE.md` violations as Important',
    'A reply on each nit thread with `@claude review once`, so the next run marks it resolved',
    'Switching the repository\'s Review Behavior to Manual and re-triggering with `@claude review`',
  ],
  answerKey: 0,
  explanation:
    '`REVIEW.md` is the review-only instruction file that reaches every finding and verification agent directly, so a re-review convergence rule such as "after the first review, suppress new nits and post Important findings only" reliably stops style churn. CLAUDE.md guidance lands less reliably and its violations are nits rather than Important, replies to inline comments do not change behavior, and Manual mode with manual re-triggers reposts the same nits on each requested review.',
  misconceptionTag: 'review-md-convergence-vs-claude-md',
  sourceUrls: [REVIEW],
});

defineQuestion({
  id: 'reg-d3-q22',
  type: 'mc',
  domain: 'd3',
  conceptId: 'headless-ci',
  taskStatement: '3.6',
  difficulty: 2,
  estimatedSeconds: 20,
  scenarioId: 'claude-code-ci-cd',
  stem: 'A CI dashboard needs to display Claude\'s tokens as they are generated during a headless run. Which output configuration streams tokens as they arrive?',
  options: [
    '`--output-format stream-json` with `--verbose` and `--include-partial-messages`',
    '`--output-format json` with `--verbose`, which flushes each message as it completes',
    '`--output-format stream-json` on its own, because partial tokens are included by default',
    '`--output-format text` with `--forward-subagent-text`, which streams text deltas',
  ],
  answerKey: 0,
  explanation:
    '`--output-format stream-json` combined with `--verbose` and `--include-partial-messages` emits newline-delimited events so you receive tokens as they are generated. Plain `json` returns one payload at the end whatever else you add, `stream-json` alone emits whole messages rather than partial tokens, and `--forward-subagent-text` only adds subagent text to a stream.',
  misconceptionTag: 'stream-json-vs-json',
  sourceUrls: [HEADLESS],
});

defineQuestion({
  id: 'reg-d3-q23',
  type: 'mc',
  variant: 'scenario',
  domain: 'd3',
  conceptId: 'headless-ci',
  taskStatement: '3.6',
  difficulty: 2,
  estimatedSeconds: 30,
  scenarioId: 'claude-code-ci-cd',
  stem: 'A pipeline runs one headless review, then a later step must ask a follow-up in the same conversation. You are running several conversations in parallel, so you cannot rely on "most recent." How do you continue the right one?',
  options: [
    'Capture `session_id` from the first run\'s JSON output and pass it to `--resume`',
    'Use `--continue` from the same working directory, which scopes it to this conversation',
    'Pass the first run\'s `uuid` from the `system/init` event to `--continue`',
    'Re-send the first prompt, with the earlier result pasted into `--append-system-prompt`',
  ],
  answerKey: 0,
  explanation:
    'When multiple conversations run, you capture the `session_id` from the first run and pass it to `--resume` to continue that specific one. `--continue` takes no ID and only picks the most recent conversation (ambiguous with parallel runs in the same project), and resending the prompt with pasted context starts a fresh session.',
  misconceptionTag: 'resume-session-id-vs-continue',
  sourceUrls: [HEADLESS],
});

defineQuestion({
  id: 'reg-d3-q24',
  type: 'mc',
  domain: 'd3',
  conceptId: 'headless-ci',
  taskStatement: '3.6',
  difficulty: 2,
  estimatedSeconds: 20,
  scenarioId: 'claude-code-ci-cd',
  stem: 'You pipe a PR diff into a headless run and want Claude to act as a security engineer for this review while keeping Claude Code\'s default behavior. Which flag adds that instruction?',
  options: [
    '`--append-system-prompt "You are a security engineer. Review for vulnerabilities."`',
    '`--system-prompt "You are a security engineer. Review for vulnerabilities."`',
    '`--append-system-prompt-file CLAUDE.md`, since the file already lists the review rules',
    '`--agents \'{"security": {...}}\'`, which gives the main session a security persona',
  ],
  answerKey: 0,
  explanation:
    '`--append-system-prompt` adds instructions while keeping Claude Code\'s default behavior, which is what layering a security-reviewer persona onto a normal run needs. `--system-prompt` fully replaces the default, appending CLAUDE.md does not add the persona, and `--agents` defines subagents rather than changing the main session\'s role.',
  misconceptionTag: 'append-vs-replace-system-prompt',
  sourceUrls: [HEADLESS],
});

defineQuestion({
  id: 'reg-d3-q25',
  type: 'mc',
  variant: 'spot-bug',
  domain: 'd3',
  conceptId: 'headless-ci',
  taskStatement: '3.6',
  difficulty: 3,
  estimatedSeconds: 25,
  scenarioId: 'claude-code-ci-cd',
  stem: 'A `package.json` "typo linter" script grants `--allowedTools "Bash(git diff *)"` so Claude can read the diff, then still pipes `git diff main | claude -p ...`. What is the unnecessary part?',
  options: [
    'The Bash grant: the diff arrives on stdin, so Claude never needs Bash to read it',
    'The pipe: `--allowedTools` already loads the diff into context before the prompt runs',
    'The `-p` flag: a prompt string is not needed when the input arrives on stdin',
    'The `*` in `Bash(git diff *)`: prefix matching is on by default, so the wildcard is ignored',
  ],
  answerKey: 0,
  explanation:
    'Piping the diff means Claude does not need Bash permission to read it, so granting `Bash(git diff *)` is redundant when the content already arrives on stdin. The pipe is what supplies the diff (`--allowedTools` only grants permission), `-p` is what makes the run non-interactive, and the trailing ` *` is what turns the rule into a prefix match.',
  misconceptionTag: 'stdin-pipe-avoids-bash-permission',
  sourceUrls: [HEADLESS],
});

defineQuestion({
  id: 'reg-d3-q26',
  type: 'multi',
  domain: 'd3',
  conceptId: 'headless-ci',
  taskStatement: '3.6',
  difficulty: 2,
  estimatedSeconds: 30,
  scenarioId: 'claude-code-ci-cd',
  selectCount: 2,
  stem: 'Which two statements about running Claude Code non-interactively in CI are correct? Select TWO.',
  options: [
    'Non-interactive mode reads stdin, so you can pipe data in and redirect the response out',
    'With `--output-format json`, the payload includes `total_cost_usd` for tracking spend per run',
    'With `-p`, Claude ignores stdin and reads only the prompt string on the command line',
    'With `--json-schema`, the values in `structured_output` are verified correct, not just well-formed',
    '`--bare` loads the project\'s hooks and `.mcp.json` servers so CI matches a developer\'s machine',
  ],
  answerKey: [0, 1],
  explanation:
    'Non-interactive mode reads stdin for piping and, with `--output-format json`, reports cost fields like `total_cost_usd` so callers can track spend. The wrong options invert the facts: `-p` does read stdin, a JSON schema guarantees shape but not correct values, and `--bare` skips local hooks and MCP servers rather than loading them.',
  misconceptionTag: 'headless-stdin-and-cost',
  sourceUrls: [HEADLESS],
});

// =====================================================================================
// SCENARIO C — Developer Productivity Tools (10 items: reg-d3-q27..q36)
// A team standardizes Claude Code configuration across many developers and repos.
// =====================================================================================

defineQuestion({
  id: 'reg-d3-q27',
  type: 'mc',
  variant: 'scenario',
  domain: 'd3',
  conceptId: 'claude-md-hierarchy',
  taskStatement: '3.1',
  difficulty: 2,
  estimatedSeconds: 30,
  scenarioId: 'developer-productivity-tools',
  stem: 'Security wants a compliance reminder applied to every Claude Code session on every developer machine, and individual users must not be able to turn it off. Where should it be deployed?',
  options: [
    'A managed-policy `CLAUDE.md`, which loads before other files and cannot be excluded by settings',
    'A `~/.claude/CLAUDE.md` pushed to every developer machine by MDM, since user memory always loads',
    'The project `CLAUDE.md` in each repository, protected by a branch rule so that no one can edit it',
    'A `.claude/rules/compliance.md` with no `paths`, deployed to each repo so it loads every session',
  ],
  answerKey: 0,
  explanation:
    'A managed-policy CLAUDE.md applies to every session in every repository, loads before user and project files, and cannot be excluded by individual settings, which is what "users must not disable it" requires. A user file can be edited or excluded by its owner, and per-repository files and rules only cover sessions inside those repositories and can be skipped with `claudeMdExcludes`.',
  misconceptionTag: 'managed-policy-cannot-be-excluded',
  sourceUrls: [MEM],
});

defineQuestion({
  id: 'reg-d3-q28',
  type: 'mc',
  domain: 'd3',
  conceptId: 'claude-md-hierarchy',
  taskStatement: '3.1',
  difficulty: 2,
  estimatedSeconds: 20,
  scenarioId: 'developer-productivity-tools',
  stem: 'A team modularizes `CLAUDE.md` with `@path` imports, and some imported files import still others. How deep can that import chain go?',
  options: [
    'Imported files can import others recursively, to a maximum depth of four hops',
    'Imported files can import others recursively, but only to a maximum depth of two hops',
    'Imports nest without limit, but each imported file loads only when Claude reads it',
    'Only the top-level `CLAUDE.md` may import; `@path` lines inside imported files stay literal',
  ],
  answerKey: 0,
  explanation:
    'Imported files can recursively import other files, with a maximum depth of four hops, and everything imported loads at launch. The other options misstate the limit as two hops or none, or deny nesting altogether, none of which matches the documented depth.',
  misconceptionTag: 'import-depth-four-hops',
  sourceUrls: [MEM],
});

defineQuestion({
  id: 'reg-d3-q29',
  type: 'mc',
  variant: 'scenario',
  domain: 'd3',
  conceptId: 'claude-md-hierarchy',
  taskStatement: '3.1',
  difficulty: 3,
  estimatedSeconds: 30,
  scenarioId: 'developer-productivity-tools',
  stem: 'In a large monorepo, sessions keep picking up other teams\' ancestor `CLAUDE.md` files that are irrelevant to your package and waste context. What is the intended way to stop that?',
  options: [
    'Set `claudeMdExcludes` with path or glob patterns in your local settings to skip those files',
    'Start Claude Code with `--add-dir` pointing at your package so only its `CLAUDE.md` loads',
    'Run `/init` inside your package so its generated `CLAUDE.md` overrides the ancestor files',
    'Set `permissions.additionalDirectories` to your package so ancestor memory is skipped',
  ],
  answerKey: 0,
  explanation:
    '`claudeMdExcludes` lets you skip specific ancestor CLAUDE.md files by path or glob, and putting it in `.claude/settings.local.json` keeps the exclusion local to your machine. `--add-dir` and `additionalDirectories` add directories rather than removing ancestors, and a generated `CLAUDE.md` is concatenated with the ancestor files instead of overriding them.',
  misconceptionTag: 'claudemdexcludes-monorepo',
  sourceUrls: [MEM],
});

defineQuestion({
  id: 'reg-d3-q30',
  type: 'mc',
  variant: 'scenario',
  domain: 'd3',
  conceptId: 'slash-commands-skills',
  taskStatement: '3.2',
  difficulty: 1,
  estimatedSeconds: 20,
  scenarioId: 'developer-productivity-tools',
  stem: 'You have a personal "summarize my uncommitted changes" workflow you want available in every project on your machine, invoked on demand. Where does the skill go?',
  options: [
    'In your personal skills folder, at `~/.claude/skills/summarize-changes/SKILL.md`',
    'In `~/.claude/rules/summarize-changes.md`, which loads in every project on your machine',
    'In `~/.claude/CLAUDE.md` under a `## Skills` heading, which registers `/summarize-changes`',
    'In `~/.claude/skills/synced/summarize-changes/`, so it follows your claude.ai account',
  ],
  answerKey: 0,
  explanation:
    'Personal skills in `~/.claude/skills/` are available across all your projects, which is exactly the scope for a personal on-demand workflow. A user rule loads every session instead of on demand, CLAUDE.md content does not register commands, and the `synced` folder is reserved for skills downloaded from claude.ai.',
  misconceptionTag: 'personal-skill-scope',
  sourceUrls: [SKILLS],
});

defineQuestion({
  id: 'reg-d3-q31',
  type: 'mc',
  variant: 'scenario',
  domain: 'd3',
  conceptId: 'slash-commands-skills',
  taskStatement: '3.2',
  difficulty: 3,
  estimatedSeconds: 30,
  scenarioId: 'developer-productivity-tools',
  stem: 'You want a skill\'s multi-step task to run in isolation so its file reads and reasoning do not pollute your main conversation, using the skill body itself as the driving prompt. Which frontmatter field does this?',
  options: [
    '`context: fork`, which runs the skill in a subagent with the skill body as its prompt',
    '`agent: Explore`, which hands the skill to the Explore subagent without a fork being needed',
    '`background: true`, which runs the skill as a background task with a fresh context',
    '`disable-model-invocation: true`, which runs the skill outside the model\'s context',
  ],
  answerKey: 0,
  explanation:
    '`context: fork` runs the skill in an isolated subagent context where the skill content becomes the prompt and it has no access to your conversation history, keeping its work out of the main thread. `agent` and `background` only take effect alongside `context: fork`, and `disable-model-invocation` controls who can start the skill, not where it runs.',
  misconceptionTag: 'context-fork-isolation',
  sourceUrls: [SKILLS],
});

defineQuestion({
  id: 'reg-d3-q32',
  type: 'mc',
  domain: 'd3',
  conceptId: 'path-scoped-rules',
  taskStatement: '3.3',
  difficulty: 1,
  estimatedSeconds: 20,
  scenarioId: 'developer-productivity-tools',
  stem: 'You want one rule to apply to both `.ts` and `.tsx` files under `src/` in a single `paths` pattern. Which glob does that?',
  options: [
    '`src/**/*.{ts,tsx}` using brace expansion',
    '`src/**/*.(ts|tsx)` using a regex group',
    '`src/**/*.[ts,tsx]` using a bracket expression',
    '`src/**/*.ts|tsx` using an alternation',
  ],
  answerKey: 0,
  explanation:
    'Brace expansion lets one pattern match multiple extensions, so `src/**/*.{ts,tsx}` covers both file types recursively under `src/`. Glob syntax has no regex groups or `|` alternation, and a bracket expression matches a single character rather than an extension.',
  misconceptionTag: 'brace-expansion-glob',
  sourceUrls: [MEM],
});

defineQuestion({
  id: 'reg-d3-q33',
  type: 'mc',
  variant: 'scenario',
  domain: 'd3',
  conceptId: 'plan-mode',
  taskStatement: '3.4',
  difficulty: 2,
  estimatedSeconds: 30,
  scenarioId: 'developer-productivity-tools',
  stem: 'A developer needs to rename a single well-understood variable in one file. They still open a full plan-mode cycle with research and approval. What is the better call?',
  options: [
    'Edit directly; a plan cycle adds research and approval overhead a small, clear change does not need',
    'Stay in plan mode but skip its research step, since the approval gate alone is what keeps the edit safe',
    'Switch to `acceptEdits` mode, which still produces a plan but approves it automatically',
    'Delegate the rename to a subagent so the plan and the edit happen outside the main context',
  ],
  answerKey: 0,
  explanation:
    'Plan mode is meant for work you want to review before editing; for a small, well-understood change such as renaming a variable, the docs say to ask Claude to do it directly, because a plan cycle only adds latency. Plan mode has no research-free variant, `acceptEdits` produces no plan at all, and subagent delegation is for isolating verbose exploration, not trivial edits.',
  misconceptionTag: 'plan-mode-vs-direct-execution',
  sourceUrls: [WORKFLOWS],
});

defineQuestion({
  id: 'reg-d3-q34',
  type: 'mc',
  domain: 'd3',
  conceptId: 'plan-mode',
  taskStatement: '3.4',
  difficulty: 2,
  estimatedSeconds: 20,
  scenarioId: 'developer-productivity-tools',
  stem: 'A developer is in plan mode and worried that once they approve the proposed plan, Claude still will not be allowed to make edits. What actually happens on approval?',
  options: [
    'Approving the plan exits plan mode, so Claude can then make the edits it proposed',
    'Approval saves the plan to `CLAUDE.md`; Claude edits only after you restart the session',
    'Approval keeps plan mode on; you must press Shift+Tab again before any edit is allowed',
    'Approval re-runs the research step, then asks you to approve the plan a second time',
  ],
  answerKey: 0,
  explanation:
    'Plan mode holds edits until you approve; approving the plan exits plan mode and switches to the permission mode the approve option describes, so Claude proceeds to make the changes it proposed. Nothing is written to CLAUDE.md, no restart or second Shift+Tab is needed, and approval does not restart the research.',
  misconceptionTag: 'plan-approval-exits-plan-mode',
  sourceUrls: [WORKFLOWS],
});

defineQuestion({
  id: 'reg-d3-q35',
  type: 'multi',
  domain: 'd3',
  conceptId: 'claude-md-hierarchy',
  taskStatement: '3.1',
  difficulty: 3,
  estimatedSeconds: 30,
  scenarioId: 'developer-productivity-tools',
  selectCount: 2,
  stem: 'Which two statements about how CLAUDE.md files load across scopes are correct? Select TWO.',
  options: [
    'Ancestor `CLAUDE.md` files are concatenated in order from the filesystem root down to the working directory',
    'A managed-policy `CLAUDE.md` loads before user and project files and cannot be excluded',
    'A subdirectory `CLAUDE.md` is loaded in full at launch, in the same startup pass as the root file',
    'When a user and a project `CLAUDE.md` both exist, only the more specific project file loads',
    'Within one directory, `CLAUDE.local.md` is read before `CLAUDE.md` so personal notes come first',
  ],
  answerKey: [0, 1],
  explanation:
    'Ancestor files are concatenated root-down so instructions closer to the working directory are read last, and a managed-policy CLAUDE.md loads first and cannot be excluded. The wrong options misstate the rest: subdirectory files load on demand not at launch, both user and project files load together, and `CLAUDE.local.md` is appended after `CLAUDE.md` within a directory.',
  misconceptionTag: 'claude-md-load-order-facts',
  sourceUrls: [MEM],
});

defineQuestion({
  id: 'reg-d3-q36',
  type: 'mc',
  variant: 'scenario',
  domain: 'd3',
  conceptId: 'path-scoped-rules',
  taskStatement: '3.3',
  difficulty: 2,
  estimatedSeconds: 30,
  scenarioId: 'developer-productivity-tools',
  stem: 'A team keeps API-endpoint conventions that only matter when editing files under `src/api/`. They want those rules to consume context only while Claude actually works in that area. What is the right home?',
  options: [
    'A rule in `.claude/rules/` with `paths: ["src/api/**/*.ts"]`, which loads only on matching reads',
    'A `.claude/rules/api.md` without `paths`, since rules load only when their topic comes up',
    'The root `CLAUDE.md` importing `@src/api/CONVENTIONS.md`, which expands only on matching reads',
    'A `CLAUDE.local.md` inside `src/api/`, which only teammates who opt in will load',
  ],
  answerKey: 0,
  explanation:
    'A path-scoped rule with a `paths` glob only enters context when Claude reads files matching the pattern, so the API conventions cost nothing while working elsewhere. An unscoped rule and an `@` import both load every session, and `CLAUDE.local.md` is a personal, gitignored file rather than a way to scope shared team rules by path.',
  misconceptionTag: 'path-scoped-rule-token-efficiency',
  sourceUrls: [MEM],
});
