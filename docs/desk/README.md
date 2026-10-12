# The desk — cellar runs agents

The spec for the desk: the phone's desk tab, the desktop control center, and the daemon that
runs agents on a host. It was drawn first as a Claude Design canvas, "cellar desk — remote
agents" (https://claude.ai/artifact/7H8zibRRmr64WYrXfkJ1ou); these files are that canvas's
written half, moved here so they version with the code.

| File | What it holds |
| ---- | ------------- |
| [structure.md](structure.md) | the three roles, the sections of the app, how the pieces talk, the roadmap |
| [screens.md](screens.md) | every artboard's logic — what each screen does and the rules behind it |
| [keys.md](keys.md) | `@` files, `$` commands and `$project/entry`, `/` agent skills, `#` colours |
| [t3code-notes.md](t3code-notes.md) | how t3code hands work to agents, and what cellar takes from it |
| [TASKS.md](TASKS.md) | the build order: every screen drawn first, then the wiring, easiest to hardest |
| [how-it-works.md](how-it-works.md) | current real/sample/missing flows, agreed wiring order and W1–W9 verification |
| [w9-resume.md](w9-resume.md) | completed W9 handoff, environment and next-task boundaries |
| [desktop-rebuild.md](desktop-rebuild.md) | W10 controller/desktop separation, technology choice, UI parity and migration/build steps |
| [w10-prompt.md](w10-prompt.md) | ready-to-paste W10 controller/desktop rebuild task |

The canvas stays the source for **how it looks** — open an artboard before building its
screen. A copy lives in [`canvas/`](canvas/): one `*.dc.html` per artboard (inline styles, and its
sample state in the `DCLogic` script at the bottom), `canvas.json` with every board's logic note,
`Map.dc.html` (the app's sections and how the pieces talk), `Notes.dc.html` (how t3code delegates)
and `ds/` (the Ping tokens the boards were drawn with). Re-copy it when the canvas changes. These files are the source for **what it does**. When the two disagree, fix the doc
and say so on the canvas.

Two rules from the canvas that hold for every task:

- **Built for anyone, used by me first.** Nothing is tied to one person's projects: projects,
  `$` commands, hosts, devices, agents, entry kinds, recipes and rules all come from settings.
  The names on the artboards (michu-pc, solar, radar) are sample data only.
- **Carry every decision back into the app.** A decision on the canvas changes what cellar
  already has, not only the new desk parts. Building something here means listing the
  existing screens and tools it touches and updating them in the same change — e.g. the
  question card's multi-pick and note apply to agent questions on entries too, through the MCP
  tools.

What is already built lives in [`desktop/README.md`](../../desktop/README.md) (the pc side:
pairing, signed requests, starting claude / codex / antigravity, pages, screen, builds).

W6/W7 carries durable turn items and synchronized streaming through phone Run,
Main totals/navigation, desktop DeskHome/DeskChat and command-job reports. Existing
layout remains the canvas baseline; added controls explain reconnect and explicit
saved history. Provider diagnostics and full tool details use the existing folded
rows. W8 runtime approvals and W9 dispatch/queues/Stop all are complete. Implementation behavior
and device verification live in `how-it-works.md`; preexisting canvas/spec edits are
preserved separately from this wiring. The future split uses independent controller and
desktop renderer builds while retaining the accepted appearance. It is now W10; keys
search follows as W11 and later tasks shift forward by one. Canvas/spec and old source
task references keep their original numbering; use the mapping in `TASKS.md`.
See `desktop-rebuild.md`.
