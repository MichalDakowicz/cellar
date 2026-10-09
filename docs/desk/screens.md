# Screens — what each artboard does

One section per artboard on the canvas, in canvas order. The artboard is how it looks; this is
the logic under it. Artboard file names are given so the canvas can be opened at the right one.

## Phone — the sender

### desk tab · `Main.dc.html`

- Replaces profile: the right nav island becomes the host, its badge counts what is waiting on
  you.
- Header: "your desk" and one status line (host awake · agents at work · waiting on you).
  Settings sits top right.
- Host card: name, awake/over what/latency, a button to see its screen; cpu, memory, agent
  slots.
- Project chips pick which set of `$` command tiles shows; the tiles are that project's
  commands (rebuild, preview, deploy, apk…). Under them, one mono line: project · folder · last
  build.
- Runs sort: **waiting → running → lately**. Tap a run to open its chat.

### new task — speak it · `NewTask.dc.html`

- A sheet over the desk tab. The mic starts listening on open; the transcript stays editable.
- **project** chips · **where it works**: main checkout or a new worktree off main.
- **agent · how much it may do**: agent chips, then ask first · edits ok · full access, with a
  one-line hint for the picked mode.
- Agent and mode default from the project, then from the entry kind's recipe.
- **from your cellar**: attached entries get claimed by the run.
- Send carries its own id, so a retry on bad signal never runs twice.

### run chat + approval · `Run.dc.html`

- Header: branch · project · agent, title, state chip, age, diff pill (+/− · files), stop.
- An approval pins above the nav, in thumb reach, and replaces the composer until answered:
  deny · allow · "allow installs for the rest of this run".
- First answer wins: phone, desktop or the notification.
- Then the composer returns with **steer it now / queue after this turn**.
- Tool steps fold into one tile; the diff pill opens changed files.
- Key strip `@ $ /` sits above the keyboard.

### preview before deploy · `Preview.dc.html`

- The dev server runs on the host; the phone opens it over the tailnet in a webview.
- Size chips resize it to phone / tablet / desktop.
- Checks = the project's own check commands (export, tsc, bundle size vs live).
- Deploy = the project's `$deploy`; "tell the agent" adds a follow-up to the same run.

### live pc screen (landscape) · `Screen.dc.html`

- Its own video channel, never mixed into run events.
- The host asks first, unless this phone is trusted.
- Modes: touch (tap = click), trackpad, keyboard, dictate into the focused field.
- Leaving the screen ends the stream.

## Phone — notifications, questions, share, race, night shift

### notifications — answer without opening · `PhoneNotify.dc.html`

- One per run, updated in place ("plan 3 of 5").
- Approvals: up to 3 buttons (android's limit).
- Questions: first 2 options + "more"; inline reply = "other".
- They follow you: desktop in use → desk only; idle 5 min or locked → phone; unanswered on the
  desk 2 min → phone.
- Never on two devices at once; the other just updates its badge.

### agent question — pickable options · `PhoneQuestion.dc.html`

- Structured questions (claude's AskUserQuestion, codex's input requests) arrive as question +
  options + single/multi.
- Rendered as lettered cards, never a text blob. A plain-text "A) … B) …" list is parsed into
  cards too.
- "other" is always there — type or say it.
- Answer by tap, voice ("B", "the second one") or notification.

### share anything into cellar · `PhoneShare.dc.html`

- Cellar is a share target for images, text and links.
- Kind guessed: screenshot → glitch, link → research, text → idea.
- "hand it off" runs that kind's recipe.
- Crashes of your debug builds (adb logcat or your own reporter) file a glitch with stack,
  screenshot and 200 log lines. The same stack again bumps a counter instead of a new entry.

### race mode — pick a winner · `PhoneRace.dc.html`

- One prompt, two runs: two agents, or one agent on two models.
- Each in its own worktree off the same commit.
- Compare: checks, diff size, time, usage, previews.
- Pick → the winner's branch stays; the loser's worktree is deleted, its chat kept 7 days.

### night shift — morning digest · `PhoneNight.dc.html`

- Tasks marked "tonight" queue up during the day.
- They run in a set window on a chosen host.
- Full access only inside their own worktree; nothing that ships runs at night.
- Stops early to leave usage for the morning.
- Digest at a set time: keep, toss or follow up per run.

## Desktop — cellar, plus the control center

### home (control center) · `DeskHome.dc.html`

- One capture bar: enter files a thought, shift+enter hands it to an agent.
- Waiting on you answers inline.
- Devices: every host and phone, live.
- Tiles: the selected project's `$` commands.
- Stop all agents = interrupt every run on every host.

### chat with `@ $ /` keys · `DeskChat.dc.html`

- Runs grouped by project, what needs you first.
- Keys: `@` files; `$` commands, or `$project/` then its entries; `/` the picked agent's
  skills; hex → colour chip. The agent picker decides which `/` skills are listed.
- Right rail: attached phone + this run's files, checkpoints, preview.
- Header meter: context + 5h/week use (see usage).

### project board · `DeskProjects.dc.html`

- Cellar's three views: by kind, one stream, board.
- Columns = entry states; badges show which agent claimed what.
- Tick entries → one run, or one run each.
- Side panel: worktrees, previews, shipped, last command runs.
- A shelf of projects can run a group run.

### phone attached over adb · `DeskPhone.dc.html`

- Mirror + control over usb, or adb over wifi on the tailnet.
- Who drives: watch / you / the agent; agent taps drawn as rings.
- Install newest build, deep links, logcat, captures.
- Dev toggles via `adb shell settings`.
- Agent access = one switch, same as the phone app's setting.

## Desktop — questions, usage, recipes, hosts, group runs

### question card — every state · `QuestionCard.dc.html`

- States: single, multi, with previews, answered (collapses to the pick), expired (run moved
  on).
- One component on phone, desktop and notifications.
- Keyboard: 1–4 or a–d picks, enter sends.
- "recommended" only when the agent marks it.
- **Change to make:** "pick one" can always become "pick several" — a small "pick more than
  one" toggle under the options, even when the agent asked for one; the answer then goes back
  as a list, with a line telling the agent you chose several. Any question takes a note: "add a
  note" under the options (type or say it), sent along with the pick — e.g. "B, but keep the
  total visible". Both work the same on phone, desktop and in notifications (there, the inline
  reply is the note). This applies to cellar's existing entry questions (`cellar_ask`) too; the
  note travels back to the agent through the MCP tools.

### settings — usage + account switching · `DeskUsage.dc.html`

- Context: tokens in this chat vs the model's window; at 80% offers `/compact`.
- Plan limits: 5-hour and weekly windows per agent, with resets.
- Read from what each agent reports, else estimated from counted tokens.
- Limits can pause new runs and keep a reserve for daytime.
- Accounts: each agent has a list — subscriptions, team seats, api keys. A run uses one
  account; its sign-in lives in the run's own folder (`CODEX_HOME`, `CLAUDE_CONFIG_DIR`),
  secrets in the os keychain — like codex-switcher, but per run, not global.
- Plan runs out: ask me (default) · next account · api key · the other agent · wait for reset.
  The switch happens between turns: a fresh session on the new account, primed with the run's
  plan, diff and last messages.
- **To check before building:** which usage numbers each agent actually exposes to another app
  (5h / weekly windows, reset times); if one does not, show cellar's own count and say it is an
  estimate. Providers' terms: openai's terms say not to circumvent rate limits, and anthropic
  added weekly limits citing account sharing — so switching is for accounts you own (personal,
  work seat, api key), and "ask me" is the default. Antigravity is an ide; it needs a headless
  way to run before cellar can drive it.

### settings — recipes by kind + rules · `DeskRecipes.dc.html`

- Every entry kind has a recipe: agent, mode, `/` skills, prompt template, `$` commands after.
- All user-editable; new kinds start empty.
- Rule entries sync into AGENTS.md / CLAUDE.md in a managed block, scoped everywhere → shelf →
  project.
- Each write shows a diff first; nothing outside the block changes.

### settings — hosts over ssh, routing, night shift · `DeskHosts.dc.html`

- A host = anywhere the daemon runs: this pc, or any machine by an ssh link
  (user@host:port + key).
- Cellar installs and updates the daemon over ssh.
- Per host: slots, night shift yes/no, which projects.
- Notification routing and quiet hours live here too.
- **Deferred:** remote hosts over ssh wait until the server exists (cellar entry on the cellar
  project). Until then the screen lists this pc only.

### group run across projects · `DeskGroupRun.dc.html`

- A group = any shelf or a hand-picked set of projects.
- One task → one run per project: same prompt + each project's rules.
- Progress per project; review the same change side by side.
- Each project ships with its own `$` commands.
