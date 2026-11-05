# GOAL — CCA Quest

status: signed
signed: 2026-07-13 — user approved the full plan (ExitPlanMode approval in Conductor session; plan file: ~/.claude/plans/system-instruction-you-are-working-tidy-squirrel.md, Rev 2 of workflow wf_4775b0ae-f3a). Approval covers the goal contract, architecture, milestones, decisions ledger, and human gates.
reopened: —

## Objective

A gamified, addictive, Duolingo-look-and-feel iPhone app (Expo/React Native + Supabase) that gets
Nate a passing score (≥720/1000) on the Anthropic Claude Certified Architect – Foundations (CCA-F)
exam. Full Duolingo feature set (path, XP, streaks, energy, gems, quests, achievements, leaderboard,
practice hub, mock exams, juice), the Feynman technique as the contract-protected core pedagogy
(explain-back as the default lesson path, graded by Claude), and ADHD/neurodivergent-first UX
(≤5-min lessons, one obvious next action, no shame anywhere) — with maximal content: 61 lessons,
~620 fresh-authored questions cited to official Anthropic docs, 3 disjoint mock exams, 5 mini-exams,
FSRS spaced repetition.

## Criteria

| id | criterion | type | verdict procedure | threshold | hard |
|----|-----------|------|-------------------|-----------|------|
| GC-01 | Content integrity: every question zod-valid, one valid answer key, ≥1 official-docs sourceUrl (allowlist), required metadata, trigram dupe detection (calibrated T, `variantOf` escape hatch) | code | `npm run content:validate` | exit 0 | yes |
| GC-02 | Volume & blueprint: weight map {d1:27,d2:18,d3:20,d4:20,d5:15}; ≥5 courses, ≥50 lessons, ≥600 unique questions; per-domain ±1; 3 pairwise-disjoint 60-Q mocks (16/11/12/12/9 ±1, difficulty floor); 5 mini-exams by reference; every lesson ≤300s incl. explain-back | code | `npm run content:stats -- --check` | exit 0 | yes |
| GC-03 | Core lesson loop: start → every renderer answerable → XP → optimistic ceremony (never awaits grading); cold open = one-tap Continue deep-resume incl. mid-lesson-kill | e2e | `npx jest --testPathPattern lesson-flow` | pass | yes |
| GC-04 | Game-logic engines (pure TS): XP, streak state machine, energy, FSRS SRS (cap under ANY backlog), mock scoring, quests, achievements, bounded reward RNG with floors, commitment (never deducts), pacing | code | `npx jest --testPathPattern engine` | pass, ≥90% line cov on src/engine/ | yes |
| GC-05 | Mock exam fidelity: 120-min countdown, flag/navigator, auto-submit, crash-resume, domain report, readiness verdict, "estimated" disclaimer | e2e | `npx jest --testPathPattern mock-exam` | pass | yes |
| GC-06 | Offline-first: lessons/mocks/SRS offline; XP outbox idempotent replay (zero dupes on double replay) vs local Supabase | e2e | `npm run test:sync` | exit 0 | yes |
| GC-07 | RLS isolation through REAL read paths (cross-cutting): two anon-session clients probe every table/view/RPC/edge-fn; leaderboard returns only (rank, display_name, weekly_xp, is_me); schema audit (RLS 100%, security_invoker views, pinned search_path, WITH CHECK, grant allowlist); out-of-policy xp_events rejected | security | `npm run test:rls` | exit 0 | yes |
| GC-08 | No secrets in bundle or history (cross-cutting): gitleaks over full git history + worktree + `expo export` output (binaries incl.); sk-ant-/service_role/sb_secret_/entropy patterns; CANARY self-test must fail on planted key | security | `bash evals/checks/secret-scan.sh` | exit 0 (canary proves detection) | yes |
| GC-09 | Edge-fn hardening: identity from Authorization token only (probed); 1000-char cap; atomic per-user quota (60/day) + atomic global budget (1000/day) BEFORE Anthropic call (concurrency 10@55⇒exactly 5); schema-valid output; injection-as-data probe; shame probe; quota exhaustion → silent self-assessment, same XP | security | `npm run test:functions` | exit 0 | yes |
| GC-10 | A11y (cross-cutting): roles/labels sweep; WCAG AA 4.5:1 on all token pairs; ≥44pt targets; reduce-motion gates juice; Dynamic Type scalable token API (no allowFontScaling={false} outside allowlist); reduce-time-pressure mode with XP parity | code | `npm run test:a11y && node evals/checks/contrast.mjs` | exit 0 | yes |
| GC-11 | Static health (cross-cutting): TypeScript + ESLint clean | code | `npm run typecheck && npm run lint` | 0 errors | yes |
| GC-12 | Auth lifecycle: anonymous → email-OTP upgrade vs local Supabase (Inbucket); auto profile with generated NOT NULL playful display_name | e2e | `npm run test:auth` | exit 0 | yes |
| GC-13 | No-shame guarantee (cross-cutting): banned-copy lint (src/ + content/, incl. "danger", "lose your streak"); runtime LLM text filtered (templated fallback); missing_points via lintable ID templates; notification auto-mute after 5 operational ignores, ≤5 scheduled ahead, quiet hours + precedence | code | `node evals/checks/copy-lint.mjs && npx jest --testPathPattern notifications` | exit 0 / pass | yes |
| GC-14 | Runs on Nate's iPhone: Gate D first install + pilot lesson (post-M3); Gate C full device checklist (haptics, sound, notifications, offline+sync, mic/dictation, largest-AX-text lesson) | e2e | MANUAL — `docs/device-verification.md` executed at Gates D and C | checklist complete | yes |
| GC-15 | Feynman loop integrity: explain-back is DEFAULT path (skip = explicit tap + analytics event); completion upgrades chest bronze→silver; gap→refine→second-grading integration-tested; key-point IDs round-trip byte-identical card↔grader | e2e | `npx jest --testPathPattern feynman-loop` + round-trip check in `content:validate` | pass | yes |
| sec-deps | No known-exploitable dependencies (high/critical) | security | `bash evals/checks/deps-audit.sh` (osv-scanner if available, else `npm audit --audit-level=high`) | 0 high/critical | yes |
| sec-sast | No error-level static-analysis findings | security | `bash evals/checks/sast.sh` (semgrep auto config; SKIP-with-warning locally if semgrep missing, enforced in CI) | 0 error-level | yes |

## Threat model

See `THREATS.md` (part of this signed contract). Every HIGH threat maps to a criterion above.

## Non-goals

- App Store / TestFlight distribution (personal device install; paid Apple account optional later)
- Real leagues machinery (cohorts/tiers/promotion/pg_cron) — one global weekly leaderboard RPC (D11)
- Light theme (single warm-dark theme v1; semantic tokens keep it additive — D17)
- Remote push notifications (local only — free Apple ID has no push entitlement, D12)
- Sign in with Apple (requires paid Apple Developer Program — D5)
- Copying any content from the unlicensed reference repo (github.com/paullarionov/claude-certified-architect — coverage cross-check only)

## Assumptions

- Exam pacing default: steady (interview D4 unanswered); onboarding exam date drives pacing — easy-reversal settings value.
- Domain weights {27/18/20/20/15} are secondary-sourced; provisional until Gate 0 (official exam guide) or a recorded proceed-on-secondary sign-off (D10).
- Nate has a Mac with Xcode and an iPhone with a free Apple ID; Gate D verifies end-to-end.
