# THREATS — CCA Quest

Part of the signed contract. Right-sized: personal study app, no PHI/PII beyond an optional email
(which never leaves `auth.users`), but it ships a public Supabase endpoint, an anonymous-auth
surface, and a server-side Anthropic API key — those are the real assets.

## Assets & sensitive data

- Anthropic API key (server-side only; spend is the asset an attacker burns)
- Supabase service credentials (`service_role`, `sb_secret_`) — must never ship in the app bundle
- Per-user study data (progress, transcripts of explain-back answers) — low sensitivity, still isolated
- Optional account email — lives only in `auth.users`, never in app tables or client-readable paths
- Device session token (supabase-js session in AsyncStorage on a passcode-locked personal phone)

## Trust boundaries & data flows

- B1: iPhone app ↔ Supabase PostgREST/auth (untrusted client; anon key is public by design, RLS is the boundary)
- B2: iPhone app ↔ `grade-feynman` edge function (untrusted client input: transcripts)
- B3: `grade-feynman` ↔ Anthropic API (server-side key; learner text is untrusted data in the prompt)
- B4: repo/CI ↔ npm registry (supply chain)
- B5: git history / expo export bundle ↔ public (leak surface)

## Threats (STRIDE per boundary)

| id | boundary | STRIDE | threat | L×I | mitigation | criterion |
|----|----------|--------|--------|-----|------------|-----------|
| T1 | B1 | Information disclosure | Cross-user reads via tables/views/RPCs (views bypass RLS unless security_invoker) | M×H | RLS on 100% tables, WITH CHECK on writes, security_invoker views, single audited leaderboard RPC, grant allowlist | GC-07 |
| T2 | B1 | Tampering | Fabricated XP/leaderboard inflation via direct PostgREST writes | H×L | Honest per-source caps + daily ceiling triggers on xp_events (stated as heuristic, not anti-tamper) | GC-07 probe |
| T3 | B2 | Denial of service / spend | Anonymous-account farming to burn Anthropic spend via grade-feynman | M×H | Triple guard: atomic per-user quota (60/day) + atomic global budget (1000/day) BEFORE API call + Anthropic console hard monthly limit (Gate B); Supabase anonymous sign-in abuse protections + CAPTCHA (Gate A) | GC-09 |
| T4 | B2 | Spoofing | Caller claims another user_id in request body | M×M | Identity resolved from Authorization JWT only; body user_id ignored (probed); bare anon key → 401 | GC-09 |
| T5 | B3 | Tampering | Prompt injection via explain-back transcript ("ignore your rubric…") | H×L | Transcript passed strictly as data in JSON payload; json_schema-constrained output; injection probe | GC-09 |
| T6 | B3 | Information disclosure | Model output leaks shame/unsafe copy to a vulnerable user | M×M | Runtime banned-vocab filter + templated fallback; missing_points via lintable ID templates; shame probe | GC-09, GC-13 |
| T7 | B5 | Information disclosure | `sk-ant-`/service key committed or bundled into the ipa/export | L×H | gitleaks over full history + worktree + expo export incl. binaries; canary self-test proves scanner works | GC-08 |
| T8 | B4 | Tampering | Slopsquatted/compromised dependency (`@rive-app/react-native-rn` is a known 404 trap here) | M×M | Registry-verified install list in PLAN-rev2 §2.2; deps audit gate; new deps require registry check | sec-deps |
| T9 | B1 | Spoofing | Session token theft from device storage | L×M | Personal passcode-locked device; supabase-js default storage; eval asserts no JWTs in app zustand stores; accepted residual (see below) | M1 eval check |

## Residual / accepted risks

- T9 residual: AsyncStorage is not hardware-encrypted storage; LargeSecureStore/AES wrapper was cut
  as threat-model theater for a single-user personal device (D5, judge-reviewed). Revisit if the app
  ever distributes beyond Nate's phone. Logged in DECISIONS.md.
- T2 is explicitly heuristic: client computes XP combos; caps bound fabrication, they don't prevent it.
  Leaderboard is social glue for ~1 real user, not a prize surface (D4).
