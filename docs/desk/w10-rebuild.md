# W10 rebuild — implementation and verification record

Started from completed W9 at `2c3df94` on dedicated branch `feat/desk-w10`.
W10 remains in progress. W11 keys search has not started. No release or web
publication is part of this task.

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
been performed. The W9 payload remains available as the migration baseline; the reachable path is refreshed only after packaging checks.

## Verification so far

- Root: 90 suites / 882 tests, lint and TypeScript pass. Desktop: 76 tests,
  host/renderer TypeScript and independent lint pass. Process containment runs with
  normal Windows process permissions. Controller boundary tests pass (2).
- JDK 21 Android release replacement-installed on physical phone `00166152F003681`,
  version 1.13.0 / code 15. It launched after unlock with original account/inbox.
  APK SHA-256: `5440911036D558E8E7CCE1ED025E14125CF9883B9C4ACA3F4C42F35FF87C7DED`.
- Actual web export maps: 3937 modules; actual Android release map: 4370 modules.
  Both reject local host/IPC/ADB imports and report zero forbidden modules.
- Desktop host and Vite renderer build with root `dist/` absent. Windows x64/NSIS
  packaging passes; artifact installation and real W10 host checks remain pending.
- 13 DOM surfaces have background browser smoke screenshots; no global overflow at
  1440px. Approval light state, folded tools, rails, queue popout and deliberate
  380px desktop layout inspected. Loading/empty/working/failed/unknown/disconnected
  and explicit saved-history states captured. Native W9 capture/home inspected;
  capture layout, glyph gutters and today figures adjusted to that baseline.
- Matching controller approval at 320px is pixel-identical to W9. Wide light chat
  retains run/preview rail and intentionally removes the attached-phone presenter.
  Browser fixtures are not evidence of native IPC, credential migration or process
  effects; those require the preserved-profile desktop and physical controller.
- 36 protected canvas/spec references matched initial SHA-256 values; repeat at end.

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

## Remaining acceptance

Refresh the documented Windows path/profile; verify native session/preferences,
pairing, drafts, history and worktrees; repeat real bounded Codex approval, queue,
interrupt-before-delivery, owned process containment, offline pending and restart
unknown checks on desktop and phone. Inspect the installed artifact, repeat final
checks/protected hashes, finish task status, commit and push. Claude remains
fixture-only. W10 stays unchecked until this acceptance passes; W11 has not started.
