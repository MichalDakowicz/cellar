# Cellar on the pc

The desktop app. Its window is Cellar itself — the same web build the site serves, loaded from
inside the app — and its main process is the half a phone talks to:

- **start agents** — claude, codex or antigravity, in a project's folder, from a thought, a
  project or a typed prompt
- **follow runs** — what is running, what it said, stop it
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
npm --prefix .. run build:web   # the window loads ../dist
npm start                       # builds build/main.js + preload.js, opens the app
```

`npm run dev` loads `http://localhost:8081` (an `expo start --web` in the repo root) instead of
the exported build. `npm run dist` builds a Windows installer into `release/`.

Closing the window hides it to the tray; the phone can still reach the pc. Quit from the tray.

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

Windows sandbox agents receive exact managed-folder Git trust in their process
environment; global Git configuration and sandbox permissions stay unchanged.
Verified phone flows and the machine's standalone Codex CLI limitation are recorded
in [`how-it-works.md`](../docs/desk/how-it-works.md#w5--git-confirmed-worktrees).
