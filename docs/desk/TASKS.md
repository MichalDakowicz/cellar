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

Order changed 2026-10-12 at the user's request: W10 is the controller/desktop rebuild,
before more features need moving. Keys search is W11; every former W10–W20 task shifts
to W11–W21, preserving order and deferred status. Accepted canvas/spec files and older
source comments retain their original task numbers; apply this +1 mapping to their
W10–W20 references. This ledger supplies current numbering; visual baselines stay intact.

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
the mic block (mic is a visual until W13 — "type instead" is the working path), project chips,
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
meta line. Deploy is disabled with a reason until W12. Built as `desk/preview/[port]` in a
`react-native-webview` (an iframe on web); the page is laid out at the picked width and scaled
into the frame (`lib/deskPreview.ts`). The pc's port rows open it instead of the browser;
`desk/preview/sample` is the sample desk's, from its `preview` tile. "Tell the agent" goes to
the page's run when there is one, else to a new task.

### V9 · the keys, drawn `[x]`

`Keys.dc.html`. The suggestion list above the composer (phone: above the keyboard, keys in a
strip): `$` lists projects then entries inside one — real already, from the cellar; `@` and `/`
from the sample desk until W11. The line under the composer that spells out what each token will
do. Chip actions: copy, nudge lighter/darker. One pure search in `lib/deskKeys.ts` (`tokenAt`,
`keySuggestions`, `applySuggestion`, `keyPlan`) behind `features/desk/useDeskKeys`, used by the run
composer and the new task screen. `$` commands are the sample's until W2; with the sample off,
`@` and `/` say they are coming. Colour chips act in the plan line under the field (`nudgeHex`
rewrites the code in the message); chips in entries still copy on tap.

### V10 · live screen, landscape `[x]`

`Screen.dc.html`. Restyle the existing screen view to the landscape artboard; mode chips (touch ·
trackpad · keyboard · dictate) drawn, view-only until W19. Built as `desk/screen`: the pc's MJPEG
page in a webview, the phone locked landscape while it is open (`expo-screen-orientation`),
host pill and mode hint over the picture, and the screen's own islands (`ScreenIslands`, not the
shared bar). The hint says a mode is view only until W19 (`lib/deskScreen.ts`); switch display is
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
slot for usage (drawn empty until W17). Built as the wide shape of `desk/run/[id]`: `RunListPane`
(`lib/deskRunList.ts` groups, filters, searches), `features/desk/RunChatPane` (the phone's whole
run screen, moved out of the route) and `RunRail`. Run cards carry their project now
(`useDeskRunCards`, shared with the desk tab). The phone in the rail is drawn until W19; files,
checkpoints and preview come from the sample desk until W6/W15.

### V13 · project board: hand off from it `[x]`

`DeskProjects.dc.html`. Badges for which agent claimed what; ticked entries → "one run" / "one
run each" in the selection bar; the side panel: worktrees, previews, shipped, last command runs.
`EntryCard` names the agent while one is on it (every list gets it, the board included). The
selection bar's hand-off opens `desk/new?entries=a,b` with every held thought attached; with two or
more, "one run · one run each" decides the starts (`taskStarts` in `lib/deskTask.ts`), sent in
turn by `useDeskStart` — a trust refusal holds the rest. The desktop project aside gets
`ProjectDeskPanel`: the checkout for real, the whole panel on the sample desk (W5, W12, W2).

### V14 · settings, desk half `[x]`

`DeskUsage`, `DeskRecipes`, `DeskHosts`. Settings › agents (slots, default per project, default
mode), keys (`!` `~` `^` `%` on/off), devices and pairing, notifications (quiet hours), usage +
accounts, recipes by kind + rules, hosts. **Hosts lists this pc only**; "add a host over ssh" is
shown disabled with "after the server is set up" — see W21. Built as `desk/settings`, reached from
settings › your pc › desk settings (the desk tab's gear stays main settings — on the phone it is
the only way there). Real: default agent and mode (`store/deskPrefs`, used by the new task screen
through `startingAgent`), pairing, and the sample desk switch, moved here. Drawn: keys (W11),
where pings go (W14), usage (W17; sample bars), recipes and rules (W16; sample recipes), hosts
(this pc, add-over-ssh off).

### V15 · notifications, drawn `[x]`

`PhoneNotify.dc.html`. The notification layouts as in-app previews: one per run, approvals with
up to 3 actions, questions with 2 options + more. Real presentation is W14. Built as `desk/notify`,
from settings › desk › where pings go. `lib/deskNotify.ts` builds every note (`runNote`,
`approvalNote`, `questionNote`, `capActions` — Android's three) so W14 draws the same ones. Real
notes come from live runs and thoughts waiting on you, and open them; the sample desk adds an
approval, a question, a filed crash and a plan out, answered locally.

### V16 · the later screens `[x]`

Drawn last because they are used last: share sheet (`PhoneShare`), race compare (`PhoneRace`),
night shift digest (`PhoneNight`), group run (`DeskGroupRun`), phone over adb panel
(`DeskPhone`). Each behind the sample desk until its wiring task. Built as `desk/share`,
`desk/race`, `desk/night`, `desk/group`, `desk/phone` in one frame (`features/desk/LaterScreen`),
linked from the desk tab's "more on the desk". The share sheet files for real (kind guessed by
`guessKind`, hand-off through `store/deskHandoff`) — only arriving from another app waits for W18;
the other four show their body only on the sample desk and say what they wait for otherwise.
Their small rules are `lib/deskLater.ts`.

**Pass 1 is done.** Every screen is drawn; the wiring starts at W1.

---

## Pass 1b — match the canvas

Pass 1 drew every screen from the written spec; this pass makes each one look like its artboard
in [`canvas/`](canvas/) and gives the app the structure `Map.dc.html` describes. Same rules as
pass 1. A board's sample *data* stays behind the sample desk; its labels, layout and look are the
target.

### M1 · settings in sections `[x]`

`settings/` (`lib/settingsSections.ts`): a column beside the page on the desktop, a list on the
phone. dump · agents · hosts · recipes and rules · keys · devices and pairing · notifications ·
night shift · usage and accounts · account. Cellar's own prefs spread by topic (dump habits under
dump, display under account, nudges under notifications). `desk/settings` redirects to agents.

### M2 · the shared look `[x]`

Fix once, every board follows: overlines are `text-xs font-bold` (`Overline`); chips are the
`.ping-chip` (min-h 36, `text-sm`, foreground on chipGround, selected = accent soft + primary
border + light-accent text) in `Chip`, `ChipWrap` and every hand-rolled chip; raised surfaces are
the row ground #171717 (a `row` token), the selected/thumb ground #262626; outlined tiles use
hsl(0 0% 20%) unselected. Nav glyphs: back is a chevron, dump a pen, projects a folder. Done
as: `Overline` to PING.md's `text-xs font-bold`; `Chip` takes `ChipWrap`'s shape (§9.6), and a
selected chip's label is `COLORS.accentText` (slate is too dim on its own soft ground). Chips keep
PING.md's muted unselected label rather than the canvas bundle's white — that would be a family
change. `bg-secondary/60` stays as the raised ground: it composes to ≈#1b1b1b and follows the
light theme, which a fixed `neutral-900` would not. Bazaar shares `components/ui/controls.tsx` and
owes the same `Chip`/`Overline` change.

### M3 · the desktop sidebar's desk section `[x]`

Under cellar's four: desk › home · chat · commands · previews · the attached phone, then pinned
projects. Adds `desk/chat` (the run list with nothing open), `desk/commands` (each project's `$`
commands — sample until W2) and `desk/previews` (the pc's pages, real). Rows and pinned
projects come from `lib/sidebar.ts`; chat is badged with what is waiting on you.

### M4 · phone boards `[x]`

Main, NewTask (a sheet over the desk: waveform, 76px primary mic between "type instead" and
"clear", sticky send with an arrow), Run (step tiles with their own glyphs, the bubble's caption,
primary mic), Preview, Screen, PhoneNotify (the shade itself), PhoneQuestion (the card pinned in
the run in place of the composer; uppercase letter tiles, recommended pill, "let it decide"),
PhoneShare (a sheet), PhoneRace, PhoneNight — each to its artboard.
- [x] Main — every run on the row ground, waiting raised; mono command/path in the detail
  (`detailParts`), coloured diff in the meta (`metaParts`); sliders glyph; no stop on the row (it is
  on the run), no status line under the host card.
- [x] NewTask — `components/desk/DeskSheet` (backdrop, grabber, scrolling body, pinned footer) as a
  `transparentModal` route; waveform, centred transcript, type instead · mic · clear; outlined
  tiles (`COLORS.outline`); "pings your phone" mode copy; the attached thought's kind tile.
- [x] Run — steps fold into rows by kind with their own glyphs (`stepRows`), the bubble's
  caption, primary mic, amber/grey decided dot; Preview frame 320, no branch glyph; Screen islands
  52 with 46×42 slots.
- [x] PhoneNotify — the shade itself (`COLORS.shade`, `noteGround`, `noteAction`), option letters
  bold mono.
- [x] Question card — letters are uppercase everywhere (`optionLabel`, the mcp's text too);
  lettered option cards with round/square tiles, "recommended" and a detail line parsed from the
  option (`optionParts`), "other" last opening its own field, "let it decide" beside answer
  (`letDecide`), the red "asks · pick one/any" head.
- [x] PhoneShare — a `DeskSheet` (76%), cancel, plain "in your words", the guessed-kind suffix in
  normal case, inbox last, hand-off as a tile with a switch; filing closes the sheet.
- [x] PhoneRace — quiet overline, 300px preview, the compare grid at 13/18 with green checks and a
  coloured diff. PhoneNight — `text-2xl` title, 16px between cards, soft summaries, "add something
  for tonight".

### M5 · desktop boards `[x]`

DeskHome, DeskChat (keys list with groups, ↑↓ / tab / esc, step cards for the plan line),
DeskProjects, DeskPhone, DeskGroupRun, QuestionCard (every state), DeskUsage (header meter, this
chat, plan limits side by side, accounts, by day, limits), DeskRecipes (kinds as a list, the
recipe as a labelled grid, rules with the managed-block preview), DeskHosts (host rows, add a
host card, ping rules as a grid with edit). Done: recipes as a kind list plus a labelled grid
(`DeskRecipe`, `defaultRecipe` — your defaults when there is no sample), rules with the managed
block; hosts with the add-a-host card drawn off; ping rules as a grid; usage with this chat, plan
limits side by side, accounts, policies, by day and the limits (`USAGE_LIMITS`,
`PLAN_OUT_POLICIES`); keys as tiles; the keys list headed by group; the wide desk's commands as `$`
buttons. Checked in the desktop window over CDP, phone views by emulating 390×844.

### M6 · clone the current canvas, visuals only `[x]`

User instruction on 2026-10-10 replaces the sequential canvas review with a visual clone of
all current boards. Main revision 5, NewTask revision 2 and Run R1b/R1c are the latest targets.
Match shared typography and grounds, phone layouts, desktop layouts and sample previews.
Keep all W tasks unchecked: new model, attachment, queue, voice and host controls are drawn
only. Record visual coverage and verification in `how-it-works.md`.

Implemented shared canvas fonts/grounds, revised Main/NewTask/Run layouts, sample previews,
phone and group panels, desktop sidebar and settings typography. Validation: 811 tests,
types, lint, web export and Android release build pass; APK installed and launched on the
connected phone. Main and NewTask keyboard layout checked on-device. New host behavior
remains in Pass 2. Historical visual coverage remains in Git history.

## Pass 2 — the wiring

### W1 · real counts on the desk `[x]`

The desk badge and status line from real data: blocked entries + host-reported waiting runs.
One pure `deskCounts` in `lib/`, used by the island, the sidebar and both headers through a
shared persistent source. Waiting is not working; unknown counts are not zero. Failed reads
hide cached totals and offer retry, disconnected hosts offer reconnect, mailbox totals show
snapshot freshness, and samples never enter real totals. Until W8, a host waiting state says
"needs you at the pc", not a verified approval.

Verified 2026-10-10: 832 app tests, 30 desktop tests, types, lint, desktop build and local web
export pass. Release APK installed and launched; phone checked confirmed counts, injected
read failure, retry, disconnect and reconnect against a separate read-only host. Original
pairing restored. See `how-it-works.md` for flow map, test boundaries and next task W2.

### W2 · `$` commands per project `[x]`

The host reads each project's `package.json` scripts (and gradle tasks for `$apk`) into commands;
tiles and `$` run them as **jobs**, not agent turns, streamed back like any run. Per-project
overrides and chains saved from a chat live in settings.

2026-10-10: real phone `$test` on Michu displays 852 passed, duration and raw output.
Phone `$apk` displays actual Gradle output, BUILD SUCCESSFUL and exit 0. Fixed Windows
wrapper quoting and Java's detached-process output failure; real Java regression passes.
Chains, stopped/failed/unknown jobs, persistence and account scope verified in host tests.

### W3 · questions carry several picks and a note `[x]`

Schema: the answer may be a list and carry a note (`supabase/schema.sql` column migrations).
`cellar_check_answers` / `cellar_get_entry` return both, with a line saying the user chose
several. App, mcp and the edge function in the same change; `unblocksEntry` unchanged.

2026-10-10: app/MCP implementation, additive SQL and edge import map are ready. Migration
applied by the user; phone saved B+C plus a note excluding A and rendered exact choices.
849 app tests, 37 MCP tests, both type checks, lint and Deno edge check pass. Hosted MCP
function deployed with explicit authorization. Live `cellar_get_entry` verifies exact B+C,
explicit several-options line and separate note; `cellar_check_answers` responds successfully.

### W4 · send a task for real `[x]`

The new task sheet and the capture bar's shift+enter start a run with project, where, agent,
mode and attached entries; the send carries a `commandId` and the host stores receipts, so a
retry never runs twice. Attached entries are claimed by the run.

2026-10-10: complete payload, owner-scoped disk receipts and durable phone pending queue
verified on real Michu host. Phone read-only Codex runs return actual output; both attached
entries are reserved atomically. Dropped start response + phone restart recovers the original
run with one launch. Mailbox task queued while PC offline is confirmed after host restart.
Already-claimed attachment fails before launch; safe edit clears only unstarted remainder.
852 app tests and 37 desktop tests/types/lint/build pass; migrations tested in PostgreSQL
for reruns, rollback and account isolation. Final APK installed; updated local PC app running.
New worktrees remain W5; phone approvals remain W8. No GitHub push or website deployment.

### W5 · worktrees `[x]`

"New worktree" creates `wt/<slug>` off main on the host; the project panel lists worktrees per
project; a finished run's worktree can be kept, merged or removed.

2026-10-11: Git-confirmed worktrees from local main, owner-scoped workspace/start
identity, reviewed Keep/Merge/Remove and durable lifecycle recovery verified.
Merge is clean fast-forward only; remove refuses dirty/locked/unmerged or
active/unknown trees and retains branch/commits. Physical phone confirmed actual
Codex Git output, Keep/Remove and merge refusal; dropped Keep reply recovered
after phone/host restarts without replay. Desktop panel matched live Git catalogue.
855 app tests and 46 desktop tests/types/lint/build pass; final APK installed.
Details and local CLI limitation: `how-it-works.md` W5. Existing canvas/spec edits
preserved; no GitHub push or website deployment.

### W6 · the event log `[x]`

The host keeps runs as numbered events in sqlite (`node:sqlite`): turn items normalised from
claude's stream-json and codex's json events (`t3code-notes.md` §05). Tool updates coalesced,
text chunked at markdown-safe boundaries. The run chat renders turn items.

Verified: durable cursor/restart and partial Unicode/provider fixtures; physical phone
Codex run `723f02fa` renders Markdown and separate command results (exit 0 and failed
exit 7), with full expandable output on phone and desktop. Legacy logs remain labelled;
interrupted tools become unknown. Live Claude testing omitted at user request; its
partial/final messages and tool results are covered by fixtures.

### W7 · the live stream `[x]`

A websocket per client with one-minute tickets: snapshot → numbered events → synchronized;
resume from the last sequence. Replaces polling on the lan; the cellar wire stays the mailbox for
when the pc is asleep.

Verified: 862 app tests, 52 desktop tests, types/lint, local web export and Android
release/install/launch. Signed socket integration covers replay, gaps, one-use/expired
tickets, account/key revocation and read failures. Physical phone confirms disconnect,
explicit saved history after a cold restart, host restart, and background/resume.
SQLite epoch/sequence and unique item IDs survive restart; desktop uses the same
synchronized feed. See `how-it-works.md` W6/W7. GitHub/web publication remains pending.

### W8 · approvals `[x]`

Agents run through the claude agent sdk (`canUseTool`) and `codex app-server`
(`requestApproval`), so a permission ask becomes a stored runtime request. The pinned panel
answers it; first answer wins across phone, pc and notification. Ask first · edits ok · full
access map onto each agent's modes.

Verified 2026-10-11: actual stored requests/receipts, first answer wins on phone/PC,
exact provider grant scopes, pending/unknown/restart expiry and synchronized waiting
dock; composer survives cold restart. Live Codex phone Allow/Deny, callback expiry
after host restart and desktop waiting area checked. Claude uses SDK callback fixtures
only, preserving the no-live-Claude constraint. 864 app and 59 desktop tests, types,
lint, web export, desktop package and installed Android release pass. Lost replies
are verified by signed HTTP/receipt tests; physical fault proxy was removed. Native
provider question tools are explicitly refused; linked questions reuse W3. Notification
delivery remains W14. Existing canvas/spec edits retain their initial hashes.
See `how-it-works.md` W8 for behavior and verification boundaries. Next: W9.

### W9 · steer, queue, stop all `[x]`

Dispatch modes on a busy run (steer now · queue after this turn), interrupt one run, stop every
run on every host from the tray, the phone or the desktop.

Completed 2026-10-12: live phone edit/cancel, Send now with owned descendant termination,
single stop, phone/desktop/tray Stop all and host/cold-phone restart recovery verified.
Offline hosts stay pending; unknown historical sessions fail explicitly. Fresh emergency
stops remain possible after local results settle while an earlier remote stop is pending.
86 app suites / 871 tests, 68 desktop tests, lint, both types, web/desktop/Android builds
pass; standalone APK installed/launched and rebuilt desktop running at the paired path.
Physical two-online-host behavior remains fixture coverage; Claude stays fixture-only.
Protected canvas/spec hashes unchanged. See `how-it-works.md` W9; historical ledgers remain in Git history.
Controller/desktop rebuild is the next task, W10; it is not part of completed W9.

### W10 · separate controller and desktop apps `[x]`

Implement [desktop-rebuild.md](desktop-rebuild.md) before wiring more features. Mobile
and web remain controllers; desktop keeps the existing Electron/TypeScript host and
gets its own React DOM/Vite renderer. Remove receiver-specific bridge imports, local-PC
settings/routes and ADB panels from controller build graphs. Keep remote host features
and useful responsive browser layouts. App role and host capabilities determine access;
window width only determines layout.

Preserve the accepted Cellar appearance and all working W1–W9 behavior, including drafts,
approvals, durable UUID receipts, queue revisions, process containment, offline pending
and restart unknowns. Keep the current profile, identity, pairing and auth ownership.
Share pure contracts/domain/tokens; desktop artifacts must no longer embed the Expo
controller export. Migrate all existing Cellar desktop surfaces before removing the old
renderer, without implementing the later unwired features during the move.

Verify visual parity and controller/host boundaries, run app and desktop checks, build
independent controller web/Android and desktop artifacts, replacement-install and launch
on phone and the existing reachable desktop path. Claude remains fixture-only; consult
T3 for lifecycle changes. Complete and verify this rebuild before W11 keys search.
Build specification: [desktop-rebuild.md](desktop-rebuild.md).

Verified complete (2026-10-13): independent DOM renderer/package and
controller graph extraction are installed. Root 883 tests and desktop 76 tests,
lint/types, actual artifact boundaries and protected hashes pass. Physical phone
and preserved-profile desktop pass live Codex approvals, queue revision/edit/cancel/
promotion, Stop all, process containment and crash/no-replay checks. Final native
capture/chat/draft, light/dark styling and route scroll checks pass at the original
Windows path/profile; original theme restored. Verification boundaries and evidence:
[how-it-works.md](how-it-works.md). No release or website publication performed.

### W11 · keys search `[x]`

`@` files from the run's worktree (changed first, `:42` line refs), `/` skills per agent (built
in + the user's own skill folders), `$` commands from W2. One search used by phone and pc.
Verified 2026-10-13 on dedicated `feat/desk-w11`, based on verified W10 `7b0fd4b`
while PR #61 remains open/unmerged. Root 889 tests and desktop 83 tests, lint/types,
independent web/Android/Windows builds and graph boundaries pass. Paired physical
phone and preserved-profile desktop verify real file/line/skill/command search,
insertion/focus, colour chips and disconnect/draft recovery. Browser retains its
mailbox limits; host runs hidden in tray. Protected references unchanged. Exact
live boundaries, artifact evidence and limitations: [how-it-works.md](how-it-works.md).

### W12 · previews and deploy `[x]`

One dev server per worktree on the host, ports allocated and reached over the tailnet; checks =
the project's check commands; deploy = its `$deploy`, asking first if the preview was never
opened.

Verified 2026-10-14: owned worktree server, native phone/desktop preview, real
passed/failed checks, once-only local deploy and reviewed cleanup. Tailnet adapter
and address behavior have fixture coverage; actual tailnet traversal unavailable
on this PC. See [how-it-works.md](how-it-works.md).

### W13 · voice `[x]`

Speech to text on the new task sheet and the composer; "B" / "the second one" answers a question;
"dollar deploy" types `$deploy`.

Verified 2026-10-14: user confirmed recognition on installed phone; exact question
choice and command-text parsing tests pass. Drafts remain editable and require
normal send/answer actions. Windows acoustic success remains unverified. See
[how-it-works.md](how-it-works.md).

### W14 · notifications that answer `[x]`

Actionable notifications for approvals and questions, one per run updated in place, routed by
where you are (desk in use → desk; idle 5 min or locked → phone; unanswered 2 min → phone),
never on two devices at once. Read the open bug "notifications arrive only on app launch" first —
it is the same delivery path.

Verified 2026-10-14: real background Android push, exact B answer receipt,
acknowledged phone↔desk handoff and unanswered escalation, live Codex approval
mailbox/provider deny, owner RLS and first-answer safeguards. Original launch-only
bug settled; app/desktop/MCP tests, native builds and approved web publish pass.
Physical approval-button and Windows speech boundaries: [how-it-works.md](how-it-works.md).

### W15 · checkpoints `[x]`

Follow-up: automatic finished-worktree cleanup saves recoverable Git snapshots,
retains explicit Keep/live/queued/unknown work, and removes duplicate checkouts.
Verification is recorded in `how-it-works.md`.

Hidden git refs per turn, diffs from them, one-click roll back that also rolls the agent's
conversation back.

Implemented 2026-10-14: hidden snapshots, reviewed combined file/context restore,
durable receipts and controller/desktop tools. Real signed Codex host check restores
file and remembered marker. Phone receipt recovery and live queued-during-restore wakeup
verified; remaining platform boundaries in [test ledger](w15-w18-testing.md).

### W16 · recipes and rules `[x]`

A recipe per entry kind (agent, mode, skills, prompt template, commands after) feeds the new task
defaults; rule entries sync into a managed block in AGENTS.md / CLAUDE.md, scoped everywhere →
shelf → project, each write shown as a diff first.

Implemented: per-kind recipes, explicit-choice precedence, scoped existing thoughts,
reviewed managed blocks and successful-turn command jobs. Phone save/review/write and
live after-command jobs verified. Instruction files render first with source/changes
controls; originals restored after acceptance. See [test ledger](w15-w18-testing.md).

### W17 · usage and accounts `[-]`

First check what each agent actually exposes (5h / weekly windows, resets); estimate and say so
where it does not. Context meter with `/compact` at 80%. Accounts per agent with per-run config
dirs and keychain secrets; when a plan runs out, "ask me" is the default.

Implemented: real/estimated context, windows/resets, guarded compact and encrypted named
API accounts with per-run directories. Default subscription sign-in remains provider-owned;
named OAuth profiles unsupported. Real context/windows rendered on phone; actual named
credentials/encryption restart and 80% compaction remain pending in the test ledger.

### W18 · share and crashes `[x]`

Cellar as an android share target; kind guessed from what was shared; crashes of debug builds
filed as glitches with stack, screenshot and log, repeats counted.

Implemented: Android text/link shares, owner-scoped drafts and reviewed/idempotent
Cellar-debug-only crash reports. Physical cold/warm shares, full draft restart, lost-response
filing, JS/native crash review/filing and release capture guard verified. Binary shares
unsupported and screenshots optional when capture fails; see the test ledger.

### W19 · screens both ways `[x]`

try Scrcpy as suggestion for phone to pc

Control on the live pc screen (touch, trackpad, keyboard, dictate), asked on the pc unless the
phone is trusted. The phone on the pc over adb: mirror, who drives, agent taps as rings, install,
deep links, logcat, dev toggles.

Implemented 2026-10-14: consented PC touch/trackpad/keyboard/voice controls and
embedded ADB phone tools. PC video uses WebRTC; phone video embeds the verified
scrcpy encoder, with bounded decoding and no external launcher. Initial controls
confirmed by user; final streams verified locally and installed on both devices.
User confirmed smooth video, then reported PC delay and mirror refresh after swipes.
Mirror lifetime fix, minimal receiver buffering and requested monitor switch are
installed. User confirmed video fixes. Subsequent PC scroll direction and phone-mirror
input scaling corrections installed; user confirmed full-screen phone control.
See [test ledger](w19-w21-testing.md).

### W20 · race, night shift, group runs `[x]`

Two runs off one commit and a pick; tonight's queue in a window with a digest; one task across a
shelf of projects.

Implemented 2026-10-14: durable race/group plans, pinned worktree bases, comparison
and pick; timed sequential night queue with caps, usage reserve and digest.
Real two-Codex race, same-commit start, readable results, pick and QA cleanup pass.
Night timing/restart and group semantics have fixtures; live Claude excluded.
See [test ledger](w19-w21-testing.md).

### W21 · rendered documents and media `[x]`

Render Markdown, AsciiDoc and other supported documents in chat and other file-opening
surfaces, with a button to view the exact source. Preview images and other supported media
visually; offer source only for formats where it makes sense. Keep filenames visible and
use bounded viewers. Added 2026-10-14 before SSH; W16 instruction-file review is rendered now.

Implemented 2026-10-14: shared bounded document protocol/viewers across chat,
tool references, keys search and attached local documents. Markdown/portable
AsciiDoc render first with exact UTF-8 source; supported raster/audio/video show
named media controls. Physical phone document and desktop render/source checks pass.
Supported formats and limits: [test ledger](w19-w21-testing.md).

### W22 · other hosts over ssh `[-]`

**W22 · other hosts over ssh** — **Deferred until the server is actually set up** — tracked by cellar entry `2246c7b8` on the
cellar project. A host = user@host:port + key; cellar installs and updates the daemon over ssh; per host:
slots, night shift, which projects; runs pick a free host. Until then, everything assumes one
host: this pc.
