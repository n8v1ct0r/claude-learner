-- 0001_profiles — CCA Quest user profile table (PLAN-rev2 §2.3).
--
-- Design contract:
--   * User state ONLY. There is NO email column here — email never leaves auth.users.
--   * Row Level Security ENABLED + FORCED (the table owner is subject to policy too).
--   * Owner-only SELECT/UPDATE via the initPlan-cached `(select auth.uid())` form.
--   * No client INSERT/DELETE policy: rows are created solely by the SECURITY DEFINER trigger
--     below (which bypasses FORCE RLS because its owner, postgres, has BYPASSRLS) and removed
--     only via `auth.users ON DELETE CASCADE`.
--   * Column-scoped write grant: a client may only ever write display_name / avatar_id / timezone.

-- Hosted Supabase projects can include the documented `ensure_rls` event trigger, whose
-- SECURITY DEFINER function lives in `public`. The event trigger does not need client-callable
-- EXECUTE privileges, so remove its RPC surface when the platform helper is present. The guarded
-- block keeps this migration portable to local stacks that do not install the helper.
do $$
begin
  if pg_catalog.to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

-- ── table ─────────────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid        primary key references auth.users (id) on delete cascade,
  display_name text        not null,
  avatar_id    text,
  timezone     text        not null default 'America/New_York',
  total_xp     integer     not null default 0,
  gems         integer     not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Per-user profile and game state. No email column — email lives only in auth.users.';

-- ── row level security ─────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.profiles force  row level security;

-- Owner-only read. `(select auth.uid())` is the initPlan-cached form: the subquery is evaluated
-- once per statement instead of once per row.
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- Owner-only update with a matching WITH CHECK so a row can never be re-pointed at another user.
-- The column privileges below decide WHICH columns a client may actually write.
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No INSERT / DELETE policy on purpose: with RLS forced and no permissive policy, every client
-- INSERT and DELETE is denied.

-- ── grant allowlist (least privilege) ──────────────────────────────────────────
-- Supabase's default privileges grant ALL on new public tables to anon/authenticated; strip that
-- back to exactly what the policies intend.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to anon, authenticated;               -- anon still yields 0 rows via RLS
grant update (display_name, avatar_id, timezone) on table public.profiles to authenticated;

-- ── auto-provision a profile with a playful handle ─────────────────────────────
-- Runs on every new auth.users row (including anonymous sign-ins). SECURITY DEFINER + empty
-- search_path is the hardened Supabase pattern; every referenced object is schema-qualified
-- (pg_catalog builtins — random/floor/array_length/lpad — resolve implicitly).
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  adjectives constant text[] := array[
    'Curious','Clever','Brave','Cosmic','Sunny','Witty','Nimble','Mellow','Bold','Quirky',
    'Radiant','Playful','Zesty','Gentle','Swift','Jolly','Lucky','Breezy','Snappy','Chipper'
  ];
  animals constant text[] := array[
    'Octopus','Otter','Fox','Panda','Koala','Falcon','Dolphin','Lynx','Badger','Heron',
    'Meerkat','Narwhal','Puffin','Gecko','Wombat','Ferret','Marmot','Raccoon','Hedgehog','Axolotl'
  ];
  adjective text := adjectives[1 + floor(random() * array_length(adjectives, 1))::int];
  animal    text := animals[1 + floor(random() * array_length(animals, 1))::int];
  suffix    text := lpad(floor(random() * 100)::int::text, 2, '0');
begin
  insert into public.profiles (id, display_name)
  values (new.id, adjective || ' ' || animal || ' ' || suffix);
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT on auth.users: provisions a profile with a generated playful display_name (e.g. "Curious Octopus 42").';

-- The function only ever runs as a trigger; no role should be able to call it directly.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
