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
-- (PING.md §2.3). Not enums: adding an eighth kind should not need a migration,
-- and a mapping table back to display text is a second source of truth.
-- ----------------------------------------------------------------------------
create table if not exists public.cellar_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.cellar_projects(id) on delete set null,
  text       text not null,
  -- idea | removal | glitch | question | research | copy | design
  kind       text not null default 'idea',
  -- open | doing | blocked | done | dropped
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
-- 5. Questions — what an agent stopped to ask, and what you answered
--
-- Its own table rather than a flagged line, because a question is not a line:
-- it carries the options it offered, the answer that came back, and whether it
-- was answered or waved off. Kept after answering — the pairs are the record of
-- why a thought was built the way it was, which is the part that was never
-- written down.
--
-- An entry is `blocked` while any of its questions is neither answered nor
-- dismissed, and goes back to `open` when the last one settles.
-- ----------------------------------------------------------------------------
create table if not exists public.cellar_entry_questions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  entry_id     uuid not null references public.cellar_entries(id) on delete cascade,
  question     text not null,
  -- The choices offered, as a json array of strings. Empty means free text
  -- only. Rendered a/b/c/d in the app; the answer is still stored as its text,
  -- so reading a question back never needs the options to interpret it.
  options      jsonb not null default '[]'::jsonb,
  answer       text,
  answered_at  timestamptz,
  -- 'app' when you answered it here, 'chat' when the agent gave up waiting and
  -- asked you directly, then wrote the answer back.
  answered_via text,
  dismissed_at timestamptz,
  -- Who asked. Null for a question with no agent name on it.
  agent        text,
  created_at   timestamptz not null default now()
);

create index if not exists cellar_entry_questions_entry_idx
  on public.cellar_entry_questions (entry_id, created_at);

-- ----------------------------------------------------------------------------
-- 6. Cellar's own settings
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

-- ----------------------------------------------------------------------------
-- 7. Agent tokens — how an agent that is not on your machine proves it is you
--
-- The MCP server used to be the only way in, and it ran on your laptop with
-- your refresh token sitting in ~/.cellar-mcp. Hosted, there is no such file:
-- the agent sends a token in a header and something has to turn that into "this
-- is the owner" without ever holding a service key.
--
-- Only the hash is kept. A row here is worth nothing to whoever reads it — it
-- cannot be turned back into a token, so a leaked backup is not a leaked
-- cellar. The plaintext is returned exactly once, by cellar_create_agent_token,
-- and losing it means minting another rather than recovering that one.
--
-- Revoking is a timestamp and not a delete, for the same reason nothing else in
-- this app is deleted: "which machine was that, and when did I turn it off" is
-- a question you will ask, and a missing row cannot answer it.
-- ----------------------------------------------------------------------------
create table if not exists public.cellar_agent_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  -- What it is for, in your words: "laptop", "work desktop". Shown in settings.
  name         text not null,
  -- sha256 of the token, hex. Unique, so resolving one is a single index hit.
  token_hash   text not null unique,
  created_at   timestamptz not null default now(),
  -- Stamped on every resolve, so a token you no longer recognise can be told
  -- apart from one that has simply never been used.
  last_used_at timestamptz,
  -- Null means it does not expire, which is right for your own machine. A
  -- token for a machine you are borrowing should not be.
  expires_at   timestamptz,
  revoked_at   timestamptz
);

create index if not exists cellar_agent_tokens_user_idx
  on public.cellar_agent_tokens (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 8. Attached docs — a link or a path, hung off a thought
--
-- One field, `ref`, holding either kind: a thought is one line, and deciding
-- "is this a url or a path" at capture time is a decision on every drop. What
-- it is gets resolved by looking at it, so pasting a link works, typing a path
-- works, and neither needs a mode.
--
-- A table rather than a column, because "docs" is plural and a column caps it
-- at one forever — a table holding one row is the same thing as a column, and
-- the reverse is a migration.
--
-- Cascades with the entry. An attachment to a thought that is gone is not a
-- record of anything.
-- ----------------------------------------------------------------------------
create table if not exists public.cellar_entry_docs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  entry_id   uuid not null references public.cellar_entries(id) on delete cascade,
  -- The url or the path, exactly as it was given. Never normalised on the way
  -- in: a path the user typed is the path they meant.
  ref        text not null,
  -- What to call it. Null falls back to the ref itself, the way a link with no
  -- title falls back to its host.
  label      text,
  created_at timestamptz not null default now()
);

create index if not exists cellar_entry_docs_entry_idx
  on public.cellar_entry_docs (entry_id, created_at);

-- ----------------------------------------------------------------------------
-- 9. The trail — what happened to a thought, and exactly when
--
-- `created_at` and the state on the row say where a thought is now; nothing
-- said how it got there. This is the trail: one row per change, with the exact
-- stamp.
--
-- It carries exact times and the rest of the app keeps saying "2d". The trail
-- is the one surface where "17:04, 22 September" is the useful answer, and
-- turning every relative stamp in a list of one-line thoughts into a timestamp
-- would be a wall of numbers nobody reads.
--
-- Append only in practice: nothing writes to a row here twice, and a trail that
-- can be edited is not a trail.
-- ----------------------------------------------------------------------------
create table if not exists public.cellar_entry_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  entry_id   uuid not null references public.cellar_entries(id) on delete cascade,
  -- What happened, as the display word, like `kind` and `state`:
  -- 'dropped' | 'state' | 'kind' | 'filed' | 'claimed' | 'released' |
  -- 'line' | 'asked' | 'answered' | 'archived' | 'restored' | 'edited'
  -- ('edited' is a reworded thought: from_value is the old text, to_value the new)
  what       text not null,
  -- Where it went, and where it came from. Both null for an event that is not
  -- a move — a line landing, a question asked.
  from_value text,
  to_value   text,
  -- 'user' or 'agent', the same two words `cellar_entry_lines.source` carries.
  source     text not null default 'user',
  -- Named when an agent did it, so the trail says who without a join.
  agent      text,
  at         timestamptz not null default now()
);

create index if not exists cellar_entry_events_entry_idx
  on public.cellar_entry_events (entry_id, at);

-- ----------------------------------------------------------------------------
-- 10. Groups — the level between a shelf and its projects
--
-- An ecosystem of apps that are one thing from far away: ping holds radar,
-- lidar, sonar, pulsar and cellar. Optional — a project in no group sits on its
-- shelf the way it always did.
--
-- A group holds no thoughts of its own. It owns a general project
-- (`cellar_projects.group_home`, see COLUMN MIGRATIONS), named after it and
-- listed first inside it, and a thought dumped into the group lands there. So
-- `project_id is null` is still the inbox and only the inbox.
--
-- Cascades with its shelf, like a project does. Deleting a group sets its
-- projects' group_id null — they fall back onto the shelf, thoughts and all.
-- ----------------------------------------------------------------------------
create table if not exists public.cellar_groups (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  shelf_id   uuid not null references public.cellar_shelves(id) on delete cascade,
  name       text not null,
  position   int  not null default 0,
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists cellar_groups_user_idx on public.cellar_groups (user_id, shelf_id, position);

-- ----------------------------------------------------------------------------
-- 11. Pictures — an image on a thought, kept as text
--
-- A data URI in a text column rather than a file in a bucket, for the reason a
-- project's icon is one: no storage policy, no second thing to clean up, and a
-- deleted thought takes its pictures with it. The person crops a picture to
-- whatever shape they want and the app never changes it; it only compresses one
-- that is too big, to about 1.5 megapixels, which puts a screenshot at 60-300 KB
-- of text, plus a 160px `thumb` for lists (src/lib/entryPicture.ts).
--
-- Their own table, not columns on the thought or its lines: the whole cellar is
-- read in one go and a hundred full-size pictures in that read would make every
-- screen slow. The app reads the thumbs for everything and `data` for one
-- picture at a time. The MCP server never selects either — an agent has no use
-- for a picture.
--
-- `line_id` null is the thought's cover, and there is at most one. A line id is
-- the picture that note carries, at most one per note.
-- ----------------------------------------------------------------------------
create table if not exists public.cellar_entry_pictures (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  entry_id   uuid not null references public.cellar_entries(id) on delete cascade,
  line_id    uuid references public.cellar_entry_lines(id) on delete cascade,
  -- Pixels of `data`, so a list can reserve the right box before anything loads.
  width      int  not null,
  height     int  not null,
  thumb      text not null,
  data       text not null,
  created_at timestamptz not null default now()
);

create index if not exists cellar_entry_pictures_entry_idx on public.cellar_entry_pictures (entry_id);
create unique index if not exists cellar_entry_pictures_cover_idx
  on public.cellar_entry_pictures (entry_id) where line_id is null;
create unique index if not exists cellar_entry_pictures_line_idx
  on public.cellar_entry_pictures (line_id) where line_id is not null;

-- ----------------------------------------------------------------------------
-- 12. The pc — a desk, and the starts sent to it through the cellar
--
-- Cellar on the pc (desktop/) listens on the LAN, and a phone on the same
-- network talks to it directly. These two tables are the way in when the phone
-- is somewhere else: the phone writes a request, the pc hears it over realtime,
-- claims it with a conditional update and writes back what happened.
--
-- `cellar_desks` is the pc's heartbeat: where it is on the LAN, which agents it
-- has, what it is running. It is upserted every 30 s, which is how a phone away
-- from home sees the runs and how a phone whose saved address went stale finds
-- the new one. `id` is the pc's own id (desk.json), not a uuid — the pc made it
-- before it knew which account it would act for, so the key is the pair.
--
-- A request is never deleted and never re-run: `taken` is set once, by the
-- update that claims it, and the pc refuses a start older than ten minutes so a
-- request sent while the pc slept does not fire hours later
-- (src/lib/deskProtocol.ts, STALE_REQUEST_MS).
-- ----------------------------------------------------------------------------
create table if not exists public.cellar_desks (
  id         text not null,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  host       text,
  port       int,
  agents     text[] not null default '{}',
  runs       jsonb not null default '[]'::jsonb,
  seen_at    timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.cellar_desk_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  desk_id    text not null,
  kind       text not null check (kind in ('start', 'stop')),
  agent      text,
  prompt     text check (char_length(prompt) <= 8000),
  cwd        text,
  name       text,
  -- The thought it was started from. `set null`, not cascade: the record of
  -- what ran on the pc outlives the thought that asked for it.
  entry_id   uuid references public.cellar_entries(id) on delete set null,
  run_id     text,
  state      text not null default 'queued' check (state in ('queued', 'taken', 'done', 'failed')),
  error      text,
  created_at timestamptz not null default now(),
  taken_at   timestamptz
);

create index if not exists cellar_desk_requests_queue_idx
  on public.cellar_desk_requests (user_id, desk_id, state, created_at);

-- ============================================================================
-- Row level security
--
-- Every table, every time. The policies are dropped and re-created so the file
-- is re-runnable; the pair runs inside the SQL Editor's single transaction, so
-- there is no window where a table sits unprotected.
-- ============================================================================
alter table public.cellar_shelves      enable row level security;
alter table public.cellar_projects     enable row level security;
alter table public.cellar_entries      enable row level security;
alter table public.cellar_entry_lines  enable row level security;
alter table public.cellar_entry_questions enable row level security;
alter table public.cellar_entry_docs   enable row level security;
alter table public.cellar_entry_pictures enable row level security;
alter table public.cellar_entry_events enable row level security;
alter table public.cellar_groups       enable row level security;
alter table public.cellar_settings     enable row level security;
alter table public.cellar_agent_tokens enable row level security;
alter table public.cellar_desks        enable row level security;
alter table public.cellar_desk_requests enable row level security;

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

-- Same shape, same reason: keyed to user_id, not joined back to the entry.
drop policy if exists cellar_entry_questions_owner_all on public.cellar_entry_questions;
create policy cellar_entry_questions_owner_all on public.cellar_entry_questions for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Same shape again: keyed to user_id, not joined back to the entry.
drop policy if exists cellar_entry_docs_owner_all on public.cellar_entry_docs;
create policy cellar_entry_docs_owner_all on public.cellar_entry_docs for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Same shape again: keyed to user_id, not joined back to the entry.
drop policy if exists cellar_entry_pictures_owner_all on public.cellar_entry_pictures;
create policy cellar_entry_pictures_owner_all on public.cellar_entry_pictures for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists cellar_entry_events_owner_all on public.cellar_entry_events;
create policy cellar_entry_events_owner_all on public.cellar_entry_events for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists cellar_groups_owner_all on public.cellar_groups;
create policy cellar_groups_owner_all on public.cellar_groups for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists cellar_settings_owner_all on public.cellar_settings;
create policy cellar_settings_owner_all on public.cellar_settings for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- The token is not in this table, only its hash, so an owner reading its own
-- rows gives nothing away. Everything an unauthenticated caller needs comes
-- from cellar_resolve_agent_token instead — the one security definer function
-- in this file, and it answers with a user id and nothing else.
drop policy if exists cellar_agent_tokens_owner_all on public.cellar_agent_tokens;
create policy cellar_agent_tokens_owner_all on public.cellar_agent_tokens for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Owner-only, like everything else: the pc acts as you, with your session,
-- borrowed from Cellar's own window. Nobody else's start can reach your pc.
drop policy if exists cellar_desks_owner_all on public.cellar_desks;
create policy cellar_desks_owner_all on public.cellar_desks for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists cellar_desk_requests_owner_all on public.cellar_desk_requests;
create policy cellar_desk_requests_owner_all on public.cellar_desk_requests for all
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
-- Agent tokens — mint one, and resolve one
--
-- Two functions, and the split between them is the whole security argument.
--
-- Minting runs as you: security invoker, so the insert is checked by the same
-- policy as every other write in this file. Resolving cannot run as you —
-- whoever is asking has not proved who they are yet, which is the thing they
-- are asking about — so it is the one security definer function here, and it is
-- kept as narrow as a function can be. It takes a hash. It returns a user id.
-- It cannot be made to say anything else about the row it found, or whether a
-- row was found at all beyond that.
-- ============================================================================

-- The token is generated in the database rather than in the app, so the
-- plaintext exists in exactly two places: this function's return value and the
-- clipboard you paste it from. Two uuids is 256 bits of the same randomness the
-- ids in this file already trust, and it needs no extension to produce.
create or replace function public.cellar_create_agent_token(p_name text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;

  v_token := 'clr_'
    || replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '');

  insert into public.cellar_agent_tokens (user_id, name, token_hash)
  values (
    auth.uid(),
    coalesce(nullif(btrim(p_name), ''), 'agent'),
    encode(sha256(convert_to(v_token, 'UTF8')), 'hex')
  );

  return v_token;
end;
$$;

revoke all on function public.cellar_create_agent_token(text) from public;
grant execute on function public.cellar_create_agent_token(text) to authenticated;

-- Hashed by the caller, never sent in the clear: the database is handed the
-- sha256 and compares that, so the token itself never reaches a query log.
create or replace function public.cellar_resolve_agent_token(p_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id   uuid;
  v_user uuid;
begin
  select id, user_id into v_id, v_user
    from public.cellar_agent_tokens
   where token_hash = p_hash
     and revoked_at is null
     and (expires_at is null or expires_at > now());

  if v_id is null then
    return null;
  end if;

  update public.cellar_agent_tokens
     set last_used_at = now()
   where id = v_id;

  return v_user;
end;
$$;

-- Callable by an unauthenticated role on purpose: that is exactly the state the
-- caller is in when it asks. Nothing else in this file is.
revoke all on function public.cellar_resolve_agent_token(text) from public;
grant execute on function public.cellar_resolve_agent_token(text) to anon, authenticated;

-- ============================================================================
-- Realtime
--
-- The cellar is one account across a phone and a browser, and the thing you
-- dump on one should be in the list on the other without a refetch.
--
-- All five tables the app reads, not only the two that hold a thought. An
-- agent's ordinary work is `cellar_append_line` and `cellar_ask`, which write
-- lines and questions and never touch `cellar_entries` — publishing only the
-- parent would leave the one case this exists for silent.
--
-- `replica identity full` is what makes a delete arrive. Postgres sends only
-- the primary key for a delete otherwise, and the client subscribes with
-- `user_id=eq.<uid>`: with no `user_id` in the old record the filter drops the
-- event, and a thought deleted on the phone would sit on the browser until a
-- reload. The rows are a line of text each, so the extra WAL is nothing.
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'cellar_shelves',
    'cellar_groups',
    'cellar_projects',
    'cellar_entries',
    'cellar_entry_lines',
    'cellar_entry_questions',
    'cellar_desks',
    'cellar_desk_requests'
  ] loop
    execute format('alter table public.%I replica identity full', t);

    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then null;
      end;
    end if;
  end loop;
end $$;

-- ============================================================================
-- COLUMN MIGRATIONS
--
-- Everything above is skipped on a live database — `create table if not exists`
-- does not reconcile columns. A new column goes here, and only here.
-- ============================================================================

-- 2026-09-13 — "addition" folded into "idea".
--
-- The two named the same act: a thing you want that is not there yet. Two chips
-- for one thought is a decision you have to make on every drop, and the answer
-- never mattered. `kind` is free text, so an un-migrated row would keep reading
-- back as 'addition' and normalizeEntry would show it as 'idea' without ever
-- fixing it. Idempotent: a second run matches nothing.
update public.cellar_entries set kind = 'idea' where kind = 'addition';
update public.cellar_settings set default_kind = 'idea' where default_kind = 'addition';

-- 2026-09-14 — where a project actually lives, so an agent can find it.
--
-- `repo_path` is the local checkout and it is the one that does work: an agent
-- running in C:\ping\cellar\src\lib resolves the project by longest-prefix match
-- on this column and needs nothing asked of the user. `repo_url` is the remote,
-- and exists only so the app has something to open — never match on it, a URL
-- tells you nothing about the directory the agent is standing in.
--
-- Both nullable. Most projects are a thought about something that has no repo
-- yet, and requiring one would make the column a lie on the day it is added.
alter table public.cellar_projects
  add column if not exists repo_path text,
  add column if not exists repo_url  text;

-- 2026-09-14 — who wrote a line.
--
-- An entry grows by appended lines, and once something other than the user can
-- append, a wall of one-liners with no attribution is the app's core value
-- destroyed: you cannot tell what you thought from what was reported back. The
-- stored value is the display word, like `kind` and `state` — 'user' | 'agent'.
--
-- Defaulted to 'user' and not null, so every line that already exists is
-- correctly yours without a backfill.
alter table public.cellar_entry_lines
  add column if not exists source text not null default 'user';

-- 2026-09-14 — which agent put an entry here or has it, if one did.
--
-- Claiming is `state = 'doing'` and nothing else; this column only names who,
-- so the app can say "claude is on this" instead of leaving you to guess why a
-- thought you never touched went amber. It is also stamped on an entry an agent
-- dropped itself — a follow-up it found while working — which lands open for
-- you to triage rather than as work it may hand straight back to itself.
-- Cleared when the entry settles.
alter table public.cellar_entries
  add column if not exists agent text;

-- 2026-09-14 — whether a blocked question raises a banner on the phone.
--
-- Cellar's own column, so the switch follows the account rather than the
-- handset. Default on: the only thing it ever fires for is an agent that
-- stopped and asked, which is by definition something waiting on you — a
-- notification you would have wanted is not noise.
--
-- Delivery is local (expo-notifications on a background wake), the way Pulsar's
-- reminders are. There is no push token, no device_tokens row and nothing of
-- Radar's involved; see docs/agent-notifications.md.
alter table public.cellar_settings
  add column if not exists notify_questions boolean not null default true;

-- 2026-09-22 — a project that sorts first inside its own shelf.
--
-- On the project rather than in MMKV: which shelf you are standing in front of
-- is where you are standing, but a pin is a fact about the project, and it has
-- to be the same one in the browser. The same argument `position` already makes
-- two columns to the left.
--
-- It sorts, and that is all it does. There is deliberately no pinned band and
-- no pinned section — a project that appears twice on one screen is a project
-- you have to check twice, and the shelf is already the grouping this app is
-- built around. The file-it list reads the same column, so a project you pinned
-- because you file into it constantly is at the top of the sheet as well.
alter table public.cellar_projects
  add column if not exists pinned boolean not null default false;

-- 2026-09-22 — how much a thought matters, inside its kind.
--
-- Three levels and no more: 'low' | 'normal' | 'high', stored as the display
-- word like `kind` and `state`. Five would be a form to fill in on a screen
-- whose entire point is that catching a thought costs one line.
--
-- It is a mark on the row, not a sort. Entries are getting a drag position in
-- the same pass, and two manual orders fighting over one list is one too many —
-- importance says how much this matters, position says where you put it, and
-- they answer different questions.
--
-- Defaulted to 'normal' and not null, so every thought that already exists is
-- correctly unremarkable without a backfill.
alter table public.cellar_entries
  add column if not exists importance text not null default 'normal';

-- 2026-09-22 — where you dragged a thought to.
--
-- Shelves and projects have carried a `position` since the beginning and only
-- their create ever wrote it; entries had none at all and came back ordered by
-- `created_at`. Dragging needs a column that survives the drag.
--
-- Defaulted to 0 rather than to a backfilled index, and that is the trap worth
-- knowing: every existing row shares position 0, so a list sorted on this
-- column alone is in an arbitrary order until something writes it. Anything
-- reading it must sort `position, created_at desc`, which keeps newest-first
-- for everything untouched and puts a dragged thought exactly where it was put.
alter table public.cellar_entries
  add column if not exists position int not null default 0;

-- 2026-09-23 — whether an agent may test on your phone without asking.
--
-- An agent that has finished a change wants to see it run, and the phone on
-- the desk is the real target. Installing over adb and driving the app is
-- taking the device over, though, so it is a standing yes you give once and on
-- purpose — not a question every session asks, and not a default. Off until
-- you turn it on in settings; cellar_orient reads it and says so to every
-- agent, so nobody has to ask.
alter table public.cellar_settings
  add column if not exists agent_device boolean not null default false;

-- 2026-09-23 — how the cellar reads: seven preferences asked for at once.
--
-- On the account like the rest of this row, so the phone and the browser read
-- the same. Every value is the display word, and every reader falls back to
-- the default for a word it does not know (src/lib/displayPrefs.ts), so none
-- of these needs a check constraint to stay safe.
--
--   row_density   roomy | compact        — padding on every entry row
--   text_size     small | normal | large — the thought line
--   haptics       a tap under the thumb on a hold and a drop
--   project_sort  newest | oldest        — inside a project
--   hide_settled  done and dropped start folded in a project
--   start_tab     dump | shelf | inbox | stats — where the app opens
--   kind_order    the kinds you put first; null is the default order, and a
--                 kind it leaves out keeps its default place after them
alter table public.cellar_settings add column if not exists row_density text not null default 'roomy';
alter table public.cellar_settings add column if not exists text_size text not null default 'normal';
alter table public.cellar_settings add column if not exists haptics boolean not null default true;
alter table public.cellar_settings add column if not exists project_sort text not null default 'newest';
alter table public.cellar_settings add column if not exists hide_settled boolean not null default false;
alter table public.cellar_settings add column if not exists start_tab text not null default 'dump';
alter table public.cellar_settings add column if not exists kind_order text[];

-- 2026-09-23 — a nudge about a thought you dumped and left alone.
--
-- Its own switch, apart from notify_questions: turning off "an agent is waiting
-- on you" must not also turn off "this idea has sat for a week", and the other
-- way round. The threshold and the day's allowance are yours to pick; more
-- stale thoughts than the allowance go out as one grouped banner rather than
-- being cut to the first few (src/lib/nudges.ts).
alter table public.cellar_settings add column if not exists notify_nudges boolean not null default true;
alter table public.cellar_settings add column if not exists nudge_days int not null default 7;
alter table public.cellar_settings add column if not exists nudges_per_day int not null default 1;

-- 2026-09-23 — a project's icon, as the image itself.
--
-- A data URI in a text column rather than a file in a bucket: no storage
-- policy, nothing to clean up when the project goes, and it rides in with the
-- row. The app crops it square and cuts it to 160px before writing, which puts
-- a photo at 8–15 KB; readers refuse anything that is not an image data URI or
-- is past 80 000 characters (src/lib/projectIcon.ts). The MCP server never
-- selects it — an agent has no use for a picture.
alter table public.cellar_projects add column if not exists icon text;

-- 2026-09-23 — which group a project sits in, and which project is the group's own.
--
-- `on delete set null`: deleting a group drops its projects back onto the
-- shelf, never with it. `group_home` marks the general project a group owns —
-- the place a thought dumped into the group lands (see 10. Groups). A home whose
-- group is gone is an ordinary project again; readers only trust the flag while
-- group_id still points somewhere.
alter table public.cellar_projects
  add column if not exists group_id uuid references public.cellar_groups(id) on delete set null;
alter table public.cellar_projects
  add column if not exists group_home boolean not null default false;

-- 2026-10-09 — where a group lives on disk.
--
-- A group's members sit in one folder (C:\ping holds radar, lidar, cellar…), and
-- that folder is where work on the group as a whole happens — it is where "start
-- on pc" runs a thought filed in the group's general project. Nullable: unset,
-- the pc screen falls back to the deepest folder the members share
-- (src/lib/deskFolders.ts). Kept on the group, not on its general project, so
-- an agent standing in C:\ping still resolves no project there.
alter table public.cellar_groups add column if not exists repo_path text;

-- 2026-10-10 — exact question choices, separate from the user's note.
-- Null picks preserve legacy prose; an empty array is an explicit free-text answer.
alter table public.cellar_entry_questions add column if not exists answer_picks text[];
alter table public.cellar_entry_questions add column if not exists answer_note text;

-- 2026-10-10 — W4 durable task payloads and atomic entry claims.
-- W4: additive columns plus owner-scoped, atomic attachment reservations.
begin;
alter table public.cellar_entries add column if not exists desk_run_id uuid;
alter table public.cellar_desks add column if not exists task_protocol integer;
alter table public.cellar_desk_requests add column if not exists payload jsonb;
alter table public.cellar_desk_requests add column if not exists receipt jsonb;

create or replace function public.cellar_claim_run_entries(p_ids uuid[], p_command_id uuid, p_agent text, p_project_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null or p_command_id is null or p_project_id is null or p_agent is null or p_agent not in ('claude','codex','agy') then
    raise exception 'Invalid task claim';
  end if;
  if p_ids is null or cardinality(p_ids) > 20 or cardinality(p_ids) <> (select count(distinct id) from unnest(p_ids) id) then
    raise exception 'Attach up to 20 distinct entries';
  end if;
  perform id from public.cellar_entries where id = any(p_ids) and user_id = owner_id order by id for update;
  if (select count(*) from public.cellar_entries where id = any(p_ids) and user_id = owner_id) <> cardinality(p_ids) then
    raise exception 'An attachment is unavailable to this account';
  end if;
  if exists (select 1 from public.cellar_entries where id = any(p_ids) and
    (project_id is distinct from p_project_id or archived or not (
      (state = 'open' and desk_run_id is null) or (state = 'doing' and desk_run_id = p_command_id)))) then
    raise exception 'An attachment belongs to another project, is archived, blocked or already claimed';
  end if;
  update public.cellar_entries set state = 'doing', agent = p_agent, desk_run_id = p_command_id
    where id = any(p_ids) and user_id = owner_id;
end; $$;

create or replace function public.cellar_release_run_entries(p_ids uuid[], p_command_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or p_command_id is null then raise exception 'Invalid task release'; end if;
  update public.cellar_entries set state = 'open', agent = null, desk_run_id = null
    where id = any(p_ids) and user_id = auth.uid() and desk_run_id = p_command_id and state = 'doing';
end; $$;
create or replace function public.cellar_clear_run_claim()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.state <> 'doing' or new.agent is null then new.desk_run_id := null; end if;
  return new;
end; $$;
drop trigger if exists cellar_entries_clear_run_claim on public.cellar_entries;
create trigger cellar_entries_clear_run_claim before update on public.cellar_entries
  for each row execute function public.cellar_clear_run_claim();
revoke all on function public.cellar_claim_run_entries(uuid[],uuid,text,uuid) from public, anon;
revoke all on function public.cellar_release_run_entries(uuid[],uuid) from public, anon;
grant execute on function public.cellar_claim_run_entries(uuid[],uuid,text,uuid) to authenticated;
grant execute on function public.cellar_release_run_entries(uuid[],uuid) to authenticated;
notify pgrst, 'reload schema';
commit;

-- W14 additive, rerunnable notification storage. Apply after schema.sql.
-- Clients operate on their own rows. Delivery coordination runs only as service_role.
begin;
create table if not exists public.cellar_notice_devices (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 100),
  kind text not null check (kind in ('desk','phone')),
  token text, secret_hash text,
  seen_at timestamptz not null default now(), idle_seconds integer not null default 0 check (idle_seconds >= 0),
  locked boolean not null default false, enabled boolean not null default true,
  primary key(user_id,id)
);
create table if not exists public.cellar_notice_preferences (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  preferences jsonb not null default '{"approvals":true,"questions":true,"finished":true,"checksFailed":true,"quietStart":1380,"quietEnd":420,"utcOffset":0}'::jsonb
);
create table if not exists public.cellar_notices (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 150),
  payload jsonb not null check (octet_length(payload::text) <= 16000),
  revision integer not null default 1,
  waiting_since timestamptz not null default now(),
  target text, desired text, generation integer not null default 1,
  phase text not null default 'ready' check (phase in ('ready','delivering','shown','dismissing')),
  delivered_revision integer not null default 0,
  last_sent_at timestamptz,
  lease_until timestamptz,
  primary key(user_id,id)
);
create table if not exists public.cellar_notice_actions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id uuid not null, desk_id text not null, payload jsonb not null,
  receipt jsonb, created_at timestamptz not null default now(),
  primary key(user_id,id)
);
create index if not exists cellar_notice_actions_pending on public.cellar_notice_actions(user_id,desk_id,created_at) where receipt is null;
create index if not exists cellar_notice_devices_secret on public.cellar_notice_devices(secret_hash) where secret_hash is not null;
alter table public.cellar_notice_devices enable row level security;
alter table public.cellar_notice_preferences enable row level security;
alter table public.cellar_notices enable row level security;
alter table public.cellar_notice_actions enable row level security;
drop policy if exists cellar_notice_devices_owner on public.cellar_notice_devices;
create policy cellar_notice_devices_owner on public.cellar_notice_devices for all to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists cellar_notice_preferences_owner on public.cellar_notice_preferences;
create policy cellar_notice_preferences_owner on public.cellar_notice_preferences for all to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists cellar_notices_owner on public.cellar_notices;
create policy cellar_notices_owner on public.cellar_notices for all to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists cellar_notice_actions_owner on public.cellar_notice_actions;
create policy cellar_notice_actions_owner on public.cellar_notice_actions for all to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.cellar_notice_devices,public.cellar_notice_preferences,public.cellar_notices,public.cellar_notice_actions to authenticated;
grant all on public.cellar_notice_devices,public.cellar_notice_preferences,public.cellar_notices,public.cellar_notice_actions to service_role;

create or replace function public.cellar_notice_timezone(p_owner uuid,p_offset integer)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if p_offset not between -840 and 840 then raise exception 'Invalid timezone offset'; end if;
  insert into public.cellar_notice_preferences(user_id) values(p_owner) on conflict(user_id) do nothing;
  update public.cellar_notice_preferences set preferences=jsonb_set(preferences,'{utcOffset}',to_jsonb(p_offset)) where user_id=p_owner;
end $$;
revoke all on function public.cellar_notice_timezone(uuid,integer) from public,anon,authenticated;
grant execute on function public.cellar_notice_timezone(uuid,integer) to service_role;

create or replace function public.cellar_publish_notice(p_id text,p_payload jsonb,p_owner uuid default auth.uid())
returns void language plpgsql security invoker set search_path='' as $$
begin
  if p_owner is null or (p_owner is distinct from auth.uid() and current_user<>'service_role') then raise exception 'Sign in to publish owned notices'; end if;
  if not coalesce((p_payload->>'active')::boolean,false) and not exists(select 1 from public.cellar_notices where user_id=p_owner and id=p_id) then return; end if;
  if p_payload->>'kind' in ('finished','checksFailed') and exists(select 1 from public.cellar_notices where user_id=p_owner and id=p_id and payload->>'active'='false' and payload->'note'=p_payload->'note') then return; end if;
  insert into public.cellar_notices(user_id,id,payload) values(p_owner,p_id,p_payload)
  on conflict(user_id,id) do update set payload=excluded.payload,revision=cellar_notices.revision+1,generation=cellar_notices.generation+1,
    waiting_since=case when cellar_notices.payload->>'requestId' is distinct from excluded.payload->>'requestId' then now() else cellar_notices.waiting_since end
  where cellar_notices.payload is distinct from excluded.payload;
end $$;
revoke all on function public.cellar_publish_notice(text,jsonb,uuid) from public,anon;
grant execute on function public.cellar_publish_notice(text,jsonb,uuid) to authenticated,service_role;

-- Route transfer cannot assign a new target until the old one acknowledges dismissal.
create or replace function public.cellar_route_notice(p_owner uuid,p_id text,p_target text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare n public.cellar_notices;
begin
  select * into n from public.cellar_notices where user_id=p_owner and id=p_id for update;
  if not found then return null; end if;
  if n.target like 'desk:%' and n.lease_until is not null and n.lease_until<now() then
    n.target:=null; n.delivered_revision:=0; n.phase:='ready';
  end if;
  if n.target is distinct from p_target then
    if n.target is not null and (n.delivered_revision>0 or n.phase in ('delivering','dismissing')) then
      if n.phase <> 'dismissing' then n.generation:=n.generation+1; end if;
      n.desired:=p_target; n.phase:='dismissing';
    else
      n.target:=p_target; n.desired:=p_target; n.generation:=n.generation+1; n.phase:='ready'; n.delivered_revision:=0;
    end if;
  elsif n.phase='dismissing' then n.desired:=p_target;
  elsif n.delivered_revision<n.revision and n.phase='shown' then n.phase:='ready'; n.generation:=n.generation+1;
  end if;
  update public.cellar_notices set target=n.target,desired=n.desired,generation=n.generation,phase=n.phase,delivered_revision=n.delivered_revision where user_id=p_owner and id=p_id;
  if n.target is null or n.phase='shown' then return null; end if;
  return jsonb_build_object('deviceId',n.target,'id',n.id,'generation',n.generation,'dismiss',n.phase='dismissing');
end $$;

create or replace function public.cellar_notice_delivery(p_owner uuid,p_device text,p_id text,p_generation integer,p_ack text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare n public.cellar_notices;
begin
  select * into n from public.cellar_notices where user_id=p_owner and id=p_id for update;
  if not found or n.target is distinct from p_device or n.generation<>p_generation then return null; end if;
  if p_ack='dismissed' then
    update public.cellar_notices set target=case when phase='dismissing' then desired else null end,phase='ready',delivered_revision=0,generation=generation+1,last_sent_at=null,lease_until=null where user_id=p_owner and id=p_id;
    return jsonb_build_object('ok',true);
  elsif p_ack='shown' and n.phase in ('ready','delivering') then
    update public.cellar_notices set phase='shown',delivered_revision=revision where user_id=p_owner and id=p_id;
    return jsonb_build_object('ok',true);
  elsif p_ack is not null then return null;
  elsif n.phase='dismissing' then return jsonb_build_object('dismiss',true);
  elsif n.phase='shown' and p_device like 'desk:%' then
    update public.cellar_notices set lease_until=now()+interval '45 seconds' where user_id=p_owner and id=p_id;
    return jsonb_build_object('dismiss',false,'payload',n.payload,'expiresAt',extract(epoch from now()+interval '45 seconds')*1000);
  elsif n.phase in ('ready','delivering') and (n.payload->>'active')::boolean then
    update public.cellar_notices set phase='delivering',lease_until=case when p_device like 'desk:%' then now()+interval '45 seconds' else null end where user_id=p_owner and id=p_id;
    return jsonb_build_object('dismiss',false,'payload',n.payload,'expiresAt',case when p_device like 'desk:%' then extract(epoch from now()+interval '45 seconds')*1000 else null end);
  end if;
  return null;
end $$;
revoke all on function public.cellar_route_notice(uuid,text,text), public.cellar_notice_delivery(uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.cellar_route_notice(uuid,text,text), public.cellar_notice_delivery(uuid,text,text,integer,text) to service_role;

-- One atomic question answer, also used by notification actions. First answer wins.
create or replace function public.cellar_answer_notice_question(p_command uuid,p_question uuid,p_picks jsonb,p_note text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q public.cellar_entry_questions; old public.cellar_notice_actions; value jsonb; answer_text text;
begin
  if auth.uid() is null then raise exception 'Sign in to answer questions'; end if;
  if p_picks is null or p_note is null or jsonb_typeof(p_picks)<>'array' or jsonb_array_length(p_picks)>8 or length(p_note)>8000 then raise exception 'Invalid answer'; end if;
  if (select count(distinct x) from jsonb_array_elements(p_picks) x)<>jsonb_array_length(p_picks) then raise exception 'Choose distinct options'; end if;
  select * into q from public.cellar_entry_questions where id=p_question and user_id=auth.uid() for update;
  if not found then raise exception 'Question unavailable'; end if;
  select * into old from public.cellar_notice_actions where user_id=auth.uid() and id=p_command;
  value:=jsonb_build_object('questionId',p_question,'picks',p_picks,'note',p_note);
  if found then
    if old.payload is distinct from value then raise exception 'Answer command belongs to another choice'; end if;
    return old.receipt;
  end if;
  if q.answered_at is not null or q.dismissed_at is not null then raise exception 'Question already settled'; end if;
  if exists(select 1 from jsonb_array_elements(p_picks) x where jsonb_typeof(x)<>'string' or not q.options @> jsonb_build_array(x)) then raise exception 'Choose offered options'; end if;
  if jsonb_array_length(p_picks)=0 and btrim(p_note)='' then raise exception 'Answer is empty'; end if;
  select string_agg(x,' + ') into answer_text from jsonb_array_elements_text(p_picks) x;
  answer_text:=coalesce(answer_text,'') || case when btrim(p_note)<>'' then case when answer_text is not null then ' — ' else '' end || btrim(p_note) else '' end;
  update public.cellar_entry_questions set answer=answer_text,answer_picks=array(select jsonb_array_elements_text(p_picks)),answer_note=nullif(btrim(p_note),''),answered_at=now(),answered_via='app' where id=p_question and user_id=auth.uid();
  update public.cellar_entries e set state='open',agent=null where e.id=q.entry_id and e.user_id=auth.uid() and e.state='blocked'
    and not exists(select 1 from public.cellar_entry_questions pending where pending.entry_id=e.id and pending.answered_at is null and pending.dismissed_at is null);
  value:=jsonb_build_object('state','confirmed','questionId',p_question);
  insert into public.cellar_notice_actions(user_id,id,desk_id,payload,receipt) values(auth.uid(),p_command,'question',jsonb_build_object('questionId',p_question,'picks',p_picks,'note',p_note),value);
  return value;
end $$;
revoke all on function public.cellar_answer_notice_question(uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.cellar_answer_notice_question(uuid,uuid,jsonb,text) to authenticated;

create or replace function public.cellar_close_finished_notice(p_id text)
returns void language sql security invoker set search_path='' as $$
  update public.cellar_notices set payload=payload||'{"active":false}'::jsonb,revision=revision+1
    where user_id=auth.uid() and id=p_id and payload->>'kind' in ('finished','checksFailed');
$$;
revoke all on function public.cellar_close_finished_notice(text) from public,anon;
grant execute on function public.cellar_close_finished_notice(text) to authenticated;

create or replace function public.cellar_settle_questions(p_entry uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
  update public.cellar_entries e set state='open',agent=null where id=p_entry and user_id=auth.uid() and state='blocked'
    and not exists(select 1 from public.cellar_entry_questions q where q.entry_id=e.id and q.answered_at is null and q.dismissed_at is null);
  get diagnostics changed=row_count; return changed>0;
end $$;
revoke all on function public.cellar_settle_questions(uuid) from public,anon;
grant execute on function public.cellar_settle_questions(uuid) to authenticated;

-- Instant enqueue, even when no client/host is running. Worker fills the canonical note.
create or replace function public.cellar_question_notice_wake()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  insert into public.cellar_notices(user_id,id,payload) values(new.user_id,'entry:'||new.entry_id,
    jsonb_build_object('active',false,'kind','question','requestId',new.id,'entryId',new.entry_id,'route','/entry/'||new.entry_id,'refresh',true))
  on conflict(user_id,id) do update set payload=cellar_notices.payload||jsonb_build_object('refresh',true);
  return new;
end $$;
drop trigger if exists cellar_question_notice_wake on public.cellar_entry_questions;
create trigger cellar_question_notice_wake after insert or update on public.cellar_entry_questions for each row execute function public.cellar_question_notice_wake();
revoke all on function public.cellar_question_notice_wake() from public,anon,authenticated;
notify pgrst, 'reload schema';
commit;
