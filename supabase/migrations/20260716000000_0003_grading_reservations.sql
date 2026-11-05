-- Atomic reservation RPCs for the Feynman grader (GC-09). The edge function reserves BOTH the global
-- daily budget and the per-user daily quota BEFORE it ever calls Anthropic, so N concurrent requests
-- can never overspend: each reservation is a single atomic statement, so exactly `cap` of them win.
--
-- These are SECURITY DEFINER + `set search_path = ''` (empty), fully-schema-qualified, and executable
-- ONLY by service_role — the grading tables (grading_quota, spend_ledger) have NO client RLS policy
-- (migration 0002), and the edge function is the only caller, running with the service-role key.

-- A submission row is also the short-lived idempotency claim. The claim is persisted before quota is
-- reserved or Anthropic is called, so two Edge Function isolates cannot both do paid work for the same
-- (user, client_submission_id). A claim token prevents an old, timed-out worker from overwriting a
-- newer recovery attempt. The 2-minute stale window is deliberately much longer than the grader's
-- 20-second Anthropic timeout, while still bounding recovery after a crashed isolate.
alter table public.feynman_submissions
  add column if not exists claim_token uuid,
  add column if not exists claimed_at timestamptz;

create or replace function public.claim_feynman_submission(
  p_user uuid,
  p_client_submission_id uuid,
  p_concept_id text,
  p_transcript text,
  p_claim_token uuid
)
returns table(claim_state text, stored_grade jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  submission public.feynman_submissions%rowtype;
  claimed_now timestamptz := clock_timestamp();
begin
  -- The insert is the uncontended fast path. On conflict, Postgres waits for any concurrent insert of
  -- the same primary key to commit before continuing, then the SELECT FOR UPDATE below serializes the
  -- decision about replay, conflict, in-flight work, or stale recovery.
  insert into public.feynman_submissions (
    user_id,
    client_submission_id,
    concept_id,
    transcript,
    claim_token,
    claimed_at,
    updated_at
  ) values (
    p_user,
    p_client_submission_id,
    p_concept_id,
    p_transcript,
    p_claim_token,
    claimed_now,
    claimed_now
  )
  on conflict (user_id, client_submission_id) do nothing;

  if found then
    claim_state := 'claimed';
    stored_grade := null;
    return next;
    return;
  end if;

  select *
    into strict submission
    from public.feynman_submissions
    where user_id = p_user
      and client_submission_id = p_client_submission_id
    for update;

  -- An idempotency key is permanently bound to its original input. Never return a grade produced for
  -- different learner data, and never let conflicting reuse mutate the authoritative row.
  if submission.concept_id is distinct from p_concept_id
     or submission.transcript is distinct from p_transcript then
    claim_state := 'conflict';
    stored_grade := null;
    return next;
    return;
  end if;

  if submission.grade is not null then
    claim_state := 'completed';
    stored_grade := submission.grade;
    return next;
    return;
  end if;

  if submission.claimed_at is null
     or submission.claimed_at <= claimed_now - interval '2 minutes' then
    update public.feynman_submissions
      set claim_token = p_claim_token,
          claimed_at = claimed_now,
          updated_at = claimed_now
      where user_id = p_user
        and client_submission_id = p_client_submission_id;
    claim_state := 'reclaimed';
    stored_grade := null;
    return next;
    return;
  end if;

  claim_state := 'in_progress';
  stored_grade := null;
  return next;
end;
$$;

-- Completion succeeds only for the isolate that still owns the current claim. If a truly stale
-- invocation returns after recovery has taken ownership, its result is discarded rather than
-- overwriting the newer attempt. The original concept and transcript are never rewritten here.
create or replace function public.complete_feynman_submission(
  p_user uuid,
  p_client_submission_id uuid,
  p_claim_token uuid,
  p_grade jsonb,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  update public.feynman_submissions
    set grade = p_grade,
        model = p_model,
        input_tokens = p_input_tokens,
        output_tokens = p_output_tokens,
        graded_at = statement_timestamp(),
        claim_token = null,
        claimed_at = null,
        updated_at = statement_timestamp()
    where user_id = p_user
      and client_submission_id = p_client_submission_id
      and claim_token = p_claim_token
      and grade is null
      and p_grade is not null
  returning true;
$$;

-- Reserve BOTH counters and refresh the idempotency lease in one transaction immediately before paid
-- work. Lock order is always claim -> global day -> user/day. Counter rows are initialized at zero,
-- locked, checked, and only then incremented together, so a user-cap rejection never needs a fallible
-- compensating write and no partial reservation can commit. Cap exits delete this invocation's
-- ungraded claim in the same transaction, preventing rejected transcripts from accumulating forever.
create or replace function public.reserve_feynman_capacity(
  p_user uuid,
  p_client_submission_id uuid,
  p_claim_token uuid,
  p_day date,
  p_global_cap integer,
  p_user_cap integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  global_count integer;
  user_count integer;
  refreshed_at timestamptz;
begin
  -- Token ownership is checked while taking the row lock. A worker whose two-minute lease was already
  -- reclaimed cannot reserve capacity or reach Anthropic, even if its earlier network call resumes.
  perform 1
    from public.feynman_submissions
    where user_id = p_user
      and client_submission_id = p_client_submission_id
      and claim_token = p_claim_token
      and grade is null
    for update;
  if not found then
    return 'claim_lost';
  end if;

  if p_global_cap <= 0 then
    delete from public.feynman_submissions
      where user_id = p_user
        and client_submission_id = p_client_submission_id
        and claim_token = p_claim_token
        and grade is null;
    return 'global_budget';
  end if;

  insert into public.spend_ledger (day, count)
    values (p_day, 0)
    on conflict (day) do nothing;
  select ledger.count
    into strict global_count
    from public.spend_ledger as ledger
    where ledger.day = p_day
    for update;
  if global_count >= p_global_cap then
    delete from public.feynman_submissions
      where user_id = p_user
        and client_submission_id = p_client_submission_id
        and claim_token = p_claim_token
        and grade is null;
    return 'global_budget';
  end if;

  if p_user_cap <= 0 then
    delete from public.feynman_submissions
      where user_id = p_user
        and client_submission_id = p_client_submission_id
        and claim_token = p_claim_token
        and grade is null;
    return 'user_quota';
  end if;

  insert into public.grading_quota (user_id, day, count)
    values (p_user, p_day, 0)
    on conflict (user_id, day) do nothing;
  select quota.count
    into strict user_count
    from public.grading_quota as quota
    where quota.user_id = p_user
      and quota.day = p_day
    for update;
  if user_count >= p_user_cap then
    delete from public.feynman_submissions
      where user_id = p_user
        and client_submission_id = p_client_submission_id
        and claim_token = p_claim_token
        and grade is null;
    return 'user_quota';
  end if;

  -- Refresh only after every potentially-contended lock/check. The 20-second Anthropic timeout now
  -- begins against a fresh two-minute lease, and claim-token completion remains the final fence.
  refreshed_at := clock_timestamp();
  update public.feynman_submissions
    set claimed_at = refreshed_at,
        updated_at = refreshed_at
    where user_id = p_user
      and client_submission_id = p_client_submission_id
      and claim_token = p_claim_token
      and grade is null;
  if not found then
    return 'claim_lost';
  end if;

  update public.spend_ledger
    set count = public.spend_ledger.count + 1
    where day = p_day;
  update public.grading_quota
    set count = public.grading_quota.count + 1
    where user_id = p_user
      and day = p_day;

  return 'reserved';
exception
  when others then
    -- PL/pgSQL rolls every counter/lease change made above back before entering this handler. Remove
    -- only the still-current ungraded claim and return a closed failure state to PostgREST.
    delete from public.feynman_submissions
      where user_id = p_user
        and client_submission_id = p_client_submission_id
        and claim_token = p_claim_token
        and grade is null;
    return 'unavailable';
end;
$$;

-- Failure cleanup is token-fenced just like completion: it can delete only this isolate's ungraded
-- row. It cannot erase a completed grade or a claim that a newer recovery attempt already owns.
create or replace function public.cleanup_feynman_submission(
  p_user uuid,
  p_client_submission_id uuid,
  p_claim_token uuid
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  delete from public.feynman_submissions
    where user_id = p_user
      and client_submission_id = p_client_submission_id
      and claim_token = p_claim_token
      and grade is null
  returning true;
$$;

-- This migration was exercised locally before the capacity transaction was consolidated. Remove the
-- superseded split RPCs if that earlier draft exists; on a fresh hosted project these are harmless no-ops.
drop function if exists public.reserve_grading_quota(uuid, date, integer);
drop function if exists public.reserve_global_budget(date, integer);
drop function if exists public.release_global_budget(date);

-- Hosted projects with legacy public-schema default ACLs can grant ALL on a newly-created identity
-- sequence even when the table itself is stripped back. An authenticated caller needs only USAGE +
-- SELECT for generated XP ids; UPDATE would permit setval() and anon needs no sequence access.
revoke all on sequence public.xp_events_id_seq from anon, authenticated;
grant usage, select on sequence public.xp_events_id_seq to authenticated;

-- Service-role only: newly-created functions grant EXECUTE to PUBLIC by default, so revoke that first.
revoke execute on function public.claim_feynman_submission(uuid, uuid, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.complete_feynman_submission(uuid, uuid, uuid, jsonb, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.reserve_feynman_capacity(uuid, uuid, uuid, date, integer, integer) from public, anon, authenticated;
revoke execute on function public.cleanup_feynman_submission(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_feynman_submission(uuid, uuid, text, text, uuid) to service_role;
grant execute on function public.complete_feynman_submission(uuid, uuid, uuid, jsonb, text, integer, integer) to service_role;
grant execute on function public.reserve_feynman_capacity(uuid, uuid, uuid, date, integer, integer) to service_role;
grant execute on function public.cleanup_feynman_submission(uuid, uuid, uuid) to service_role;
