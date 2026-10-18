# Cellar on the pc

The desktop app. Its window is Cellar itself — the same web build the site serves, loaded from
inside the app — and its main process is the half a phone talks to:

- **start agents** — claude, codex or antigravity, in a project's folder, from a thought, a
  project or a typed prompt
- **follow runs** — what is running, what it said, stop it
- **restore checkpoints** — review file diff, restore files and agent context; retain recovery evidence
- **configure recipes and rules** — per-kind task defaults and reviewed scoped instruction blocks
- **read usage** — provider limits, context, explicit compact and encrypted named API accounts
- **manage worktrees** — start in a separate branch from local main, read Git workspaces
  per project, and review Keep/Merge/Remove after every source run finishes
- **open the pc's pages** — anything listening on localhost (a dev server, `expo start --web`),
  served to the phone through a per-port proxy and shown in the app's preview screen
  (`desk/preview/<port>`), sized as a phone, tablet or desktop
- **watch the screen** — a few frames a second of the main display, view only, shown sideways
  in the app's `desk/screen`
- **drop builds** — the newest release APK of every app in the workspace, downloaded and
  installed on the phone without a cable

## Run it

```sh
cd cellar/desktop
npm install
npm start                       # builds host/preload and renderer-dist, opens the app
```

Run `npm run renderer:dev` in one terminal and `npm run dev` in another for Vite on
`http://127.0.0.1:5173`. `npm run build:host` bundles main/preload;
`npm run renderer:build` produces `renderer-dist/`; `npm run build` runs both.
`npm run dist` packages that output as `resources/renderer` and builds a Windows
installer into `release/`. No root Expo export is consumed.

Keep only the latest verified desktop package in `release/` and launch
`release/win-unpacked/Cellar.exe` from there. Build output must stay inside this
repository in Git-ignored folders; QA evidence and logs belong in `../artifacts/qa/`.
Do not create sibling `cellar-desktop-wN*` or `cellar-wN*` output folders.

Checks: `npm test`, `npm run lint`, `npm run check`, `npm run renderer:check`.
Vite validates every transitive renderer module and emits `module-graph.json`.
Controller source maps are checked with `node scripts/controllerBoundary.mjs <output>`
from the repository root. Keep the graphs separate: only pure contracts, domain helpers,
tokens and assets cross their boundary.

The packaged renderer retains `cellar-desk://app`, existing profile/auth storage and MMKV
web preference namespaces. Renderers share the normal Supabase browser session; main receives only
an access token and user ID. IPC accepts only Cellar-created windows' top-level renderers.
Middle-click or Ctrl/Cmd-click navigation to open another Cellar window. External links
open in the system browser; embedded preview frames never receive the host bridge.
Development `?sample=1` fixtures are isolated from account operations; production sample
presenters remain labelled and never execute later unwired features.

Closing the window hides it to the tray; the phone can still reach the pc. Quit from the tray.

Launch `Cellar.exe --tray` to keep the window hidden from startup. Its renderer still
loads the existing profile and remains the only account refresh-token owner. The
tray opens the normal desktop UI when needed. A second `--tray` launch hides an
already-running window without creating another host.

## Keys search (W11)

Run and new-task composers share pure token/search contracts with the controllers.
Signed LAN and local IPC call read-only `/keys-search` and `/keys-preview` endpoints.
Files require an owned run and validated project checkout/worktree; changed files
include untracked/working changes and commits since the merge base with local main.
Ignored files and symlinks/junctions are excluded; previews are bounded text only.
Skills read configured agent homes and project skill folders, without executing
skills or returning their bodies. `$` uses the existing W2 command catalogue.

Browser UI retains mailbox limitations and receives no local filesystem, process,
IPC bridge or phone credentials. Background browser visual checks use the same DOM
components with labelled fixtures; they do not authorize live local-host actions.
Exact verification and limitations: [w11-keys.md](../docs/desk/w11-keys.md).

## Pairing

On the pc: tray → **pair a phone**, or settings → this pc. The window shows a QR code.

On the phone: settings → your pc → **scan the pc's code**, or point the phone's own camera at
it. The code is `http://<lan ip>:47821/pair#d=…&k=…` — a link to the pc with its secret in the
fragment, which the browser never sends. The page it opens hands the pairing to Cellar through
`cellar://desk-pair?…`. **Forget every paired phone** rotates the secret.

## How the phone reaches it

Lan first, the cellar second — the decision on the cellar entry that asked for this.

| wire | when | carries |
| ---- | ---- | ------- |
| bridge | Cellar's own window on the pc (`window.cellarDesk`, IPC) | everything but pairing a phone |
| lan | the paired phone's signed `GET /desk` was answered on this network | everything |
| cellar | the pc beat into `cellar_desks` in the last 90 s | start, stop, the run list |

The cellar wire needs `supabase/schema.sql` §12 run once in the dashboard. Until then the pc
says so in `/desk` and the phone only uses the LAN.

Desk totals share `src/lib/deskCounts.ts`: blocked entries plus host waiting runs, with
only running runs counted as working. A waiting run means it needs attention at the PC;
it is not a verified runtime approval until W8. A failed run poll returns an error rather
than cached success. Heartbeats include the full run list; a failed poll leaves the last
heartbeat's age unchanged while mailbox requests can still be handled. The phone labels
remote counts as snapshots and hides unavailable totals. Flow map and verification:
[`docs/desk/how-it-works.md`](../docs/desk/how-it-works.md).

## What it will not do

- **Run anywhere.** A start's selected folder must be a project's `repo_path`, checked
  against the signed-in account. Worktree tasks launch only in a host-created, validated
  folder bound to that project and account. Signed out on the pc, nothing starts.
- **Use a shell.** Every agent is spawned with an argument list; the prompt is one argv entry.
- **Invent permission choices.** W4 maps Ask first / Edits ok / explicit Full access to
  each agent's supported modes. Antigravity supports Edits ok only. Phone approvals remain W8.
- **Send the key.** The pairing secret leaves the main process only through IPC to its own
  window. A phone proves it holds it by signing every request (HMAC over method, path, body,
  time and a one-use nonce — `src/lib/deskSign.ts`), so the key never crosses the Wi-Fi. Pages,
  the screen and builds open with one-minute, one-use tickets, and the session a ticket opens
  only works from the address that redeemed it.

## First-run things only you can do

- **Windows Firewall** asks, the first time it listens, whether Cellar may accept connections on
  private networks. Say yes, or the phone never reaches it.
- **Trust each repo for claude once.** `claude --bg` refuses a folder whose trust prompt was
  never accepted — run `claude` in that folder once.
- **Google sign-in** comes back to `http://127.0.0.1:54545/callback`, the same address the MCP
  login uses. It must be on Supabase → Authentication → URL Configuration → Redirect URLs. Sign
  in with your phone works without it.

## Worktrees

W5 requires Git and a local `main` branch. New task defaults to a worktree under
`<host workspace>/.cellar-worktrees`; the original checkout stays as it is. The
project panel reads actual Git branches, paths, local changes, locks and kept state.
Lifecycle review/actions require a direct LAN or IPC connection. Starts use W4's
same durable protocol, including mailbox handling and explicit trust retry.

Keep retains local work. Merge only fast-forwards a clean, checked-out main after
all relevant runs finish. Remove refuses dirty, locked, active/unknown or unmerged
work; it keeps the Git branch and commits. A changed review requires another review.
Lost replies recover one persisted command receipt, never optimistic success.

Finished task worktrees are cleaned up automatically once their provider session
closes (idle sessions close after 30 minutes), with no active/unknown runs or queued
messages. The host also checks existing finished tasks on startup and every 30
seconds. Explicit Keep opts out. Branches and commits remain; staged, unstaged and
nonignored untracked edits are saved in a labelled Git stash pinned at
`refs/cellar/archives/<worktree-id>` before removal. Generated dependencies/builds
can be removed; other ignored files such as `.env` retain the folder for PC review.
Only Cellar-owned, unlocked worktrees with confirmed completion are eligible.

To recover a removed task, run `git worktree add <folder> <task-branch>` from the
project, then `git -C <folder> stash apply --index refs/cellar/archives/<worktree-id>`
if a snapshot exists. Snapshots also appear in `git stash list` as “Cellar finished
task”. Recovery never changes the project's main checkout.

Windows sandbox agents receive exact managed-folder Git trust in their process
environment; global Git configuration and sandbox permissions stay unchanged.
Verified phone flows and the machine's standalone Codex CLI limitation are recorded
in [`how-it-works.md`](../docs/desk/how-it-works.md#w5--git-confirmed-worktrees).

## Run events and live history

W6/W7 stores owner-scoped numbered events and stable turn items in
`<app data>/events.sqlite` using `node:sqlite`. Provider source cursors and Claude
partial state commit with their item updates. New Claude tasks produce stream-json
partial events; Codex produces JSON items. Existing transcripts and legacy plain
logs remain readable, with unconfirmed/legacy output labelled. Full tool results and
Markdown are rendered by the shared app; job reports retain exact raw text.

A signed `POST /event-ticket` (or the same IPC API) opens one shared websocket
per client/account/PC. Tickets expire at 60 seconds and redeem once. The socket
rechecks account and pairing key, sends snapshot -> replay -> synchronized and
resumes from a persisted sequence. Gaps, failed reads and lost connections never
produce live status. Desktop connects over loopback; phone uses the LAN. New hosts
replace run/transcript polling with this feed; discovery, commands and mailbox
behavior stay as before. Explicit View history reads labelled MMKV snapshots while
disconnected, including after a phone restart; current run state remains unknown.

Verification and the user-requested live Claude test exclusion are recorded in
[`how-it-works.md`](../docs/desk/how-it-works.md#w6w7--durable-turns-and-synchronized-streams).

## W9 dispatch and stop controls

Managed chats retain their provider conversation between turns. Durable controls save
requests before effects; busy Send queues, edit/cancel use revisions, and Send now confirms
interruption before delivery. Codex's fallback terminates only its private owned process
tree before resuming the persisted conversation. Restarted chats and uncertain delivery
remain unavailable/unknown instead of silently replaying work.

Phone, desktop and tray Stop all coordinate account hosts through the existing mailbox.
Each host/run reports its own result; offline hosts stay pending, unsupported historical
sessions fail explicitly. Known local results allow a distinct new Stop all even if an
earlier remote stop remains pending. Live checks, exact process exits, rebuilt artifacts
and fixture boundaries are recorded in [`how-it-works.md` W9](../docs/desk/how-it-works.md#w9--retained-chat-dispatch-and-stop-all).
Claude remains fixture-only.

## Screens and attached phones

Phone PC-screen access asks on the desktop: Allow once, Trust this phone or Deny.
Trust binds to the current account and pairing key. Sessions expire after ten
minutes; release, lock, logout and forgetting phones revoke control. Screen
video uses a dedicated WebRTC capture renderer. The phone can switch connected
displays; video and input stay bound to its selection. Its preload exposes only the
capture source, with no host API or account session. Input uses one persistent
Windows worker per session; touch, trackpad, keys and dictated drafts share the
same validated, sequenced input API.
Two-finger scroll follows content. The existing screen-island monitor button
switches displays.

Desktop Phone embeds a pinned, integrity-checked scrcpy 4.0 server and decodes
H.264 in Cellar. No separate scrcpy window or installation is needed. ADB and
Android USB debugging authorization are required. Choose viewer, user or agent
driver. Agent actions additionally require the existing account device-testing
setting and a live owned run's private loopback token; taps appear as rings.
APK installation, deep links, bounded package logcat and development toggles use
the same selected authorized device. Video queues are bounded so stale frames
cannot grow without limit. See [verification](../docs/desk/w19-w21-testing.md).
Mirror input carries its encoded frame dimensions; the host scales tap/swipe
coordinates to Android's full display size, respecting rotation and display-size
overrides. Agent screenshot coordinates stay in their original full pixel space;
tap rings are normalized to the mirrored canvas.

## Race, night and group plans

Later desk creates plans from owned project checkouts. Race starts two independent
worktrees from one pinned main commit. Compare summaries, diff statistics, checks,
usage and previews; pick keeps the winner and archives eligible loser worktrees
with Git recovery. Chats remain available for at least seven days.

Night uses an explicit local start/end window, one run at a time, a run cap and a
usage reserve when providers expose limits. It uses ask-first access, skips recipe
after-commands and instructs agents not to ship. Pending approvals wait for you;
the host must stay awake and signed in. Group applies one prompt plus scoped
rules across selected projects or a shelf, with keep/toss and follow-up actions.
Stop all also stops undispatched plan members. Unknown effects recover the original
receipt instead of replaying. [Verification](../docs/desk/w19-w21-testing.md).

## Documents and media

Local file references in chat, tool details, keys results and attached entry docs
open a shared named viewer. Markdown and a portable AsciiDoc prose subset render
first; Source shows exact UTF-8 content, including original line endings. JSON can
be pretty-printed or viewed exactly. Code/plain text remain literal. Raster images
fit within the viewer; supported audio/video have explicit playback controls.

Files must belong to the selected owned project/run checkout and be Git-visible.
Ignored files, traversal and linked files are refused. Text is limited to 256 KiB;
media to 8 MiB. HTML/SVG remain source text; PDF/office formats have no built-in
viewer. AsciiDoc includes/macros and remote media never execute or fetch. See
[format and verification details](../docs/desk/w19-w21-testing.md).

W10 implements the independent renderer and controller extraction described in
[`desktop-rebuild.md`](../docs/desk/desktop-rebuild.md). Acceptance evidence is recorded
in [`w10-rebuild.md`](../docs/desk/w10-rebuild.md). Keys search is
W11 and remains outside this migration. Windows packaging is exercised here; existing
host platform interfaces remain available for future macOS/Linux adapters.
