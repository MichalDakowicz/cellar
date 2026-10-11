# Screens — what each artboard does

One section per artboard on the canvas, in canvas order. The artboard is how it looks; this is
the logic under it. Artboard file names are given so the canvas can be opened at the right one.

## Phone — the sender

### desk tab · `Main.dc.html`

- Replaces profile: the right nav island becomes the host, its badge counts what is waiting on
  you.
- Header: the paired PC's name and monitor icon replace "your desk". Connection state sits
  directly below, beside the global working/waiting counts when those counts are available.
  Keep the paired name during reconnecting/disconnected states so the target stays clear;
  before pairing, the title is "your desk". Settings sits top right. Long names truncate without
  pushing settings outside the header; connection status may wrap when needed.
- Top content inset is 16px after the device safe area. The browser canvas has no system
  status bar, so its simulated top safe-area inset is zero; do not add an empty 40px band.
- Waiting on you comes immediately after the header: questions on entries and run approvals
  together, labelled by type, with a shared count. Open the run or entry to answer; no inline
  answering on phone home. This section always spans all projects.
- Compact host card: occupied agent slots beside the screen action, then connection route/
  latency and freshness. PC identity and connection state are not repeated here. CPU/memory
  expand on tap. Checking, connected, unreachable and not-paired states are explicit;
  an unavailable screen action stays visible with a reason. Show freshness only for the data
  actually available; a previous snapshot must not look like a live desk.
- Project chips pick which set of `$` command tiles shows; the tiles are that project's
  commands (rebuild, preview, deploy, apk…). Under them, one mono line: project · folder · last
  build.
- Label the project chips "commands for"; their selection changes commands. A separate run
  filter defaults to all projects and narrows working/history to the commands project when
  selected. It never filters waiting items. Show counts alongside the run-filter choices.
- Run headings and chips say **working** (the protocol's internal `running` state is unchanged).
  Waiting reasons have two lines; project/agent remain readable, branch/path are secondary.
  Project chips retain compact visual sizing with 44px hit areas.
- Runs sort: **waiting → working → lately**. Tap a run to open its chat.
- Canvas includes busy, connecting, run-load-error while connected, disconnected, unpaired,
  no-projects and no-runs states. On-page recovery actions are pair PC, link project and retry
  as appropriate; start a task through the chat-plus navigation action, without a duplicate
  empty-state button. While disconnected or connecting, hide PC runs, blockers/counts, metrics,
  project commands, paths and build history; retain host identity and connection recovery.
  Local Cellar navigation remains available. A run-loading error with a verified PC connection
  is a separate state: no invented run totals or slot figures, but independently available
  commands and screen remain usable. Retry only the failed run load; do not relabel the PC as
  disconnected. Reconnect moves the disconnected state to connecting without restoring data.
- Keep 16px side gutters in every state, consistent button/link geometry and 44px controls.
  On-page primary/recovery actions fill their container width, are at least 48px high and use
  the 8px control radius rather than pill corners. Project command tiles retain their grid.
  The scroll end must leave the final content above the floating navigation.

### new task — type or speak · `NewTask.dc.html`

- A tall sheet over the desk tab. Restore the original centered transcript and circular
  controls. The field remains editable, with inline colour chips. Typing starts first and
  focuses the field, opening the phone keyboard.
- The large 76px primary control shows the keyboard by default; 48px microphone sits beside it.
  Tapping voice swaps their icons/roles: voice/stop becomes primary, keyboard becomes secondary.
  Waveform appears above the input in voice mode and disappears when typing resumes.
  Transcribing, stopped, denied and unavailable states retain clear feedback and a typing path.
- Preserve mobile chat-plus and the always-tall opening. Keyboard appearance reduces the body;
  dismissal restores the same sheet top/height. Pin title/target/close and send around the scroll
  body. Use 16px gutters, at least 44px targets and a full-width 52px send with 8px corners.
  Send stays at the bottom of the sheet, above the keyboard when visible.
- This page always starts **one run**. Label the action **send to michu-pc**, with no run count,
  configuration summary strip, split-run controls or started-runs monitor. Any compatible
  attached thoughts become context for that one task. Open its Run chat only after confirmation.
  Batch flows in other pages require their own review.
- Initial project: attached thoughts' project → Main commands project → explicit selection.
  Main chat-plus passes the commands project; the run filter does not replace this context.
- Agent/permissions: project override → compatible kind recipe → global settings, per field.
  Preserve explicit overrides on project changes. Workspace starts as new worktree from the
  project's default branch; paths/base branch follow project. Unsupported worktrees require an
  explicit checkout choice. Permissions stay independent and must be enforced by the host.
- Picker and attachments stay scoped to the selected project. Mixed-project context blocks send
  until resolved. Empty prompt, no project, offline, unavailable choices and incomplete speech
  explain blocked sending. Offline choices are saved context rather than live host capability.
- Autosave drafts. Reopening offers Resume draft / New task, preserving incoming handoff until
  the user chooses. Keep the existing folder trust flow. Failed sends retain work; unknown
  outcomes check the original receipt using the same start ID before another start.
- Revision 2 reflects the user's single-run/composer correction (NEW-R2 in canvas/updates.md),
  overriding the earlier split/run-list decisions for this page. Canvas voice and host replies
  remain simulations; browser storage is canvas-only. App implementation remains pending.

### run chat + approval · `Run.dc.html`

- Compact pinned title, state and PC connection/freshness; tap for full title, project,
  agent, branch/worktree, age, changed files and separate Preview. Use “working”, 16px gutters,
  normal top spacing and 44px control targets.
- Chat scrolls above the measured bottom dock. Keyboard moves the dock up and hides nav.
  Follow new output only when already at the bottom; otherwise show New messages.
- Composer follows the user's latest reference: multiline text above a compact toolbar inside
  one frame. Transparent plus opens an upward File / Image tray. Voice, model/reasoning and
  primary Send remain in the toolbar. No persistent `@ $ /` buttons or dispatch selector.
  Typed symbols still open context suggestions; the message retains selected references.
- Send during an active turn always queues. After PC acceptance, show a compact queue count
  and popout rows with preview, Send now, Cancel and More → full text/settings/Edit. Send now
  interrupts the active tool/command, then continues with that queued message. Keep the item
  queued until PC confirms; reject/unknown outcomes retain it and reuse the original receipt.
- Model/reasoning choices apply to the next message and are saved on each queued item.
  Pickers list host-supported models and effort combinations; explain unsupported switching.
  Uploading/failed attachments block Send until confirmed or removed. Keep draft and files on
  failure; do not pretend that browser-local file metadata is a durable PC upload.
- Voice toggles mic to Stop and shows waveform above the frame; transcription can be edited
  before sending. Sending has pending/rejected/unknown states; check an unknown receipt before
  retrying. Draft survives waiting and reconnects. Finished runs use explicit Continue in the
  same chat/workspace; explain when the host cannot resume.
- Approvals and existing linked entry questions share the bottom waiting area, replacing the
  composer and preserving its draft. Switch pending items. Allow once is primary, Deny stays
  visible, and host-supported run scope appears under More options. First answer wins across
  phone, PC and notifications; show pending/failure/expired/answered elsewhere truthfully.
- Tool rows expand saved file/command/edit details. Changed files opens a diff list; Preview
  remains separate. Stop has pending/failure/retry and becomes stopped only after PC confirms.
- Disconnected/reconnecting shows recovery first, with no live progress/actions. Saved chat
  requires View history and a last-received label. Loading/missing/empty are distinct from done.
- Run revision 1, including RUN-R1b/R1c in canvas/updates.md, awaits canvas acceptance. Host,
  queue, model, voice and upload replies are simulations; app wiring remains pending.

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
