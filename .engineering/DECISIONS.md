# DECISIONS — CCA Quest

## Ledger

<!-- projection of decisions.json; full text in PLAN-rev2.md section 6 -->

| id | title | rev | one-way? | status | gate |
|----|-------|-----|----------|--------|------|
| D1 | Expo dev-build from day one (never Expo Go) | easy | - | ruled | signed contract |
| D2 | Bundle all course content as a build-time SQLite db; no content tables in Postgr | moderate | - | ruled | signed contract |
| D3 | Stable, append-only content slug IDs (deprecate, never rename or delete) | hard | ONE-WAY DOOR | ruled | signed contract |
| D4 | XP as append-only event log with idempotent replay; integrity via honest caps, n | hard | ONE-WAY DOOR | ruled | signed contract |
| D5 | Anonymous-first auth with email-OTP upgrade; default AsyncStorage session storag | moderate | - | ruled | signed contract |
| D6 | Energy model fully specified: gates only new path-lesson starts, guaranteed reco | easy | - | ruled | signed contract |
| D7 | NativeWind 4.2.6 for styling | moderate | - | ruled | signed contract |
| D8 | Lottie as the single animation system (mascot, celebrations, AND confetti) | easy | - | ruled | signed contract |
| D9 | claude-haiku-4-5 with structured outputs for grading; triple spend guard | easy | - | ruled | signed contract |
| D10 | Blueprint weights as an explicit domain→weight MAP: {d1:27, d2:18, d3:20, d4:20, | easy | - | ruled | signed contract |
| D11 | One global weekly-XP leaderboard computed on read; league ladder deleted from v1 | easy | - | ruled | signed contract |
| D12 | Local scheduled notifications only; operationally-defined anti-nag | easy | - | ruled | signed contract |
| D13 | Local Docker Supabase for all dev/tests; single hosted free-tier project deploye | moderate | - | ruled | signed contract |
| D14 | No-shame contract as enforceable evals, now covering runtime LLM output and stre | moderate | - | ruled | signed contract |
| D15 | Tiered mascot/SFX asset plan (bespoke Lottie character NOT assumed) | easy | - | ruled | signed contract |
| D16 | Dictation via expo-speech-recognition, with a pre-decided typed-only fallback | easy | - | ruled | signed contract |
| D17 | Single warm-dark theme in v1 | easy | - | ruled | signed contract |
| D18 | Transparent reward economy: guaranteed floors, bounded RNG, published odds, defi | easy | - | ruled | signed contract |
| D19 | Feynman explain-back as the contract-protected default path (GC-15) | moderate | - | ruled | signed contract |
| D20 | Onboarding minimized: exam date → daily goal → first lesson; placement quiz and  | easy | - | ruled | signed contract |
| D21 | Terracotta pixel Claude Code agent replaces the Archie octopus mascot | easy | - | ruled | user directive |
| D22 | Public app identity is Claude Learner; CCA Quest remains the internal codename | easy | - | ruled | user directive |

## Log

- 2026-07-13 - SIGN-OFF: GOAL.md signed (user approved the full Rev-2 plan via ExitPlanMode in Conductor; approval explicitly covered contract, architecture, milestones, decisions ledger, human gates).
- 2026-07-13 - RATIFIED: full decisions ledger D1-D20 including one-way doors D3 (append-only content slugs) and D4 (XP event log; integrity = honest caps).
- 2026-07-13 - RISK-ACCEPTED: T9 residual (AsyncStorage session storage on personal passcode-locked device; AES wrapper cut as threat-model theater, judge-reviewed). Expiry: revisit if the app distributes beyond Nate's phone.
- 2026-07-13 - NOTE: user directives recorded: Fable 5 for docs/architecture/content, Opus 4.8 for implementation code, dynamic Workflow subagents, superpowers discipline.
- 2026-07-18 - D22 USER DIRECTIVE: restored the installed and learner-facing product identity to
  Claude Learner (`claude-learner`, `claudelearner://`, `com.cyrilvictor.claudelearner`). CCA Quest
  remains the internal contract and engineering codename; internal package, content, and gate names
  are intentionally unchanged.
- 2026-07-13 - D16 OUTCOME: expo-speech-recognition has NO Expo SDK 57 release. It exists on npm (no 404) with wildcard peer deps (no npm peer-conflict), but its newest published version (56.0.1) declares `expo: ~56.0.8` and targets the SDK-56 Expo Modules API; `expo install` did not recognize it as an SDK-57 native module and fell back to the SDK-56 build. Per D16, NOT forced — package backed out (npm uninstall), no config plugin added to app.json. v1 ships explain-back typed-only (typed input is already the equal-class default per PLAN 3.1). Re-evaluate dictation when an SDK-57 build of expo-speech-recognition is published.
- 2026-07-13 - GATE 0 SATISFIED (early): user provided the official CCA-F Exam Guide v1.0 (July 2026) + Exam Policy + T&C PDFs. Blueprint weights {d1:27,d2:18,d3:20,d4:20,d5:15} CONFIRMED verbatim; scenario pool of 6 confirmed; D10 resolved (weights no longer provisional). New official facts adopted: multi-response items state how many to select; 30 task statements (7/5/6/6/6) extracted to content/official-task-statements.md; exam fee $125; 12-month validity. PDFs stored locally in docs/official/ (gitignored - Anthropic confidential-adjacent material stays out of the repo).
- 2026-07-13 - NOTE: user shared claudecertificationguide.com/learn (copyrighted third-party prep site) - treated as structure cross-check only, no content copying; its 30-task-statement count corroborates our extraction.
- 2026-07-14 - HARNESS-FIX: GC-08 secret-scan worktree pass now respects .gitignore (scans tracked+untracked-not-ignored only). Was false-positiving on gitignored ios/Pods Apple CodeSignature manifests. NOT a gate weakening — committable-secret detection proven intact by planted-key test; history + export-bundle + JWT passes unchanged. Owner-approved scope correction, not an Iron-Law-6 suppression of a real finding.
- 2026-07-14 - GATE-FIX (GC-02, not a threshold change): the bank-per-domain check computed
  per-domain targets from the stale planning constant `lesson_bank_target: 440`, so the 465
  correctly-proportioned questions the M5 lanes produced all read as "over target". Fixed
  content/scripts/stats.ts to (a) treat 440 as a FLOOR (bank total ≥ 440, like the ≥600 total gate)
  and (b) check per-domain PROPORTIONS against the ACTUAL bank pool size — the literal reading of
  GC-02's "weight × pool-size". Transposition detection (the check's purpose) is unchanged and still
  ±1 per domain at any pool size. Not a weakening: over-production of correctly-weighted content is
  strictly better for study coverage. d5 (lowest weight) was then topped up to meet the ±1 proportion
  cleanly rather than loosening the tolerance.
- 2026-07-14 - D21 USER DIRECTIVE: replaced the planned Archie octopus with the supplied terracotta
  pixel Claude Code agent character. The mascot is reconstructed as a crisp scalable native component
  with reduce-motion-aware poses; learner-facing Feynman prompts now say "Teach the agent."
- 2026-07-16 - MERGE (not a contract change): merged origin/main (HEAD e0b0364, an M8 parallel build)
  into vienna via `git merge -s ours`. origin/main proved to be a DERIVED, earlier, smaller snapshot of
  vienna's own content — its question bank came from commit 75e3961 "import vienna curriculum — 330
  questions" — and every one of its subsystems (JSON content, scoring.ts/mock.ts, progress.ts,
  DailyPanel, PathNode, 3 stores, migration 0001) has a strictly more advanced vienna equivalent
  (content.db pipeline w/ 649 Q + 5 renderers, engine/mock-exam.ts + 3 disjoint mock forms, FSRS SRS,
  8 stores + sync layer, migrations 0001+0002). Nothing was grafted in: all 28 conflicts resolved to
  vienna, zero main-only files imported; merge-commit tree is byte-identical to vienna HEAD 8c74865
  (verified `git diff --stat` empty). No eval weakened, no slug renamed/dropped (id-registry unchanged,
  D3 intact), evals.json untouched (Iron Law 2 — CI regenerates via evals/run.sh). Purpose: record main
  as merged so the two builds stop diverging and these 28 conflicts never resurface.
- 2026-07-17 - M10 REVIEW RULINGS (adversarial review pass-with-fixes; no contract change):
  (1) FIXED — global-budget slot is RELEASED when the per-user quota then rejects (new
  release_global_budget RPC in migration 0003; ledger-delta assertion added to the concurrency
  probe). Closes the capped-user-drains-app-budget hole while keeping the spec's global→user order.
  (2) RISK-ACCEPTED for v1 — a failed/timed-out Anthropic call does NOT refund either reservation:
  an outage burns quota slots with no grades delivered. Bounded (60/user/day, 1000/day, client
  degrades silently to self-assessment with identical XP), and refund-on-model-failure would let a
  crafted failure loop spin the API. Revisit if real outages ever matter. Expiry: revisit at v2.
  (3) FIXED — storedGrade lookup now fails CLOSED (502, no quota charged) instead of treating a DB
  error as "no prior grade" and re-charging quota on replay.
  (4) FIXED — a late server verdict landing after finishExplainBack no longer rewrites coveredIds,
  so the fixed chestTier and the gap card can never disagree.
- 2026-07-17 - M11 RULINGS: (a) WelcomeBack standalone takeover DELETED — PracticeHub already ships
  an integrated, session-wired welcome-back mode; the unmounted duplicate would have required a new
  navigation surface to exist at all (dead UI is worse than fewer features). (b) SFX/lottie assets
  are ORIGINAL synthesized works (generator scripts committed: content/scripts/build-sfx.ts,
  build-confetti.ts) — no third-party asset licensing risk; assets/licenses/ documents provenance.
  (c) No haptic on incorrect answers — deliberate no-punishment stance (GC-13 spirit). (d) GC-14
  ratchet deferred: thresholds stay at m10 until Gate C's manual checklist executes (enforcing a
  human-only criterion in CI would just freeze merges, not create information).
- 2026-09-24 - CONTRACT RE-OPEN (USER-APPROVED, sec-deps): after aligning Expo SDK 57 patch versions
  and overriding every HIGH advisory that has an in-major fix, two HIGH advisories remain in
  `image-size` 1.2.1, pulled in by metro: GHSA-5p2g-fcmc-qvqq (JXL/HEIF parser DoS) and
  GHSA-w3rx-r6r6-pgpr (ICNS parser DoS). Every version through 2.0.2 is affected, and image-size 2.x
  cannot be substituted because its default export only accepts buffers while metro passes file
  paths. Risk: build-time only, parsing the repo's own assets; nothing ships in the app. Owner ruling
  (Nate, 2026-09-24): allow exactly these two advisory IDs for image-size via
  evals/deps-allowlist.json, each expiring 2026-12-23, after which the gate fails again and forces a
  re-check. The osv-scanner path now prints every unexcused finding (the old 15-line cap is removed).
  The npm-audit fallback is unchanged and stays strict (no allowlist), so a missing osv-scanner can
  never widen the exception.
