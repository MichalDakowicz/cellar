# Desk — how it works

Reviewed 2026-10-12 through W9. The current canvas remains the visual baseline. Pass 2
adds behavior through the existing view models, host API and transports.

## Current flows

| Flow | Works now | Sample or missing |
| --- | --- | --- |
| Reach the PC | QR pairing; signed LAN HTTP; desktop IPC; one-use ticketed websocket with synchronized resume; account-owned mailbox and heartbeat snapshots | SSH deferred (W21) |
| Desk totals | W1: shared global blocked-entry and host waiting-run counts; W8 waiting cards identify actual runtime approvals | Legacy host `waiting` remains coarse: an idle interactive session can need the PC |
| Send a task | W4/W5: full task choices, durable receipts, attachment reservations, duplicate-safe recovery and managed worktrees from local main; W8 supervised Claude/Codex runtimes | Legacy sessions keep their original PC controls; Antigravity retains its existing mode |
| Manage worktrees | W5: Git-confirmed project catalogue; finished runs offer reviewed Keep/Merge/Remove with durable lifecycle receipts | Merge requires a clean checked-out main and fast-forward history; previews/checks/deploy remain W12 |
| Follow a run | W6/W7 synchronized events and saved history; W8 runtime approvals; W9 retained chats, queue/edit/cancel/Send now, single stop and account-wide Stop all | Restarted/legacy provider chats explain unavailability; offline host stops remain pending |
| Answer an entry | W3: exact stored picks and separate note; confirmed writes unblock entries; W8 linked entry questions share the waiting dock; hosted MCP reads both | Native provider question tools are explicitly refused; actionable notifications remain W14 |
| Commands and keys | W2: real project command catalogue, jobs, saved chains and readable test reports; `$` also finds projects/entries; hex chips copy/nudge | Command delivery needs LAN/IPC. `@` files and `/` skills remain samples (W11) |
| Preview, screen, builds | LAN port list and preview, view-only PC screen, APK discovery/download | No managed worktree dev servers/checks/deploy (W12), remote input or real phone panel (W19) |
| Capture and boards | File thoughts, pictures, project routing; board selection and desktop shift-enter open task composition; W4 confirms starts/claims | Race, night shift and group execution remain samples (W20) |
| Settings | Durable local defaults and sample toggle; existing account and notification plumbing | Voice, actionable delivery/routing, recipes/rule sync, usage/account policy, checkpoints and share/crash automation remain W13–W18 |

Sample mode is off by default. Sample cards remain previews; they never contribute to
real header or navigation totals. Sample actions do not confirm host execution.

## Agreed wiring order

W1 → W2 → W3 → W4 → W5 → W6 → W7 → W8 → W9 → W10 rebuild → W11 keys search
→ W12 previews/deploy, then W13–W20.
W21 stays deferred. Counts establish trustworthy status first; project commands are
the next concrete phone-to-PC action. Structured answers precede task receipts and
worktrees. Durable events precede streaming, approvals and dispatch controls.

The user approved W1 after the behavior review, then explicitly requested W2–W7 and
approved W8 approvals after the next flow review. The recorded verification boundaries
remain in force: no live Claude tasks; Claude uses fixtures, Codex uses fixtures and
live phone-to-PC checks. W9 is complete. The user moved the controller/desktop rebuild
to W10, before keys search (W11) and previews/deploy (W12), so later work lands in the
separated apps. See [desktop-rebuild.md](desktop-rebuild.md) and current `TASKS.md`;
legacy canvas/spec/source W10–W20 references map to W11–W21 after this insertion.

## W1 behavior

- One pure `src/lib/deskCounts.ts` supplies the nav island, desktop sidebar and both
  Desk headers. One root `DeskStatusProvider` keeps the source alive across routes.
- Waiting is unarchived blocked entries plus host-reported waiting runs. Working is
  only host-reported running runs. Counts are global even when run cards are scoped
  to a project. IDs are deduplicated within each source; samples are excluded.
- A successful empty read means zero. Initial reads, disconnected hosts, malformed
  snapshots and failed queries produce unavailable totals, never cached numeric
  success. Navigation hides an unavailable badge; Desk explains the state.
- Failed reads offer **retry counts**. Disconnected hosts offer **reconnect**. Both
  wait for a successful read before showing totals again. Failed entry reads also
  suppress the combined total.
- Mailbox counts say **snapshot** with freshness. The existing heartbeat expiry rule
  hides expired snapshots. A host run-read failure does not refresh the old heartbeat;
  queued requests can still be handled. Heartbeats no longer truncate runs at twenty.
- Real waiting run cards say **needs you at the pc**. Sample approval cards and
  sections containing sample runs are marked as samples. W8 will introduce verified
  runtime requests; W1 does not invent them.
- A question answer or run update changes counts after the existing confirmed write
  and refetch/invalidation path. No optimistic decrement or invented host success.

### Surfaces and protocol

Touches Main, DeskHome, shared nav/sidebar badge, waiting cards, host freshness copy,
run-list reads and heartbeat publication. Run/detail screens share the persistent run
source. `GET /runs`, desktop IPC and `cellar_desks.runs` keep their existing protocol;
responses are validated before use. No database schema or auth changes.

Canvas HTML, canvas metadata, `screens.md` and `keys.md` retain their preexisting
uncommitted contents. Only small availability/recovery text and controls change UI.

### Verification

- App: 76 suites / 832 tests; TypeScript and lint pass. Desktop: 30 tests,
  TypeScript and bundle build pass. Web export succeeds locally; not deployed.
- Signed HTTP integration uses the real host router and Runs class with controlled
  agent rows: working/waiting aggregation, failure with retained cache, recovery,
  and unsigned-request refusal. Pure tests cover answer/resume updates, duplicate and
  sample exclusion, loading/error/offline, malformed snapshots and mailbox expiry.
- Heartbeat tests cover more than twenty runs and a failed poll preserving heartbeat
  age while still reading the mailbox. These are controlled tests, not production
  database writes or live approval requests.
- Android release `cellar-v1.12.0.apk` built, installed in place and launched. Physical
  phone on LAN showed Michu's confirmed empty list as `0 working · 0 waiting on you`.
- A separate read-only QA host, temporarily paired on the phone, returned actual
  local run reads. Injected read failure showed **counts unavailable**, retry restored
  confirmed zeros, host stop showed **disconnected** without totals, and reconnect
  restored confirmed counts. No agent start, approval or entry edit was sent.
- Original Michu pairing restored; original desktop process kept running. Temporary
  QA host stopped. No relevant error in the checked phone process log. Nonzero counts
  and mailbox expiry were verified by controlled tests, not fabricated live tasks.

GitHub push, PR publication and web deployment remain pending explicit authorization.

## W2 — project jobs and test reports

The PC discovers npm scripts and the local Gradle release wrapper. Tiles, a bare
`$command` in a new task or run chat, and project settings use that real catalogue.
Commands run as processes, without an agent turn. Chains stop on a failed step.
`/save-command check = npm:lint + npm:test` stores an account-scoped project override;
settings reads the same file. Mailbox command delivery is unavailable and says so.

The host acknowledges an actual process spawn; only an observed zero exit becomes
done. Failed, stopped and restarted-without-exit jobs retain those distinct states.
Readable test reports parse Jest, Vitest or Node TAP totals from the visible log.
They describe the latest reported suite, never an inferred result for the whole
chain. Unsupported, incomplete and truncated output remains available as raw text.
Interrupted LAN replies report the PC unavailable; a confirmed read restores the report.

Verified: 852 app tests, types/lint/web export and 37 desktop tests/types/build.
Phone starts actual Cellar `$test` on the updated, signed-in Michu host: 852 passed,
0 failed, 0 skipped, duration and selectable raw output. Chat saves a project override;
settings loads it. Real phone `$apk` shows Gradle BUILD SUCCESSFUL and observed exit 0.
Windows wrapper quoting and Java detached-process output defects have regression coverage.
Early isolated QA used an account fixture; final jobs use the real account and project.

## W3 — exact choices and note

`answer_picks` stores exact option texts; `answer_note` stores free text. Null picks
mean a legacy prose answer; an empty list means a new free-text answer, so mentioning
an option in a note cannot silently select it. The readable `answer` remains for old
clients. Invalid/empty writes fail; app drafts clear only after a confirmed save.
The existing `unblocksEntry` rule is unchanged.

The user applied `supabase/desk-w3.sql`. Physical phone saved B+C with the note
"exclude Alpha" and showed B/C checked with A unselected. Shared new MCP formatting
returns exact choices, the separate note and an explicit several-options line in
both entry briefs and answer checks. App tests: 849; MCP tests: 37; types/lint and
the exact Deno edge bundle pass. Temporary QA question archived after verification.

Hosted MCP function deployed with explicit authorization. Live `cellar_get_entry`
returns exact B+C, the separate note and several-options line. `cellar_check_answers`
also responds successfully. W3 is verified; website deployment and GitHub remain pending.

## W4 — confirmed task handoff

New task and start-on-PC send project ID, checked folder, agent, permission mode,
checkout choice and every attachment ID, with one durable UUID command ID. Fresh
tasks require protocol v2. Unsupported worktrees or Antigravity modes are refused
before launch. Claude modes map to manual/acceptEdits/bypassPermissions; Codex maps
to read-only/workspace-write/explicit full access. Phone approvals remain W8.

The PC persists intent before claiming or launching. Repeated IDs return the same
confirmed run; changed payloads are refused. A lost launch reply or interrupted
host leaves unknown, never an automatic replay. Proven pre-launch refusals release
reservations and permit a fresh explicit retry. Phone persists pending payloads
per account/PC; only confirmed starts leave the queue. Confirmed batch prefixes
never replay. Safe editing discards only a proven-unstarted remainder.

SQL claims lock all owner-visible attachments together, validate project/state,
then reserve them with the command ID. Failure rolls back every claim. Open entries
may carry an agent author stamp; it is not an active claim. Ordinary finish/unclaim
clears the reservation. Ambiguous claim/launch responses retain the original ID.
Mailbox requests carry the same payload and recover taken starts from disk receipts.
Restart never launches a taken request again.

Verified on physical phone and signed-in Michu: actual Codex read-only output and
observed exit; two attachments reserved together; dropped confirmed response plus
app restart recovered run b8a96577 with one POST; queued mailbox start while PC
offline became run bc48be4e after restart, with W4_MAILBOX_OK output. A repeat handoff
of a reserved entry produced failed receipt and safe-edit UI, without launching.
Both temporary entries are archived. The explicitly authorized QA proxy is stopped;
original Michu pairing restored. Updated PC app runs from
`C:/ping/cellar-desktop-ready/win-unpacked/Cellar.exe`; final Android 1.12.0 installed.

852 app tests, 37 desktop tests, 37 MCP tests, types/lint, local web export, desktop
package and Android release pass. PostgreSQL migration tests cover reruns, rollback,
RLS isolation, competing reservations and normal release/reclaim. UI/canvas baseline
preserved; recovery feedback and permission explanations are functional additions.
All source commits remain local. Only the authorized MCP function was deployed.

## W5 — Git-confirmed worktrees

New task defaults to a separate `wt/<task-slug>-<workspace-id>` branch from local
`main`. The host checks the linked account/project/repository before reserving
entries, stores workspace identity before Git creation, and launches the selected
agent inside that folder. Proven trust refusals reuse the same workspace on an
explicit retry; unknown starts never replay. Existing checkout edits stay there.

Managed folders live under `<host workspace>/.cellar-worktrees`, with short owner,
project and UUID directories for Windows paths. Metadata/receipts remain in app
data. Windows sandbox agents receive exact-folder `safe.directory` through their
child process environment, preserving inherited Git configuration. No global Git
trust or sandbox permission changes. A Git creation failure is a proven refusal
before agent launch, even if the PC must inspect partial Git preparation.

Project panels read actual Git registrations, branches, local changes, locks and
kept state. Missing external folders remain individually unavailable; they neither
disable healthy project creation nor get pruned. Failed/disconnected reads hide
cached rows. Samples stay explicitly labelled.

Every run under the source folder must have a confirmed finished state. Keep
retains the folder, including local changes. Merge requires clean unlocked source
and checked-out main, no active/unknown main run, and fast-forward history. Remove
requires a clean unlocked tree with no unmerged commits; Git removes only the
folder/registration, retaining branch and commits. Review tokens bind source and
target commits, paths, local-change checks and run states; confirmation rechecks.
No force removal, automatic conflict resolution or implicit checkout/stash.

Lifecycle intent is persisted before effects. Confirmed/failed/unknown/pending
states stay distinct; restart during an action becomes unknown. Phone retains
pending UUIDs across restart and recovers the original owner-scoped receipt.

Verified: 855 app tests, 46 desktop tests, lint/types, local web export, desktop
package and Android release/install/launch. Actual Git tests cover clean merge,
dirty/unmerged/divergent/locked refusal, active/unknown runs, stale reviews,
account isolation, trust retry and signed LAN/IPC receipt recovery.

Physical phone on signed-in Michu started Codex read-only run `5d5a00e2` in a real
worktree. Both Git commands succeeded: its `wt/` branch and SHA
`8fc76df22aaff0432aa984c6a75f2240d2aa253f` matched local main. Phone Keep/Remove
confirmed actual Git effects; Merge refused because production main was not
checked out. Dropped Keep response, phone restart and host restart recovered
receipt `fe6830b2-4b3b-43bd-89de-3ae10e137696` with one action POST and one receipt
GET. Desktop project panel showed the same live catalogue, kept/local-change and
missing-folder states. QA proxy stopped and original pairing restored.

Standalone Codex CLI 0.162.1 hit a machine runtime ACL refresh error while another
session held `node_repl.exe`. The installed Codex app runtime passed the same
read-only sandbox check; final local host uses that binary through process PATH.
Failed command outputs remained visible; an agent's marker alone was never counted
as successful verification. Current host runs from
`C:/ping/cellar-desktop-w5-final-host/win-unpacked/Cellar.exe`; Android 1.12.0 installed.
Canvas/spec edits preserved byte-for-byte. GitHub and website deployment remain pending.

## W6/W7 — durable turns and synchronized streams

The PC stores owner-scoped, contiguous numbered events in `events.sqlite` using
`node:sqlite`. Catalogues, stable turn-item projections, source byte cursors and
Claude partial-message state survive restart. Projection and cursor updates commit
together. Tool deltas update one item; complete UTF-8 lines advance the cursor.
Large JSON rows and Unicode remain intact; replaced/truncated sources fail visibly.
Assistant text splits only at safe Markdown block boundaries, retaining fenced code,
lists and tables. Full tool input/output remains selectable and expandable. Repeated
CLI diagnostics fold into readable rows without discarding their text.

New Claude tasks use managed print-mode stream-json with partial events; Codex uses
JSON events. Existing Claude sessions read their original transcripts. Old plain
logs retain an explicit legacy label and unknown item status; jobs keep exact raw
output for the existing reported-test parser. A tool with no confirmed result stays
unknown after its run ends. Process completion and failed individual tools remain
separate facts. Runtime permission requests still require W8.

A signed LAN request or desktop IPC requests a 60-second, one-use event ticket.
The websocket binds to the signed-in account and current pairing key, rechecking
both while sending. Desktop uses loopback; phone uses the existing LAN address.
One shared socket per account/PC/client supplies every run view and the global
catalogue. Snapshot -> replay -> synchronized must finish before output/counts are
live. Duplicate events are idempotent; a sequence gap fails and reconnects. Fresh
tickets, heartbeat/watchdog and bounded retry handle disconnect/background/resume.
Run/log polling is disabled for capable hosts; legacy hosts retain their protocol.
Discovery and command-catalogue queries keep their existing schedules. The mailbox
and remote heartbeat snapshots retain their existing behavior.

MMKV retains recent account/PC-scoped chats and the resume cursor. Saved content
requires explicit View history and carries its received timestamp. It renders even
after a cold phone restart with no live capability response. Offline/unsynchronized
run status is unknown; saved content never confirms current host state. Live output
returns only after synchronization. Sample run IDs cannot bypass the sample toggle.

Verified on physical phone and signed-in Michu: checkout/read-only Codex task
`723f02fa` renders W6 Markdown results; `pwd` confirms actual folder and exit 0,
while `exit 7` remains a failed tool with full output. Host shutdown hides live
output; explicit history survives a cold phone restart. Restart restores live
synchronization automatically. SQLite epoch
`086764df-950f-4a8b-bf18-a982fa9176e5`, sequence 2576 and unique item IDs survive
that restart unchanged. Phone background/foreground resynchronizes. Desktop chat
shows the same turns; existing command-job reports still parse their recorded totals.
No live Claude task was sent, per the user's token constraint. Claude partial/final
message and tool-result normalization is verified with recorded-shape fixtures.

862 app tests and 52 desktop tests pass, including signed snapshot/replay/live,
shared-socket routing, gap handling, one-use/expired tickets, account/key revocation,
read failure, durable restart, partial Unicode and interrupted-tool status. Lint,
both TypeScript checks, local web export, desktop bundle/package and Android release
pass. Android 1.12.0 is installed and launched with no process-scoped error log.
Current local host: `C:/ping/cellar-desktop-w6-w7-final/Cellar.exe`. Existing canvas,
metadata, keys and screens edits remain byte-for-byte unchanged. Source commits
stay local; GitHub push, PR publication and web deployment remain unauthorized.

## W8 behavior and verification

Agreed scope: real runtime approvals for fresh Cellar Claude/Codex tasks, durable
first-answer-wins responses, the existing waiting dock, linked entry questions and
truthful disconnect/restart recovery. Preserve the visual clone and the user's
preexisting canvas/spec edits. Notifications remain W14 and dispatch remains W9.

Fresh complete tasks use the installed Claude executable through pinned Agent SDK
0.3.296 (`canUseTool`) or installed Codex 0.162.1 through its stdio app-server. No
model is pinned. Ask first maps to Claude `default` and Codex `untrusted` plus
`read-only`; edits ok maps to `acceptEdits` and `on-request` plus `workspace-write`;
full access maps to explicit `bypassPermissions` and `never` plus
`danger-full-access`. Codex uses `approvalsReviewer: user` so auto review cannot
silently replace a requested human decision. Existing provider allow/deny rules
still apply; a provider action that does not ask never creates an invented request.

The host stores actual request identity, run/account, subject, effect, supported
broader scope, state and first decision in `approvals.sqlite`. A signed LAN POST or
desktop IPC uses the same `/approval-answers` handler. The transport supplies the
answer source; client text cannot impersonate a PC answer. The SQLite claim and
answer receipt commit before the provider callback runs. Another command cannot
win the same request. Resending the same UUID/choices returns its original receipt;
changing that UUID's choices is refused. Receipt GETs are account-scoped.

Codex command, file-change and granular-permission requests retain provider scope.
File proposals display available path/diff details. Session grants appear only
when supported: Codex command decisions honor `availableDecisions`, granular
permissions copy the exact requested profile, and Claude only offers exact
session-scoped allow-rule suggestions. File-change requests have no broad grant.
Granular Codex permission approval explicitly says it applies to the turn.
Unsupported native question requests are refused with explanatory copy; linked
Cellar questions keep their original stored record and W3 confirmed write path.

Pending becomes answering while delivery is unconfirmed. Codex confirmation waits
for the matching `serverRequest/resolved`; Claude confirmation records the host's
accepted permission callback result. This confirms the decision, not tool success.
Actual tool items/exit codes still determine execution results. A lost/late provider
acknowledgment remains unknown and blocks a second authorization; a late live
acknowledgment can confirm the original receipt. Restart expires unanswered requests
and keeps in-flight answers unknown because original callbacks cannot be recovered.
Neither is replayed. Interrupted/disconnected managed runs cannot imply a successful
or failed turn without a provider result. Confirmed stop remains a separate state.

Approval projections travel through the existing durable epoch/sequence stream.
New clients subscribe with `approvals: true`; older clients receive compatible
catalogue events at the same sequence rather than an unknown event kind. Older
hosts retain the explicit PC-only waiting state. Offline/unsynchronized clients
hide current approval actions and offer reconnect; saved chats do not authorize.

The existing run dock and wide Desk waiting area display real approval panels.
Tabs retain mounted question drafts; the composer and unconfirmed answer UUIDs
persist in account/PC/run-scoped MMKV. Repeated taps are disabled. Recovery reads
the original receipt before resending the same answer. Both Run and wide Desk keep
receipt recovery available after a decision event arrives ahead of its HTTP reply.
Sample approvals remain visibly separate and never authorize real host requests.

Verified on physical phone and signed-in Michu:

- Codex run `1e3f6a20`: actual write request appeared with exact command/reason;
  marker absent before Allow once, decision confirmed from phone, command exit 0
  and expected marker contents verified independently
- Codex run `509a9295`: Deny confirmed, tool marked failed, denied marker absent;
  the agent's completed turn remains separate from its refused tool action
- Codex run `5c5f4bf3`: cold phone restart restored the same pending request
  `77b9f07d-bf63-492a-b338-2db0e5571d67`; host shutdown hid approval controls and
  showed disconnected/unknown; host restart expired that exact callback, left the
  run unknown and did not create the marker
- Composer draft `W8_draft_keep` survived cold phone restart and APK replacement
- Desktop home displayed the same actual runtime approval and waiting count
- Final capability-aware APK/package run `adac981b` displayed the actual request
  without a duplicate prompt tool row; Deny confirmed and its marker remained absent

Automated coverage includes signed HTTP/websocket delivery, competing phone/PC
answers, original-receipt recovery after a lost reply, changed-choice refusal,
account isolation, exact grant scope, late confirmation, cancellation, restart
expiry and real stdio request/acknowledgment fixture sequencing. PC bridge source
attribution is tested through `DeskHost.request`. Legacy event subscribers retain
valid sequence continuity. Claude callbacks use fixtures only; no live Claude
task was sent. A physical dropped-reply proxy was not used: automatic approval
review rejected the LAN listener, and the safer loopback alternative was refused
by the existing pairing validator. The proxy and ADB reverse mapping were removed;
physical phone retained its original pairing. Lost replies are verified in the
signed HTTP/receipt tests, not claimed as a physical proxy test.

864 app tests and 59 desktop tests pass. Lint, both TypeScript checks, local web
export, desktop bundle/package and Android release pass. The standalone APK is
installed and launched. Local host: `C:/ping/cellar-desktop-w8-final/win-unpacked/Cellar.exe`.
The seven protected canvas/spec files retain their initial SHA-256 hashes. Source
work remains local; publication is still pending under the earlier authorization
boundary. Next wiring task is W9.

Provider references: [Codex app-server](https://learn.chatgpt.com/docs/app-server),
[Claude SDK user input](https://code.claude.com/docs/en/agent-sdk/user-input), and
[Claude SDK permissions](https://code.claude.com/docs/en/agent-sdk/permissions).
Installed generated Codex schemas and pinned SDK types/code determine exact enum
spellings and supported response shapes when online examples differ.

## W9 — retained chat, dispatch and Stop all

Completed 2026-10-12 on `feat/desk-w9`, retaining the accepted UI. `deskDispatch.ts`
defines the shared validated controls and queue model. The host's `ControlStore`,
`Dispatch`, `Controls` and `ManagedRuns` own effects; clients retain requests/drafts
under their account/PC/run scope. No database schema or additional transport was added.

Controls save a UUID before effects. Duplicate requests and lost replies recover that
receipt; a different payload cannot reuse it. Busy Send queues FIFO; idle Continue
uses the retained provider conversation and workspace. Queue rows save the actual
agent/mode and explicit provider-default model/effort, rather than inventing settings.
An accepted queue receipt means the PC saved the message, not that a tool or turn succeeded.

Queue edit/cancel check revisions. Send now interrupts first, then delivers the selected
message in the same conversation; an ambiguous provider result remains unknown. Codex
0.162.1 lacks T3's background-terminal termination method, so the fallback stops the
private owned app-server tree before resuming its persisted thread. Process names or
global CLI searches never authorize kills. Claude uses injected SDK fixtures only.
Reference: T3 adapter source at `bed923986fbcbe8279f23b9367efde1596bde1f9`, recorded
in `t3code-notes.md`.

Stop targets one owned run. Stop all from phone, desktop or tray coordinates every
account host through the existing mailbox, with separate host/run results. Offline
hosts stay pending; historical or external sessions without an owned runtime fail
explicitly. No blanket “all stopped” claim is made from partial results. When local
results are known, an explicit new Stop all gets a new UUID even while an older remote
stop is pending. The client archives the old pending receipt; background recovery still
uses its original UUID. Missing receipts and uncertain local effects keep recovery mode.

Restart never silently resends queued or claimed provider effects. Saved queue items
become unknown and explain the unavailable original chat. A prior send receipt continues
to describe acceptance at the time it was written; the live queue describes current
delivery uncertainty. Pending controls recover their original UUID, and uncertain local
stops do not become confirmed. Composer drafts survive cold phone restart and replacement
APK install, and clear only after confirmed message acceptance.

### Verification

All live tasks below used bounded read-only Codex QA. Claude remained fixture-only.

| Check | Evidence |
| --- | --- |
| Phone Continue/FIFO | Earlier `36d39b56` continued with a real reply; `901f10e7` queued and delivered `W9_CONTAINED_PHONE` once after its approved command finished |
| Phone edit/cancel/Send now | `c6fd6308`: queue `17c66d04-711e-4e0c-bfc8-5b3b26c064c4` edited at revision 1, promoted to delivered revision 2; cancelled item `51dc75cc-3fdb-4284-91b7-7d4dd0ea1ab6` retained cancelled revision 1; owned command PID 2940 and provider PID 29372 exited before `W9_EDITED_PHONE` replied |
| Single-run phone stop | `c3ada845`: approved command PID 6276 and provider PID 19660 exited; stop receipt `bd9cb498-c8f9-46a5-a7be-47ed9655bdeb` confirmed; interrupted tool became failed |
| Desktop Stop all | `8c6e7e5b`: command PID 24064 and provider PID 31492 exited; PC receipt `cbbf0494-c6a1-4868-bec4-750c49ac4c55` confirmed this run separately from unsupported runs and offline host |
| Phone Stop all | `cdc3e8d5`: command PID 28156 and provider PID 24864 exited; phone receipt `92cc0ac6-afae-4f28-bc71-1ea89110aeb5` retained partial/offline results |
| Tray Stop all | User clicked the actual tray action; receipt `91b4f694-fbe6-4241-ab01-0d2b26c89d78` stopped `9a9c8623`, expired its pending approval and left no owned provider. Its command was never approved/executed; this is not a running-command containment claim |
| Host and cold phone restart | `94c997ce`: phone queued `acd0796e-0a4b-418e-95b6-89654126c3a1` and saved draft `W9_RESTART_DRAFT_KEEP`; controlled termination of the verified Cellar tree removed command PID 28704 and provider PID 29324. Cold phone showed disconnected/explicit saved history with draft intact; rebuilt host restored queue as unknown, run unknown, chat unavailable |
| Duplicate after restart | GET and duplicate POST for the same send UUID returned the identical original acceptance receipt; no replacement message or provider launched. Epoch `086764df-950f-4a8b-bf18-a982fa9176e5` persisted, sequence advanced 2869 → 2874; original tray Stop all UUID retained offline pending and local partial results |
| Rebuilt-app regression | Installed phone stopped new run `2733317c` using fresh receipt `26955706-6133-4e75-86d5-636c326aba9c`, despite old remote pending; command PID 33528 and provider PID 28536 exited. Rebuilt desktop stopped `73ddee33` with fresh PC receipt `100258eb-1267-466c-8b0f-c6216fb3ffb8`; pending approval expired, provider PID 32444 exited |

The reachable host was `fdc08940efe02b5c`; account host `02da56786abe3b95` was offline
and remained pending throughout. Historical `5c5f4bf3` and `916e2dba`, plus restart QA
`94c997ce`, remained unknown/unsupported rather than falsely stopped. Final UI reported
one confirmed stop, three unsupported/unconfirmed runs and one pending host. Physical
two-online-host testing was not performed; mailbox pickup/confirmation, duplicate
delivery and owner isolation are covered by two-host fixtures. Earlier `44e90ea6`
exposed the descendant bug and is not cited as successful containment.

Final checks: 86 app suites / 871 tests, 68 desktop tests, lint and both TypeScript
checks pass. Desktop process-tree fixtures need normal Windows process permissions;
the sandbox-only invocation failed to terminate its own fixture, which was cleaned up
by exact verified PID before the successful rerun. Local web export, Electron bundle,
Windows x64 package/NSIS installer and Android release build pass.

APK `android/app/build/outputs/apk/release/cellar-v1.12.0.apk` was replacement-installed
on serial `00166152F003681`, launched and verified running without Cellar boot errors.
Release remains 1.12.0 / Android versionCode 14. Desktop package is
`C:/ping/cellar-desktop-w9-final/Cellar Setup 0.1.0.exe`; its unpacked payload refreshed
the existing reachable `C:/ping/cellar-desktop-w9-qa/win-unpacked/Cellar.exe` and was
launched there with the existing profile/pairing. The NSIS installer was built, not run.
No firewall, pairing or global Git trust settings changed.

Logs, snapshots, exact process records and artifact hashes remain outside Git under
`C:/ping/cellar-w9-qa`. Seven protected spec/canvas files retain their starting SHA-256
hashes. This pass builds local web; website publication remains outside the requested
scope. W10 is next: the desktop renderer/controller rebuild described in
[desktop-rebuild.md](desktop-rebuild.md). Keys search follows as W11; this completed
W9 build still uses the shared web export.
