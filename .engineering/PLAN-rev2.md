# CCA Quest — Implementation Plan (Rev 2, post-judge-panel)
**A gamified, Duolingo-style iPhone app for passing the Anthropic Claude Certified Architect – Foundations (CCA-F) exam**

Repo root: `/Users/cyrilvictor/conductor/workspaces/claude-certified-architect-app/vienna`
Stack (locked): Expo SDK 57 / React Native 0.86 / TypeScript · Supabase (auth, sync, leaderboard) · bundled content · Claude Haiku 4.5 for Feynman grading. Build style: contract-driven, eval-harness-first, autonomous build loop with explicit human gates.

**Revision summary (what changed and why):** device install moved to right after the first usable lesson loop (was last); Feynman explain-back promoted from skippable bolt-on to the default path with its own goal-contract criterion (GC-15); Dynamic Type added to GC-10; edge-function spend/abuse guards hardened (global budget, identity-from-token, atomic quota); domain-weight transposition resolved with an explicit map + Human Gate 0 for the official exam guide; leagues simplified to one global weekly leaderboard; sync simplified (client streaks, honest XP caps instead of anti-tamper theater); M3/M4/M8 split into loop-sized milestones and reordered by study value; MMKV/nitro/aes-js/Skia/fast-confetti dropped; single dark theme v1; energy/streak/reward/SRS/notification mechanics fully specified and testable; placement quiz and commitment wager cut from onboarding.

---

## 1. GOAL CONTRACT DRAFT

Each criterion has a third-party-runnable verdict procedure. All are wired into `evals/run.sh` (Section 5) except where marked MANUAL. The contract is the definition of done.

| ID | Criterion | Verdict procedure |
|----|-----------|-------------------|
| **GC-01** | **Content integrity.** Every question parses against the zod schema; has exactly one valid answer key (single-MC: 1 of 4; multi-select: explicit key array); has ≥1 `sourceUrl` on the official-docs allowlist (platform.claude.com, docs.claude.com, code.claude.com, anthropic.com/engineering, anthropic.com/news, modelcontextprotocol.io, anthropic.skilljar.com); has domain, conceptId, difficulty 1–3, `estimatedSeconds`, and explanation ≥1 sentence. No two questions share a normalized-stem trigram similarity > T (T calibrated empirically at M2 on the pilot unit using intentionally authored sibling questions; starting value 0.85) — EXCEPT pairs joined by an explicit, human-reviewed `variantOf` field (variant-group escape hatch, logged in the stats report). URL liveness validated once at authoring time inside `content:validate` (network-tolerant offline); no recurring liveness CI. | `npm run content:validate` exits 0; prints per-check counts. |
| **GC-02** | **Content volume & blueprint.** `content/blueprint.json` is an explicit **domain→weight map** `{d1:27, d2:18, d3:20, d4:20, d5:15}` (single source of truth; provisional until Gate 0 — see Section 7). Checks: ≥5 courses, ≥50 lessons; ≥600 unique questions TOTAL counting the exam register (~440 lesson-bank + 180 exam-register); **per-domain exact-target assertion**: each domain's share within ±1 question of weight×pool-size for both the lesson bank and the exam register (a d2/d4 transposition can no longer pass); exactly 3 mock forms × 60 questions, pairwise disjoint, each form matching per-form domain targets **16/11/12/12/9 ±1** with a difficulty floor (≥60% difficulty ≥2), built as 4 scenario clusters + standalones; 5 mini-exams of 15–20 questions **drawn by reference (reuse-by-ID) from the register + lesson bank** — dupe detection treats referenced reuse as legal, never as a copy; every lesson has a Feynman concept card with 3–5 canonical key points; **every lesson's `estimatedSeconds` sum (explain-back included, per-type defaults: mc 20s, multi 30s, match 40s, order 30s, cloze 30s, scenario 60s, explain-back 90s) ≤ 300s** — the ≤5-min rule is a build gate, not a vibe. | `npm run content:stats -- --check` exits 0 against `content/blueprint.json`. |
| **GC-03** | **Core lesson loop works.** A lesson can be started, every exercise renderer answered, XP awarded per the economy rules, and the completion ceremony reached — proven by a jest-expo integration test driving the lesson player with a fixture lesson. Additional assertions: (a) the ceremony renders **without awaiting the grading promise** (optimistic — explain-back submits, base XP awards immediately, coverage meter fills in async); (b) cold app-open lands on the path tab auto-scrolled to the current node with one primary "Continue" CTA that deep-resumes the correct next/in-progress lesson from persisted state, including the mid-lesson-kill case. | `npx jest --testPathPattern lesson-flow` passes. |
| **GC-04** | **Game-logic correctness.** Pure-TS engine modules (`src/engine/`) pass unit suites covering, exhaustively: **XP** (10 base + ≤5 combo, 20 unit-complete, 40 legendary, 5 gold-replay decay, boost windows; explain-back awards the same base XP regardless of grading outcome or connectivity — grading affects the coverage meter and hints, never XP); **streak state machine** (Section 4.5: active → freeze auto-consume → paused → resume-within-7-days → warm archive; timezone-correct day boundaries; freeze-exhaustion path); **energy** (Section 4.4 spec: gates ONLY new path-lesson starts; practice/SRS/mistake-review/explain-back/mocks never consume or require energy; 0-energy node offers one-tap warm-up-to-refill; passive refill 1/45 min; invariant test: at 0 energy at least one zero-cost study action is always available on the path screen); **SRS** (FSRS intervals monotonic, lapse resets, due-date determinism; property test: presented-due-list length ≤ daily cap for ANY simulated backlog size; welcome-back warmup after ≥5 idle days); **mock scoring** (scaled = 100 + round(raw/60 × 900); pass line 720 ⇒ 42/60); **quests** (rotation, escalation, chest awards, all-three bonus); **achievements** (tier thresholds, monthly-badge rollover); **reward economy** (chest payout always ≥ floor, RNG bounded to published ranges, gem sinks priced within earnable range at the stated daily goal); **commitment goal** (no currency or streak ever deducted — unit test); **pacing** (examDate + lessons-remaining → lessons/week + days-remaining). | `npx jest --testPathPattern engine` passes with ≥90% line coverage on `src/engine/`. |
| **GC-05** | **Mock exam fidelity.** 60 questions / 120-min countdown, flag-for-review, navigator grid, auto-submit at 0:00, resume-after-kill from local persistence, per-domain report with Strong/Borderline/Needs-work bands, readiness verdict thresholds (<650 / 650–769 / ≥770), "estimated score" disclaimer present, per-form domain distribution verified in the content gate (GC-02). | `npx jest --testPathPattern mock-exam` passes (timer via fake timers; resume via store rehydration test). |
| **GC-06** | **Offline-first.** With network mocked off: full lessons, mocks, SRS reviews complete; XP/progress events queue locally; on reconnect the queue replays to Supabase idempotently — replaying the same batch twice produces zero duplicate `xp_events` rows (verified by `client_event_id` uniqueness against local `supabase start`). Offline explain-back transcripts queue for async grading (idempotent on a client-side submission id) purely for the gap-card payload — XP is identical either way (GC-04). | `npm run test:sync` exits 0 (requires Docker + `supabase start`). |
| **GC-07** | **RLS isolation (security) — tested through the REAL read paths.** The suite constructs **two supabase-js clients** using the project URL + anon/publishable key + real session JWTs from `signInAnonymously()` (never SQL role-switching alone), and as user B probes every user table CRUD, every view select, every RPC, and the edge function via `functions.invoke` — all cross-user access returns 0 rows / error, asserted on returned rows/HTTP status. `get_leaderboard()` returns only `(rank, display_name, weekly_xp, is_me)`; `display_name` asserted non-null for all rows. **Schema audit (complementary SQL layer)** asserts: RLS enabled on 100% of public tables; every view `security_invoker = on`; every SECURITY DEFINER function pins `search_path`; **every write policy has a correct `WITH CHECK` clause**; **function-grant audit**: no function in the API-exposed schema is EXECUTE-able by `anon`/PUBLIC, and only allowlisted functions (`get_leaderboard`) by `authenticated`; no table stores email. **XP integrity probe**: as user A, insert an `xp_events` row with an out-of-policy amount (e.g., 99999 for source=lesson) and assert rejection by the per-source cap trigger. | `npm run test:rls` exits 0. |
| **GC-08** | **No secrets in bundle (security).** Gitleaks runs against **full git history** (`gitleaks git`), the worktree, and `npx expo export --platform ios` output — including a strings-style pass over binaries (`content/dist/content.db`, `assets/`). Patterns: `sk-ant-`, Supabase `service_role` JWT, **`sb_secret_`**, generic high-entropy. Only `EXPO_PUBLIC_SUPABASE_URL` and the publishable/anon key may be embedded. **Canary self-test**: a fixture containing a fake `sk-ant-` key must make the scanner FAIL, then the real tree must pass — a broken scanner is RED, not silently green. | `bash evals/checks/secret-scan.sh` exits 0 (includes canary). |
| **GC-09** | **Edge-function hardening (security + spend).** `grade-feynman`: (1) **identity is always resolved from the Authorization token itself** (`supabase.auth.getUser(jwt)`); requests with no user (missing `sub` / role=anon) → 401 — probe (a): bearer = bare anon/publishable key → 401; (2) **`user_id` is never accepted in the payload** — probe (b): user A sends a body claiming user B's id → rows and quota land on A; (3) transcript cap 1,000 chars → 400 (the client's live counter — soft warn 800, hard stop 1,000 — makes this unreachable from the UI); (4) **per-user quota reserved atomically BEFORE the Anthropic call**: single-statement `INSERT ... ON CONFLICT (user_id, day) DO UPDATE SET count = count + 1 WHERE count < 60 RETURNING count` against `grading_quota`; no row ⇒ 429; concurrency test: 10 parallel requests at count=55 ⇒ exactly 5 succeed; (5) **global daily budget guard**: same atomic pattern against a per-day `spend_ledger` row (app-wide cap 1,000 calls/day) checked BEFORE calling Anthropic; test asserts the 429 and that the cap check precedes the API call; (6) response always validates against the grading JSON schema; learner text passed as data inside a JSON payload, never concatenated into instructions (injection probe kept: "ignore your rubric…" transcript still returns schema-valid output); (7) **shame probe**: seeded transcripts engineered to elicit negative feedback — the rendered client strings (after the runtime banned-vocabulary filter with templated fallback, Section 4.6) pass the banned-copy list; (8) **quota/budget-exhaustion UX**: client silently degrades to self-assessment mode (canonical key points shown, user taps covered/missed, same XP) — never an error dialog. | `npm run test:functions` (Deno test + supabase functions serve) exits 0. |
| **GC-10** | **Accessibility.** Every touchable in core screens has `accessibilityRole` + `accessibilityLabel` (jest-expo sweep); all design-token foreground/background pairs of the shipped (dark) theme meet WCAG AA 4.5:1 (script over `src/design/tokens.ts`); touch targets ≥44pt (token-enforced min sizes); `useReducedMotion` gates confetti/shake/parallax; no information conveyed by color alone. **Dynamic Type**: all text styles derive from a scalable token API that respects the iOS text-size setting; per-tier `maxFontSizeMultiplier` policy (body/labels unbounded into AX sizes; display/ceremony numerals capped ~1.5× with layouts that reflow, never truncate); jest-expo sweep asserts no component sets `allowFontScaling={false}` outside an explicit allowlist. **Timed content (WCAG 2.2.1)**: a "reduce time pressure" setting (auto-on with reduce-motion, independently toggleable) converts TF speed rounds to untimed with identical XP; validator rule ensures no question exists only in speed-round form; unit test asserts timers disabled + XP parity under the flag. Policy wired into tokens at **M1**, not retrofitted at the end. | `npm run test:a11y` + `node evals/checks/contrast.mjs` exit 0. |
| **GC-11** | **Static health.** `tsc --noEmit` zero errors; ESLint zero errors; content TS modules compile under the same config. | `npm run typecheck && npm run lint` exit 0. |
| **GC-12** | **Auth lifecycle.** Anonymous sign-in on first launch → later email link via `updateUser({email})` + OTP `verifyOtp` — integration-tested against local Supabase (Inbucket captures the OTP email); RLS-authenticated writes succeed for the anonymous user; `is_anonymous` claim distinguishable; profile row auto-created with a **generated non-null playful display_name** ("Curious Octopus 42") by the insert trigger. | `npm run test:auth` exits 0. |
| **GC-13** | **No-shame guarantee (product/a11y).** Banned-copy lint: no user-facing string in `src/` or `content/` contains shame vocabulary — list now includes **"danger", "lose your streak", "about to break"** alongside "wrong!", "failed", "lazy", "you lost", "don't let X down" (`evals/banned-copy.json`). **Runtime LLM text is covered too**: `next_step_hint`/`misconception` pass a runtime banned-vocabulary filter before display (templated fallback on match); `missing_points` render from key-point IDs via app-authored, lintable templates, not model prose (tested under GC-09's shame probe). Notifications: copy playful-supportive; **"ignored" is operationally defined** — a reminder counts as ignored when its fire time passed and no app session started before the next daily scheduling pass (last-session vs last-fire timestamp comparison); any session resets the counter to 0; auto-mute after 5 ignored; because no code runs while ignored, at most 5 future notifications are ever scheduled ahead (mute horizon pre-applied — long-idle edge case unit-tested); un-mute is an in-app opt-in prompt after 14 days; quiet hours default 21:00–07:00 with precedence rule: the streak-save nudge fires at min(habitual hour, quiet-start − 1h), quiet hours win for everything else (unit-tested). Mistakes never deduct without a recovery path (energy refund logic tested). | `node evals/checks/copy-lint.mjs` + jest notification tests exit 0. |
| **GC-14** | **Runs on the user's iPhone.** First dev build installs via `npx expo run:ios --device` with free Apple ID at **Gate D (immediately after M3)** — a pilot lesson must complete on the physical phone before content build-out begins. Final checklist (Gate C) additionally verifies: haptics, sound, local notifications, offline lesson, sync-on-reconnect against hosted Supabase, microphone + speech-recognition permission prompts and dictated explain-back, and **"set iPhone to largest accessibility text size and complete one full lesson + one mock-exam screen."** | MANUAL — checklist in `docs/device-verification.md`, executed at Gates D and C. |
| **GC-15** | **Feynman loop integrity (the pedagogy is contract-protected).** (a) Explain-back is the **default path**: the lesson player integration test proves skip requires an explicit user tap (opt-out, never opt-in) and emits a local analytics event distinguishing completed vs skipped; (b) completing explain-back upgrades the lesson chest tier bronze→silver (economy rewards it; skip is never punished); (c) the full gap→refine cycle is integration-tested: gap micro-card shown → refine tap → second grading → coverage-meter delta asserted; (d) **round-trip key-point test**: for every lesson, the concept card's key-point IDs are byte-identical to the IDs the grader scores against (content-side check in `content:validate`) — analogy → explain-back → gap is verifiably one loop, not three features. | `npx jest --testPathPattern feynman-loop` + `content:validate` round-trip check exit 0. |

---

## 2. ARCHITECTURE

### 2.1 Repo layout (single repo)

```
vienna/
├── app/                          # expo-router file routes
│   ├── (tabs)/                   #   path / practice / leaderboard / profile
│   ├── lesson/[lessonId].tsx
│   ├── exam/[examId].tsx
│   └── onboarding/
├── src/
│   ├── engine/                   # PURE TS, zero RN imports, 90%+ coverage
│   │   ├── xp.ts  streak.ts  energy.ts  srs.ts (FSRS)  scoring.ts
│   │   ├── quests.ts  achievements.ts  rewards.ts  commitment.ts  pacing.ts
│   ├── features/                 # lesson-player, path, exam, feynman, practice-hub,
│   │                             # quests, streak, leaderboard, onboarding, achievements
│   ├── components/               # design-system primitives (Button3D, ProgressRing, …)
│   ├── design/                   # tokens.ts (scalable type API), haptics.ts, sound.ts, motion.ts
│   ├── db/                       # drizzle schema (local sqlite), sync-queue, content-reader
│   ├── api/                      # supabase client, edge-fn callers
│   └── state/                    # zustand stores (persist → AsyncStorage)
├── content/
│   ├── blueprint.json            # explicit domain→weight MAP + volume thresholds (config, not code)
│   ├── schema/                   # zod schemas: course/unit/lesson/question/concept/exam
│   ├── src/                      # authored content, typed TS modules
│   │   ├── d1-agentic-architecture/   (courses → units → lesson files)
│   │   ├── d2-tool-design-mcp/  d3-claude-code-config/
│   │   ├── d4-prompt-engineering/  d5-context-management/
│   │   ├── exams/  (register pool, mock-1..3.ts, mini-d1..d5.ts reference lists)
│   │   └── meta/   (meet-the-exam intro unit, mascot copy, notification copy)
│   ├── scripts/                  # validate.ts, stats.ts, dupes.ts, citations.ts,
│   │                             # build-sqlite.ts, volatile-report.ts
│   └── dist/content.db           # generated bundled SQLite (gitignored, built in CI)
├── supabase/
│   ├── migrations/               # timestamped SQL, source of truth for schema
│   ├── functions/grade-feynman/  # Deno edge function (+ .env.example, tests/)
│   ├── seed.sql                  # dev users
│   └── tests/                    # RLS isolation suite (supabase-js clients), schema audit SQL
├── evals/
│   ├── run.sh                    # thin dispatcher; checks land WITH their features
│   ├── checks/                   # secret-scan.sh (+canary), contrast.mjs, copy-lint.mjs, schema-audit.sql
│   └── banned-copy.json
├── assets/                       # lottie/, sfx/ (CC0 + LICENSES.md), mascot/, fonts/
├── docs/                         # device-verification.md, human-gates.md, content-style-guide.md,
│                                 # design-review-checklist.md (one-CTA rule), maintenance.md
└── tasks/                        # todo.md, lessons.md
```

### 2.2 Libraries (verified versions, 2026-07-13; always install via `npx expo install`)

| Concern | Package | Version |
|---|---|---|
| Framework | expo / expo-router | ~57.0.4 (RN 0.86.0, React 19.2.3) |
| Dev client | expo-dev-client | 57.0.5 |
| Animation | react-native-reanimated + react-native-worklets | ~4.5.x + 0.10.x |
| Gestures | react-native-gesture-handler | **~2.32.0 (SDK pin — NOT npm-latest 3.x)** |
| Celebrations + confetti | lottie-react-native (confetti is a Lottie asset — ONE animation system) | ~7.3.8 |
| Haptics / Sound | expo-haptics / expo-audio | 57.0.0 (**not expo-av** — legacy) |
| Notifications | expo-notifications (LOCAL only) | 57.0.3 |
| Speech-to-text (explain-back dictation) | expo-speech-recognition (config plugin; adds `NSMicrophoneUsageDescription` + `NSSpeechRecognitionUsageDescription`) | ~2.x — **verify SDK-57 compat at M1; if incompatible, v1 ships typed-only (explicit fallback, D16)** |
| Styling | nativewind | 4.2.6 |
| State | zustand (+persist) | 5.0.14 |
| KV / persistence | @react-native-async-storage/async-storage | SDK 57 pin |
| Local DB | expo-sqlite + drizzle-orm (pin 0.45.x) | 57.0.0 + 0.45.2 |
| Backend | @supabase/supabase-js (default AsyncStorage session storage) | 2.110.3 |
| SVG rings | react-native-svg | 15.15.4 (SDK pin) |
| Fonts | expo-font (Nunito) | 57.x |

**Removed since Rev 1** (five native/crypto deps): react-native-mmkv + react-native-nitro-modules (perf irrelevant at this data size), aes-js + react-native-get-random-values + the LargeSecureStore wrapper (threat-model theater for a study app on a passcode-locked personal phone — supabase-js default AsyncStorage storage is used; an eval check asserts no persisted zustand store contains JWT-shaped strings, `eyJ` prefix, or keys matching `access_token|refresh_token|session`), @shopify/react-native-skia (optional and unused — add the day a feature needs it), react-native-fast-confetti (confetti via Lottie).

Hard rules: **never install `@rive-app/react-native-rn` (404 slopsquat — real package is `rive-react-native`, deferred anyway; Lottie chosen)**; never target Expo Go (dev-build from day one for dev-client ergonomics); WatermelonDB rejected.

### 2.3 Data model (Supabase Postgres — user state ONLY; content never lives in Postgres)

All tables: `user_id uuid references auth.users`, RLS enabled, owner policy `using ((select auth.uid()) = user_id)` **with matching `WITH CHECK` on every write policy** (initPlan-cached form). **Email never leaves `auth.users`.**

- `profiles` — id (=auth.users.id), **display_name NOT NULL (insert trigger generates a playful handle, e.g., "Curious Octopus 42"; renameable from the profile tab)**, avatar_id, timezone, total_xp (one-line SUM trigger), gems, created_at. No email.
- `xp_events` — id, user_id, amount, source (lesson|exam|quest|…), source_id, **client_event_id uuid UNIQUE**, occurred_at, created_at. RLS: INSERT + SELECT only — append-only ledger. **Integrity is honest caps, not recomputation**: a BEFORE INSERT trigger enforces per-source amount caps (config table mirrored from `src/engine/xp.ts`, e.g., lesson ≤ 60, exam ≤ 150, quest ≤ 100) and a generous per-user daily event ceiling by `occurred_at` (300/day — never trips on real use incl. offline replay of a full day, blocks bulk fabrication). Ledger note: XP validation is heuristic (client computes combos); caps are the defense, not exact recomputation.
- `user_progress` — PK (user_id, lesson_id text), status, best_score, crowns, content_version, updated_at. LWW with updated_at guard.
- `streaks` — **client-computed** (the pure-TS engine already tested under GC-04 is the single implementation; no duplicate PL/pgSQL date logic), synced as an LWW row: current, longest, last_activity_date, freezes_equipped, freezes_used, paused_at.
- `energy_state` — energy, max_energy, last_refill_at. LWW.
- `srs_reviews` — PK (user_id, question_id text): due_at, stability, difficulty, reps, lapses, last_grade (FSRS state). LWW.
- `exam_attempts` — id, user_id, exam_id, mode (sim|practice), answers jsonb, raw_score, scaled_score, passed, domain_scores jsonb, duration_s, created_at.
- `user_quests` / `user_achievements` — instances + progress; definitions bundled in-app.
- `feynman_submissions` — id, user_id, concept_id, transcript, grade jsonb, model, tokens_in/out (minimal accounting folded in; no separate grading_events table), client_submission_id UNIQUE (idempotent async-grading replays), graded_at.
- `grading_quota` — PK (user_id, day), count — atomic per-user reservation (GC-09).
- `spend_ledger` — PK (day), count — atomic app-wide daily budget (GC-09).

Cross-user read path: **exactly one** — SECURITY DEFINER RPC `get_leaderboard()` (search_path pinned) ranking ALL users by `SUM(xp_events.amount)` for the current ISO week, **computed on read**, returning `(rank, display_name, weekly_xp, is_me)`. **No pg_cron, no rollover function, no cohorts/tiers/ghosts, no promote/demote engine, no trigger-maintained weekly_xp** (Rev 1's league machinery deleted per review; xp_events makes the full ladder a clean later addition). **Function grants**: migrations `REVOKE EXECUTE ... FROM PUBLIC, anon` on every function; `GRANT EXECUTE ON get_leaderboard() TO authenticated` only; grant audit in GC-07. Any view created gets `WITH (security_invoker = on)`. The primary social surface is "beat your past week" (solo); the global board is opt-out-able.

### 2.4 Offline-first sync

- **Content**: 100% bundled (`content/dist/content.db`, built at CI time from typed TS sources, opened read-only via expo-sqlite/drizzle). Zero network for lessons/mocks/SRS. Content fixes ship via new build (EAS Update later, optional).
- **User state**: written locally first (sqlite + AsyncStorage-persisted zustand). Two sync strategies:
  - **Event log for XP** (genuinely load-bearing for idempotent offline replay): client-generated `client_event_id` UUIDs queued in a local `outbox` table, flushed on reconnect with `ON CONFLICT (client_event_id) DO NOTHING`. `total_xp` is a one-line SUM trigger. Server-side integrity = per-source caps + daily ceiling (2.3), stated honestly — not "tamper-proof".
  - **LWW with `updated_at` guard** for idempotent state (`user_progress`, `srs_reviews`, `streaks`, `energy_state`, quest progress). Streak computation lives ONLY in `src/engine/streak.ts`.
- Auth: `signInAnonymously()` on first launch (instant play, ADHD-friendly); upgrade via `updateUser({email})` + email OTP (`{{ .Token }}` template → 6-digit code, no deep links). Session via supabase-js default AsyncStorage storage; AppState listener drives `startAutoRefresh()/stopAutoRefresh()`. Eval check: no JWT-shaped strings in any persisted zustand store. Sign in with Apple deferred (requires paid Apple Developer Program).

### 2.5 Edge functions

One function for v1: **`grade-feynman`**.
Request `{concept_id, transcript, client_submission_id}` → **identity resolved from the Authorization token** (`auth.getUser(jwt)`; no user → 401; `user_id` never read from the body) → **global budget check** (atomic `spend_ledger` upsert, cap 1,000/day app-wide, 429 on exhaustion) → **per-user quota reservation** (atomic `grading_quota` upsert `WHERE count < 60 RETURNING`, 429 on exhaustion) — both BEFORE the Anthropic call → loads the concept's canonical key points from a bundled copy shipped with the function (content hash pinned; round-trip-tested against lesson cards per GC-15d) → calls Anthropic Messages API, model `claude-haiku-4-5`, `max_tokens ~500`, `output_config.format` json_schema (no `effort` param — errors on Haiku), versioned rubric system prompt with **gap-positive tone constraints** + 2 few-shot examples → returns `{covered_points[], missing_points[], jargon_flags[], misconception|null, simple_score 1–5, next_step_hint ≤25 words}` (key-point IDs, not prose) → inserts `feynman_submissions` (with token accounting columns; idempotent on client_submission_id). Guards: 1,000-char cap (400; unreachable from UI due to client counter), transcript strictly as data. Client rendering: `missing_points` rendered from app-authored templates keyed by point ID (lintable); `next_step_hint`/`misconception` pass a runtime banned-vocab filter with templated fallback. Cost: ≈$0.002–0.003/call; skip prompt caching (below Haiku's 4,096-token cacheable minimum). **Latency never blocks the loop**: ceremony is optimistic (GC-03a); on timeout/error/quota, degrade to self-assessment mode (GC-09.8) — same XP always. `ANTHROPIC_API_KEY` lives only in `supabase secrets` (prod, with a **hard monthly spend limit set in the Anthropic console at Gate B**) / `supabase/functions/.env` (local, gitignored) — enforced by GC-08. Supabase **anonymous sign-in abuse protections (per-IP rate limits + CAPTCHA/Turnstile)** enabled at Gate A — the third layer against anonymous-account quota farming.

### 2.6 Content format & pipeline

Authoring = **typed TS modules** (autocomplete + compiler help for agents), e.g. `defineLesson({...})`, validated by zod at build time. Question shape:

```ts
{ id: "d2-mcp-transports-q07",         // stable slug — append-only, NEVER renamed (server rows key on it)
  type: "mc" | "multi" | "match" | "cloze" | "order" | "explain-back",
  variant?: "scenario" | "spot-bug" | "tf-speed",   // MC prop variants, not separate renderers
  domain: "d1".."d5", conceptId, difficulty: 1|2|3,
  estimatedSeconds: number,             // per-type defaults; lesson sum ≤ 300s gate (GC-02)
  stem, options[], answerKey, explanation,
  sourceUrls: ["https://platform.claude.com/docs/..."],   // allowlist-checked, liveness at authoring time
  volatile?: true,                      // beta-headered features (context editing, compaction)
  variantOf?: string,                   // reviewed sibling-question escape hatch for dupe detection
  misconceptionTag?: string, scenarioId?: string }
```

Pipeline: `content:validate` (zod + answer-key + citations + dupes-with-variant-groups + banned-copy + blueprint coverage + lesson time budget + key-point round-trip) → `content:stats --check` (volume gates incl. per-mock-form distribution) → `content:build` (compile to `content.db` + manifest with `content_version` hash) → `content:volatile-report` (informational: lists volatile-tagged and stale-authored-date questions with sourceUrls; run manually, NOT in run.sh — no flaky network reds; `docs/maintenance.md` says re-verify volatile items once before the user's exam date). Deprecation flag instead of deletion; renames forbidden by the ID-registry validator.

---

## 3. CONTENT PLAN

### 3.1 Curriculum tree (explicit weight map `{d1:27, d2:18, d3:20, d4:20, d5:15}` in `content/blueprint.json` — RULING: this matches the curriculum table below and is the single source of truth; GC-02 and D10 now reference the map, not an ordered tuple. Provisional until confirmed against the official exam guide at **Gate 0**.)

**Course 0 — Meet the Exam** (1 unit, 3 lessons): blueprint, scenario format, scoring/720 line, partner-gating honesty screen ("exam access currently requires a Claude Partner Network org — verify at registration"), how this app maps to it.

| Course | Domain (weight) | Units | Lessons | Lesson-bank Q (of ~440) | Exam-register Q (of 180) |
|---|---|---|---|---|---|
| C1 | Agentic Architecture & Orchestration (27%) | 5 | 14 | ~119 | ~49 |
| C2 | Tool Design & MCP Integration (18%) | 4 | 10 | ~79 | ~32 |
| C3 | Claude Code Configuration & Workflows (20%) | 4 | 11 | ~88 | ~36 |
| C4 | Prompt Engineering & Structured Output (20%) | 4 | 11 | ~88 | ~36 |
| C5 | Context Management & Reliability (15%) | 3 | 9 | ~66 | ~27 |

Totals: **58 lessons + 3 intro = 61**, **~620 unique questions = ~440 lesson-bank + 180 exam-register** (mocks/minis now COUNT toward the ≥600 contract — hundreds of questions cheaper than Rev 1's separate 800–900). The 3 mock forms partition the register (3 × 60, pairwise disjoint, per-form domain targets 16/11/12/12/9 ±1). The 5 mini-exams (15–20 Q, 25 min) are **assembled by reference** from register + lesson-bank IDs (documented reuse policy; dupe detection treats reference as legal). SRS decks auto-derived (every concept's items + user mistakes). Unit topic assignments follow the research topic trees verbatim (e.g., C1: workflows-vs-agents, augmented LLM, agentic loop, 5 composable patterns, subagents, orchestrator economics, Agent SDK, guardrails, evals; C5: context rot, caching, context editing, compaction, stop_reason/error taxonomies, HITL triggers, degradation).

Lesson spine (fixed, Feynman-as-default-path — see GC-15): concept card (analogy FIRST → 2–3 plain sentences → "exam words" strip + snippet; ≤2 concepts) → 6–10 exercises ramping difficulty → **explain-back: a ~30-second "teach Archie one sentence" micro-prompt, dictation-first with typed input equal-class; on the default path with a visible skip link (skip requires an explicit tap and is never punished); completing it upgrades the lesson chest bronze→silver; never costs energy; same base XP whether graded, degraded, or offline** → gap micro-card (coverage meter fills asynchronously; ONE next-step hint) → one-tap refine (second grading, coverage delta — integration-tested) → identity-framed wrap ("You can now explain subagents"). Re-explain prompts are **FSRS items** (one per concept, distinct item type) so a single scheduler owns all spacing — initial FSRS state seeded to approximate 1d/3d/7d for early reps (no competing fixed-interval scheduler). Feynman targets prioritize the researched confusion pairs: workflows vs agents · subagent vs Skill vs MCP server · tool_choice any vs tool · settings merge vs override · caching vs context editing vs compaction.

Mock design: 4 scenario clusters per form drawn from the 6 published scenarios (Customer Support Agent, Claude Code codegen, Multi-Agent Research, Developer Productivity Tools, CI/CD, Structured Data Extraction) + Agent Skills coverage as insurance; distractors are plausible-but-flawed architectures (wrong pattern for the failure mode, cache-hostile ordering, over-agentic design) — the exam tests decisions, not definitions. Scoring displayed as "estimated scaled score" with the ≥770 "likely ready" buffer; first mock gates until 2 courses complete. Review flow: wrong answers by weakest domain → relearn links → auto-add to SRS → generated patch plan whose next session opens with an explain-back on the weakest concept. The predicted-score dial also shows **days-to-exam and required weekly pace** from the onboarding exam date (`src/engine/pacing.ts`, unit-tested; feeds daily-quest sizing) — the collected exam date is used, not dead weight.

### 3.2 Parallelized generation + validation harness

- **Fan-out**: one authoring agent per domain (5 lanes, each independently verifiable — M5.1–M5.5) + one exam-register agent (M5.6). Each receives: its topic tree, the citation allowlist, question quotas per unit/type/difficulty **including its exam-register quota from the table above**, the per-lesson 300s time budget, the style guide (`docs/content-style-guide.md`), the banned-copy list, and the anchored simple_score rubric for concept key points.
- **Cite-the-docs requirement**: every question carries ≥1 official sourceUrl; `citations.ts` validates domain allowlist + URL liveness **once at authoring time** (network-tolerant offline). No recurring liveness CI (flaky HEAD checks cut per review).
- **Answer-key validation**: a separate reviewer agent (not the author) re-derives the answer from the cited doc — 100% structural pass on schema and a sampled ≥20%-per-domain semantic audit; disagreements block merge. Structural checks (exactly one correct for MC, key ⊆ options, no "all of the above") are mechanical in `validate.ts`.
- **Duplicate detection**: normalized-stem trigram similarity across the full bank and across mock forms (forms pairwise disjoint), threshold **calibrated at M2** on intentionally authored pilot siblings; `variantOf` escape hatch for reviewed pairs.
- **Volatility hygiene**: sourceUrl + authored-date + `volatile: true` tags (data-only, cheap); `content:volatile-report` lists items to re-verify; `docs/maintenance.md` runbook = re-verify volatile items once before the user's exam date (demoted from "quarterly load-bearing process" — the user intends to pass once).
- Anti-IP rule: Skilljar courses define scope only; paraphrase concepts, never mirror course text.

---

## 4. DESIGN SYSTEM — "Clay" (Duolingo feel, Claude world)

### 4.1 Tokens (in `src/design/tokens.ts`, contrast-checked by GC-10)

- **v1 ships ONE theme — warm dark** (`#1F1B16` bg, `#2A251E` elevated, clay lifted to `#E08A6B`) — it fits evening study sessions; confirmed with the user at Gate D. Tokens stay semantic so the light theme is purely additive later. (Halves contrast pairs and removes a QA lane.)
- **Core palette**: `clay.500 #CC785C` family (primary), pressed/shadow and tint shades; warm dark neutrals; `ink`-on-dark text tokens.
- **Game-juice accents**: XP gold `#E5A63F` · gem teal `#2F9E9B` · streak flame `#E5703F` · success sage `#3F9B6E` · info blue `#5B8DEF` · "needs review" amber `#D98E32` (deliberately **no harsh red** — incorrect states use warm amber + icon + text, per no-shame rule).
- **Type**: Nunito ExtraBold (display, numbers, buttons), Nunito SemiBold/Regular (body); generous 1.4 line-height; min body 16pt — **all sizes flow through a scalable token API honoring iOS Dynamic Type**, with per-tier `maxFontSizeMultiplier` (body unbounded to AX sizes; display/ceremony numerals capped ~1.5× with reflowing layouts). Built at M1 (GC-10).
- **Buttons**: chunky 3D-pressed — solid fill + 4px hard bottom shadow (`shadowOffsetY: 4`, no blur), press = translateY(4px) + shadow collapse + light haptic; radius 16; min height 52pt.
- **Radii/spacing scale**: 4/8/12/16/24; cards radius 20; segmented progress bar with springy per-answer fill (Reanimated).

### 4.2 Mascot — **"Archie"**, the terracotta octopus architect — with an owned asset plan (D15)

An octopus because the metaphor is the product: eight arms orchestrating tools, subagents, and context — tiny hard hat, rolled blueprint. **Asset production is explicitly tiered (a bespoke Lottie character set is NOT assumed buildable by a coding agent):**
- **Tier 1 (v1 baseline, owned by M11):** static Archie illustrations (AI-generated PNG/SVG, 6 poses: idle, cheer, think, curious-magnifier, sleepy, legendary) animated with Reanimated (breathe/bounce/tilt/parallax).
- **Tier 2 (v1):** generic LottieFiles free-library animations for confetti, chest-open, flame ignition (no custom character needed).
- **Tier 3 (post-v1, optional):** commissioned custom Lottie state set.
- **SFX:** named CC0 source (Kenney Interface/Digital Audio packs) committed to `assets/sfx/` with `LICENSES.md`.
Copy voice: warm, curious, never guilt ("Found a gap — that's the good part").

### 4.3 Juice moments (all gated on `useReducedMotion` + sound/haptics user toggles)

Correct: sage flash + rising chirp (expo-audio, players preloaded at lesson start) + light haptic. Incorrect: soft thud, no buzzer, amber card, "add to review deck" framing. 5-in-a-row: combo flare + energy refund lightning. Lesson end ceremony (the addictive part, **optimistic — never awaits grading, GC-03a**): XP tally count-up → combo/accuracy bonus reveal → chest open (tier already upgraded if explain-back completed) → streak flame → Lottie confetti. Streak milestones at 7/30/100 days: full-screen Archie takeover. Reduce-motion replaces all of it with instant-state + gentle opacity fades.

### 4.4 Energy — full spec (was undefined; now the GC-04 test oracle)

- Energy gates **ONLY new path-lesson starts** (cost 1, max 5). It is a pacing meter, not a punishment meter.
- **Never consume or require energy**: practice hub, SRS reviews, mistake review, explain-back, mock exams.
- A mistake in a path lesson costs 1 energy; 5-in-a-row correct restores 1; completing any practice/SRS session restores 1 (guaranteed recovery path); passive refill 1 per 45 min.
- **At 0 energy**: the lesson node offers a one-tap "warm up to refill" practice session (guaranteed +2 on completion) — the user is redirected, never stopped. Invariant (unit-tested): at 0 energy, at least one zero-cost study action is always available on the path screen. No depleting-bar anxiety framing; the meter renders as refill-progress, not depletion.

### 4.5 Streaks — full state machine (was incoherent; now the GC-04 test oracle)

`active` → (missed day, timezone-correct boundary) → **freeze auto-consumes silently** (2 equipped free from day one) → (freezes exhausted) → **`paused`**: count frozen and displayed warmly ("Streak resting at 12") → any completed lesson within **7 days** resumes at the frozen count → after 7 days, count archives to `longest` with a warm restart message — nothing "breaks", ever. The evening notification is a **supportive nudge** ("Archie saved your streak — 5 min keeps it warm"), fires at min(habitual hour, quiet-start − 1h); "danger"/"lose your streak"/"about to break" are in `banned-copy.json` (GC-13). Every transition, timezone-boundary and freeze-exhaustion path unit-tested (GC-04).

### 4.6 Reward economy — full spec (was unspecified; now `src/engine/rewards.ts` config + GC-04 tests)

- **Chest tiers**: bronze (lesson complete) / silver (lesson + explain-back completed — the Feynman incentive, GC-15b) / gold (unit legendary). Payouts: bounded random gems (bronze 5–10, silver 10–18, gold 20–35) + occasional cosmetic drops (Archie hats / blueprint skins). **Published odds in-app** (transparency is the anti-dark-pattern line). Hard rules: nothing purchasable with money, no near-miss animations, variability only ever ADDS on top of a guaranteed floor.
- **Gem sinks**: extra streak freezes, Archie cosmetics, 15-min 2× XP boost windows — priced within earnable range at the stated daily goal (tested).
- **Commitment goal (gain-framed; replaces the wager, cut from onboarding)**: in-app optional feature (M8): pick a 7-day goal, preview the bonus chest earned on completion; missing days costs nothing; the offer silently renews. Unit test: no currency or streak is ever deducted; copy passes banned-copy lint; skippable with one tap.

### 4.7 ADHD-first rules — encoded as tokens/tests/checklists

1. **One primary CTA per screen**, largest tap target — enforced via `docs/design-review-checklist.md` at each milestone review (custom ESLint rule cut: most expensive-to-maintain artifact class for a solo app).
2. Lessons ≤5 min, ≤2 concepts — **now a build gate** (`estimatedSeconds` sum ≤ 300s, GC-02); "Continue" never below the fold; **cold app-open lands one tap from resuming** (GC-03b).
3. **No shame anywhere**: banned-copy lint incl. runtime LLM text (GC-13); mistakes are review-deck fuel; streaks pause per the 4.5 state machine; 2 free freezes.
4. **Energy per 4.4**: never hard-blocks; practice always free; recovery always one tap away.
5. Deliberate exit points: "Goal hit — you can stop now" screen after daily goal (anti-doomscroll).
6. Notifications: playful-supportive, habitual-hour timed, **operationally-defined auto-mute after 5 ignored** (GC-13), quiet hours 21:00–07:00 with the 4.5 precedence rule; **permission priming happens after the first lesson completion** (value demonstrated first — never an un-primed system dialog at launch).
7. Choice minimization: onboarding is exam-date → daily-goal pick (5/10/15/20 min) → **first full lesson before any signup** (anonymous auth invisible underneath) → notification priming → save-progress email prompt after first streak. **Placement quiz cut** (start-from-scratch only; the path already unlocks by progress). **Wager cut** (see 4.6).
8. Leaderboard **opt-out-able**; "beat your past week" solo view is the primary surface.
9. Progress is additive: coverage meters fill, nothing turns red, no depleting bars for learning state; **SRS never shows a due-count** — daily review presentation capped from daily-goal minutes (≈2 cards/min, 10-min goal ⇒ ~20), overflow silently rescheduled by FSRS; after ≥5 idle days the first session is a fixed 10-card confidence-weighted warmup with a "welcome back" Archie state (no Anki shame wall — property-tested, GC-04).
10. Predicted-score dial (100–1000 vs the 720 line) + days-to-exam + required pace as the "am I actually learning" meter.

---

## 5. MILESTONES (autonomous build loop; reordered by study value; device install early)

**Eval harness design — `evals/run.sh`** is a **thin dispatcher**: M0 ships only checks that can run truthfully on day one (typecheck, lint, jest, secret-scan+canary, CI); every later check lands in the same milestone as its feature (contrast with tokens at M1, copy-lint with the content pipeline at M2, schema-audit with migrations at M9). CI = GitHub Actions running the same script. Thresholds ratchet per milestone via `evals/thresholds.json`.

- **M0 — Eval harness (thin).** `run.sh` dispatcher, typecheck/lint/jest wiring, `secret-scan.sh` with canary self-test, CI workflow, `content/blueprint.json` (explicit weight map), `evals/thresholds.json`. Verify: dispatcher runs; canary proves the scanner fails on a planted fake key. *No human gate.*
- **M1 — Foundation.** Expo SDK 57 scaffold (dev-client, router tabs, NativeWind), **dark-theme tokens + scalable Dynamic Type API + contrast check land here**, Nunito, zustand→AsyncStorage, supabase-js client (default session storage) + no-JWT-in-stores eval check, `supabase init` + migration 0001 (`profiles` with NOT NULL generated display_name trigger + RLS with WITH CHECK + total_xp SUM trigger), anonymous auth. Verify SDK-57 compat of expo-speech-recognition (D16 fallback decision recorded). Verify: typecheck/lint/contrast GREEN, app renders in iOS Simulator, profiles RLS test GREEN.
- **M2 — Content pipeline (pilot).** zod schemas (incl. `estimatedSeconds`, `volatile`, `variantOf`), all validators (citations at-authoring-time, dupes **with threshold calibration on intentional pilot siblings**, answer-key, banned-copy/copy-lint lands here, 300s lesson budget, key-point round-trip, ID registry), sqlite builder, style guide, design-review checklist; pilot unit (C1-U1, 3 lessons, ~30 questions). Verify: `content:validate` + `content:build` GREEN on pilot; calibrated threshold recorded in blueprint.json.
- **M3 — Lesson core (FIRST USABLE APP).** Lesson player with the Feynman spine — MC renderer (+ scenario/spot-bug/tf-speed prop variants) + multi-select; **explain-back v1 in local self-assessment mode (default path, explicit-tap skip, chest-tier hook — GC-15a/b scaffolded)**; XP/energy/**streak** engines per Sections 4.4/4.5 (streak moved up from gamification — it drives daily use); combo logic; ceremony v1 (optimistic); cold-open Continue CTA. Verify: GC-03 GREEN, engine suites GREEN. → **HUMAN GATE D (~30 min): first device install** — `npx expo run:ios --device` with free Apple ID; complete a pilot lesson on the physical iPhone; confirm theme choice; start weekly re-provision cadence (7-day free-provisioning expiry). **M4+ does not start until a lesson completes on the phone.**
- **M4 — Remaining renderers + path.** match-pairs, order-steps, cloze renderers; reduce-time-pressure mode for tf-speed (GC-10); path UI (units, chest/legendary/review nodes), unit review. Verify: renderer suites + a11y sweep GREEN. *(The user can now genuinely study on the phone while content lanes run.)*
- **HUMAN GATE 0 (~20 min, anytime before M5.6 content freeze):** user signs up for the free Claude Partner Network account, downloads the official CCA-F exam guide, confirms/corrects `blueprint.json` weights and the scenario pool. If unavailable, an explicit "proceed on secondary-sourced weights" sign-off is recorded in the decisions ledger (D10). **M5.6's ratchet to full GC-02 thresholds is blocked on one or the other.**
- **M5.1–M5.5 — Domain content lanes (parallel, independently gated).** One lane per domain producing its lessons + lesson-bank questions + register quota (per the 3.1 table), each verified alone against per-domain thresholds in the ratchet file; lanes interleave with M6–M8 so app work never blocks on authoring. **M5.6 — Exam register assembly + audit**: 3 disjoint mock forms (per-form distribution 16/11/12/12/9 ±1 + difficulty floor), 5 minis by reference, reviewer-agent audit (100% structural, ≥20%/domain semantic), Meet-the-Exam course, `content:volatile-report` script + `docs/maintenance.md`. Verify: GC-01 + GC-02 GREEN at full thresholds.
- **M6 — SRS + Practice Hub.** FSRS scheduler as the **single** scheduler (re-explain prompts as FSRS items seeded ~1d/3d/7d), daily presentation cap from goal minutes, no due-count anywhere, ≥5-idle-day welcome-back warmup, automatic mistake capture, low-energy warmups (match, TF). Verify: SRS property tests (incl. cap-under-any-backlog) GREEN.
- **M7 — Mock exam mode + readiness.** Sim + practice-pace modes, timer, flag/navigator, crash-resume, scaled scoring + disclaimers, domain report, readiness verdict, patch plan, predicted-score dial **+ exam-date pacing (`pacing.ts`)**. Verify: GC-05 GREEN.
- **M8 — Gamification core.** Quests (3 daily, escalating, chests, all-three bonus), **reward economy per 4.6** (payout config, published odds, sinks), achievements + monthly badge, **commitment goal (gain-framed)**, local notifications (precedence rule, operational ignored-definition, auto-mute, priming flow), gems. Verify: quest/achievement/reward/commitment/notification suites GREEN, GC-13 GREEN.
- **M9 — Sync + leaderboard (local Supabase).** **M9a**: full migration set (all 2.3 tables incl. xp caps trigger + grading_quota + spend_ledger), outbox replay, LWW guards, auth lifecycle — GC-06, GC-12, GC-07 for existing surface. **M9b**: `get_leaderboard()` RPC + function-grant REVOKEs + full schema audit (WITH CHECK, grants, security_invoker) — GC-07 GREEN in full. → **HUMAN GATE A** (hosted project + `db push` + **enable anonymous-sign-in abuse protections/CAPTCHA**).
- **M10 — Feynman grading live.** `grade-feynman` per Section 2.5 (identity-from-token, atomic quota + global budget before the API call, structured outputs, runtime shame filter, injection/shame probes, self-assessment degradation), explain-back UI fully wired (coverage meter async fill, refine loop, char counter, **dictation via expo-speech-recognition** with typed fallback), GC-15 suite. Verify: GC-09 + GC-15 GREEN via `functions serve` locally. → **HUMAN GATE B** (`supabase secrets set ANTHROPIC_API_KEY` + **hard monthly spend limit in the Anthropic console** + deploy).
- **M11 — Juice, a11y, onboarding, final device.** Archie asset plan Tiers 1+2 (static illustrations + Reanimated motion; LottieFiles celebrations), SFX from CC0 pack with licenses, ceremonies v2, reduce-motion + **Dynamic Type audits**, onboarding flow per 4.7 #7 (incl. notification priming), final `expo export` secret scan. Verify: GC-08, GC-10 GREEN; full `evals/run.sh` GREEN. → **HUMAN GATE C**: full `docs/device-verification.md` checklist (GC-14, incl. AX-text-size lesson + mic/speech permissions).

---

## 6. DECISIONS LEDGER

| # | Decision | Reversibility | Notes |
|---|----------|---------------|-------|
| D1 | Expo dev-build from day one; never Expo Go | Easy | Kept for dev-client ergonomics + custom native config (speech plugin); the old "forced by MMKV" rationale is gone with MMKV |
| D2 | Bundled SQLite content, no content tables in Postgres | Moderate | Could move to server-fetched content later; sync keys unaffected |
| D3 | **Stable, append-only content slugs (deprecate, never rename)** | **Hard — one-way door** | Server rows key on slugs; a rename orphans SRS/progress forever. Enforced by ID-registry validator |
| D4 | **XP as append-only event log with client_event_id idempotent replay; integrity = honest per-source caps + daily ceiling, NOT recomputation** | **Hard** | Idempotent offline replay is the load-bearing property. Amended per review: the "tamper-proof leaderboard" claim is withdrawn — caps are heuristic defense; client computes combos |
| D5 | Anonymous-first auth → email-OTP upgrade; supabase-js default AsyncStorage session storage; no Sign in with Apple v1 | Moderate | LargeSecureStore/AES wrapper cut as threat-model theater; eval check keeps JWTs out of app stores; Apple sign-in blocked by free account anyway |
| D6 | Energy model per Section 4.4 spec (gates only new path lessons; guaranteed recovery paths) | Easy | Config values in one module; fully unit-tested |
| D7 | NativeWind over Unistyles/StyleSheet | Moderate | Migration is mechanical but broad |
| D8 | Lottie only — mascot poses, celebrations, AND confetti (fast-confetti + Skia removed) | Easy | One animation system; swap to rive-react-native (correct name!) later if wanted |
| D9 | Haiku 4.5 + structured outputs for grading; no prompt caching; no Sonnet in hot path; **triple spend guard: atomic per-user quota + atomic global daily budget + Anthropic-console monthly limit** | Easy | Model ID in one constant; re-verify pricing at build time |
| D10 | **Blueprint is an explicit domain→weight MAP {d1:27, d2:18, d3:20, d4:20, d5:15}** (ruling resolves the Rev-1 d2/d4 transposition in favor of the curriculum table); per-domain ±1-question exact assertion; provisional until **Gate 0** (official exam guide via free Partner signup) or a recorded proceed-on-secondary sign-off | Easy | Weights live in config; correction is a data change |
| D11 | **One global weekly-XP leaderboard, computed on read** (single SECURITY DEFINER RPC over xp_events); no tiers/cohorts/ghosts/pg_cron/rollover; "beat your past week" is the primary surface; opt-out-able | Easy | Rev-1 league machinery deleted per review — enterprise-scale apparatus for a one-real-user app; xp_events makes the full ladder a clean later addition |
| D12 | Local notifications only; no APNs/remote push v1; operational ignored-definition + auto-mute | Easy→Moderate | Free Apple ID has no push entitlement |
| D13 | Single hosted Supabase free-tier project; local Docker for all dev/tests; abuse protections + CAPTCHA on anonymous sign-in at Gate A | Moderate | Free tier pauses after ~1 week inactivity — documented risk |
| D14 | No-shame contract as enforceable evals — now covering runtime LLM output, streak copy, and notification framing (GC-13), trading retention power for wellbeing | Moderate | Deliberate product stance; wager cut, commitment feature gain-framed only |
| D15 | **Tiered mascot/SFX asset plan**: Tier 1 static AI-generated Archie + Reanimated motion, Tier 2 free LottieFiles celebrations, Tier 3 commissioned set post-v1; SFX from CC0 (Kenney) with committed licenses | Easy | Bespoke character Lottie is not agent-buildable; this de-risks the juice layer |
| D16 | **Dictation via expo-speech-recognition** (config plugin + mic/speech Info.plist strings), typed input equal-class; if SDK-57 compat fails at M1, v1 ships typed-only (recorded fallback) | Easy | Dictation is load-bearing for the low-friction Feynman default path |
| D17 | **Single warm-dark theme v1**; semantic tokens keep light theme additive later | Easy | Halves contrast surface + QA; confirm preference with user at Gate D |
| D18 | **Reward economy per 4.6**: guaranteed floors + bounded bonus RNG + published odds; no money purchases, no near-miss animations; sinks: freezes, cosmetics, XP boosts | Easy | Variable-ratio dopamine without dark patterns; config module + GC-04 tests |
| D19 | **Feynman explain-back is the default path** (explicit-tap skip, chest-tier upgrade, optimistic ceremony, XP independent of grading) — protected by GC-15 | Moderate | The pedagogy centerpiece is now contract-enforced, not aspirational |

### Rejected / partially-applied review suggestions

1. **"Cut the per-user quota, grading_events, and injection probe from GC-09" (simplicity, minor) — partially rejected.** The data-isolation blockers mandate spend/abuse controls that outrank this simplification: the atomic per-user quota (one SQL statement), the global daily budget, and identity-from-token stay. Applied where compatible: the separate `grading_events` table is cut (token accounting folded into `feynman_submissions`), and injection handling is one probe test rather than a suite — the shame probe shares the same harness, so marginal cost is near zero.
2. **"Descope dictation to typed-only" (completeness, major — option b) — rejected in favor of option (a).** The ADHD-pedagogy blocker fix asks for dictation-first explain-back; free-typing on a phone keyboard is exactly the friction that makes the Feynman loop skippable. expo-speech-recognition is added with permissions and a GC-14 checklist item, with an explicit recorded fallback (D16) if SDK-57 compat fails at M1 — so the schedule risk the judge flagged has a pre-decided exit.
3. **"Wire the maintenance report into evals/run.sh as an informational check" (completeness, minor) — partially applied.** The `content:volatile-report` script is built (M5.6) with a `docs/maintenance.md` runbook, but it is NOT wired into `run.sh`: the simplicity panel correctly notes network-dependent checks produce spurious CI reds, and the user intends to pass the exam once — a pre-exam manual re-verification is the right weight.

## 7. HUMAN GATES (build never blocks on them, except the two content/device checkpoints that exist to de-risk everything downstream)

Everything except device installs and hosted deploys runs on **local Supabase (Docker) + iOS Simulator** — zero accounts, zero secrets, zero money.

- **Gate D (after M3, ~30 min — NEW, the earliest gate):** enable Developer Mode on the iPhone (Settings → Privacy & Security); sign into Xcode with a free Apple ID (Personal Team); USB; `npx expo run:ios --device`; complete one pilot lesson on the phone; confirm theme preference (D17). Ongoing: re-run weekly (7-day free-provisioning expiry) — or buy the $99/yr Apple Developer Program when that gets annoying (TestFlight 90-day installs + remote push + Sign in with Apple). **This gate front-loads every device-class risk (provisioning, dev-client build, native linking, haptics/sound) and gives the user a usable study app while content builds out.**
- **Gate 0 (before M5.6 content freeze, ~20 min — NEW):** free Claude Partner Network signup → download the official CCA-F exam guide → confirm/correct `blueprint.json` weights + scenario pool. If not obtainable, record a "proceed on secondary-sourced weights" sign-off in D10. M5.6's full-threshold ratchet is blocked on one or the other.
- **Gate A (after M9, ~15 min):** create hosted Supabase project → dashboard: enable anonymous sign-ins **+ its abuse protections (per-IP rate limits, CAPTCHA/Turnstile)**; set Magic Link template to `{{ .Token }}` → locally: `supabase link`, `supabase db push`, put `EXPO_PUBLIC_SUPABASE_URL` + publishable key in `.env` (safe to embed; RLS is the boundary). Optional: custom SMTP (Resend) if OTP emails feel rate-limited. (pg_cron/pg_net/Vault no longer needed — leagues simplified.)
- **Gate B (before M10 hosted deploy, ~10 min):** create an Anthropic API key at console.anthropic.com **and set a hard monthly spend limit on it in the console** → `supabase secrets set ANTHROPIC_API_KEY=…` → `supabase functions deploy grade-feynman`. (Local dev already works via `supabase/functions/.env`.)
- **Gate C (M11, ~30 min):** execute the full `docs/device-verification.md` checklist (GC-14): haptics, sound, notifications, offline lesson, sync-on-reconnect against hosted Supabase, mic + speech-recognition permission prompts + dictated explain-back, largest-AX-text-size lesson + mock screen.
- **Optional, anytime:** `npx expo login` / EAS — only for EAS Update OTA content fixes or cloud builds (free tier: 15 iOS builds/month; EAS iOS device distribution requires the paid Apple membership).

**Standing risks logged:** official domain weights/scenario pool are secondary-sourced — **owned by Gate 0** (weights live in config for this reason); exam access itself is partner-gated — the app states this plainly on the exam-info screen; volatile-tagged content gets one manual re-verification pass before the user's exam date (`docs/maintenance.md`); Supabase free tier pauses after ~1 week inactivity; free-provisioning re-signing is weekly until/unless the paid Apple program is purchased.