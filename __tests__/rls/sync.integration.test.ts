/** @jest-environment node */
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { replayXpEvents } from '../../src/sync/replay';

import { TURNSTILE_TEST_OPTIONS } from '../support/turnstile';

function config(): { url: string; key: string } {
  const raw = execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' });
  const parsed = JSON.parse(raw) as Record<string, string>;
  return { url: parsed.API_URL, key: parsed.ANON_KEY ?? parsed.PUBLISHABLE_KEY };
}

let client: SupabaseClient;
let userId: string;

beforeAll(async () => {
  const local = config();
  client = createClient(local.url, local.key, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await client.auth.signInAnonymously(TURNSTILE_TEST_OPTIONS);
  if (result.error || !result.data.user) throw result.error ?? new Error('missing anonymous user');
  userId = result.data.user.id;
});

afterAll(async () => { await client.auth.signOut(); });

test('GC-06 replays the identical XP batch twice with exactly one server row', async () => {
  const event = { id: randomUUID(), amount: 10, source: 'lesson' as const, sourceId: 'c1-u1-l1', occurredAt: Date.now() };
  expect((await replayXpEvents(client, userId, [event])).error).toBeNull();
  expect((await replayXpEvents(client, userId, [event])).error).toBeNull();
  const { data, error } = await client.from('xp_events').select('client_event_id').eq('client_event_id', event.id);
  expect(error).toBeNull();
  expect(data).toHaveLength(1);
});
