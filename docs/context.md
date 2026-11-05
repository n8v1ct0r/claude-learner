# CCA Quest — Full Context

A single-file briefing on what this app is, for anyone (human or agent) who needs the whole picture
without reading through `.engineering/GOAL.md` + `PLAN-rev2.md` + `ROADMAP.md` +
`content/curriculum-map.md` separately. This is a narrative synthesis of those documents, not a
replacement for them — the `.engineering/` files remain the authoritative, contract-enforced
source; this file will drift over time and should be treated as a fast-orientation read, not ground
truth for anything the eval harness checks.

## Elevator pitch

CCA Quest is a Duolingo-style iPhone app whose entire job is getting Nate a passing score
(≥720/1000) on the Anthropic Claude Certified Architect – Foundations exam. It borrows Duolingo's
full engagement mechanic — path, XP, streaks, energy, gems, quests, achievements, a leaderboard, a
practice hub, timed mock exams, and juice — and puts the Feynman technique (explain the concept
back, graded by Claude) at the center as the default lesson path, not an optional extra. The visual
identity ("Clay") is warm, dark, clay-toned, chunky-3D-button Duolingo-feel wearing a Claude-world
skin, with a terracotta pixel Claude Code agent as mascot and app icon (D21 replaced an earlier
octopus concept named "Archie" — see `.engineering/DECISIONS.md`). See `product.md` for the product framing and
`docs/design-north-star.md` for the full aesthetic spec — this file is the connective layer between
them plus everything else (content, tech, constraints) in one place.

## The user and the goal

One user, one exam, one number: Nate needs ≥720/1000 on CCA-F. There is no persona research to do
here — the target user is fully specified, self-reported ADHD context and all, and every UX
decision (≤5-min lessons, one CTA per screen, no shame, deliberate exit points) is built around how
he actually studies rather than a generic learner. The product succeeds or fails on that one exam
score; every other metric (streak length, lessons completed, XP) is a leading indicator, not a
goal.

## Full feature inventory

**Study loop**
- Duolingo-style path: units with lesson / chest / legendary / review nodes, data-driven per
  course, not hardcoded.
- Lesson player: concept card (analogy-first, 3–5 key points) → renderer-based exercises (multiple
  choice, multi-select, match-pairs, order-steps, cloze, true/false-speed) → **Feynman explain-back
  (default path, graded by Claude)** → gap card if the explanation misses a key point → optimistic
  ceremony that never waits on grading.
- Cold-open behavior: launching the app lands one tap from resuming exactly where you left off,
  including mid-lesson.
- Unit review: energy-free review pass at the end of a unit.

**Pedagogy**
- Feynman explain-back is the default, not a toggle; skipping it requires an explicit tap (logged).
- A completed explain-back upgrades the lesson's reward chest bronze → silver — the game mechanic
  literally rewards the deeper study method over the shallow one.
- Explain-back targets are chosen specifically at the confusion pairs where exam distractors live
  (e.g. workflows vs. agents, subagent vs. Agent Skill vs. MCP server, `tool_choice: any` vs.
  `tool`, settings merge vs. override, prompt caching vs. context editing vs. compaction).

**Gamification engines** (all pure TS, unit-tested, no UI dependency)
- XP + combo bonuses.
- Streak state machine: `active` → missed day auto-consumes a silent free freeze (2 equipped from
  day one) → freezes exhausted → `paused` (count preserved, displayed warmly, e.g. "Streak resting
  at 12") → any lesson within 7 days resumes at the frozen count → after 7 days archives to
  `longest` with a warm restart. Nothing ever "breaks."
- Energy: gates only *new path-lesson starts* (cost 1, max 5); never gates practice, SRS, mistake
  review, explain-back, or mock exams. A mistake costs 1; 5-in-a-row correct restores 1; completing
  any practice/SRS session restores 1; passive refill 1 per 45 min. At 0 energy, the path always
  offers a one-tap zero-cost warmup with a guaranteed +2 refund — never a hard stop.
- Reward economy: bronze/silver/gold chests with bounded-random gem payouts on a guaranteed floor
  and **published in-app odds**; occasional cosmetic drops (mascot cosmetics, blueprint skins); nothing
  purchasable with real money; no near-miss animations.
- Gem sinks: extra streak freezes, cosmetics, 15-minute 2× XP windows — priced within what's
  earnable at the stated daily goal.
- Quests: 3 rotating daily quests, escalating chest rewards, an all-three completion bonus.
- Achievements: tiered, with monthly rollover.
- Commitment goal: gain-framed only (pick a 7-day goal, preview the completion bonus) — missing
  days costs nothing, no wager mechanic (a wager was explicitly considered and cut).

**Practice & retention**
- Practice Hub: energy-free, always available.
- FSRS is the **single** spaced-repetition scheduler (no due-count ever shown); daily review
  presentation is capped from the user's daily-goal minutes (~2 cards/min), with overflow silently
  rescheduled — never a backlog wall.
- Automatic mistake capture feeds SRS without any manual "add to review deck" step.
- After ≥5 idle days, the first session back is a fixed 10-card confidence-weighted warmup with a
  "welcome back" agent state — not an Anki-style shame wall of everything overdue.

**Mock exams**
- 3 pairwise-disjoint full 60-question mock forms (per-form domain split 16/11/12/12/9 ±1, ≥60%
  difficulty ≥2, 4 scenario clusters per form) + 5 mini-exams (one per domain, 15–20 Q, assembled by
  reference from the bank/register).
- 120-minute countdown timer, question navigator, flagging, auto-submit, and full crash-resume.
- Sim mode (timed, exam-realistic) and untimed guided mode.
- Transparent scaled-score estimate (with an explicit "estimated" disclaimer), domain-level
  readiness report, weak-domain relearn patch plan, and a predicted-score dial against the 720 line
  with days-to-exam pacing.

**Social / leaderboard**
- One global weekly leaderboard, opt-out-able; minimal-field RPC (rank, display name, weekly XP,
  "is me" flag only). The primary comparison surface is "beat your own past week," not ranking
  against strangers.

**Notifications**
- Local only (no push entitlement on a free Apple ID).
- Playful-supportive tone, timed to habitual hour, quiet hours 21:00–07:00.
- Auto-mutes after 5 operationally-defined ignores; capped at ≤5 scheduled ahead; permission
  priming happens *after* the first lesson completes (value shown before the OS dialog), not at
  cold launch.
- Streak-nudge copy is always forward-looking ("the agent saved your streak — 5 min keeps it warm"),
  never loss-framed.

**Account & sync**
- Anonymous-first: the very first full lesson happens before any signup screen.
- Optional upgrade path to email OTP later, preserving all progress across the upgrade.
- Full offline-first sync: lessons, mocks, and SRS work with no connection; an idempotent XP outbox
  replays cleanly against Supabase with zero duplicate awards on double-replay; two-way newer-wins
  merge across progress, energy, streak, SRS, quests, achievements, exams, and leaderboard privacy.

## Content structure

Curriculum weights are `{d1: 27%, d2: 18%, d3: 20%, d4: 20%, d5: 15%}` (provisional until Gate 0's
official exam guide confirms them — see `.engineering/DECISIONS.md` D10). Full build: 6 courses, 21
units, 58 lessons, 649 unique questions (469 lesson-bank + 180 exam-register).

| Course | Weight | Focus |
|---|---|---|
| Course 0 — Meet the Exam | — | exam format, scoring, how the app's mechanics map to prep |
| Course 1 — Agentic Architecture & Orchestration | 27% | largest domain |
| Course 2 — Tool Design & MCP Integration | 18% | |
| Course 3 — Claude Code Configuration & Workflows | 20% | |
| Course 4 — Prompt Engineering & Structured Output | 20% | |
| Course 5 — Context Management & Reliability | 15% | |

Every lesson: an analogy-first concept card with 3–5 key points, 6–10 exercises, an explain-back
target, and a ≤300-second total time budget (a build gate, not a guideline — `GC-02`). Every
question cites an official Anthropic/MCP source (`docs.claude.com`, `platform.claude.com`,
`anthropic.com` engineering/news, `modelcontextprotocol.io`, `anthropic.skilljar.com`); Skilljar
course content defines scope only and is always paraphrased, never mirrored. The unlicensed
reference repo `paullarionov/claude-certified-architect` is used strictly for coverage
cross-checking — its content is never copied.

## Design system (summary — full spec in `docs/design-north-star.md`)

"Clay" — warm-dark theme only in v1 (`#1F1B16` bg / `#2A251E` elevated), terracotta clay accent
family (`#CC785C`), distinct game-juice accent colors (XP gold, gem teal, streak flame, sage
success), deliberately **no harsh red** anywhere. Nunito type across a Dynamic-Type-aware tiered
token system. Chunky 3D-pressed buttons (hard 4px shadow, translateY(4px) + haptic on press).
Mascot & app icon: a terracotta pixel Claude Code agent (`src/components/ClaudeAgentMascot.tsx`;
replaced an earlier octopus concept per D21), shown in a graduation cap + diploma on the app icon.
All juice gated on reduce-motion and sound/haptics toggles.

## Tech stack

Expo SDK 57 (React Native + TypeScript, expo-router), zustand for state (persisted to
AsyncStorage), Supabase (Postgres + RLS) for user-state sync only — **content never lives in
Postgres**; it ships as a bundled SQLite asset built by a content pipeline (zod-validated
authoring format → `content.db`). Edge functions handle Feynman grading via the Anthropic API
(rate-limited, quota-capped, identity from the auth token only). FSRS for spaced repetition.
Reanimated for motion. `@/*` path alias. See `README.md` for scripts and repo layout.

## The ten ADHD-first rules (structural, not stylistic)

1. One primary CTA per screen, largest tap target.
2. Lessons ≤5 min, ≤2 concepts — enforced as a content build gate.
3. No shame anywhere — banned-copy lint covers authored content *and* runtime LLM text.
4. Energy never hard-blocks; practice is always free; recovery is always one tap away.
5. Deliberate exit points — a "goal hit, you can stop now" screen after the daily goal.
6. Notifications are playful-supportive, habitual-hour timed, auto-mute after 5 ignores, quiet
   hours honored.
7. Choice minimization in onboarding: exam date → daily-goal pick → first full lesson (before
   signup) → notification priming → save-progress prompt after the first streak. No placement
   quiz, no wager.
8. Leaderboard is opt-out-able; the default comparison is against your own past week.
9. Progress is always additive — nothing turns red, no depleting bars, no due-count anywhere.
10. A predicted-score dial (vs. the 720 line) + days-to-exam + required pace is the one "am I
    actually learning" signal surfaced to the user.

## Non-goals (explicitly out of scope for v1)

- App Store / TestFlight distribution.
- Real multi-tier leagues/cohorts.
- Light theme.
- Remote push notifications.
- Sign in with Apple.
- Copying content from the unlicensed reference repo.

## Where the rest lives

- `product.md` — product framing: problem, value prop, success criteria.
- `docs/design-north-star.md` — full aesthetic spec and rationale.
- `.engineering/GOAL.md` — the signed contract: 17 criteria, each wired to an automated check.
- `.engineering/PLAN-rev2.md` — full architecture, design system, content plan, and milestone spec.
- `.engineering/ROADMAP.md` — milestone sequencing and human gates.
- `.engineering/STATE.md` — live build status and the current NEXT action.
- `content/curriculum-map.md` — full course/unit/lesson authoring spec.
