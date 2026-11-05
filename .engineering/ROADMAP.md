# ROADMAP — CCA Quest

Milestone order optimized for study value: the app is usable on Nate's phone after M3+Gate D;
content lanes (M5.x) interleave with M6–M8 so app work never blocks on authoring.
Full detail: PLAN-rev2.md §5. Model routing: implementation code = Opus 4.8 subagents;
docs/architecture/content/review = Fable 5.

| # | Milestone | Ships | Gate to advance |
|---|-----------|-------|-----------------|
| M0 | Eval harness (thin) | evals/run.sh dispatcher, secret-scan + canary, blueprint.json, thresholds.json, CI | Harness observed RED this session; red-baseline tagged |
| M1 | Foundation | Expo SDK 57 scaffold, Clay tokens + Dynamic Type API + contrast check, zustand, supabase client, migration 0001 (profiles + RLS), anon auth, speech-recognition compat check | typecheck/lint/contrast GREEN; renders in Simulator; profiles RLS GREEN vs `supabase start` |
| M2 | Content pipeline + pilot | zod schemas, validators (dupes calibrated, citations, answer-key, copy-lint, 300s budget, round-trip, ID registry), content:build → content.db, style guide, pilot unit C1-U1 | content:validate/build/stats GREEN on pilot |
| M3 | Lesson core (FIRST USABLE) | Lesson player Feynman spine (self-assessment mode), MC/multi renderers, XP/energy/streak/combo engines, optimistic ceremony, cold-open Continue | GC-03 + engine suites GREEN → **HUMAN GATE D: iPhone install + pilot lesson on device** |
| M4 | Renderers + path | match/order/cloze renderers, reduce-time-pressure mode, path UI, unit review | renderer suites + a11y sweep GREEN |
| — | **GATE 0** | Official exam guide via free Partner Network signup → confirm blueprint weights | Blocks M5.6 full-threshold ratchet only |
| M5.1–5.6 | Content build-out | 5 parallel domain lanes (~440 bank Q + lessons) + exam register (180 Q, 3 disjoint mocks, 5 minis by reference) + reviewer audit + Meet-the-Exam course | GC-01 + GC-02 GREEN at full thresholds |
| M6 | SRS + Practice Hub | FSRS single scheduler, presentation cap, welcome-back warmup, mistake capture, practice tab | SRS property tests GREEN |
| M7 | Mock exams + readiness | Sim/practice modes, timer, crash-resume, scaled scoring, domain report, patch plan, pacing dial | GC-05 GREEN |
| M8 | Gamification core | Quests, chests + published-odds reward economy, achievements, commitment goal, local notifications | GC-04 extended + GC-13 GREEN |
| M9 | Sync + leaderboard | Full migration set, outbox replay, LWW, auth lifecycle, get_leaderboard RPC, schema audit | GC-06/07/12 GREEN vs local → **HUMAN GATE A: hosted Supabase + anti-abuse** |
| M10 | Feynman grading live | grade-feynman edge fn (all probes), dictation + explain-back UI, degraded modes | GC-09 + GC-15 GREEN via `functions serve` → **HUMAN GATE B: API key + spend limit + deploy** |
| M11 | Juice + a11y + onboarding | Claude Code agent mascot poses + motion, SFX + licenses, ceremony v2, streak takeovers, onboarding, final audits | GC-08 + GC-10 GREEN; full run.sh GREEN → **HUMAN GATE C: device checklist (GC-14)** |

Human gates detail: PLAN-rev2.md §7 / plan file §8. Build never blocks on gates except D
(device risk front-load) and 0 (content freeze accuracy).
