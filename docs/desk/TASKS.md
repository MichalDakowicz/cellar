# Desk — build order

Two passes. **First every screen is drawn** — real components, real routes, real navigation,
fed by whatever data already exists and by a sample desk where nothing does yet. **Only then
the wiring** that makes each one work for real. Inside each pass, easiest first.

Why this order: the screens settle the shapes (what a run row needs, what a question carries,
what a command tile is) before any protocol is written to carry them. A view model that has
been looked at on the phone is a better contract than one designed on paper.

Rules for every task:

- One task, one or more commits on its own; tick it here in the same commit that finishes it.
- Screens take a view model from `src/lib/desk*.ts` types and render it — never shape data in a
  component. Pure parts get a `*.test.ts`.
- **Sample data is not shipped as real data.** Pass 1 screens show the sample desk only behind
  settings › desk › "show a sample desk" (off by default). With it off, a screen shows what is
  real or its empty state.
- Each task names the existing screens and tools it touches (`README.md`, "carry every decision
  back"). Update them in the same change.
- User-visible → a line in `UPDATE.md`. Built to the phone before it is called done.

Status: `[ ]` to do · `[~]` in progress · `[x]` done · `[-]` deferred

---

## Pass 1 — the screens

### V1 · run state chip `[x]`

`components/desk/RunChip.tsx`: waiting (red) · doing (amber) · done (green). The one chip every
run row, header and notification uses. Status words and colours from `lib/deskView.ts`.

### V2 · hex codes paint themselves `[x]`

`lib/hexChips.ts` splits text into plain runs and `#fff` / `#64748B` / `#64748BCC` codes, and
picks dark or light text for each chip; `#later`, `#12`, `#ggg` stay text. `LinkedText` renders
the chips, so entries, lines and the dump preview get them at once. Tap: copy. (Nudge and
"colours this project uses" come with the chat composer, V9.)

### V3 · the desk tab replaces profile `[x]`

Right nav island: the desk glyph, badge = what is waiting on you (blocked entries for now).
`(tabs)/desk` is the tab; the old `/desk` route redirects to it. Profile's leftovers — the
account line, the avatar, the figures — move to settings › account. Touches: `navDestinations`,
`DesktopSidebar`, `(tabs)/_layout`, `settings`, `(tabs)/profile` (removed).

### V4 · desk tab home `[x]`

`Main.dc.html`. Header + status line + settings button; host card (name, link, latency, cpu /
memory / slots, see-the-screen); project chips + command tiles + the mono meta line; waiting →
running → lately. Runs come from today's run list; everything the host cannot report yet comes
from the sample desk or is left out. Pairing and the local sections (pages, screen, builds) stay,
below the runs.

### V5 · question card: pick several, add a note `[x]`

`QuestionCard.dc.html`, "change to make". Under the options: "pick more than one" (even when the
agent asked for one) and "add a note". Lettered options, "recommended" only when marked,
answered collapses to the pick, expired greys out. The note rides in the answer text as
"pick — note" (`composeAnswer`), so it already reaches the agent; W3 makes it a field. Applies to entry questions in the inbox and on the entry.

### V6 · new task sheet `[x]`

`NewTask.dc.html`. Built as a screen, `desk/new`, not a sheet — taller than a phone once the
keyboard is up. From the left island on the desk tab, and from an entry's start on pc (`?entry=`): the transcript field with
the mic block (mic is a visual until W12 — "type instead" is the working path), project chips,
where it works (main checkout · new worktree), agent chips, ask first · edits ok · full access
with its hint, attached entries ("from your cellar"), send to <host>. Replaces `DeskPromptForm`
on the phone.

### V7 · run chat `[x]`

`Run.dc.html`. `desk/run/[id]`: header (branch · project · agent, title, chip, age, diff pill,
stop), your message as a bubble, agent text, tool steps folded into one tile, the approval panel
pinned above the nav (deny · allow · allow for the rest of this run) that replaces the composer,
then the composer with steer it now / queue after this turn and the `@ $ /` key strip. Fed from
today's log tail as plain agent text until W6.

### V8 · preview before deploy `[x]`

`Preview.dc.html`. Size chips (phone · tablet · desktop) around the existing per-port page,
reload, the host + address bar with "live", checks list, "tell the agent" and deploy with its
meta line. Deploy is disabled with a reason until W11. Built as `desk/preview/[port]` in a
`react-native-webview` (an iframe on web); the page is laid out at the picked width and scaled
into the frame (`lib/deskPreview.ts`). The pc's port rows open it instead of the browser;
`desk/preview/sample` is the sample desk's, from its `preview` tile. "Tell the agent" goes to
the page's run when there is one, else to a new task.

### V9 · the keys, drawn `[x]`

`Keys.dc.html`. The suggestion list above the composer (phone: above the keyboard, keys in a
strip): `$` lists projects then entries inside one — real already, from the cellar; `@` and `/`
from the sample desk until W10. The line under the composer that spells out what each token will
do. Chip actions: copy, nudge lighter/darker. One pure search in `lib/deskKeys.ts` (`tokenAt`,
`keySuggestions`, `applySuggestion`, `keyPlan`) behind `features/desk/useDeskKeys`, used by the run
composer and the new task screen. `$` commands are the sample's until W2; with the sample off,
`@` and `/` say they are coming. Colour chips act in the plan line under the field (`nudgeHex`
rewrites the code in the message); chips in entries still copy on tap.

### V10 · live screen, landscape `[x]`

`Screen.dc.html`. Restyle the existing screen view to the landscape artboard; mode chips (touch ·
trackpad · keyboard · dictate) drawn, view-only until W18. Built as `desk/screen`: the pc's MJPEG
page in a webview, the phone locked landscape while it is open (`expo-screen-orientation`),
host pill and mode hint over the picture, and the screen's own islands (`ScreenIslands`, not the
shared bar). The hint says a mode is view only until W18 (`lib/deskScreen.ts`); switch display is
drawn off. The host card and the pc's "the screen" row open it instead of the browser.

### V11 · desktop home `[x]`

`DeskHome.dc.html`. The wide layout of the desk tab in the desktop window and on wide web:
capture bar (enter files, shift+enter hands off — files only until W4), waiting on you answered
inline, devices, tiles, today, stop all. Built as `features/desk/DeskWide` behind `useIsDesktop`
in the desk route; the app's own sidebar stays (shared shell), so the artboard's sidebar is not
redrawn. Enter files into the inbox through the dump's `drop`; shift+enter hands the words to the
new task screen through `store/deskHandoff` (in memory, never a route param). Sample approvals get
deny / allow inline; real blocked thoughts open their entry. Today counts real dumps and runs
(`lib/deskHome.ts`); stop all stops every run this desk started.

### V12 · desktop chat `[x]`

`DeskChat.dc.html`. Runs grouped by project on the left (what needs you first), the run chat in
the middle, the right rail: attached phone, this run's files, checkpoints, preview. Header meter
slot for usage (drawn empty until W16). Built as the wide shape of `desk/run/[id]`: `RunListPane`
(`lib/deskRunList.ts` groups, filters, searches), `features/desk/RunChatPane` (the phone's whole
run screen, moved out of the route) and `RunRail`. Run cards carry their project now
(`useDeskRunCards`, shared with the desk tab). The phone in the rail is drawn until W18; files,
checkpoints and preview come from the sample desk until W6/W14.

### V13 · project board: hand off from it `[x]`

`DeskProjects.dc.html`. Badges for which agent claimed what; ticked entries → "one run" / "one
run each" in the selection bar; the side panel: worktrees, previews, shipped, last command runs.
`EntryCard` names the agent while one is on it (every list gets it, the board included). The
selection bar's hand-off opens `desk/new?entries=a,b` with every held thought attached; with two or
more, "one run · one run each" decides the starts (`taskStarts` in `lib/deskTask.ts`), sent in
turn by `useDeskStart` — a trust refusal holds the rest. The desktop project aside gets
`ProjectDeskPanel`: the checkout for real, the whole panel on the sample desk (W5, W11, W2).

### V14 · settings, desk half `[x]`

`DeskUsage`, `DeskRecipes`, `DeskHosts`. Settings › agents (slots, default per project, default
mode), keys (`!` `~` `^` `%` on/off), devices and pairing, notifications (quiet hours), usage +
accounts, recipes by kind + rules, hosts. **Hosts lists this pc only**; "add a host over ssh" is
shown disabled with "after the server is set up" — see W20. Built as `desk/settings`, reached from
settings › your pc › desk settings (the desk tab's gear stays main settings — on the phone it is
the only way there). Real: default agent and mode (`store/deskPrefs`, used by the new task screen
through `startingAgent`), pairing, and the sample desk switch, moved here. Drawn: keys (W10),
where pings go (W13), usage (W16; sample bars), recipes and rules (W15; sample recipes), hosts
(this pc, add-over-ssh off).

### V15 · notifications, drawn `[x]`

`PhoneNotify.dc.html`. The notification layouts as in-app previews: one per run, approvals with
up to 3 actions, questions with 2 options + more. Real presentation is W13. Built as `desk/notify`,
from settings › desk › where pings go. `lib/deskNotify.ts` builds every note (`runNote`,
`approvalNote`, `questionNote`, `capActions` — Android's three) so W13 draws the same ones. Real
notes come from live runs and thoughts waiting on you, and open them; the sample desk adds an
approval, a question, a filed crash and a plan out, answered locally.

### V16 · the later screens `[x]`

Drawn last because they are used last: share sheet (`PhoneShare`), race compare (`PhoneRace`),
night shift digest (`PhoneNight`), group run (`DeskGroupRun`), phone over adb panel
(`DeskPhone`). Each behind the sample desk until its wiring task. Built as `desk/share`,
`desk/race`, `desk/night`, `desk/group`, `desk/phone` in one frame (`features/desk/LaterScreen`),
linked from the desk tab's "more on the desk". The share sheet files for real (kind guessed by
`guessKind`, hand-off through `store/deskHandoff`) — only arriving from another app waits for W17;
the other four show their body only on the sample desk and say what they wait for otherwise.
Their small rules are `lib/deskLater.ts`.

**Pass 1 is done.** Every screen is drawn; the wiring starts at W1.

---

## Pass 2 — the wiring

### W1 · real counts on the desk `[ ]`

The desk badge and status line from real data: blocked entries + runs waiting on an approval.
One pure `deskCounts` in `lib/`, used by the island, the sidebar and the header.

### W2 · `$` commands per project `[ ]`

The host reads each project's `package.json` scripts (and gradle tasks for `$apk`) into commands;
tiles and `$` run them as **jobs**, not agent turns, streamed back like any run. Per-project
overrides and chains saved from a chat live in settings.

### W3 · questions carry several picks and a note `[ ]`

Schema: the answer may be a list and carry a note (`supabase/schema.sql` column migrations).
`cellar_check_answers` / `cellar_get_entry` return both, with a line saying the user chose
several. App, mcp and the edge function in the same change; `unblocksEntry` unchanged.

### W4 · send a task for real `[ ]`

The new task sheet and the capture bar's shift+enter start a run with project, where, agent,
mode and attached entries; the send carries a `commandId` and the host stores receipts, so a
retry never runs twice. Attached entries are claimed by the run.

### W5 · worktrees `[ ]`

"New worktree" creates `wt/<slug>` off main on the host; the project panel lists worktrees per
project; a finished run's worktree can be kept, merged or removed.

### W6 · the event log `[ ]`

The host keeps runs as numbered events in sqlite (`node:sqlite`): turn items normalised from
claude's stream-json and codex's json events (`t3code-notes.md` §05). Tool updates coalesced,
text chunked at markdown-safe boundaries. The run chat renders turn items.

### W7 · the live stream `[ ]`

A websocket per client with one-minute tickets: snapshot → numbered events → synchronized;
resume from the last sequence. Replaces polling on the lan; the cellar wire stays the mailbox for
when the pc is asleep.

### W8 · approvals `[ ]`

Agents run through the claude agent sdk (`canUseTool`) and `codex app-server`
(`requestApproval`), so a permission ask becomes a stored runtime request. The pinned panel
answers it; first answer wins across phone, pc and notification. Ask first · edits ok · full
access map onto each agent's modes.

### W9 · steer, queue, stop all `[ ]`

Dispatch modes on a busy run (steer now · queue after this turn), interrupt one run, stop every
run on every host from the tray, the phone or the desktop.

### W10 · keys search `[ ]`

`@` files from the run's worktree (changed first, `:42` line refs), `/` skills per agent (built
in + the user's own skill folders), `$` commands from W2. One search used by phone and pc.

### W11 · previews and deploy `[ ]`

One dev server per worktree on the host, ports allocated and reached over the tailnet; checks =
the project's check commands; deploy = its `$deploy`, asking first if the preview was never
opened.

### W12 · voice `[ ]`

Speech to text on the new task sheet and the composer; "B" / "the second one" answers a question;
"dollar deploy" types `$deploy`.

### W13 · notifications that answer `[ ]`

Actionable notifications for approvals and questions, one per run updated in place, routed by
where you are (desk in use → desk; idle 5 min or locked → phone; unanswered 2 min → phone),
never on two devices at once. Read the open bug "notifications arrive only on app launch" first —
it is the same delivery path.

### W14 · checkpoints `[ ]`

Hidden git refs per turn, diffs from them, one-click roll back that also rolls the agent's
conversation back.

### W15 · recipes and rules `[ ]`

A recipe per entry kind (agent, mode, skills, prompt template, commands after) feeds the new task
defaults; rule entries sync into a managed block in AGENTS.md / CLAUDE.md, scoped everywhere →
shelf → project, each write shown as a diff first.

### W16 · usage and accounts `[ ]`

First check what each agent actually exposes (5h / weekly windows, resets); estimate and say so
where it does not. Context meter with `/compact` at 80%. Accounts per agent with per-run config
dirs and keychain secrets; when a plan runs out, "ask me" is the default.

### W17 · share and crashes `[ ]`

Cellar as an android share target; kind guessed from what was shared; crashes of debug builds
filed as glitches with stack, screenshot and log, repeats counted.

### W18 · screens both ways `[ ]`

Control on the live pc screen (touch, trackpad, keyboard, dictate), asked on the pc unless the
phone is trusted. The phone on the pc over adb: mirror, who drives, agent taps as rings, install,
deep links, logcat, dev toggles.

### W19 · race, night shift, group runs `[ ]`

Two runs off one commit and a pick; tonight's queue in a window with a digest; one task across a
shelf of projects.

### W20 · other hosts over ssh `[-]`

**W20 · other hosts over ssh** — **Deferred until the server is actually set up** — tracked by cellar entry `2246c7b8` on the
cellar project. A host = user@host:port + key; cellar installs and updates the daemon over ssh; per host:
slots, night shift, which projects; runs pick a free host. Until then, everything assumes one
host: this pc.
