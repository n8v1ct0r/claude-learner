# `src/state` — zustand stores

**Hard rule: no auth or session material ever enters a persisted store.** Access tokens, refresh
tokens, the Supabase session object, or any JWT-shaped string are owned exclusively by
`supabase-js`, which persists them through its own configured storage — the app code never copies
them into a zustand store, and no persisted store may contain a field named `access_token`,
`refresh_token`, or `session`. Persisted stores here (`settings.ts` → AsyncStorage) hold only
non-sensitive user preferences; runtime-only stores (`session-meta.ts`) hold transient flags and
are never written to disk at all. This boundary is not a convention you have to remember: JWT
hygiene is enforced by `__tests__/state/persistence.test.ts`, which writes state through a mocked
AsyncStorage and sweeps everything persisted for JWT-shaped values (`/eyJ[A-Za-z0-9_-]{8,}\./`)
and for any `access_token`/`refresh_token`/`session` key or serialized field, failing the build if
one ever appears.
