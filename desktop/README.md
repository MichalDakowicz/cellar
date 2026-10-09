# Cellar on the pc

The desktop app. Its window is Cellar itself — the same web build the site serves, loaded from
inside the app — and its main process is the half a phone talks to:

- **start agents** — claude, codex or antigravity, in a project's folder, from a thought, a
  project or a typed prompt
- **follow runs** — what is running, what it said, stop it
- **open the pc's pages** — anything listening on localhost (a dev server, `expo start --web`),
  served to the phone through a per-port proxy
- **watch the screen** — a few frames a second of the main display, view only
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
| lan | the phone answered `GET /desk` with its key on this network | everything |
| cellar | the pc beat into `cellar_desks` in the last 90 s | start, stop, the run list |

The cellar wire needs `supabase/schema.sql` §12 run once in the dashboard. Until then the pc
says so in `/desk` and the phone only uses the LAN.

## What it will not do

- **Run anywhere.** A start's folder must be a project's `repo_path` in your cellar, checked
  against the signed-in account. Signed out on the pc, nothing starts.
- **Use a shell.** Every agent is spawned with an argument list; the prompt is one argv entry.
- **Bypass permissions.** claude runs in auto, codex with `--approve-for-me`, antigravity in
  accept-edits (it has no auto mode).
- **Serve the key.** The pairing secret leaves the main process only through IPC to its own
  window. Pages, the screen and builds are opened with one-minute, one-use tickets.

## First-run things only you can do

- **Windows Firewall** asks, the first time it listens, whether Cellar may accept connections on
  private networks. Say yes, or the phone never reaches it.
- **Trust each repo for claude once.** `claude --bg` refuses a folder whose trust prompt was
  never accepted — run `claude` in that folder once.
- **Google sign-in** comes back to `http://127.0.0.1:54545/callback`, the same address the MCP
  login uses. It must be on Supabase → Authentication → URL Configuration → Redirect URLs. Sign
  in with your phone works without it.
