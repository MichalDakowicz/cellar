# W9 completed — 2026-10-12

W9 is complete on `feat/desk-w9`. W8 remains complete at `e5a9bef`; W9 checkpoint
`0897a32` was followed by live verification and recovery fix `8a73556`. W10 has not
started. See `how-it-works.md` W9 for behavior, exact run/receipt IDs, process exits,
build evidence and limitations; `TASKS.md` records completion.

## Verified outcome

- Phone run `c6fd6308` verified queue edit/cancel, cold-restart draft retention and Send now.
  Owned command PID 2940 and provider PID 29372 exited before `W9_EDITED_PHONE` replied.
  Edit revision 1, delivered revision 2 and cancelled revision 1 remain durable.
- Previously pending `c3ada845` was approved for its exact bounded read-only command,
  then stopped from the phone. Owned command PID 6276 and provider PID 19660 exited;
  receipt `bd9cb498-c8f9-46a5-a7be-47ed9655bdeb` confirmed the stop.
- Desktop `8c6e7e5b` and phone `cdc3e8d5` Stop all stopped their approved commands and
  owned provider trees. Tray `9a9c8623` was stopped using the actual tray action clicked
  by the user; its unapproved callback expired. Automation verified the PC receipt and
  provider absence. Tray command execution was never authorized or claimed.
- Restart run `94c997ce` queued message `acd0796e-0a4b-418e-95b6-89654126c3a1` from
  the phone, then the verified Cellar host tree was terminated for the recovery check.
  Cold phone restart showed disconnected/explicit saved history; draft
  `W9_RESTART_DRAFT_KEEP` survived both restart and replacement APK install.
- Rebuilt host restored that run and queue item as unknown with original chat unavailable;
  no silent replay. GET and duplicate POST of the same send UUID returned the identical
  original acceptance receipt. Event epoch persisted; sequence advanced 2869 → 2874.
- A real regression was fixed: an offline host's earlier pending Stop all had prevented
  another Stop all from stopping new local runs. Explicit new stops now get fresh UUIDs
  after local results settle, retaining old pending receipts. Background recovery and
  uncertain local effects still use the original UUID.
- Rebuilt phone regression `2733317c` confirmed fresh Stop all receipt
  `26955706-6133-4e75-86d5-636c326aba9c`, terminating command PID 33528 and provider
  PID 28536. Rebuilt desktop `73ddee33` confirmed another fresh PC stop receipt,
  expired its unapproved callback and terminated provider PID 32444.

Account host `02da56786abe3b95` was offline and remains pending. Historical unknown
`5c5f4bf3` and `916e2dba`, plus restart QA `94c997ce`, remain unsupported/unknown,
not successfully stopped. Final Stop all reported one stopped, three unsupported/
unconfirmed and one pending host. Physical two-online-host verification did not occur;
two-host pickup, duplicate safety and isolation use fixtures. Earlier `44e90ea6`
exposed the descendant bug and is not successful containment evidence.

## Checks and installed artifacts

- 86 app suites / 871 tests and 68 desktop tests pass; lint and both TypeScript checks pass.
  Desktop process containment tests passed with normal Windows process permissions after
  the sandbox-only invocation could not kill its own fixture. That exact fixture was cleaned up.
- Root local web export, Electron main/preload build, Windows x64 package/NSIS installer
  and JDK 21 Android release all pass. Version remains 1.12.0 / Android versionCode 14.
- `android/app/build/outputs/apk/release/cellar-v1.12.0.apk` replacement-installed on
  serial `00166152F003681`, launched and verified running without Cellar boot errors.
- Built `C:/ping/cellar-desktop-w9-final/Cellar Setup 0.1.0.exe`; its unpacked payload
  refreshed the existing reachable desktop path below. NSIS installer was not run.
  Source and installed `app.asar` hashes match. Existing profile, pairing and host ID retained.
- Accepted UI preserved. Seven protected spec/canvas files retain their initial hashes.
  Website publication is outside this requested pass; local web build was verified.

## Environment and boundaries for the next task

Use `C:/ping/cellar-desktop-w9-qa/win-unpacked/Cellar.exe`, normal Cellar profile,
host `fdc08940efe02b5c`. A different executable path previously caused phone LAN
timeouts while loopback worked. Keep this reachable path; do not change firewall,
pairing, global Git trust or credentials to work around a local test problem.

Installed Codex 0.162.1 lacks T3's newer background-terminal termination API. W9
interrupts, terminates only its private owned app-server tree, then resumes the same
persisted thread for Send now. Consult `t3code-notes.md`, pinned adapter source
`bed923986fbcbe8279f23b9367efde1596bde1f9`. **Claude remains fixture-only.**

Evidence/scripts/logs remain outside Git in `C:/ping/cellar-w9-qa` and `cellar-w8-qa`.
`inspect.mjs` reads a signed snapshot; `observe-phone.mjs` reads Android UI hierarchy;
`read-controls.mjs` reads local durable receipts. Secrets stay in the normal profile,
never in docs or Git. No approved bounded QA command/provider remains running.

The user chose phone controller + desktop host, Windows first with future macOS/Linux
possible. `desktop-rebuild.md` records mobile/web cleanup and a dedicated Electron /
TypeScript / React DOM / Vite desktop renderer, retaining Cellar's look and existing host.
This is planned work, not implemented by W9. W10 remains keys search; keep new pure
search/domain contracts reusable and do not merge a full renderer rewrite into it.
Ready-to-paste continuation: `w10-prompt.md`.
