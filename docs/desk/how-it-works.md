# Desk — how it works

Reviewed 2026-10-10 after M6. The current canvas remains the visual baseline. Pass 2
adds behavior through the existing view models, host API and transports.

## Current flows

| Flow | Works now | Sample or missing |
| --- | --- | --- |
| Reach the PC | QR pairing; signed LAN HTTP; desktop IPC; account-owned mailbox requests and heartbeat snapshots | No websocket/resume yet (W7); SSH deferred (W20) |
| Desk totals | W1: shared global blocked-entry and host waiting-run counts; only running runs count as working | Host `waiting` is coarse: an idle interactive session can need the PC. It is not proof of an approval request (W8) |
| Send a task | Typed prompt, project folder, agent, attached entry context; folder checks, trust refusal, error reporting; basic sequential starts | No durable start receipts, complete mode/worktree payload or claims per run (W4/W5/W8) |
| Follow a run | Polled run list and transcript/log tail, rendered text and tool steps; stop runs started by Cellar | No durable normalized events, live resume, steering or queue dispatch (W6/W7/W9) |
| Answer an entry | Several text picks plus a note, sent as composed answer text; confirmed writes unblock the entry | Structured picks/note fields still W3; runtime deny/allow panels are samples until W8 |
| Commands and keys | `$` finds real projects and entries; hex chips copy/nudge | Command tiles are samples; no jobs (W2). `@` files and `/` skills are samples (W10) |
| Preview, screen, builds | LAN port list and preview, view-only PC screen, APK discovery/download | No managed worktree dev servers/checks/deploy (W11), remote input or real phone panel (W18) |
| Capture and boards | File thoughts, pictures, project routing; board selection opens task composition; desktop enter files and shift-enter hands off | Handoff still needs W4 receipts/claims; race, night shift and group execution are samples (W19) |
| Settings | Durable local defaults and sample toggle; existing account and notification plumbing | Voice, actionable delivery/routing, recipes/rule sync, usage/account policy, checkpoints and share/crash automation remain W12–W17 |

Sample mode is off by default. Sample cards remain previews; they never contribute to
real header or navigation totals. Sample actions do not confirm host execution.

## Agreed wiring order

W1 → W2 → W3 → W4 → W5 → W6 → W7 → W8 → W9 → W10 → W11, then W12–W19.
W20 stays deferred. Counts establish trustworthy status first; project commands are
the next concrete phone-to-PC action. Structured answers precede task receipts and
worktrees. Durable events precede streaming, approvals and dispatch controls.

The user approved **W1: shared real counts and availability rules** before coding.
W2 is the next recommendation, not authorized implementation in this change.

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

Verified locally: 846 app tests, types, lint, 31 desktop tests, desktop types/build
and web export. Phone started the real Cellar `$test` job and displayed its confirmed
841-test result, duration and selectable raw output. Chat saved a project override;
settings loaded that saved override. A phone `$apk` attempt exposed Windows quoting;
the app displayed failed, the launcher was fixed and a wrapper-with-spaces regression
passes. The repeated phone APK build remains under verification; W2 stays in progress.
QA uses a separate host and account fixture, actual scripts, and no production DB writes.

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
