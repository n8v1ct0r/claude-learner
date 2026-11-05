# CCA-F Official Task Statements (condensed authoring reference)

Derived from the official "Claude Certified Architect – Foundations Exam Guide" v1.0
(effective July 2026), provided by Nate 2026-07-13. Full PDF: `docs/official/` (gitignored,
local only). 30 task statements total (7/5/6/6/6). **Exam items are written against these
objectives** — every lesson and question we author must trace to one.

Item format (official): multiple-choice AND multiple-response; **each item states how many
responses to select**. 4 scenarios per sitting from the bank of 6. Score report shows
percent-correct by domain.

## Domain 1 — Agentic Architecture & Orchestration (27%)

- **1.1 Agentic loops**: stop_reason lifecycle ("tool_use" → execute → append results → repeat;
  "end_turn" → done); tool results appended to history; model-driven decisions vs pre-configured
  trees. Anti-patterns: parsing NL for termination, arbitrary iteration caps as primary stop,
  assistant-text as completion signal.
- **1.2 Coordinator-subagent orchestration**: hub-and-spoke; subagents have ISOLATED context (no
  auto-inheritance); coordinator decomposes/delegates/aggregates + dynamically selects subagents;
  risk of overly narrow decomposition (coverage gaps); route all inter-subagent comms through the
  coordinator; iterative refinement loops (evaluate synthesis → re-delegate targeted queries).
- **1.3 Subagent invocation/context/spawning**: Task tool spawns subagents; coordinator's
  allowedTools must include "Task"; context passed explicitly in the subagent prompt; structured
  data (source URLs, metadata) to preserve attribution; parallel spawning = multiple Task calls in
  ONE response; AgentDefinition (descriptions, system prompts, tool restrictions); fork-based
  sessions for divergent exploration; goal/quality-criteria prompts over step-by-step scripts.
- **1.4 Multi-step workflows, enforcement, handoffs**: programmatic enforcement (hooks,
  prerequisite gates) vs prompt guidance — prompts have non-zero failure rate where compliance
  must be deterministic (e.g. block process_refund until get_customer verified); decompose
  multi-concern requests, investigate in parallel, synthesize; structured handoff summaries
  (customer ID, root cause, recommended action) for humans without transcript access.
- **1.5 Agent SDK hooks**: PostToolUse to normalize heterogeneous data before the model sees it;
  PreToolUse-style interception to enforce business rules (block refunds > $500 → escalate);
  hooks = deterministic guarantees, prompts = probabilistic compliance.
- **1.6 Task decomposition strategies**: fixed pipelines (prompt chaining) for predictable
  multi-aspect work vs dynamic adaptive decomposition for open-ended investigation; per-file
  local passes + separate cross-file integration pass to avoid attention dilution; map structure
  → prioritize → adapt as dependencies emerge.
- **1.7 Session state, resumption, forking**: --resume <session-name>; fork_session for parallel
  branches from a shared baseline; inform resumed sessions about file changes; fresh session +
  structured summary beats resuming with stale tool results.

## Domain 2 — Tool Design & MCP Integration (18%)

- **2.1 Tool interface design**: descriptions are THE tool-selection mechanism; include input
  formats, example queries, edge cases, boundaries ("when to use vs alternatives"); overlapping
  descriptions cause misrouting; keyword-sensitive system-prompt wording can override good
  descriptions; split generic tools into purpose-specific ones with clear contracts.
- **2.2 Structured error responses**: MCP isError flag; error taxonomy: transient / validation /
  business / permission; generic "Operation failed" prevents recovery decisions; return
  errorCategory + isRetryable + human-readable description; retriable:false + friendly
  explanation for business-rule violations; subagents recover locally from transient errors,
  propagate only unresolvable ones with partial results; access failure ≠ valid empty result.
- **2.3 Tool distribution + tool_choice**: too many tools (18 vs 4–5) degrades selection;
  out-of-specialization tools get misused; scope tools per agent role; tool_choice "auto" / "any"
  (must call SOME tool) / {"type":"tool","name":...} (forced specific); force extract-first
  sequencing; "any" guarantees a tool call instead of conversational text.
- **2.4 MCP servers in Claude Code**: project .mcp.json (shared, version-controlled) vs
  user-level ~/.claude.json (personal); env-var expansion ${GITHUB_TOKEN} keeps secrets out of
  git; all configured servers' tools discovered at connection time simultaneously; MCP RESOURCES
  expose content catalogs (schemas, issue summaries) to cut exploratory tool calls; enrich MCP
  tool descriptions so the agent doesn't prefer built-ins (Grep) over better MCP tools;
  community servers for standard integrations, custom for team-specific.
- **2.5 Built-in tools**: Grep = content search; Glob = filename/pattern; Read/Write full-file;
  Edit = targeted unique-anchor modification (falls back to Read+Write on non-unique match);
  incremental codebase understanding (Grep entry points → Read to trace) over reading everything.

## Domain 3 — Claude Code Configuration & Workflows (20%)

- **3.1 CLAUDE.md hierarchy**: user (~/.claude/CLAUDE.md, personal, NOT shared via VCS) vs
  project (root CLAUDE.md, shared) vs directory-level; @import syntax for modularity;
  .claude/rules/ as alternative to monolithic CLAUDE.md; /memory to diagnose what's loaded.
- **3.2 Slash commands + skills**: project .claude/commands/ (shared) vs ~/.claude/commands/
  (personal); skills in .claude/skills/ with SKILL.md frontmatter: context: fork (isolated
  sub-agent context to avoid polluting main conversation), allowed-tools (restrict during
  execution), argument-hint; skills = on-demand invocation, CLAUDE.md = always-loaded standards.
- **3.3 Path-specific rules**: .claude/rules/ YAML frontmatter `paths:` glob patterns; rules load
  only when editing matching files (token efficiency); glob rules beat directory CLAUDE.md when
  conventions span directories (**/*.test.tsx).
- **3.4 Plan mode vs direct execution**: plan mode for large-scale/architectural/multi-approach/
  multi-file work (safe exploration before commitment); direct execution for well-scoped clear
  changes; Explore subagent isolates verbose discovery; combine plan-then-execute.
- **3.5 Iterative refinement**: 2–3 concrete input/output examples beat prose; test-first
  iteration (share failures to guide); interview pattern (Claude asks questions first);
  interacting fixes in one message vs independent fixes sequentially; document testing standards
  and fixtures in CLAUDE.md to improve generated-test quality.
- **3.6 Claude Code in CI/CD**: -p / --print non-interactive; --output-format json +
  --json-schema for machine-parseable output; CLAUDE.md provides CI review context; independent
  review instance beats self-review (generation session retains its own reasoning context);
  include prior findings on re-review to avoid duplicates; provide existing tests to avoid
  duplicate generation.

## Domain 4 — Prompt Engineering & Structured Output (20%)

- **4.1 Explicit criteria**: specific categorical criteria beat vague ("flag comments only when
  claimed behavior contradicts code" vs "check accuracy"); "be conservative" fails to improve
  precision; high false-positive categories destroy trust — temporarily disable them; severity
  definitions with concrete code examples per level.
- **4.2 Few-shot**: most effective technique for consistent formatted output; 2–4 targeted
  examples for ambiguous cases showing WHY one action over alternatives; demonstrate desired
  output format; distinguish acceptable patterns from genuine issues; varied document structures
  reduce extraction hallucination.
- **4.3 Structured output via tool use + JSON schemas**: tool_use with JSON schemas = guaranteed
  schema-compliant output, eliminates syntax errors but NOT semantic errors (wrong values that
  validate); tool_choice "auto" (may return text) vs "any" (must call some tool) vs forced
  specific tool; optional/nullable fields prevent fabrication when source lacks info; enum +
  "other"+detail / "unclear" values for extensibility and ambiguity.
- **4.4 Validation/retry/feedback loops**: retry-with-error-feedback (append the specific
  validation error); retries fix format/structural errors, NOT missing source information;
  detected_pattern fields enable false-positive analysis; semantic validation (calculated_total
  vs stated_total, conflict_detected booleans).
- **4.5 Batch processing**: Message Batches API = 50% cost savings, ≤24h window, no latency SLA;
  for non-blocking latency-tolerant work (overnight reports), NOT blocking pre-merge checks; no
  multi-turn tool calling within a batch request; custom_id correlation; resubmit only failures
  (chunk oversized docs); refine prompts on a sample before batching large volumes.
- **4.6 Multi-instance/multi-pass review**: self-review is weak (model retains generation
  reasoning); independent instance without prior context catches more; per-file local passes +
  cross-file integration pass; self-reported confidence per finding enables calibrated routing.

## Domain 5 — Context Management & Reliability (15%)

- **5.1 Long-interaction context**: progressive summarization risks losing numbers/dates/
  expectations; lost-in-the-middle position effects; verbose tool results consume context
  disproportionately (trim to relevant fields); persistent "case facts" block outside summarized
  history; key-findings summaries at the TOP; subagents return structured data (key facts,
  citations, relevance) not verbose reasoning when downstream budgets are tight.
- **5.2 Escalation & ambiguity**: valid triggers = explicit customer request, policy gaps/
  exceptions, inability to progress — NOT sentiment or self-reported confidence (poorly
  calibrated); honor explicit human requests immediately; multiple entity matches → ask for
  identifiers, never heuristic-pick; explicit escalation criteria + few-shot in system prompt.
- **5.3 Error propagation in multi-agent systems**: structured error context (failure type,
  attempted query, partial results, alternatives) enables coordinator recovery; access failure ≠
  empty result; silent suppression AND whole-workflow termination on single failure are both
  anti-patterns; synthesis output annotates coverage gaps.
- **5.4 Large-codebase context**: extended-session degradation ("typical patterns" instead of
  discovered specifics); scratchpad files persist findings across boundaries; subagent delegation
  isolates verbose exploration; phase summaries injected into next phase; structured state
  exports (manifests) for crash recovery; /compact during long exploration.
- **5.5 Human review & confidence calibration**: aggregate accuracy masks per-segment failures;
  stratified random sampling of high-confidence extractions; field-level confidence calibrated
  on labeled sets; validate per document type/field before automating.
- **5.6 Provenance & uncertainty in synthesis**: claim-source mappings preserved through
  summarization/merging; conflicting credible sources → annotate both with attribution, never
  arbitrarily pick; publication/collection dates prevent temporal misreads; well-established vs
  contested findings distinguished; render content-appropriately (tables/prose/lists).
