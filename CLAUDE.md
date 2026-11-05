# CLAUDE.md — CCA Quest

Gamified Duolingo-style iPhone app (Expo SDK 57 / RN / TS + Supabase) to pass the Anthropic
Claude Certified Architect – Foundations (CCA-F) exam. Feynman pedagogy, ADHD-first UX.

## Orientation (read in this order)

1. `.engineering/STATE.md` — current phase, NEXT action, standing constraints
2. `.engineering/GOAL.md` — the SIGNED contract: 17 criteria, all wired to `evals/run.sh`
3. `.engineering/ROADMAP.md` — milestones M0–M11 + human gates
4. `.engineering/PLAN-rev2.md` — full architecture/design/content spec (the judge-reviewed plan)
5. `content/curriculum-map.md` — course/unit/lesson authoring spec

## Commands

- `bash evals/run.sh` — full contract check (writes evals.json; the ONLY writer of it)
- `bash evals/run.sh --gate` — milestone ratchet (what CI enforces; see evals/thresholds.json)
- `npm run typecheck && npm run lint` — static health
- `supabase start` / `npm run test:rls` — local Postgres + RLS isolation suite (needs Docker)
- `npx expo start` — dev server; `npx expo run:ios --device` — install on iPhone

## Hard rules

- Engineering harness (Iron Laws): never hand-edit `evals.json`; never weaken an eval to go green;
  evals change only through a user-approved contract re-open logged in `.engineering/DECISIONS.md`.
- Model routing (user directive): implementation-code subagents run on **Opus 4.8**; docs,
  architecture, content authoring, and review run on **Fable 5**.
- NEVER install: `@rive-app/react-native-rn` (slopsquat), react-native-mmkv, expo-av,
  @shopify/react-native-skia, react-native-fast-confetti. Native deps only via `npx expo install`.
- Content slugs are append-only once server rows exist (one-way door D3): deprecate, never rename.
- No shame copy anywhere (GC-13, `evals/banned-copy.json`) — including LLM-generated hints.
- Reference repo `paullarionov/claude-certified-architect` is UNLICENSED: coverage cross-check
  only, never copy content. Cite only official Anthropic/MCP domains (see content/blueprint.json).
- Secrets: `ANTHROPIC_API_KEY` lives only in Supabase secrets / functions/.env (gitignored);
  only `EXPO_PUBLIC_SUPABASE_URL` + the anon/publishable key may ship in the bundle (GC-08).
- Stage commits with explicit file paths (never `git add -A`).
