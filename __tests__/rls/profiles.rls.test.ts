/**
 * @jest-environment node
 *
 * RLS isolation suite for public.profiles (GC-07, scoped to migration 0001).
 *
 * Exercises the REAL PostgREST read/write paths with two independent anonymous sessions plus a
 * no-session client, proving the owner-only policies + grant allowlist in migration 0001 actually
 * isolate users. Local URL + anon key come from `supabase status -o json` (override with
 * SUPABASE_URL / SUPABASE_ANON_KEY). If Supabase is not running this suite FAILS loudly rather than
 * passing vacuously.
 */
import { execFileSync } from 'node:child_process';

import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { TURNSTILE_TEST_OPTIONS } from '../support/turnstile';

type LocalConfig = { url: string; anonKey: string };

// "Curious Octopus 42" — adjective, animal, two digits (see handle_new_user in migration 0001).
const PLAYFUL_NAME = /^[A-Z][a-z]+ [A-Z][a-z]+ \d{2}$/;

function resolveConfig(): LocalConfig {
  const envUrl = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const envKey = process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_KEY;
  if (envUrl && envKey) return { url: envUrl, anonKey: envKey };

  let raw: string;
  try {
    raw = execFileSync('supabase', ['status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    throw new Error(
      'Local Supabase is not running (`supabase status` failed). Start it first ' +
        '(`npm run supabase:start`, or `supabase start`), then re-run `npm run test:rls`. ' +
        'Alternatively set SUPABASE_URL and SUPABASE_ANON_KEY.',
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`Could not parse \`supabase status -o json\` output: ${raw.slice(0, 200)}`);
  }

  const url = parsed.API_URL;
  const anonKey = parsed.ANON_KEY ?? parsed.PUBLISHABLE_KEY;
  if (typeof url !== 'string' || typeof anonKey !== 'string') {
    throw new Error('`supabase status` did not report API_URL / ANON_KEY — is the local stack healthy?');
  }
  return { url, anonKey };
}

function makeClient({ url, anonKey }: LocalConfig): SupabaseClient {
  // No session persistence in Node: keeps the suite pure (no AsyncStorage) and each client isolated.
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

let clientA: SupabaseClient;
let clientB: SupabaseClient;
let clientAnon: SupabaseClient;
let userA: string;
let userB: string;

beforeAll(async () => {
  const config = resolveConfig();
  clientA = makeClient(config);
  clientB = makeClient(config);
  clientAnon = makeClient(config);

  const a = await clientA.auth.signInAnonymously(TURNSTILE_TEST_OPTIONS);
  if (a.error || !a.data.user) {
    throw new Error(`clientA anonymous sign-in failed: ${a.error?.message ?? 'no user returned'}`);
  }
  userA = a.data.user.id;

  const b = await clientB.auth.signInAnonymously(TURNSTILE_TEST_OPTIONS);
  if (b.error || !b.data.user) {
    throw new Error(`clientB anonymous sign-in failed: ${b.error?.message ?? 'no user returned'}`);
  }
  userB = b.data.user.id;

  if (userA === userB) {
    throw new Error('expected two distinct anonymous users but got the same id');
  }
});

afterAll(async () => {
  await clientA?.auth.signOut();
  await clientB?.auth.signOut();
});

test('(a) each client sees exactly its own auto-created profile with a playful display_name', async () => {
  const { data: rowsA, error: errA } = await clientA.from('profiles').select('id, display_name');
  expect(errA).toBeNull();
  expect(rowsA).toHaveLength(1);
  expect(rowsA?.[0].id).toBe(userA);
  expect(rowsA?.[0].display_name).toEqual(expect.stringMatching(PLAYFUL_NAME));

  const { data: rowsB, error: errB } = await clientB.from('profiles').select('id, display_name');
  expect(errB).toBeNull();
  expect(rowsB).toHaveLength(1);
  expect(rowsB?.[0].id).toBe(userB);
  expect(rowsB?.[0].display_name).toEqual(expect.stringMatching(PLAYFUL_NAME));
});

test("(b) user B selecting user A's row by id gets 0 rows", async () => {
  const { data, error } = await clientB.from('profiles').select('id, display_name').eq('id', userA);
  expect(error).toBeNull();
  expect(data).toHaveLength(0);
});

test("(c) user B updating user A's row affects 0 rows and leaves A untouched", async () => {
  const { data, error } = await clientB
    .from('profiles')
    .update({ display_name: 'Sneaky Otter 99' })
    .eq('id', userA)
    .select();
  // RLS `using` hides A's row from B, so the UPDATE matches nothing: no error, zero rows changed.
  expect(error).toBeNull();
  expect(data).toHaveLength(0);

  const { data: aRow } = await clientA.from('profiles').select('display_name').eq('id', userA).single();
  expect(aRow?.display_name).not.toBe('Sneaky Otter 99');
});

test('(d) user B cannot INSERT a profiles row', async () => {
  const fabricatedId = '00000000-0000-4000-8000-0000000000dd';
  const { data, error } = await clientB
    .from('profiles')
    .insert({ id: fabricatedId, display_name: 'Injected 01' })
    .select();
  // No INSERT policy + no INSERT grant for `authenticated` ⇒ the write is rejected.
  expect(error).not.toBeNull();
  expect(data).toBeNull();
});

test('(e) an anonymous (no-session) client sees 0 profile rows', async () => {
  const { data, error } = await clientAnon.from('profiles').select('id');
  expect(error).toBeNull();
  expect(data).toHaveLength(0);
});
