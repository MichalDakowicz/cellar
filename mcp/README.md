# Cellar MCP

Hands the thoughts you dumped about a repo to whatever is working in that repo.

Cellar is a mind dump: one-line thoughts filed under projects. This server turns that pile
into a work queue an agent can read, claim, report against and — when the thought is too
thin to act on — ask you about.

```
open ──claim──▶ doing ──finish──▶ done | dropped
                  │
                  └──ask──▶ blocked ──(you answer)──▶ open
```

## Setup, once

```sh
cd cellar/mcp
npm install
npm run login          # the same account the app signs into
```

**Email and password**, the ordinary way. It is the default because it is the only one of
the three that depends on nothing outside this repo.

The shared account may have been created with Google and so have no password at all. Set
one from inside the app — **settings → password for agent tools**. That works because the
app is already signed in, and Google sign-in keeps working afterwards; it adds a way in
rather than replacing one.

Two fallbacks, both real and both with a dependency worth knowing about:

- `npm run login -- --google` stands up a one-request server on `127.0.0.1:54545` and runs
  the same PKCE flow the app runs through `expo-web-browser`. Needs the browser to complete
  a redirect back to that loopback port, and `http://127.0.0.1:54545/callback` allow-listed
  under *Authentication → URL Configuration → Redirect URLs*. The literal address is on
  purpose: on Windows `localhost` resolves to `::1` first, so a server bound to `127.0.0.1`
  never sees the redirect and the tab hangs *after* a successful sign-in.
- `npm run login -- --code` has Supabase email you a code — or a link, depending on the
  template; it takes either. Needs that mail to actually arrive, which on a project using
  the built-in sender is rate-limited and not guaranteed.

`--password` skips the menu, and `CELLAR_EMAIL` + `CELLAR_PASSWORD` run it with no prompt
at all.

Then register it with whatever runs agents. Claude Code:

```json
{
    "mcpServers": {
        "cellar": {
            "command": "node",
            "args": ["--import", "tsx", "C:/ping/cellar/mcp/src/server.ts"],
            "cwd": "C:/ping/cellar/mcp",
            "env": { "CELLAR_AGENT": "claude" }
        }
    }
}
```

The `cwd` is load-bearing: it is how node finds the `tsx` loader in this package's own
`node_modules`. Two shapes that look equivalent and are not — `npx tsx …` re-downloads tsx
when it is run from another repo's directory, and `npm run serve` prints its own banner to
**stdout**, which is the protocol stream, so the client drops the server with no useful
error. Anything the server has to say goes to stderr for the same reason.

Register it in **every repo you dump thoughts about**, not just in Cellar's own — the whole
point is that the agent working on Radar can read the Radar thoughts.

Last step, and it is the one that removes the recurring question: give each project its
checkout path, in the app under a project → edit → *where it lives*, or by letting the agent
do it with `cellar_link_repo`. After that `cellar_orient` resolves the project from the
working directory and nobody is ever asked "which project is this?" again.

## Hosted, instead

The setup above puts a node process on your machine. The other way is to put the same
server on Supabase and give the agent a URL, which is what you want when the agent is not
running where your session file is — a cloud session, a second machine, a phone.

It is the *same tools from the same files*: `supabase/functions/mcp` is a transport and a
door, and `mcp/src/mcpServer.ts` defines what is behind it. Nothing is registered twice.

**One-time, in the app:** settings → *agent access* → name the machine → **mint a token**.
The token is shown once, because only its sha256 is stored and the database cannot produce
it again. *Copy the config* puts the whole block on your clipboard:

```json
{
    "mcpServers": {
        "cellar": {
            "type": "http",
            "url": "https://<project>.supabase.co/functions/v1/mcp",
            "headers": {
                "Authorization": "Bearer clr_…",
                "x-cellar-agent": "claude"
            }
        }
    }
}
```

`x-cellar-agent` is what your name looks like on an entry you claim. Set it per machine
when two of them work the same cellar — a list that says "claude" twice cannot tell you
who has what.

Revoking is in the same screen and takes effect on the next call: the token is resolved
per request and nothing is cached between them.

**Deploying it**, which is a thing you do once and after changing the function:

```sh
npx supabase link --project-ref <ref>
npx supabase secrets set CELLAR_JWT_SECRET=<the project's JWT secret>
npx supabase functions deploy mcp
```

`verify_jwt = false` is set for this function in `supabase/config.toml`, and that is not a
hole — the header carries a cellar token rather than a Supabase JWT, so the platform's own
check would reject every request before the function ran. The check it replaces is
stricter: the platform's asks whether a JWT is valid, `auth.ts` asks whether this is one of
*your* tokens and whether you have revoked it.

### What the hosted half is allowed to do

The same as you and not one row more, and the reason is worth stating because a hosted
endpoint is where that promise usually quietly breaks.

There is no service role key in the function. What it has is the anon key, a token hash and
`cellar_resolve_agent_token` — a security definer function narrow enough to be read in one
sitting: it takes a hash and returns a user id. The function then mints a five-minute JWT
for that user and every query after it is checked by the same RLS policies the app is
checked by. A service key here would have handed a prompt-injected agent Radar's `profiles`
and the shared `user_settings` as well; four other apps live in this database.

**The token is a bearer credential.** Anyone holding it has your cellar, which is why it is
shown once, stored as a hash, scoped to nothing else, and revocable from the phone in your
pocket.

## Configuration

| Variable                    | Default                          | For                                               |
| --------------------------- | -------------------------------- | ------------------------------------------------- |
| `CELLAR_SUPABASE_URL`       | `EXPO_PUBLIC_SUPABASE_URL` in `../.env` | Overriding the project                     |
| `CELLAR_SUPABASE_ANON_KEY`  | `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `../.env` | ditto                                 |
| `CELLAR_AGENT`              | `claude`                         | What the agent is called on the entries it touches |
| `CELLAR_EMAIL` / `CELLAR_PASSWORD` | —                         | Non-interactive `npm run login`                    |
| `CELLAR_EMAIL` alone        | —                                | Skips the email prompt on the emailed-code flow     |
| `CELLAR_JWT_SECRET`         | —                                | **Hosted only**, set with `supabase secrets set` — signs the per-request user JWT |

It reads the app's own `.env` by default, so there is no second copy of the credentials to
keep in step.

## Security

**Anon key plus your user session. Never the service role.**

Every `cellar_*` table is owner-only RLS keyed to `auth.uid()`, and that policy is the only
thing between a prompt-injected agent and a database four other apps live in. A service key
would hand it Radar's `profiles` and the shared `user_settings` as well. The agent gets
exactly your access and nothing more.

The session (a refresh token) is written to `~/.cellar-mcp/session.json`, mode 0600, outside
the repo — a token in a working tree is one `git add -A` from a public remote. `npm run
logout` removes it.

## The tools

Reads:

| Tool                   | For                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `cellar_orient`        | **Start here.** cwd → project, shelf, repo, and everything open/claimed/blocked in it |
| `cellar_list_projects` | Every project, its counts and its checkout                                          |
| `cellar_list_entries`  | Filter by project, kind, state, text                                                |
| `cellar_get_entry`     | One thought in full: both halves of its thread, its repo, its brief                 |

Writes:

| Tool                   | For                                                                         |
| ---------------------- | --------------------------------------------------------------------------- |
| `cellar_claim_entry`   | `open → doing`, atomic, returns the brief                                    |
| `cellar_append_line`   | One line of findings, `source = agent`                                       |
| `cellar_ask`           | Question + `→ blocked`. **An outcome, not a failure**                        |
| `cellar_finish_entry`  | `→ done \| dropped` with a note                                              |
| `cellar_unclaim_entry` | `→ open`, unchanged                                                          |
| `cellar_create_entry`  | Drop a follow-up thought found while working                                 |
| `cellar_archive_entry` | Put a thought away, reason required                                          |
| `cellar_link_repo`     | Point a project at a checkout, so this never has to be worked out again      |

There is **no delete tool**, on purpose. Nothing in Cellar is destroyed to get it out of the
way; archive is the strongest thing an agent can do and it comes back in one tap.

## Design notes

**`cellar_orient` is the whole ergonomic argument.** Without it a session costs four round
trips and a question to the user: list the projects, guess which one this repo is, confirm,
list its entries. With a repo path on the project it is one call and no question. Everything
else here is a follow-up.

**Claiming is atomic.** The update is conditional on the entry still being `open`, so
PostgREST executes the check and the write as one statement. Two sessions racing for the
same thought cannot both win it; the loser is told who holds it.

**Ids are printed short.** Eight characters, resolved back by prefix. Thirty-six characters
of hex on forty rows is most of a page spent on punctuation, and the ids only ever travel
from one tool result into the next argument.

**Results are text in the app's own gutter shape**, not JSON — `id / kind / state / age /
project / thought`, with the same four-character kind codes the app puts in its list gutter.
It scans the way the app scans, and it does not repeat every key on every row.

**Lines are held to the app's capture rule.** `agentLine()` runs the same `oneLine()` the
dump field runs and caps the length. An entry stays one line forever and grows by appended
lines; an agent that writes a paragraph would break the one property that makes a wall of
one-liners readable.

**The voice rules travel with the brief.** Every claim returns them, because the failure
mode is real: "I've successfully implemented the requested changes" sitting directly under
"nav island jumps on keyboard open" makes the list unreadable.

## Shared with the app

The server imports from `../src/lib` rather than keeping its own copy:

- `lib/rows.ts` — row shapes, column lists, normalizers. One definition of what a row means.
- `lib/agentWork.ts` — the loop, the kind briefs, the ask rules, the line voice, `splitThread`.
- `lib/repoLink.ts` — cwd → project matching. The app and the agent must agree on this or
  work gets filed under the wrong project.
- `lib/kinds.ts`, `lib/entryState.ts`, `lib/relTime.ts`, `lib/dump.ts`.

That is why those files are free of React and of the Supabase client: `lib/` is importable
from a node script, and this is the node script it was kept importable for.

What is **not** shared is `features/cellar/cellarApi.ts` — it holds the app's client, which
is built on AsyncStorage and react-native's AppState. The queries are written twice; what a
row means is not.
