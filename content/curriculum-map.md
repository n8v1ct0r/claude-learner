# CCA Quest — Curriculum Map (authoring spec)

Source of truth for course/unit/lesson structure. Topic trees derive from official Anthropic
sources (see .engineering/RESEARCH.md#exam-blueprint); weights from content/blueprint.json
(confirmed at Gate 0, 2026-07-13, against the public CCA-F Exam Guide v1.0). Shipped counts:
lesson bank 445 in the five domain courses (d1 119 / d2 80 / d3 88 / d4 89 / d5 69) plus 24 in
Course 0, and an exam register of 180 (49/32/36/36/27), for 649 unique questions. Every lesson:
concept card (analogy FIRST, 4–5 key points as shipped; the schema allows 3–5), 6–10 exercises,
explain-back target, ≤300s estimated total.

Feynman explain-back targets prioritize the confusion pairs where scenario distractors live:
workflows vs agents · subagent vs Agent Skill vs MCP server · tool_choice `any` vs `tool` ·
settings merge vs override · prompt caching vs context editing vs compaction.

## Course 0 — Meet the Exam (1 unit, 3 lessons)

- **C0-U1 "Know the Game"**
  - C0-U1-L1: The CCA-F exam — format (60 Q / 120 min), five domains + weights, scaled scoring, the 720 line
  - C0-U1-L2: Scenario-clustered questions — the 6 published scenarios, decisions-not-definitions, distractor anatomy
  - C0-U1-L3: How this app gets you there — Feynman loop, streaks, SRS, mock readiness; partner-gating honesty screen

## Course 1 — Agentic Architecture & Orchestration (27%, 5 units, 14 lessons, 119 bank Q + 49 register Q)

- **C1-U1 "Think in Agents"** (pilot unit — built at M2)
  - C1-U1-L1: Workflows vs agents — predefined code paths vs model-directed loops
  - C1-U1-L2: The augmented LLM building block — retrieval + tools + memory
  - C1-U1-L3: The agentic loop — gather context → act → observe → repeat; stop conditions
- **C1-U2 "The Five Patterns"**
  - C1-U2-L1: Prompt chaining + routing — when each fits
  - C1-U2-L2: Parallelization — sectioning vs voting
  - C1-U2-L3: Orchestrator-workers + evaluator-optimizer
- **C1-U3 "Keep It Simple"**
  - C1-U3-L1: When NOT to build an agent — cost/latency/error tradeoffs, start simple
  - C1-U3-L2: Multi-agent economics — token multiplication, when single-agent wins
- **C1-U4 "Subagents & Orchestration"**
  - C1-U4-L1: Subagents — isolated context windows, restricted tools, per-agent models, specialized prompts
  - C1-U4-L2: Orchestrator / hub-and-spoke design — decomposition and delegation
  - C1-U4-L3: Parallel vs sequential execution; partial-failure handling
- **C1-U5 "Agent SDK & Guardrails"**
  - C1-U5-L1: Claude Agent SDK — query loop, sessions, ResultMessage subtypes, permission modes, hooks, auto-compaction
  - C1-U5-L2: Guardrails — max_turns, budget caps, permission gates, HITL approvals; stop_reason branching
  - C1-U5-L3: Evaluating agents — LLM-as-judge, trajectory vs outcome evals; session state and resumability

## Course 2 — Tool Design & MCP Integration (18%, 4 units, 10 lessons, 80 bank Q + 32 register Q)

- **C2-U1 "Tool Anatomy"**
  - C2-U1-L1: Tool definition anatomy — name, description, input_schema; description quality is the selection lever
  - C2-U1-L2: The tool-use loop — stop_reason `tool_use` → execute → tool_result → continue
  - C2-U1-L3: tool_choice modes (auto/any/tool/none) + parallel tool calls & disable_parallel_tool_use
- **C2-U2 "Robust Tools"**
  - C2-U2-L1: Tool error handling — is_error, actionable messages, retryable vs terminal; strict tool use
  - C2-U2-L2: Writing tools for agents — pagination, token-efficient responses, consolidation; client vs server tools
- **C2-U3 "MCP Fundamentals"**
  - C2-U3-L1: MCP architecture — host / client / server, JSON-RPC 2.0
  - C2-U3-L2: Server primitives — tools, resources, prompts
  - C2-U3-L3: Advanced primitives — elicitation, notifications; sampling and roots taught as legacy
    (deprecated as of MCP protocol 2026-07-28; items marked volatile)
- **C2-U4 "MCP in Practice"**
  - C2-U4-L1: Transports — stdio vs Streamable HTTP; OAuth/bearer auth
  - C2-U4-L2: MCP config scopes in Claude Code (local > project > user); tools vs MCP servers vs Agent Skills

## Course 3 — Claude Code Configuration & Workflows (20%, 4 units, 11 lessons, 88 bank Q + 36 register Q)

- **C3-U1 "Memory & Rules"**
  - C3-U1-L1: CLAUDE.md hierarchy — enterprise → user → project → directory; import syntax
  - C3-U1-L2: .claude/rules/ — YAML frontmatter, path-scoped rules
  - C3-U1-L3: Context commands — /clear, /compact, /memory (exam-guide framing; current docs:
    /context lists loaded memory files), # shortcut, auto-compact
- **C3-U2 "Settings & Permissions"**
  - C3-U2-L1: Settings precedence — managed → CLI → local → project → user; permission rules MERGE
  - C3-U2-L2: Permission system + modes — default, acceptEdits, plan, bypassPermissions
  - C3-U2-L3: Plan Mode — read-only planning before execution
- **C3-U3 "Extending Claude Code"**
  - C3-U3-L1: Hooks — PreToolUse/PostToolUse/UserPromptSubmit/Stop/…; exit-code semantics (0/2/other)
  - C3-U3-L2: Slash commands + Agent Skills — SKILL.md, frontmatter, progressive disclosure
  - C3-U3-L3: Claude Code subagents (.claude/agents) + adding MCP servers (scopes, transports)
- **C3-U4 "Teams & Automation"**
  - C3-U4-L1: Headless & CI — claude -p, output formats, GitHub Actions, automated review
  - C3-U4-L2: Git workflows — commits, PRs, worktrees; team standardization via checked-in config

## Course 4 — Prompt Engineering & Structured Output (20%, 4 units, 11 lessons, 89 bank Q + 36 register Q)

- **C4-U1 "Core Techniques"**
  - C4-U1-L1: Clear, direct instructions — system prompts and role prompting
  - C4-U1-L2: Few-shot — 3–5 diverse XML-wrapped examples; examples beat instructions for format
  - C4-U1-L3: Chain-of-thought + extended thinking — effort/budget tradeoffs
- **C4-U2 "Structure"**
  - C4-U2-L1: XML tags, prompt templates/variables, positive directives
  - C4-U2-L2: Structured Outputs — output_config.format, schema support/limits, refusal & max_tokens edges
  - C4-U2-L3: Tool-based extraction vs structured outputs vs legacy prefill; validation-retry loops
- **C4-U3 "Scale & Ground"**
  - C4-U3-L1: Long-context prompting — documents at the TOP, quote-extraction-first grounding
  - C4-U3-L2: Hallucination mitigation — permission to say "I don't know", citation grounding
  - C4-U3-L3: Message Batches API — 50% discount, high-volume extraction patterns
- **C4-U4 "Evaluate"**
  - C4-U4-L1: Success criteria + empirical prompt evaluation
  - C4-U4-L2: AI Fluency 4D — Delegation, Description, Discernment, Diligence (breadth on 4.1/4.6;
    not named in the exam guide; sourced from Anthropic's AI Fluency Framework PDF + Academy course page)

## Course 5 — Context Management & Reliability (15%, 3 units, 9 lessons, 69 bank Q + 27 register Q)

- **C5-U1 "The Context Window"**
  - C5-U1-L1: Window mechanics — context rot, lost-in-the-middle
  - C5-U1-L2: Context engineering — smallest high-signal set; prune / summarize / delegate
  - C5-U1-L3: Prompt caching — cache_control, 4 breakpoints, TTLs, cost multipliers, invalidation
- **C5-U2 "Active Management"**
  - C5-U2-L1: Context editing API — clear_tool_uses / clear_thinking, triggers, cache interaction
  - C5-U2-L2: Compaction — server-side, Claude Code auto-compact, Agent SDK; memory tool/files
  - C5-U2-L3: count_tokens + token budgeting
- **C5-U3 "Reliability"**
  - C5-U3-L1: stop_reason taxonomy + HTTP error taxonomy — retryable vs not, backoff, Retry-After
  - C5-U3-L2: Rate limits (RPM/ITPM/OTPM) + streaming via SSE
  - C5-U3-L3: HITL escalation triggers, graceful degradation, structured error propagation

## Exam register & assessments

- Register: 180 questions (d1 49 / d2 32 / d3 36 / d4 36 / d5 27), scenario-clustered.
- 3 mock forms × 60 Q, pairwise disjoint, per-form 16/11/12/12/9 ±1, ≥60% difficulty ≥2,
  4 scenario clusters per form from the published pool + standalones.
- 5 mini-exams (one per domain, 18 Q as shipped) assembled BY REFERENCE from the register only;
  every mini item also appears in a mock form (mock-1 reuses all 60 of its items in minis).
- Distractor style: plausible-but-flawed architectures (wrong pattern for the failure mode,
  cache-hostile ordering, over-agentic design) — decisions, not definitions.

## Sourcing rules

Cite only the hosts in content/blueprint.json `citation_allowlist` (the enforced list):
platform.claude.com / docs.claude.com / docs.anthropic.com / code.claude.com / anthropic.com
(engineering + news) / www-cdn.anthropic.com (published PDFs) / claude.com (blog) /
academy.claude.com / modelcontextprotocol.io / anthropic.skilljar.com +
anthropic-partners.skilljar.com (certification landing page) / the public CCA-F Exam Guide PDF host
(everpath-course-content.s3-accelerate.amazonaws.com; the S3 path may change on re-upload, so the
landing page is the stable entry point). Cite final URLs, not redirects.
Skilljar courses define SCOPE only — paraphrase concepts, never mirror course text.
The unlicensed reference repo (paullarionov/claude-certified-architect) is a coverage
cross-check only. Volatile/beta-headered features get `volatile: true`.
