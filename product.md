# CCA Quest — Product

## What this is

A gamified, Duolingo-style iPhone study app whose entire purpose is getting Nate a passing score
(≥720/1000) on the Anthropic **Claude Certified Architect – Foundations (CCA-F)** exam. It is not a
general-purpose learning platform — it is a single-purpose exam-prep instrument, scoped to one
person, one exam, one deadline. Everything in the product exists to serve that outcome; features
that don't move the needle on "will Nate pass" are explicitly out of scope (see Non-goals).

## Who it's for

One user: Nate. Self-reported ADHD context, best thinking in the morning, low tolerance for
friction, guilt, or busywork. The product is built around how he actually studies — short bursts,
visual/first-principles explanations, momentum-driven habits — not around a generic learner
persona. This means the UX rules in the design north star (no shame, one CTA, ≤5-minute lessons)
aren't stylistic flourishes; they're the actual mechanism by which the app gets used daily instead
of abandoned after week one, the way most study tools are.

## The problem

Studying for a certification exam solo is a motivation problem before it's a content problem. The
content (official Anthropic docs, MCP spec, agent architecture patterns) is dense, technical, and
has no built-in spaced-repetition or feedback loop. Left to a PDF and a study guide, the realistic
failure mode isn't "didn't understand the material" — it's "stopped opening the PDF after four
days." Duolingo-style apps solve exactly this problem for language learning: they turn a
diffuse, undated goal into a daily habit with visible momentum. CCA Quest applies that same
mechanism to a single, narrow, deadline-bound exam.

## The solution

Duolingo's full engagement mechanic (path progression, XP, streaks, energy, gems, quests,
achievements, a leaderboard, a practice hub, timed mock exams, and "juice" — the animations,
sound, and haptics that make completing a lesson feel good) layered on top of the **Feynman
technique** as the graded, contract-protected core pedagogy: for every lesson, explaining the
concept back in your own words (graded by Claude) is the *default* path, not an optional add-on.
Multiple-choice recall proves you can recognize an answer; explain-back proves you actually
understand the concept well enough to teach it — which is the level of understanding the exam
(and the job the exam certifies you for) actually requires.

## Core loop

1. Open the app → land one tap from resuming exactly where you left off (no menu-hunting).
2. Complete a lesson (≤5 minutes, ≤2 concepts): read a concept card → answer a question →
   **explain it back** (default) → see any gap surfaced immediately → optimistic XP/chest reward
   that never waits on grading to feel earned.
3. Progress renders as path advancement, XP, and streak — momentum you can see accumulate daily.
4. Spaced repetition (FSRS) quietly resurfaces anything you got wrong or explained poorly, without
   ever showing a due-count or Anki-style guilt wall.
5. Periodically, a full 120-minute mock exam gives an honest, scaled readiness estimate against the
   720 pass line, with a domain-level report on what to study next.

## Feature set

- **Path** — Duolingo-style unit path with lesson, chest, legendary, and review nodes; data-driven,
  not hardcoded per course.
- **Feynman explain-back** — the default lesson path, not a toggle; graded by Claude; a completed
  explain-back upgrades the lesson's reward chest bronze → silver; gaps route into a dedicated gap
  card and a second grading pass.
- **XP, streaks, energy, combo** — pure, unit-tested game-logic engines. Streaks never "break":
  missed days auto-consume a free freeze, then pause warmly (count preserved 7 days) rather than
  reset. Energy gates only *new* path-lesson starts and always leaves a zero-cost recovery action
  available — it's a pacing meter, not a punishment meter.
- **Gems & reward economy** — bounded random payouts on a guaranteed floor, published odds, nothing
  purchasable with real money, spent on streak freezes / cosmetics / XP-boost windows.
- **Quests & achievements** — 3 rotating daily quests with escalating chest rewards, tiered
  achievements with monthly rollover.
- **Practice Hub** — energy-free, always-available review surface driven by FSRS spaced repetition;
  automatic mistake capture; no due-counts, capped daily presentation, gentle welcome-back warmup
  after an idle stretch.
- **Mock exams** — 3 pairwise-disjoint full-length 120-minute mocks + 5 mini-exams; timed simulation
  and untimed guided modes; navigator, flags, countdown/auto-submit, crash-resume, a transparent
  "estimated" scaled score, a domain-level weak-spot report, and a relearn patch plan.
- **Leaderboard** — one global weekly leaderboard, opt-out-able; the primary comparison surface is
  "beat your own past week," not competing against strangers.
- **Juice** — ceremony animations, sound, haptics, and an owned mascot ("Archie") — always gated on
  `reduce-motion` and user sound/haptics toggles.
- **Offline-first sync** — lessons, mocks, and SRS all work offline; an idempotent XP outbox
  replays cleanly against Supabase with zero duplicate awards.
- **Account** — anonymous-first (no signup wall between download and first lesson); optional
  upgrade to email OTP later preserves all progress.

## Pedagogy: why Feynman, specifically

Multiple-choice-only study measures recognition, which is a weaker signal than the exam (and the
underlying job) actually needs. The Feynman technique — explain a concept in your own words as if
teaching someone else — forces retrieval and exposes half-understood concepts immediately, before
they show up as a wrong answer on exam day. Making it the *default* lesson path (skip requires an
explicit tap, logged) is a deliberate product bet: the easy path and the effective path are the
same path.

## Success criteria

The product succeeds if and only if Nate passes CCA-F with a score ≥720/1000. Every other metric —
lessons completed, streak length, XP earned — is a leading indicator toward that one outcome, not a
goal in itself. Non-outcome quality bars (offline reliability, RLS isolation, no secrets in the
bundle, accessibility, no known-exploitable dependencies) exist because a broken or unsafe app
doesn't get used consistently enough to produce the outcome.

## Non-goals

- App Store / TestFlight distribution — personal device install only.
- Real multi-tier leagues (cohorts, promotion/relegation) — one global weekly leaderboard.
- Light theme — v1 ships a single warm-dark theme (tokens stay semantic so light mode is additive
  later, not a rewrite).
- Remote push notifications — local notifications only (free Apple ID has no push entitlement).
- Sign in with Apple — requires a paid Apple Developer account.
- Any content copied from the unlicensed reference repo
  (`paullarionov/claude-certified-architect`) — used for coverage cross-check only, never as a
  content source.

## Current status

See `.engineering/STATE.md` for the live build state and `.engineering/GOAL.md` for the full signed
contract (17 criteria, each wired to an automated check in `evals/run.sh`). As of this writing: 15
of 17 automated gates are green; the app runs Nate's real curriculum (6 courses, 21 units, 58
lessons, 649 questions) end-to-end offline; two human gates remain open (hosted Supabase linkup,
and a final on-device scroll-fix retest).
