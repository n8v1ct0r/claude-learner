/** @jest-environment node */
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { TURNSTILE_TEST_OPTIONS } from '../support/turnstile';

function status(): Record<string, string> {
  return JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' })) as Record<string, string>;
}
function client(url: string, key: string): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function sql(statement: string): string {
  return execFileSync('docker', ['exec', 'supabase_db_vienna', 'psql', '-U', 'postgres', '-d', 'postgres', '-Atqc', statement], { encoding: 'utf8' }).trim();
}

let a: SupabaseClient;
let b: SupabaseClient;
let anon: SupabaseClient;
let userA: string;
let userB: string;

beforeAll(async () => {
  const local = status();
  const key = local.ANON_KEY ?? local.PUBLISHABLE_KEY;
  a = client(local.API_URL, key); b = client(local.API_URL, key); anon = client(local.API_URL, key);
  const aa = await a.auth.signInAnonymously(TURNSTILE_TEST_OPTIONS);
  const bb = await b.auth.signInAnonymously(TURNSTILE_TEST_OPTIONS);
  if (!aa.data.user || !bb.data.user) throw new Error('anonymous sign-in failed');
  userA = aa.data.user.id; userB = bb.data.user.id;

  const now = new Date().toISOString();
  const rows: Array<[string, Record<string, unknown>]> = [
    ['user_progress', { user_id: userA, lesson_id: 'lesson-a', status: 'completed', best_score: 100, updated_at: now }],
    ['streaks', { user_id: userA, current: 2, longest: 2, freezes_equipped: 2, freezes_used: 0, updated_at: now }],
    ['energy_state', { user_id: userA, energy: 4, max_energy: 5, last_refill_at: now, updated_at: now }],
    ['srs_reviews', { user_id: userA, question_id: 'q-a', concept_id: 'concept-a', due_at: now, stability: 1, difficulty: 5, reps: 1, lapses: 0, updated_at: now }],
    ['user_quests', { user_id: userA, quest_id: 'quest-a', progress: 1, claimed: false, updated_at: now }],
    ['user_achievements', { user_id: userA, achievement_id: 'lessons-1', unlocked_at: now, updated_at: now }],
    ['exam_attempts', { user_id: userA, id: 'attempt-a', exam_id: 'mock-1', mode: 'sim', time_limit_minutes: 120, answers: {}, created_at: now, updated_at: now }],
  ];
  for (const [table, row] of rows) {
    const result = await a.from(table).insert(row);
    if (result.error) throw new Error(`${table} seed failed: ${result.error.message}`);
  }
  // The grading table is server-authored. Seed through the database owner so the test can prove
  // authenticated callers retain owner-only reads without receiving any mutation privilege.
  sql(
    `insert into public.feynman_submissions ` +
      `(user_id, client_submission_id, concept_id, transcript, updated_at) values ` +
      `('${userA}', '22222222-2222-4222-8222-222222222222', 'concept-a', 'Simple explanation', now())`,
  );
  const xp = await a.from('xp_events').insert({ user_id: userA, amount: 10, source: 'lesson', source_id: 'lesson-a', client_event_id: randomUUID(), occurred_at: now });
  if (xp.error) throw new Error(`xp seed failed: ${xp.error.message}`);
});

afterAll(async () => { await a.auth.signOut(); await b.auth.signOut(); });

describe('GC-07 all real read paths', () => {
  const ownerTables = ['profiles','xp_events','user_progress','streaks','energy_state','srs_reviews','user_quests','user_achievements','exam_attempts','feynman_submissions'];
  for (const table of ownerTables) {
    test(`${table}: user B and a no-login client cannot read user A rows`, async () => {
      const column = table === 'profiles' ? 'id' : 'user_id';
      const fromB = await b.from(table).select('*').eq(column, userA);
      expect(fromB.error).toBeNull();
      expect(fromB.data).toHaveLength(0);
      const fromAnon = await anon.from(table).select('*');
      if (fromAnon.error) expect(fromAnon.data).toBeNull();
      else expect(fromAnon.data).toHaveLength(0);
    });
  }

  test('cross-user writes are rejected or affect zero rows', async () => {
    const insert = await b.from('user_progress').insert({ user_id: userA, lesson_id: 'attack', updated_at: new Date().toISOString() });
    expect(insert.error).not.toBeNull();
    const update = await b.from('user_progress').update({ best_score: 0, updated_at: new Date().toISOString() }).eq('user_id', userA).select();
    expect(update.data).toHaveLength(0);
  });

  test('feynman submissions are owner-readable but server-write-only', async () => {
    const submissionId = '22222222-2222-4222-8222-222222222222';
    const own = await a
      .from('feynman_submissions')
      .select('user_id,client_submission_id,transcript,grade')
      .eq('client_submission_id', submissionId)
      .single();
    expect(own.error).toBeNull();
    expect(own.data?.user_id).toBe(userA);
    expect(own.data?.grade).toBeNull();

    const insert = await a.from('feynman_submissions').insert({
      user_id: userA,
      client_submission_id: randomUUID(),
      concept_id: 'concept-a',
      transcript: 'Forged insert',
      grade: { simple_score: 5 },
      updated_at: new Date().toISOString(),
    });
    expect(insert.error).not.toBeNull();

    const update = await a
      .from('feynman_submissions')
      .update({ transcript: 'Forged update', grade: { simple_score: 5 } })
      .eq('client_submission_id', submissionId);
    expect(update.error).not.toBeNull();

    const deletion = await a
      .from('feynman_submissions')
      .delete()
      .eq('client_submission_id', submissionId);
    expect(deletion.error).not.toBeNull();

    const unchanged = await a
      .from('feynman_submissions')
      .select('transcript,grade')
      .eq('client_submission_id', submissionId)
      .single();
    expect(unchanged.error).toBeNull();
    expect(unchanged.data).toEqual({ transcript: 'Simple explanation', grade: null });
  });

  test('out-of-policy XP is rejected by the real insert path', async () => {
    const result = await a.from('xp_events').insert({ user_id: userA, amount: 99_999, source: 'lesson', source_id: 'attack', client_event_id: randomUUID(), occurred_at: new Date().toISOString() });
    expect(result.error).not.toBeNull();
  });

  test('leaderboard exposes only the four allowlisted fields', async () => {
    const result = await a.rpc('get_leaderboard');
    expect(result.error).toBeNull();
    expect(result.data?.length).toBeGreaterThan(0);
    for (const row of result.data ?? []) {
      expect(Object.keys(row).sort()).toEqual(['display_name', 'is_me', 'rank', 'weekly_xp']);
      expect(row.display_name).toBeTruthy();
    }
    const noLogin = await anon.rpc('get_leaderboard');
    expect(noLogin.error).not.toBeNull();
  });

  test('leaderboard privacy opt-out removes only the caller from the cross-user board', async () => {
    const future = new Date(Date.now() + 1_000).toISOString();
    const hidden = await a.from('profiles').update({ leaderboard_opt_out: true, leaderboard_opt_out_updated_at: future, updated_at: future }).eq('id', userA);
    expect(hidden.error).toBeNull();
    const board = await a.rpc('get_leaderboard');
    expect(board.error).toBeNull();
    expect(board.data?.some((row: { is_me: boolean }) => row.is_me)).toBe(false);
  });

  test('LWW guards keep newer progress and profile privacy rows', async () => {
    const stale = new Date(0).toISOString();
    const progress = await a.from('user_progress').update({ best_score: 1, updated_at: stale }).eq('lesson_id', 'lesson-a').select('best_score').single();
    expect(progress.error).toBeNull();
    expect(progress.data?.best_score).toBe(100);
    const profile = await a.from('profiles').update({ leaderboard_opt_out: false, leaderboard_opt_out_updated_at: stale, updated_at: stale }).eq('id', userA).select('leaderboard_opt_out').single();
    expect(profile.error).toBeNull();
    expect(profile.data?.leaderboard_opt_out).toBe(true);
  });
});

test('schema audit: RLS, policies, function grants/search_path, views, and no email columns', () => {
  expect(sql("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity")).toBe('0');
  expect(sql("select count(*) from information_schema.columns where table_schema='public' and column_name ilike '%email%'")).toBe('0');
  expect(sql("select count(*) from pg_policies where schemaname='public' and cmd in ('INSERT','UPDATE') and with_check is null")).toBe('0');
  expect(sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and not exists (select 1 from unnest(coalesce(p.proconfig,'{}')) setting where setting like 'search_path=%')")).toBe('0');
  expect(sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and has_function_privilege('anon',p.oid,'EXECUTE')")).toBe('0');
  expect(sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and has_function_privilege('authenticated',p.oid,'EXECUTE') and p.proname <> 'get_leaderboard'")).toBe('0');
  expect(sql("select has_table_privilege('authenticated','public.feynman_submissions','SELECT')")).toBe('t');
  expect(sql("select has_table_privilege('authenticated','public.feynman_submissions','INSERT') or has_table_privilege('authenticated','public.feynman_submissions','UPDATE') or has_table_privilege('authenticated','public.feynman_submissions','DELETE')")).toBe('f');
  expect(sql("select to_regclass('public.xp_events_user_occurred_at_idx') is not null")).toBe('t');
  expect(sql("select has_sequence_privilege('anon','public.xp_events_id_seq','USAGE') or has_sequence_privilege('anon','public.xp_events_id_seq','SELECT') or has_sequence_privilege('anon','public.xp_events_id_seq','UPDATE')")).toBe('f');
  expect(sql("select has_sequence_privilege('authenticated','public.xp_events_id_seq','USAGE') and has_sequence_privilege('authenticated','public.xp_events_id_seq','SELECT')")).toBe('t');
  expect(sql("select has_sequence_privilege('authenticated','public.xp_events_id_seq','UPDATE')")).toBe('f');
  expect(sql("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v' and coalesce(array_to_string(c.reloptions,','),'') not like '%security_invoker=true%'")).toBe('0');
});
