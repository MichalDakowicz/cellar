# Desk — how it works

Reviewed 2026-10-10 after M6. The current canvas remains the visual baseline. Pass 2
adds behavior through the existing view models, host API and transports.

## Current flows

| Flow | Works now | Sample or missing |
| --- | --- | --- |
| Reach the PC | QR pairing; signed LAN HTTP; desktop IPC; account-owned mailbox requests and heartbeat snapshots | No websocket/resume yet (W7); SSH deferred (W20) |
| Desk totals | W1: shared global blocked-entry and host waiting-run counts; only running runs count as working | Host `waiting` is coarse: an idle interactive session can need the PC. It is not proof of an approval request (W8) |
| Send a task | W4: full task choices, durable command IDs/receipts, owner-scoped attachment reservations and duplicate-safe recovery over LAN/IPC/mailbox | New worktrees remain W5; runtime approvals on phone remain W8 |
| Follow a run | Polled run list and transcript/log tail, rendered text and tool steps; stop runs started by Cellar | No durable normalized events, live resume, steering or queue dispatch (W6/W7/W9) |
| Answer an entry | W3: exact stored picks and separate note; confirmed writes unblock entries; hosted MCP reads both | Runtime deny/allow panels remain samples until W8 |
| Commands and keys | W2: real project command catalogue, jobs, saved chains and readable test reports; `$` also finds projects/entries; hex chips copy/nudge | Command delivery needs LAN/IPC. `@` files and `/` skills remain samples (W10) |
| Preview, screen, builds | LAN port list and preview, view-only PC screen, APK discovery/download | No managed worktree dev servers/checks/deploy (W11), remote input or real phone panel (W18) |
| Capture and boards | File thoughts, pictures, project routing; board selection and desktop shift-enter open task composition; W4 confirms starts/claims | Race, night shift and group execution remain samples (W19) |
| Settings | Durable local defaults and sample toggle; existing account and notification plumbing | Voice, actionable delivery/routing, recipes/rule sync, usage/account policy, checkpoints and share/crash automation remain W12–W17 |

Sample mode is off by default. Sample cards remain previews; they never contribute to
real header or navigation totals. Sample actions do not confirm host execution.

## Agreed wiring order

W1 → W2 → W3 → W4 → W5 → W6 → W7 → W8 → W9 → W10 → W11, then W12–W19.
W20 stays deferred. Counts establish trustworthy status first; project commands are
the next concrete phone-to-PC action. Structured answers precede task receipts and
worktrees. Durable events precede streaming, approvals and dispatch controls.

The user approved W1 after the behavior review, then explicitly requested W2, W3
and W4. All four are now verified. W5 is next; implementation awaits a new request.

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
