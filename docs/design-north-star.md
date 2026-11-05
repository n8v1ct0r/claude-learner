# CCA Quest — Design North Star

One line: **Duolingo feel, Claude world.** The interaction language and juice of Duolingo, wearing
the visual identity of the thing being studied — a warm, clay-toned, hand-built workshop, not a
neon gamer app and not a sterile enterprise dashboard.

This document is the aesthetic contract. The literal values live in
`src/design/tokens.ts` + `src/design/palette.json` (contrast-checked by GC-10); this file is *why*
those values are what they are, so future decisions extend the system instead of drifting from it.

## The one thing every screen has to be

**Chunky, warm, and honest.** Chunky: big tap targets, thick 3D buttons, generous spacing — nothing
fiddly or precise-tap-required. Warm: terracotta/clay tones on a dark background, not cool
neon-on-black. Honest: progress only ever moves forward — no depleting bars, no red, no fake
urgency. If a screen feels cold, cramped, or punishing, it's off-brand regardless of how polished
it looks.

## Color: the "Clay" palette

- **v1 ships exactly one theme — warm dark.** Background `#1F1B16`, elevated surfaces `#2A251E`.
  This isn't a placeholder for "we'll add light mode eventually" hedging — it was a deliberate call
  because the app is mostly used in evening study sessions, and it halves the QA/contrast surface
  for a solo build. Tokens are semantic (`bg`, `textPrimary`, `clay400`, …) specifically so a light
  theme is additive later, not a rewrite.
- **Primary accent**: the `clay500 #CC785C` family — the material the whole system is named after.
  Buttons, primary CTAs, and links live here.
- **Game-juice accents** are deliberately distinct from the primary accent so reward moments read
  as *events*, not more UI chrome: XP gold `#E5A63F`, gem teal `#2F9E9B`, streak flame `#E5703F`,
  success sage `#3F9B6E`, info blue `#5B8DEF`.
- **No harsh red, ever.** Wrong answers and "needs review" states use warm amber (`#D98E32`) plus
  an icon and text label — never a red X, never a buzzer. This is a *design* rule before it's a
  copy rule: red reads as failure, amber reads as "not yet."

## Type

Nunito across the board — ExtraBold for display/numbers/buttons (the app's "shout" register),
SemiBold/Regular for body (the "explain calmly" register). Generous 1.4 line-height, 16pt minimum
body size. Every size flows through the tiered token API (`body`/`label`/`display`/`ceremony`) so
Dynamic Type is never an afterthought bolted on later — body text scales unbounded into iOS
Accessibility sizes, while display/ceremony numerals cap at 1.5× and reflow instead of blowing out
a layout. Treat this tiering as load-bearing: a new screen that hardcodes a font size instead of
picking a tier is a regression, not a shortcut.

## Shape language: chunky 3D clay

Buttons are the single most-touched element in the app, so they get the most deliberate treatment:
solid fill, a hard 4px bottom shadow (no blur — this is a *pressed clay tile*, not a soft material
shadow), 16px corner radius, 52pt minimum height. Pressing one moves it down 4px and collapses the
shadow, paired with a light haptic — the button should feel like it's physically depressing into
the surface. Cards use a slightly larger 20px radius so they read as a distinct, softer layer above
buttons. This 3D-pressed language is Duolingo's signature interaction feel; the clay/terracotta
material is what makes it read as *this* app instead of a clone.

## Mascot & app icon: the Claude Code agent

**Superseded design note:** the original plan (`PLAN-rev2.md` §4.2) specified an octopus mascot
named "Archie." That was replaced per **D21** (`.engineering/DECISIONS.md`, 2026-07-14, user
directive): the octopus is gone, swapped for a terracotta pixel Claude Code agent character the
user supplied directly. Learner-facing Feynman copy now says "Teach the agent," not "Teach Archie."
This section describes the character as it actually shipped.

A blocky, pixel-invader-silhouette figure — square body, two rectangular eye-slits, three short
stub legs, no arms — rendered in `clay400` on the app's `bg` ink color. It's reconstructed as a
native component (`src/components/ClaudeAgentMascot.tsx`, Views not a bitmap) rather than a static
image specifically so it stays crisp at every density and supports mood-driven poses (`idle`,
`celebrate`, `thinking`, `peek`) via small Reanimated transforms — all gated on reduce-motion like
every other juice moment. The **app icon** (`assets/images/icon.png`) dresses this same character
in a graduation cap and rolled diploma — a one-off "hero" costume for the icon/logo context, not an
additional in-app pose; the in-lesson mascot stays the plain undressed agent. The metaphor still
holds even without the octopus's eight arms: this is *the* Claude Code agent — the same kind of
system the exam certifies you to build — cheering you on while you study it.

Voice is unchanged from the original concept: warm and curious, never a scold. A wrong answer is
"found a gap — that's the good part," not "oops, try again."

## Motion & juice

Juice is the addictive layer, and it should feel *earned*, never *awaited* — the lesson-end
ceremony (XP count-up → bonus reveal → chest open → streak flame → confetti) is explicitly
optimistic and never blocks on a grading network call. Every juice moment — confetti, chest
animations, streak takeovers — is gated on `reduce-motion` and user sound/haptics toggles, falling
back to instant-state changes with gentle opacity fades. Motion is a reward for engagement, not a
tax the user pays to see their result.

## Voice & tone

Warm, curious, first-principles, never guilt-based. This is a written-content rule as much as a
visual one and it is enforced mechanically (banned-copy lint over both authored content and any
runtime LLM-generated text): no "danger," no "you'll lose your streak," no depleting bars, no
Anki-style shame walls. When something goes wrong — a missed streak day, a wrong answer, an idle
week — the framing is always forward-looking ("the agent saved your streak" / "found a gap" /
"welcome back"), never a scoreboard of failure.

## Accessibility as a design input, not a checklist

WCAG AA contrast (4.5:1 body text, 3.0:1 large numerals/icons) and 44pt minimum touch targets are
enforced by the same palette/token files the visual design reads from — there is no separate "a11y
pass" that can drift from what ships. Reduce-motion and reduce-time-pressure aren't degraded modes;
they're first-class states every juice/timer feature is designed against from the start, not
retrofitted after the fact.

## The ADHD-first constraint set

These aren't UX nice-to-haves layered on top of the visual design — they're structural, and any new
screen should be checked against them before it ships:

1. **One primary CTA per screen**, largest tap target on the screen.
2. **Lessons ≤5 minutes, ≤2 concepts** — a hard content budget, not a soft guideline.
3. **No shame anywhere** — mistakes are review-deck fuel, not failure states.
4. **Progress is additive** — meters fill, nothing turns red, nothing depletes toward zero as a
   punishment.
5. **Deliberate exit points** — a "goal hit, you can stop now" screen after the daily goal, so the
   app actively resists becoming a doomscroll surface.
6. **Choice minimization** — onboarding is exam-date → daily-goal pick → first full lesson (before
   any signup) → notification priming (after value is demonstrated, never an un-primed dialog at
   launch).

## Anti-patterns to catch in review

- A screen with two competing primary buttons.
- Red anywhere in an incorrect/error/warning state.
- A depleting progress bar framed as loss rather than a refill-in-progress meter.
- Juice or a timer that isn't gated on reduce-motion / reduce-time-pressure.
- Hardcoded font sizes, colors, or spacing values instead of tokens.
- Copy that implies urgency, danger, or guilt ("don't lose your streak," "you're falling behind").
