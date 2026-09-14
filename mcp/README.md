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

## Configuration

| Variable                    | Default                          | For                                               |
| --------------------------- | -------------------------------- | ------------------------------------------------- |
| `CELLAR_SUPABASE_URL`       | `EXPO_PUBLIC_SUPABASE_URL` in `../.env` | Overriding the project                     |
| `CELLAR_SUPABASE_ANON_KEY`  | `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `../.env` | ditto                                 |
| `CELLAR_AGENT`              | `claude`                         | What the agent is called on the entries it touches |
| `CELLAR_EMAIL` / `CELLAR_PASSWORD` | —                         | Non-interactive `npm run login`                    |

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
