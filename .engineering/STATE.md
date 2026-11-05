# STATE — CCA Quest          (updated: 2026-07-18, Claude Learner live Release rollout)

phase: 5
evals: 16 green / 17 total   (all except GC-14 device-manual; GC-09 now GREEN + ratchet-enforced)

## Progress

- Contract SIGNED; Gate 0 SATISFIED. M0 harness RED baseline tagged. M1 foundation done.
- M2 DONE + verified: content pipeline + pilot unit C1-U1 (15 answers re-derived from docs, zero
  disagreements). GC-08 scanner scope bug fixed. sec-deps CI bug fixed (temp-file parse, npm-audit
  fallback, ecosystem severity — CI green).
- M3 DONE + verified (workflow wf_d383a154-025): pure-TS engines (xp/energy/streak/combo) at 100%
  line / 95.77% branch cov; content-db reader (bundled sqlite asset via metro assetExts + committed
  assets/content/content.db); Feynman lesson player (concept card → mc/multi/order/cloze renderers
  → explain-back DEFAULT path → gap card → optimistic ceremony); cold-open Continue deep-resume.
  GC-03 + GC-04 + GC-15 GREEN. 174 expo tests pass. iOS export ships content.db asset.
- Verifier smoke was PARTIAL (couldn't tap iOS "Open" dialog in its sandbox); orchestrator closing
  the visual-proof gap with a Release build screenshot (bhp3a16jy).
- Known: expo web target broken (wa-sqlite wasm) — web is a NON-TARGET, iOS unaffected. MatchRenderer
  is a stub (no match questions in pilot; wire real one at M4).

- M4 DONE + verified (wf_b762d9b4-db7): real MatchRenderer, tf-speed timer + reduce-time-pressure
  (auto-on under reduce-motion, XP parity), timed-content validator rule, full Duolingo path UI
  (lesson/chest/legendary/review nodes, data-driven path-model) + energy-free unit review. 10/17
  green, ZERO regressions. Release build launched on sim — Path screen renders real pilot content
  (docs/m3-path-screen.png).

- M5 DONE + verified (wf_0080065b-d97 + wf_994bcaed-268): full curriculum — 6 courses, 21 units,
  58 lessons, 649 unique questions (469 bank + 180 register), 3 pairwise-disjoint mock forms
  (≥93% difficulty≥2) + 5 minis. GC-01 + GC-02 GREEN. Independent reviewer audit re-derived 273+
  answer keys from official docs → ZERO disagreements. GC-02 gate corrected to pool-relative
  proportions + 440 floor (DECISIONS.md 2026-07-14 GATE-FIX; not a weakening). 11/17 green.
  content.db bundled asset refreshed (649 Q); iOS export verified.

- M6 DONE + verified: single FSRS scheduler, capped no-shame review, welcome-back warmup, automatic
  mistake capture, and the energy-free Practice Hub. GC-04 remains green.
- M7 DONE + verified: dedicated Exams tab with 3 full mocks + 5 minis; timed simulation and untimed
  guided modes; navigator, flags, countdown/auto-submit, crash resume, pacing, transparent scaled
  estimate, readiness + weak-domain report, relearn patch plan, and SRS capture. GC-05 GREEN; ratchet
  advanced to all automated criteria delivered through M7. Content-reader isolation also fixed 153
  exam-register items that could otherwise leak into lesson exercise lists.
- Physical iPhone install succeeded earlier, but Gate D remains open until the scroll fix and new UI
  are retested end to end. Latest CLI relaunch found Developer Mode disabled on the connected phone.
- M8 DONE + verified: three rotating daily quests, escalating chest rewards + all-three bonus,
  bounded gem economy with published odds and earnable sinks, achievement tiers + monthly rollover,
  gain-only seven-day commitment, exam-date pacing, and local notification policy with quiet hours,
  five-ignore mute horizon, 14-day return offer, and post-first-lesson priming. Profile is now a real
  progress/quests/achievement/workshop surface; GC-13 GREEN and M8 ratchet enforced.
- M9 AUTOMATED SLICE DONE + verified locally: anonymous-first session bootstrap that safely no-ops
  without environment credentials; anonymous-to-six-digit-email-OTP ownership preservation; full
  user-state outbox with append-only XP and coalesced LWW rows; two-way newer-wins merges across
  progress, energy, streak, SRS, quests, achievements, exams, and leaderboard privacy; hardened
  owner-only schema plus the minimal-field `get_leaderboard()` RPC; offline-safe account and League
  surfaces. `test:sync`, `test:auth`, and all 23 real-client RLS probes are GREEN against local
  Supabase. GC-06 + GC-07 + GC-12 are now CI-enforced. Release iOS simulator build succeeded and
  rendered the warm-dark path on iPhone 17 Pro. Human Gate A remains open.

- M10 AUTOMATED SLICE DONE + verified (wf_e169f898-690 + inline finish after a session restart):
  grade-feynman Deno edge function (token-only identity, user_id never read from body, 1000-char
  cap, atomic global-budget→user-quota reservations BEFORE the Anthropic call with release-on-quota-
  reject so a capped user can't drain the app budget, Haiku 4.5 structured output, schema+subset
  validation, fail-closed idempotent replay, bundled key-points.json round-tripped byte-identical);
  migration 0003 reservation RPCs (SECURITY DEFINER, search_path='', service_role-only); GC-09 probe
  suite 10/10 GREEN via real `functions serve` + mocked Anthropic (401 probes, spoof-lands-on-caller,
  concurrency exactly-5-of-10, zero-API-calls-on-budget-exhaustion, injection-as-data, ledger-refund);
  explain-back v2 (async coverage meter, one refine loop, 800/1000 char counter, EVERY degraded path
  silently self-assessment with identical XP, runtime banned-vocab filter superset-tested against
  evals/banned-copy.json, ID-templated missing_points; typed-only per D16 — still no SDK-57
  expo-speech-recognition). finalize() stays synchronous (GC-03a). Adversarial review pass-with-fixes;
  findings 1/3/4 fixed + regression-tested, finding 2 risk-accepted (see DECISIONS.md 2026-07-17).
  16/17 green, gate GREEN with GC-09 enforced (ratchet m9→m10), 347 tests / 42 suites, zero regressions.

- M10 MERGED to main (PR #7, CI gate green after two CI-env fixes: edge-runtime image-pull time in
  the serve boot window, and functions URL taken from serve's own banner because `supabase status`
  has no FUNCTIONS_URL under CI's `-x edge-runtime`).
- M11 DONE + verified (wf_1422354b-8eb + finisher agent): full mascot pose set (reduce-motion-gated),
  original synthesized SFX + hand-authored confetti lottie (generators + licenses committed),
  expo-audio player with sound toggle + exam-sim mute, settings-gated haptics (none on incorrect),
  ceremony v2 (staged, skippable, reduce-motion instant, completion synchronous per GC-03a), answer
  cues wired at the renderer choke point, streak-milestone takeover, choice-minimized onboarding
  (exam-date → daily-goal → first lesson; no quiz, no signup wall; resumable; returning installs
  never re-see it), Gate C checklist rewritten so every claim is executable. Review pass-with-fixes:
  fresh-install nav dead-end, haptics-toggle bypass, onboarding re-bounce, hooks lint — all fixed.
  Dead code deleted (old sound stub, unmounted WelcomeBack duplicate). 16/17 green, 356 expo tests.
  NOTE: thresholds stay at m10 — GC-14 joins the ratchet only via manual status at Gate C sign-off.
- PUBLIC IDENTITY OVERRIDE RECORDED (D22): installed and learner-facing name is Claude Learner;
  generated iOS target/workspace/scheme is `ClaudeLearner`, URL scheme is `claudelearner://`, and
  bundle ID is `com.cyrilvictor.claudelearner`. CCA Quest remains the internal contract codename.
- LIVE RELEASE ROLLOUT IN PROGRESS: hosted project `qredxvgflpkqqhlhwllf` has exactly migrations
  0001–0003, 12/12 public tables with enabled + forced RLS, explicit least-privilege grants, clean
  schema lint, and only reviewed advisor notices. Concurrent grading is claim-fenced before paid
  work; capacity is transactional and rejected/failed attempts retain no transcript claim. Signed
  standalone Claude Learner `1.0.0 (2)` is clean-installed on the target iPhone while CCA Quest
  remains installed separately. Automatic launch succeeded without Metro; the human walkthrough is open.

## NEXT

ALL AUTOMATED MILESTONES COMPLETE (M0–M11). Remaining work is the hosted-service and human gates:
GATE A — database migration/RLS slice DONE. Remaining: safe public Expo URL/key already embedded;
activate anonymous-sign-in protection/CAPTCHA plus verified Resend SMTP and six-digit-token templates.
GATE B — Anthropic API key + HARD monthly spend limit in console + `supabase secrets set` +
`supabase functions deploy grade-feynman` (local dev already works via supabase/functions/.env).
GATE D/C — build 2 is installed and launched; keep the iPhone awake for the checklist → GC-14.
Local Supabase API 54341.

## CRITICAL — DO NOT

- Model routing (user directive): implementation-code subagents = Opus 4.8 (`model: 'opus'`);
  docs/architecture/content/review = Fable 5. Dynamic Workflow subagents for milestones.
- NEVER install `@rive-app/react-native-rn` (slopsquat; real pkg is rive-react-native, deferred).
- gesture-handler must stay at the SDK-57 pin (~2.32), NOT npm-latest 3.x.
- Content slugs are append-only once server rows exist (D3, one-way door). Deprecate, never rename.
- Reference repo github.com/paullarionov/claude-certified-architect has NO license: coverage
  cross-check only, never copy content.
- evals/ + evals.json live at REPO ROOT (not inside .engineering/) — hooks enforce there.
- Blueprint weights CONFIRMED at Gate 0 (official exam guide v1.0): {d1:27, d2:18, d3:20, d4:20, d5:15}. Author against content/official-task-statements.md.
- Never edit evals.json by hand (Iron Law 2); only evals/run.sh writes it.
