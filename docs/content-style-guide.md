# Content Style Guide — CCA Quest

Governs every lesson, question, and concept card. Enforced mechanically where possible
(`content:validate`, copy-lint); the rest is reviewed against this doc.

## Voice

Warm, curious, direct. Address the learner as "you". The terracotta pixel Claude Code agent mascot is
encouraging, never patronizing: "Found a gap — that's the good part." No shame vocabulary
(evals/banned-copy.json). No filler enthusiasm ("Awesome!!!"); one exclamation mark per lesson, max.

## Concept cards (the LEARN step)

1. **Analogy first.** Open with a plain-world analogy before any terminology.
   ("An MCP server is a universal power adapter: any tool can plug into any AI.")
2. Then 2–3 plain sentences of what it is and when you'd use it. Reading level ~grade 8.
3. Then the **"exam words" strip**: the canonical terms the exam will use (`tool_choice: "any"`,
   `stop_reason: "tool_use"`), formatted as code where they are code.
4. Optionally one tiny snippet (≤8 lines) — real syntax, from the cited doc.
5. **3–5 key points** with stable IDs (`kp-<concept>-1`) — these are BYTE-IDENTICAL to what the
   Feynman grader scores against (GC-15d). Write them as claims a learner could state.
6. ≤2 concepts per lesson. If a topic needs three, it is two lessons.

## Questions

- **Decisions, not definitions.** Prefer "which design fixes this failure mode" over "what does
  X stand for". Scenario stems describe a concrete situation in ≤3 sentences.
- Distractors are **plausible-but-flawed architectures**: wrong pattern for the failure mode,
  cache-hostile ordering, over-agentic design, right tool at the wrong scope. Never joke options,
  never "all of the above", never trick negatives ("which is NOT…" sparingly, ≤10% of a unit).
- Single-MC: exactly 4 options, exactly 1 correct. Multi-select: 4–6 options, 2–3 correct, and the
  stem STATES HOW MANY to select ("Select TWO.") — matching the official item format; never
  "select all that apply."
- Every question: `explanation` (why right is right AND why the tempting distractor is wrong,
  2–4 sentences), ≥1 `sourceUrls` from the allowlist, `difficulty` 1–3, `conceptId`,
  `estimatedSeconds` (defaults per type), `misconceptionTag` where a distractor encodes a known
  confusion pair.
- Stems must be answerable from the cited doc — a reviewer re-derives the key from the source.
- Style: American English, sentence case, no em dashes in learner-facing copy, code terms in
  backticks, product names exact (Claude Code, Agent SDK, MCP).

## Confusion pairs (Feynman + distractor priority)

workflows vs agents · subagent vs Agent Skill vs MCP server · tool_choice `any` vs `tool` ·
settings merge vs override · prompt caching vs context editing vs compaction · retryable vs
terminal errors · CLAUDE.md hierarchy levels · hooks exit-code semantics.

## Explain-back prompts (the Feynman step)

One sentence ask, one concept: "Teach the agent: why would you pick a workflow over an agent here?"
Expect 1–3 learner sentences. The rubric rewards coverage of key points in PLAIN language;
jargon without explanation gets a gentle jargon flag, never a penalty framing.

## Volatility & IP

- Beta-headered/fast-moving features (context editing, compaction): `volatile: true`.
- Skilljar course text is Anthropic's IP — paraphrase concepts; scope only.
- The unlicensed reference repo is a coverage cross-check ONLY.

## ADHD constraints (build gates, not vibes)

- Lesson `estimatedSeconds` sum ≤300s including the 90s explain-back (GC-02).
- One idea per exercise; stems ≤3 sentences; options ≤14 words each where possible.
- Progress is additive: explanations frame mistakes as "added to your review deck".
