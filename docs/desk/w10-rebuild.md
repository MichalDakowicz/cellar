# W10 rebuild — implementation and verification record

Started from completed W9 at `2c3df94` on dedicated branch `feat/desk-w10`.
W10 verified complete on 2026-10-13. Implementation, independent packaging,
preserved-profile migration, final native visual checks and live W9 regression
checks below pass. W11 keys search has not started. No release or web publication
is part of this task.

## Boundaries implemented

- Native phone and controller web select their role at the entry point. Width
  selects layout only. The web pairing store is memory-only and holds no LAN key.
- Desktop IPC/session handoff, pairing issuance and the ADB presenter route were
  removed from the controller graph. Wide controller layouts remain available.
- Pure host calls, stream reduction, view models and design tokens are shared.
  DOM components and their auth/storage/navigation stay in `desktop/src/renderer`.
- Vite checks its transitive module graph for Expo, React Native, platform screen
  trees, host modules, provider SDKs and Node builtins. A module manifest is emitted.
- IPC accepts only the current top-level Cellar renderer and typed GET/POST
  requests. Embedded previews cannot call the bridge. Desktop preview tickets use
  loopback; the phone retains its LAN URL and one-use ticket rules.
- Browser visual previews are development-only, use no persisted auth session,
  and block database/function/sign-in operations.

## Migration identity

The renderer retains `cellar-desk://app`, the existing Electron application ID,
product name and normal profile. Supabase uses the same unprefixed auth keys as
the previous AsyncStorage web adapter. The renderer remains the only refresh-token
owner; only access token and user ID reach the host.

Preferences update the original MMKV web namespace (`cellar\<store>`) and preserve
unknown fields and envelope versions. Theme retains the separate
`cellar-theme\theme_preference` key and shared account setting. Durable records use
the original keys for task batches, worktree actions, approvals, drafts and controls.
History/cursors retain the W9 `owner:host:bridge:` key, including its trailing colon.
Missing replies retain their UUID; only confirmed prefixes leave task batches.

No profile reset, pairing-key rotation, SQLite replacement or firewall change has
been performed. The original W9 payload is preserved at
`C:/ping/cellar-desktop-w9-qa/win-unpacked-w9-backup`. The W10 payload now runs at
the original reachable path, `C:/ping/cellar-desktop-w9-qa/win-unpacked/Cellar.exe`,
using `C:/Users/MSI/AppData/Roaming/Cellar`.

## Verification so far

- Root: 90 suites / 883 tests, lint and TypeScript pass. Desktop: 76 tests,
  host/renderer TypeScript and independent lint pass. Process containment runs with
  normal Windows process permissions. Controller boundary tests pass (2).
- JDK 21 Android release replacement-installed on physical phone `00166152F003681`,
  version 1.13.0 / code 15. It launched after unlock with original account/inbox.
  APK SHA-256: `5440911036D558E8E7CCE1ED025E14125CF9883B9C4ACA3F4C42F35FF87C7DED`.
- Actual web export maps: 3937 modules; actual Android release map: 4370 modules.
  Both reject local host/IPC/ADB imports and report zero forbidden modules.
- Desktop host and Vite renderer build with root `dist/` absent. Windows x64/NSIS
  packaging passes. Final package: `C:/ping/cellar-desktop-w10-final`.
  ASAR contains 4765 files and zero Expo Router/React Native/mobile screen imports;
  renderer graph contains 1988 modules. All eight installed renderer files match
  the final package byte-for-byte. Installed and packaged host ASAR SHA-256:
  `8090DB669B1710F679D061B94A2CB76C6574429AE2D35B462C4F35D8110228B0`.
- 13 DOM surfaces have background browser smoke screenshots; no global overflow at
  1440px. Approval light state, folded tools, rails, queue popout and deliberate
  380px desktop layout inspected. Loading/empty/working/failed/unknown/disconnected
  and explicit saved-history states captured. Native W9 capture/home inspected;
  capture layout, glyph gutters and today figures adjusted to that baseline.
- Matching controller approval at 320px is pixel-identical to W9. Wide light chat
  retains run/preview rail and intentionally removes the attached-phone presenter.
  Browser fixtures are not evidence of native IPC, credential migration or process
  effects; those require the preserved-profile desktop and physical controller.
  The 390px recapture had a browser screenshot clipping error despite zero DOM
  overflow; it is not counted as a pixel match. Physical phone screenshots confirm
  the real controller layout. No claim of pixel identity across every DOM surface.
- 36 protected canvas/spec references still match their initial SHA-256 values.

## Preserved-profile and live acceptance

The installed DOM app retained the signed-in account, `apps` shelf, theme, original
capture data, commands, historical runs and the original pending Stop all receipt.
Host ID remains `fdc08940efe02b5c` / Michu. `desk.json`, `worktrees.json` and
`worktree-receipts.json` retain their exact pre-migration hashes. SQLite history and
durable controls were opened in place, never replaced. A contract test reads the
installed MMKV adapter's real separator rather than assuming the migration fixture.

- Original W9 draft `W10_MIGRATED_DESKTOP_DRAFT_KEEP` is visible under run
  `c6fd6308` in the new renderer. An initial check opened the wrong historical run;
  the original draft was not lost. The new desktop draft under `cb852e7c` survived
  renderer reload and host cold restart. A read-only LevelDB audit decodes only the
  draft envelope and confirms both markers. The first unblurred accessibility
  replacement was not counted; normal typing, blur and reload were used instead.
- Run `71366a19`: physical phone allowed the exact bounded read-only PowerShell
  sleep. Desktop queued `003ba5ec-daf8-48b1-b650-169ae08f7186`; phone queued
  `96f696fd-acef-4480-944c-bbcff2553bd8`. Desktop edited the first to revision 1,
  cancelled the second, and promoted the first to delivered revision 2. The old
  provider and sleep child exited. Transcript records interruption before the
  edited message, then `W10_PROMOTED_OK`; the cancelled text never reached it.
- Run `ccc746f5`: desktop approval and desktop Stop all passed. Provider PID 8464
  and child 34976 exited. Run `920d7460`: phone approval and phone Stop all passed;
  provider PID 25212 and child 10180 exited. Durable Stop all UUIDs are
  `79931abd-bdd9-450a-b962-ba357fb2d359` (PC) and
  `ef096826-905d-4237-b35e-4822581b571b` (phone).
- Run `cb852e7c`: crash of the verified Cellar host killed owned provider PID 42592
  and sleep child 23980. Phone cold restart retained `W10_PHONE_DRAFT_KEEP`, showed
  disconnected/unknown, and exposed saved output only after explicit View history.
  Pairing reconnected without new credentials after host launch. The run remains
  unknown and queue UUID `6b03bf38-2883-4e5a-8e65-2ed8f55d48d7` becomes unknown,
  unavailable and not replayed. GET and duplicate POST return the identical original
  confirmed queued receipt; acceptance is not confused with execution.
- Original unknown runs `94c997ce`, `916e2dba`, `5c5f4bf3` remain unknown. Offline
  host `02da56786abe3b95` remains pending in Stop all receipts; no success is inferred.
  No live QA provider remains running. The restarted run/queued item deliberately
  remain as recovery evidence rather than being rewritten to stopped or delivered.

All live runs used Codex with one explicitly approved read-only sleep command;
Claude remains fixture-only. Two simultaneously online physical hosts, macOS and
Linux remain test/design boundaries, not live verification claims. Browser retains
mailbox transport limitations; full browser LAN streaming was not added.

QA outputs stay outside Git in `C:/ping/cellar-w10-qa`. Controller web artifact was
moved there to prove independent desktop builds (`controller-web-v1.13.0`). The W9
reference is an isolated source snapshot, not another refresh-token owner. Ports:
5173 DOM, 8134 current controller, 8140 W9 reference. W9 Metro uses IPv6 loopback
because an unrelated IPv4 listener owns port 8090; it was left untouched.

Capture gains durable desktop drafts in separate `desktop-capture` and
`desktop-desk-capture` namespaces; original chat/task/control migration keys remain
unchanged. Samples are presentation data: their IDs never subscribe to a provider
and their commands/approvals/message delivery cannot execute. Unreadable preference
envelopes show a recovery error without resetting saved records.

## Final packaged visual acceptance

After an Escape interruption, the user resumed Computer Use on 2026-10-13. The
installed app at the documented path showed the original account/data/shelf and
restored desktop draft, with synchronized host, unknown restarted run and unreplayed
queue. Dark chat and light capture/settings were inspected; original dark theme
was restored. Native proof screenshots are `native-final-chat-dark.jpg`,
`native-final-capture-light.jpg` and `native-final-home-dark.jpg` in the QA folder.

This pass found settings scroll carrying into Home. The main workspace now resets
scroll when the route changes; chat's internal transcript follow behavior remains
independent. The final Windows package was refreshed at the existing path, reloaded,
and verified by scrolling settings then returning to Home: header and stop receipts
remain visible at the top. Root/desktop tests, lint and types pass after this fix.
Other final polish affects scrollbar styling and sample run labels/IDs only;
provider semantics are unchanged. W10 acceptance is closed. W11 may start separately
using [w11-prompt.md](w11-prompt.md), after normal branch triage.
