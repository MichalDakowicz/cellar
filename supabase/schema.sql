-- ============================================================================
-- Cellar — schema
--
-- Idempotent, and applied by hand: Supabase Dashboard -> SQL Editor -> paste ->
-- Run. It never drops a table, a column or a row.
--
-- This project is shared with Radar, Lidar, Sonar and Pulsar
-- (docs/shared-database.md). Everything Cellar creates is namespaced `cellar_*`
-- so it cannot collide with a sibling, and every table has RLS keyed to
-- auth.uid().
--
-- Cellar is the one sibling with no social surface at all: a half-formed idea
-- about an unreleased app is not a thing you publish to a friends feed. So
-- nothing here calls private.can_view() and no row is readable by anyone but
-- its owner. The shared account is still shared — same login, same profile,
-- same theme — but the cellar itself is private, full stop.
--
-- Adding a column later means an `alter table ... add column if not exists`
-- under COLUMN MIGRATIONS at the bottom — editing a `create table` does nothing
-- on a live database.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Prerequisites
--
-- Radar's schema.sql is the foundation: it owns profiles, friendships,
-- user_settings and private.can_view. Cellar reads profiles and user_settings.
-- Running this file first would create tables against an account model that
-- does not exist, so it fails early instead of half-applying.
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.profiles') is null
     or to_regclass('public.user_settings') is null then
    raise exception
      'Cellar requires the shared tables. Run the Radar supabase/schema.sql first.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1. Shelves — the layer above projects
--
-- The reason this app exists rather than a second note in a notes app: app
-- ideas and mod ideas are two kinds of work, and a single flat list of projects
-- makes you read both to find either.
-- ----------------------------------------------------------------------------
create table if not exists public.cellar_shelves (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  -- Explicit, because the order of shelves is a decision the user made and a
  -- created_at order would silently re-sort it on a rename.
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists cellar_shelves_user_idx on public.cellar_shelves (user_id, position);

-- ----------------------------------------------------------------------------
-- 2. Projects — one app, one mod, one site
-- ----------------------------------------------------------------------------
create table if not exists public.cellar_projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  -- Cascades: emptying a shelf empties its projects, which is what deleting a
  -- shelf means. Entries survive as inbox rows — see the entries table.
  shelf_id   uuid not null references public.cellar_shelves(id) on delete cascade,
  name       text not null,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists cellar_projects_user_idx  on public.cellar_projects (user_id, shelf_id, position);

-- ----------------------------------------------------------------------------
-- 3. Entries — one line, caught
--
-- `project_id` is nullable and null *is* the inbox. Not a magic project row: a
-- project you can rename or delete out from under the inbox is a bug waiting,
-- and `on delete set null` then means deleting a project files its thoughts back
-- to the inbox rather than destroying them. Nothing in this app is deleted to
-- get it out of the way.
--
-- `kind` and `state` are text, and the stored value is the display string
-- (PING.md §2.3). Not enums: adding a ninth kind should not need a migration,
-- and a mapping table back to display text is a second source of truth.
-- ----------------------------------------------------------------------------
create table if not exists public.cellar_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.cellar_projects(id) on delete set null,
  text       text not null,
  -- idea | addition | removal | glitch | question | research | copy | design
  kind       text not null default 'idea',
  -- open | doing | done | dropped
  state      text not null default 'open',
  -- Out of the project and out of the inbox, still in search, one tap back.
  archived   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The inbox is `project_id is null` and it is the screen with a badge on it, so
-- it gets its own partial index rather than scanning the user's whole cellar.
create index if not exists cellar_entries_inbox_idx
  on public.cellar_entries (user_id, created_at desc)
  where project_id is null and archived = false;

create index if not exists cellar_entries_project_idx on public.cellar_entries (project_id, created_at desc);
create index if not exists cellar_entries_user_idx    on public.cellar_entries (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 4. Lines — how an entry grows
--
-- An entry stays one line. Coming back to dump more into it appends a row here
-- instead of editing the first one into a paragraph, which keeps "what I
-- thought then" and "what I worked out later" as two separate readings.
-- ----------------------------------------------------------------------------
create table if not exists public.cellar_entry_lines (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  entry_id   uuid not null references public.cellar_entries(id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);

create index if not exists cellar_entry_lines_entry_idx on public.cellar_entry_lines (entry_id, created_at);

-- ----------------------------------------------------------------------------
-- 5. Cellar's own settings
--
-- Cellar-only preferences. The two shared columns it is allowed to write —
-- user_settings.theme and user_settings.friends_visibility — stay in Radar's
-- table and are not mirrored here (docs/shared-database.md).
-- ----------------------------------------------------------------------------
create table if not exists public.cellar_settings (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  -- The mono gutter that makes a list scan like a ledger.
  show_codes    boolean not null default true,
  -- Open the capture screen in many-lines mode.
  raw_default   boolean not null default false,
  -- Keep the project chip you picked selected for the next drop.
  remember_last boolean not null default true,
  default_kind  text    not null default 'idea',
  -- grouped | stream — which reading of a project you get first.
  default_view  text    not null default 'grouped',
  updated_at    timestamptz not null default now()
);

-- ============================================================================
-- Row level security
--
-- Every table, every time. The policies are dropped and re-created so the file
-- is re-runnable; the pair runs inside the SQL Editor's single transaction, so
-- there is no window where a table sits unprotected.
-- ============================================================================
alter table public.cellar_shelves     enable row level security;
alter table public.cellar_projects    enable row level security;
alter table public.cellar_entries     enable row level security;
alter table public.cellar_entry_lines enable row level security;
alter table public.cellar_settings    enable row level security;

drop policy if exists cellar_shelves_owner_all on public.cellar_shelves;
create policy cellar_shelves_owner_all on public.cellar_shelves for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists cellar_projects_owner_all on public.cellar_projects;
create policy cellar_projects_owner_all on public.cellar_projects for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists cellar_entries_owner_all on public.cellar_entries;
create policy cellar_entries_owner_all on public.cellar_entries for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Keyed to user_id rather than to the parent entry: a join per row would
-- re-answer a question the entry's own policy has already answered.
drop policy if exists cellar_entry_lines_owner_all on public.cellar_entry_lines;
create policy cellar_entry_lines_owner_all on public.cellar_entry_lines for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists cellar_settings_owner_all on public.cellar_settings;
create policy cellar_settings_owner_all on public.cellar_settings for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ============================================================================
-- Triggers
-- ============================================================================

create or replace function public.cellar_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists cellar_entries_touch on public.cellar_entries;
create trigger cellar_entries_touch before update on public.cellar_entries
  for each row execute function public.cellar_touch_updated_at();

drop trigger if exists cellar_settings_touch on public.cellar_settings;
create trigger cellar_settings_touch before update on public.cellar_settings
  for each row execute function public.cellar_touch_updated_at();

-- ============================================================================
-- Seed — the first two shelves
--
-- A brand new cellar with no shelves has nowhere to put a thought, and the
-- capture screen is the default tab, so the very first thing a new user sees
-- would otherwise be an empty picker. One function, called by the app on its
-- first read rather than by a signup trigger, because Radar owns signup.
-- ============================================================================
create or replace function public.cellar_seed_shelves()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (select 1 from public.cellar_shelves where user_id = auth.uid()) then
    return;
  end if;
  insert into public.cellar_shelves (user_id, name, position)
  values (auth.uid(), 'apps', 0), (auth.uid(), 'side projects', 1);
end;
$$;

-- ============================================================================
-- Realtime
--
-- The cellar is one account across a phone and a browser, and the thing you
-- dump on one should be in the list on the other without a refetch.
-- ============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.cellar_entries;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.cellar_projects;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- ============================================================================
-- COLUMN MIGRATIONS
--
-- Everything above is skipped on a live database — `create table if not exists`
-- does not reconcile columns. A new column goes here, and only here.
-- ============================================================================
-- (none yet)
