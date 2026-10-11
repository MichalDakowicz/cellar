# W9 checkpoint — 2026-10-11

User requested committing all changes and pushing a branch, then continuing tomorrow.
W8 is complete at `e5a9bef`. W9 remains in progress; do not mark it complete from this
checkpoint. The existing canvas/spec edits are included without changing their contents.

## Behavior implemented

- The existing host protocol carries durable control UUIDs and account-scoped receipts.
  Requests are saved before effects. Recovery reads the original receipt; uncertain
  provider effects are not replayed. A queue receipt confirms PC acceptance, not an
  agent reply or successful tool result.
- Managed Claude/Codex chats retain their provider conversation between turns. Busy
  Send queues; idle Continue uses the same available conversation and workspace.
  Restarted or released sessions explain unavailability rather than inventing recovery.
- The existing queue popout shows real messages and saved provider-default settings.
  Edit/cancel use revisions. Send now interrupts before delivering the selected message.
  Unknown delivery stays visible. Composer drafts clear only after confirmed acceptance.
- Single-run stop and stop-all use durable controls. Account-wide stop coordinates local
  owned runs and remote hosts through the existing mailbox; offline hosts remain pending.
  Unsupported external or historical runs produce explicit failures, never guessed kills.
- Phone, desktop and tray use the same control facade. No new schema or transport was added.

Consult [T3 Code](https://github.com/pingdotgg/t3code) for custom-chat work as required in
`CLAUDE.md`; pinned source and adaptation notes are in `t3code-notes.md`.

## Verification so far

- Checkpoint: 85 app suites / 868 tests and 68 desktop tests pass. Lint and both
  TypeScript checks pass. The queue edit state cleanup is included in these checks.
- Fixtures cover durable duplicate/recovery semantics, FIFO, revision conflicts,
  ambiguous promotion, restart uncertainty, owner isolation and two-host stop delivery.
  Claude uses injected SDK fixtures only. Do not run live Claude tasks.
- Physical phone run `36d39b56` confirmed Continue and a real Codex reply. Its initial
  command failed Windows sandbox setup; do not count that as a successful command run.
- Physical phone run `901f10e7` approved the exact read-only 180-second command, queued
  `Reply W9_CONTAINED_PHONE with no tools`, and displayed the edit controls. At checkpoint,
  the original command completed with exit 0 and the queued message delivered once,
  followed by the real `W9_CONTAINED_PHONE` reply. Queue is empty. No edit was submitted.
- Earlier Send now run `44e90ea6` exposed a real bug: turn interruption left a command
  descendant alive. Do not cite it as successful process containment. The source fix
  passes a real stdio fixture that spawns a descendant and verifies its termination.

## First checks tomorrow

1. Re-read `CLAUDE.md`, `TASKS.md`, `screens.md`, `canvas/updates.md`, `visual-clone.md`
   and this note. Preserve the accepted UI. W9 is the current task; W10 has not started.
2. Finish live Codex Send now verification: approve a bounded read-only long command,
   queue from phone, capture its actual descendant PIDs, promote, then verify those
   exact processes exited before the replacement message runs in the same conversation.
   Installed Codex 0.162.1 lacks T3's newer background-terminal termination API. Cellar's
   fallback interrupts, stops its private app-server process tree, then resumes the same
   persisted thread. Only Cellar-owned live process handles may be terminated.
3. Verify phone queue edit/cancel confirmations and draft retention. Verify one-run stop
   and phone/desktop/tray stop-all; keep partial failures and offline hosts truthful.
   Physical multi-host testing has not occurred; two-host behavior is fixture coverage.
4. Repeat phone cold restart and host restart with a queued or pending action. Keep
   uncertain items unknown; never silently replay them. Historical unknown run
   `5c5f4bf3` is unsupported and must not be reported as successfully stopped.
5. Review the final implementation, update `how-it-works.md` with verified W9 behavior,
   run relevant checks, rebuild local web/desktop and standalone APK, then install and
   launch on the physical phone. Only then check W9 complete in `TASKS.md`.

## Local QA environment

The running host is `C:/ping/cellar-desktop-w9-qa/win-unpacked/Cellar.exe`, using the
normal Cellar profile. A different executable path caused phone LAN timeouts while
loopback still worked. Reuse the reachable path; do not change firewall or pairing
settings to work around it. Its package and the installed APK predate the latest source
adjustments, including stop optimization, interrupted-tool status and queue edit cleanup.
Rebuild before claiming final device verification. Release remains 1.12.0 / Android 14.

Scratch evidence and scripts are outside the repository in `C:/ping/cellar-w9-qa` and
`C:/ping/cellar-w8-qa`. `inspect.mjs` reads a signed snapshot; `start.mjs` starts only a
bounded Codex QA run; `phone.ps1` observes Cellar's Android hierarchy. Credentials stay
in the normal local profile and must not be copied into documents or Git. Android serial
is `00166152F003681`. Use JDK 21 for release builds. Reobserve the current phone app before
typing; native queue popout hierarchy bounds can be clipped even when screenshots and
touch targets work correctly.

The latest bounded QA command finished naturally; no matching sleep process remained
at checkpoint. No new QA work was launched for this checkpoint. Git push is explicitly
authorized by the user; website deployment and a completed-feature PR were not requested.
