# The keys — pc and phone

Three keys, and colours that paint themselves. The same on the pc and the phone: one search
behind both. The pc shows results above the composer and takes the keyboard; the phone shows
them above the keyboard. On Run, type `@`, `$` or `/` inside the message: the reviewed composer
has no separate symbol-button strip (RUN-R1a/R1b in `canvas/updates.md`). Other canvas pages
retain their existing arrangements until their own review.

A task always names its project first, so search stays exact.

## `@` files

- **finds** — files changed in this run first, then the rest of the worktree, folders too.
  `:42` after a name points at a line.
- **a new name** — nothing; agents make files, you point at them.
- **preview** — hover on the pc, long-press on the phone, to see those lines.

## `$` cellar — its commands, entries and projects

- **finds**
  - prepared commands — `$rebuild`, `$preview`, `$deploy`, `$apk`, `$try-on-phone`, `$logcat`.
    Bare, they run in the current project; `$web-shop/deploy` runs another's.
  - projects first, entries inside one: `$` lists projects, pick one and type `/`, then search
    its entries by their words — `$cellar/sticky` finds "inbox swipe feels sticky".
- **a command** — first in the message it runs straight away as a job; inside a sentence the
  agent runs it when it gets there. Every command is also a button on the desk tab and on home.
  In an active Run chat, sending always queues the message, including command references.
  Queue popout **Send now** explicitly interrupts the active tool, then delivers that message.
  The leading command runs when the host dispatches the message; typing it bypasses no queue.
- **an entry** — the agent claims it, moves it to doing and writes its lines back to it.
- **a new name** — `$project/new words` makes an entry in that project; a new project comes
  from "new project" at the bottom of the list.

## `/` agent skills — claude code, codex and the rest

- **finds** — the picked agent's built-in skills (`/review`, `/init`, `/compact`) and your own
  skills for that agent (`/frontend-design`, `/release-notes`). The list follows the agent
  picker beside the composer.
- **what it does** — the agent loads the skill and works the way it says. It is *how to work*,
  where `$` is *what to run*.
- **a new name** — offers to write a new skill for that agent.

## `#` hex codes paint themselves

`#` is no longer a key — it is a colour.

- Type `#` and 3, 6 or 8 hex digits — `#fff`, `#64748B`, `#64748BCC`.
- The moment it is a valid code, the text becomes a chip filled with that colour.
- The chip's text turns dark or light, whichever reads on it.
- Click or tap a chip: copy it, nudge it lighter or darker, or swap in a colour the project
  already uses.
- Agents get the plain code, and colours in their replies come back as chips too.
- Anything else after a `#` stays plain text — `#later`, `#12`, `#ggg` — no popup, nothing to
  dismiss.

## One line, many things

Before you send, the composer spells out what each token will do. Which agent runs it is the
picker beside the composer — or the project's default — not a key.

> fix `$cellar/streak-pill-clips` — make the pill `#F59E0B` in `@StreakPill.tsx` with
> `/frontend-design`, then `$apk` and `$try-on-phone`

- `$` claims the entry and moves it to doing
- `#` passes the colour as plain `#F59E0B`
- `/` the agent loads its frontend-design skill
- `$` when the fix is in, builds the apk
- `$` installs it on the phone, screenshot back to the chat

Save the line and it becomes a command of its own, with a button: `$fix-and-try`.

Search UI: `↑↓` move · `tab` puts it in · `esc` closes. By voice: "at nav islands", "dollar
deploy", "slash review".

## Your own keys

Pick a free character and where it searches: a folder, a list, or a url that answers with json.
`@ $ /` are fixed and `#` belongs to colours. Ideas to start from:

| key | searches | example | default |
| --- | -------- | ------- | ------- |
| `!` | snippets — saved prompts from a notes folder | `!review-tone` `!no-new-deps` | on |
| `~` | past runs — pull another run's plan and diff in as context | `~desk-tab` | on |
| `^` | git — branches, worktrees, commits | `^main` `^wt/desk-tab` | off |
| `%` | links — consoles, docs, dashboards | `%firebase` `%supabase` | off |

## ctrl+k — jump anywhere

No key: search everything at once (entries, runs, commands). On the phone it is a pull-down on
the desk tab. `enter` opens, `ctrl+enter` opens it on the phone, `tab` narrows to `@ $ /`.
