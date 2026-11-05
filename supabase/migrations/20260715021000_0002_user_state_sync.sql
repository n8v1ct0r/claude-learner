-- M9 complete user-state schema, idempotent XP ledger, LWW rows, and one hardened leaderboard RPC.

alter table public.profiles add column leaderboard_opt_out boolean not null default false;
alter table public.profiles add column leaderboard_opt_out_updated_at timestamptz not null default 'epoch'::timestamptz;
grant update (leaderboard_opt_out, leaderboard_opt_out_updated_at, updated_at) on table public.profiles to authenticated;

create or replace function public.guard_profile_leaderboard_lww()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.leaderboard_opt_out_updated_at < old.leaderboard_opt_out_updated_at then
    new.leaderboard_opt_out := old.leaderboard_opt_out;
    new.leaderboard_opt_out_updated_at := old.leaderboard_opt_out_updated_at;
  end if;
  return new;
end $$;
revoke execute on function public.guard_profile_leaderboard_lww() from public, anon, authenticated;
create trigger guard_profile_leaderboard_lww_before_update before update on public.profiles for each row execute function public.guard_profile_leaderboard_lww();

create table public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  source text not null check (source in ('lesson','exam','quest','achievement','practice')),
  source_id text not null,
  client_event_id uuid not null unique,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Supports owner-RLS reads, per-user/day abuse checks, leaderboard aggregation, and auth-user
-- cascade deletes. Keep user_id first because every access path begins at the owning user.
create index xp_events_user_occurred_at_idx on public.xp_events (user_id, occurred_at);

create table public.user_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  status text not null default 'completed',
  best_score integer not null default 0,
  crowns integer not null default 0,
  content_version text,
  updated_at timestamptz not null,
  primary key (user_id, lesson_id)
);

create table public.streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','paused')),
  current integer not null default 0,
  longest integer not null default 0,
  last_activity_date date,
  settled_date date,
  freezes_equipped integer not null default 2,
  freezes_used integer not null default 0,
  paused_at date,
  updated_at timestamptz not null
);

create table public.energy_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  energy integer not null check (energy between 0 and 5),
  max_energy integer not null default 5 check (max_energy = 5),
  last_refill_at timestamptz not null,
  updated_at timestamptz not null
);

create table public.srs_reviews (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  concept_id text not null,
  item_type text not null default 'question' check (item_type in ('question','feynman')),
  card_state text not null default 'new' check (card_state in ('new','learning','review','relearning')),
  due_at timestamptz not null,
  stability double precision not null,
  difficulty double precision not null,
  reps integer not null,
  lapses integer not null,
  last_grade integer,
  last_review_at timestamptz,
  updated_at timestamptz not null,
  primary key (user_id, question_id)
);

create table public.user_quests (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id text not null,
  progress integer not null default 0,
  claimed boolean not null default false,
  updated_at timestamptz not null,
  primary key (user_id, quest_id)
);

create table public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, achievement_id)
);

create table public.exam_attempts (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null,
  mode text not null check (mode in ('sim','practice')),
  question_ids jsonb not null default '[]'::jsonb,
  time_limit_minutes integer not null check (time_limit_minutes > 0),
  deadline_at timestamptz,
  cursor integer not null default 0 check (cursor >= 0),
  answers jsonb not null default '{}'::jsonb,
  flagged_question_ids jsonb not null default '[]'::jsonb,
  raw_score integer,
  scaled_score integer,
  passed boolean,
  domain_scores jsonb not null default '{}'::jsonb,
  duration_s integer check (duration_s is null or duration_s >= 0),
  completed_at timestamptz,
  submitted_reason text check (submitted_reason is null or submitted_reason in ('completed','time-expired','manual')),
  mistakes_captured_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, id)
);

create table public.feynman_submissions (
  user_id uuid not null references auth.users(id) on delete cascade,
  client_submission_id uuid not null,
  concept_id text not null,
  transcript text not null check (char_length(transcript) <= 1000),
  grade jsonb,
  model text,
  input_tokens integer,
  output_tokens integer,
  graded_at timestamptz,
  updated_at timestamptz not null,
  primary key (user_id, client_submission_id)
);

create table public.grading_quota (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

create table public.spend_ledger (
  day date primary key,
  count integer not null default 0
);

-- Every public table is explicitly RLS-on and forced. Internal spend tables have no client policy.
do $$
declare table_name text;
begin
  foreach table_name in array array['xp_events','user_progress','streaks','energy_state','srs_reviews','user_quests','user_achievements','exam_attempts','feynman_submissions','grading_quota','spend_ledger']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end $$;

create policy xp_events_select_own on public.xp_events for select to authenticated using ((select auth.uid()) = user_id);
create policy xp_events_insert_own on public.xp_events for insert to authenticated with check ((select auth.uid()) = user_id);
grant select, insert on public.xp_events to authenticated;
revoke all on sequence public.xp_events_id_seq from anon, authenticated;
grant usage, select on sequence public.xp_events_id_seq to authenticated;

-- Owner CRUD for client-authored LWW/state rows. Every write policy has an explicit WITH CHECK.
-- feynman_submissions is deliberately excluded: the grade-feynman Edge Function is the only writer,
-- using service_role after it validates the bearer token and reserves quota. Allowing client writes
-- here would let a caller pre-seed a forged grade that the function's idempotency lookup would trust.
do $$
declare table_name text;
begin
  foreach table_name in array array['user_progress','streaks','energy_state','srs_reviews','user_quests','user_achievements','exam_attempts']
  loop
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name || '_delete_own', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end $$;

-- Learners may read only their own persisted grading history. All mutations remain service-role-only;
-- service_role keeps its platform table privileges and bypasses RLS for the authoritative upsert.
create policy feynman_submissions_select_own
  on public.feynman_submissions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
grant select on table public.feynman_submissions to authenticated;
grant select, insert, update, delete on table public.feynman_submissions to service_role;

create or replace function public.enforce_xp_policy()
returns trigger language plpgsql security definer set search_path = '' as $$
declare source_cap integer;
begin
  source_cap := case new.source when 'lesson' then 150 when 'exam' then 150 when 'quest' then 100 when 'achievement' then 100 when 'practice' then 50 else 0 end;
  if new.amount <= 0 or new.amount > source_cap then raise exception 'xp amount outside source policy'; end if;
  if (select count(*) from public.xp_events where user_id = new.user_id and occurred_at::date = new.occurred_at::date) >= 300 then
    raise exception 'daily xp event ceiling reached';
  end if;
  return new;
end $$;
revoke execute on function public.enforce_xp_policy() from public, anon, authenticated;
create trigger xp_policy_before_insert before insert on public.xp_events for each row execute function public.enforce_xp_policy();

create or replace function public.refresh_profile_total_xp()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set total_xp = (select coalesce(sum(amount), 0) from public.xp_events where user_id = new.user_id), updated_at = now() where id = new.user_id;
  return new;
end $$;
revoke execute on function public.refresh_profile_total_xp() from public, anon, authenticated;
create trigger xp_total_after_insert after insert on public.xp_events for each row execute function public.refresh_profile_total_xp();

create or replace function public.guard_lww()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.updated_at < old.updated_at then return old; end if;
  return new;
end $$;
revoke execute on function public.guard_lww() from public, anon, authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['user_progress','streaks','energy_state','srs_reviews','user_quests','user_achievements','exam_attempts','feynman_submissions']
  loop execute format('create trigger guard_lww_before_update before update on public.%I for each row execute function public.guard_lww()', table_name); end loop;
end $$;

create or replace function public.get_leaderboard()
returns table(rank bigint, display_name text, weekly_xp bigint, is_me boolean)
language sql security definer stable set search_path = '' as $$
  with totals as (
    select p.id, p.display_name, coalesce(sum(x.amount), 0)::bigint as weekly_xp
    from public.profiles p
    left join public.xp_events x on x.user_id = p.id and x.occurred_at >= date_trunc('week', now())
    where p.leaderboard_opt_out = false
    group by p.id, p.display_name
  )
  select dense_rank() over (order by totals.weekly_xp desc, totals.display_name), totals.display_name, totals.weekly_xp, totals.id = (select auth.uid())
  from totals order by 1, 2 limit 100;
$$;
revoke execute on function public.get_leaderboard() from public, anon;
grant execute on function public.get_leaderboard() to authenticated;
