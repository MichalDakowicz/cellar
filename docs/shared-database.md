# The shared database — Cellar's half of the contract

Cellar runs on the **same Supabase project** as Radar, Lidar, Sonar and Pulsar. Not a copy,
not a sync — the same rows. One identity, one login, one theme preference, across all five.

Radar owns the shared core. Cellar is a reader with its own `cellar_*` tables.

---

## What Cellar reads

| Table | Columns | Why |
| --- | --- | --- |
| `public.profiles` | `id, username, display_name, pfp, created_at` | the avatar on the right nav island, the name on Profile |
| `public.user_settings` | `theme` | the theme switch, shared with the siblings on purpose |

`profiles.favorites` is Radar's film shelf and is **off limits** — Cellar's select names its
columns rather than taking `*`, so the column never reaches memory and can never be
round-tripped back on an update.

`user_settings.current_streak` / `streak_updated_at` are **Radar's publish channel** and are
read-only to everyone else. Cellar does not read them either; it has nothing to say about a
film-watching streak.

## What Cellar writes to a shared table

Exactly one column:

- `user_settings.theme`

That is enforced in `src/lib/userSettings.ts`, not just documented — the update payload is
built from an allow-list, so a future feature cannot widen it by accident.

Cellar does **not** write `user_settings.friends_visibility`. It has no social surface at
all (see below), so a privacy switch here would be a control with nothing behind it.

## What Cellar owns

Six tables, all namespaced, all with RLS keyed to `auth.uid()`:

| Table | Holds |
| --- | --- |
| `cellar_shelves` | the layer above projects — "apps", "minecraft mods" |
| `cellar_projects` | one app, one mod, one site |
| `cellar_entries` | one line, caught. `project_id is null` **is** the inbox |
| `cellar_entry_lines` | the lines appended to an entry afterwards |
| `cellar_settings` | Cellar-only preferences (gutter codes, raw default, default kind and view) |
| `cellar_agent_tokens` | hashed tokens a hosted agent presents instead of signing in |

## Cellar is private, and that is a design decision

Every other sibling calls `private.can_view(uuid)` somewhere, because a shelf of films or
records is a thing you show people. A half-formed idea about an unreleased app is not.

So **no policy in `supabase/schema.sql` references `private.can_view`**, no row is readable
by anyone but its owner, and there is no Social tab. The account is still shared — the same
login, the same profile, the same theme — but the cellar itself is yours alone. If a future
version ever adds sharing, it adds a per-project opt-in column and a policy of its own; it
does not quietly widen the owner policies.

## Order of operations

Radar's `supabase/schema.sql` must be applied **first**. Cellar's file starts with a
prerequisite check for `public.profiles` and `public.user_settings` and raises without them,
so a wrong order fails immediately instead of half-applying.

Schema changes are applied by hand: Supabase Dashboard → SQL Editor → paste → Run. The file
is idempotent and never drops a table, a column or a row. Adding a column means an
`alter table ... add column if not exists` under **COLUMN MIGRATIONS** at the bottom — never
editing the `create table`, which is skipped entirely on a live database.

## Deleting

Two cascades, both deliberate:

- Deleting a **shelf** cascades to its projects. That is what "delete this shelf" means.
- Deleting a **project** does **not** cascade to its entries. `project_id` is
  `on delete set null`, so those thoughts land back in the inbox. Nothing in this app is
  destroyed to get it out of the way — that is what `archived` is for.
