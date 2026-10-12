# Structure — sections, architecture, features

Cellar on the desktop is all of cellar, plus the desk.

Current implementation shares one renderer across three roles. At the desk it is the
**control center**: chat, projects, commands, the phone on the side. Away from it, the
**phone is the remote**. The part that actually runs agents is a small **daemon** inside
the desktop app; it keeps running in the tray when the window is closed.

The 2026-10-12 direction separates the controller app (mobile and web) from the desktop
host app, with an independent desktop renderer and the same Cellar appearance. This is
scheduled as W10 before keys search (now W11), not a completed migration; see
[desktop-rebuild.md](desktop-rebuild.md) for ownership, technology, controller cleanup
and staged builds. The host daemon remains part of the desktop app.

| Role | Is | Does |
| ---- | -- | ---- |
| desktop app | the control center | cellar's four tabs, the desk sections, full chat with the keys, the phone attached on the side over adb |
| desk daemon | the part that works | runs agents and command jobs as hidden processes, keeps the event log, serves previews, talks adb. No window needed |
| phone app | the remote | the same cellar app with the desk tab where profile was: speak a task, answer approvals, look at previews and the pc screen |

## Sections of the desktop app

### cellar

- **dump** (phone + desktop) — one capture bar: enter files a thought, shift+enter hands it to
  an agent. Raw dump: one thought per line. The keys work here too.
- **projects** (phone + desktop) — by kind · one stream · board. Tick entries, hand them off
  together. Worktrees, previews, shipped, commands on the side.
- **inbox** (phone + desktop) — to file, plus "waiting on you". Agent questions and approvals
  in one list.
- **stats** (phone + desktop) — what you dump, where it stands. New: runs per project,
  answered from the phone.

### desk

- **home** (desktop; the phone's desk tab is its small version) — waiting on you, running,
  lately. Devices, quick commands, today. Stop all agents.
- **chat** (phone + desktop) — runs grouped by project. Plan, diffs, checkpoints, approvals
  inline. Composer with `@ $ /` and voice; hex codes become colour chips. Attached phone in the
  right rail.
- **commands** (desktop to edit · both to run) — each project's prepared `$` commands, from
  `package.json` and gradle. Each one is also a button on home and the desk tab. Chains saved
  from a chat.
- **previews** (phone + desktop) — one dev server per worktree, on the tailnet. Open on any
  device, then deploy.

### devices

- **this pc** (desktop) — agent slots, load, daemon status. Screen sharing to the phone —
  always asks first.
- **phones over adb** (desktop) — mirror and control, or let an agent drive. Install, deep
  links, logcat, capture. Dev toggles: theme, taps, network, font size. USB or wifi.
- **other hosts** (desktop · settings › hosts) — any machine over an ssh link: a home server, a
  laptop, a build box. Runs pick a free host; night shift picks its own.

### settings

- **agents** — claude code, codex; slots; default per project. Each agent's skills, built in
  and yours, feed the `/` list. Default mode: ask first · edits ok · full access.
- **keys** — add your own: `!` snippets, `~` past runs, `^` git.
- **devices and pairing** — qr pairing, token scopes per phone. Revoke, rename, wireless adb.
- **notifications** — what pings the phone; quiet hours.
- **account** — the profile page's leftovers: one ping account, theme, sign out.

## How the pieces talk

```
                 supabase (the shared ping database)
              ▲ entries, lines        ▲ mailbox, when the pc is off
              │                       ┊
your phone ───┼── tasks and answers ──▶ cellar desktop ── spawns over pipes ──▶ agents and
(desk tab)  ◀─┼── runs, pings, screen ─ (ui + daemon,                           command jobs
              │                         event log in sqlite)
              │                          │ install, mirror, logs     │ $deploy, $apk
              │                          ▼                           ▼
              │                       pixel over adb              where you ship
              │                       (usb, or wifi on tailnet)   (hosting, stores, releases)
```

Phone ↔ desktop is a websocket over tailscale, the way t3code does it: commands up, numbered
events down. The fallback: when the pc is asleep, the phone writes the task into supabase and
the daemon picks it up when it wakes.

Today (PR #60, `desktop/README.md`) the wires are: the in-window **bridge** (IPC), the **lan**
(signed HTTP on :47821) and the **cellar** (`cellar_desks` heartbeat + starts in supabase).
The websocket event stream replaces the lan's polling; the cellar wire stays the mailbox.

## What it can do — the roadmap

`now` = first version · `next` = right after · `later` = once it has been lived in.

### capture and hand off

| | |
| - | - |
| one bar for thoughts and tasks — shift+enter turns a thought into a run | now |
| the same keys on pc and phone: `@` files, `$` cellar and commands, `/` agent skills | now |
| hex codes paint themselves as colour chips, both ways | now |
| speak a task from the phone | now |
| tick entries on a board, hand them off together or one run each | now |
| agents suggest which old open entries they could take | later |

### agents

| | |
| - | - |
| 4 slots; default agent and mode per project | now |
| steer it now, or queue after this turn | now |
| checkpoints with one-click roll back | now |
| recipes saved as commands: fix → `$apk` → `$try-on-phone` → screenshot back | next |
| usage meter: this chat's context, plus each agent's 5-hour and weekly use | now |
| accounts per agent; when a plan runs out: ask, next account, api key, other agent or wait | now |
| race mode and night shift | next |
| recipes per entry kind; rule entries synced into AGENTS.md / CLAUDE.md | now |
| group runs across a shelf of projects | next |
| time per run and answers per day in stats | later |

### devices

| | |
| - | - |
| pc screen on the phone, phone screen on the pc | now |
| "file this screen" from either device | now |
| agents test on the phone, their taps drawn as rings | next |
| adb over wifi on the tailnet, so the phone stays attached anywhere | next |

### ship

| | |
| - | - |
| a preview per worktree, opened on any device | now |
| deploy asks "you haven't opened the preview" first | next |
| builds straight to a release page your app's update check reads | next |
| release notes drafted from runs merged since the last tag | later |

### safety

| | |
| - | - |
| approvals: the first answer wins, phone or pc | now |
| stop all agents from the tray, the phone or the desktop | now |
| phone tokens scoped: runs, commands, previews, screen | now |
| screen sharing always asks on the pc | now |
| quiet hours — only blockers ping you | next |
