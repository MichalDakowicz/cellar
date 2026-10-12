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
been performed. The installed W9 executable remains available while parity is checked.

## Verification so far

- Root tests, lint and types passed before the latest shared card extraction;
  final checks will be repeated after all source changes.
- Desktop host fixture suite passed 69 tests outside the sandbox, including W9
  containment, approval, queue and restart checks. Initial sandbox run could not
  terminate a fixture tree; the unrestricted rerun passed.
- Host and renderer type checks and the independent Vite build pass. New IPC and
  graph boundary tests pass. Desktop lint is being completed with its own tooling.
- 36 protected canvas/spec references matched their initial SHA-256 values.
- Background browser previews use ports 5173 (DOM), 8134 (current controller QA)
  and 8140 (W9 reference). The W9 source snapshot is isolated in the external QA
  directory. Its Metro uses IPv6 loopback because an unrelated IPv4 listener owns
  port 8090. That listener was not changed or stopped.

## Remaining acceptance

Complete remaining screen parity and fixture states; verify dark/light and matching
phone, narrow/wide web and desktop views; switch packaging to the independent renderer;
inspect controller exports and Android bundles; build all three standalone artifacts;
replacement-install/launch the phone and refresh the documented Windows path/profile;
repeat real bounded Codex checks and restart recovery; finish docs/status and push.
Claude remains fixture-only. W10 must stay unchecked until this acceptance passes.
