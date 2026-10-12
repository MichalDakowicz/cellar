# Separate controller and desktop host builds

Decision recorded 2026-10-12. The user wants two app roles: a phone controller and a
desktop host, with the web app remaining another controller. Windows comes first;
keep macOS/Linux practical. The user scheduled this rebuild as **W10**, immediately
after completed W9, so fewer later features need moving. Keys search becomes W11;
remaining tasks shift forward by one. This is planned work until W10 is implemented.
The accepted Cellar appearance remains the visual contract.

## Technology choice

Keep **TypeScript throughout**, **React Native / Expo for mobile**, and build the
desktop UI with **React DOM + Vite + CSS inside the existing Electron package**.
Keep the existing Node host, provider adapters and SQLite stores. The controller web
app can initially remain an Expo web export, with its own controller-only entry graph.

This recommendation follows the repository: working TypeScript host code, a packaged
Electron app, tested process ownership, durable controls and synchronized clients
already exist. A dedicated DOM renderer removes the mobile routing/layout coupling
without rewriting those parts. Electron separates its Node main process from web
renderers and supports a preload bridge ([process model](https://www.electronjs.org/docs/latest/tutorial/process-model)).
Retain `contextIsolation`, sandboxing and `nodeIntegration: false` from `window.ts`.

Tauri is an alternative if measured package size or memory becomes a binding requirement.
Its Rust core and system webview architecture introduce a new host boundary here
([Tauri architecture](https://v2.tauri.app/concept/architecture/)). Adopting it now would
require either porting the existing Node host or packaging and supervising a Node sidecar.
C#/.NET would similarly require a host/UI rewrite and a separate cross-platform strategy.
Neither is necessary to separate the app roles. Revisit from measurements, not assumptions
that Electron or a different language automatically fixes UI reuse.

## Responsibilities

| Surface           | Owns                                                                                                                                                    | Sends to host                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Mobile controller | Cellar capture/projects/inbox/stats, pairing client, drafts, saved history, remote Desk UI                                                              | Starts, approvals, dispatch/queue controls, command/worktree requests, preview and screen requests |
| Web controller    | Cellar browser UI, responsive remote Desk UI, account mailbox client                                                                                    | Only operations supported by its authenticated transport and host capabilities                     |
| Desktop app       | Dedicated Cellar desktop UI, local host, tray, pairing issuer, provider processes, filesystem/Git, command jobs, event log, ADB, preview/screen servers | Renderer calls the local host through narrow typed IPC                                             |

The phone and browser never execute provider processes or receive a local filesystem
bridge. Remote control remains useful: removing receiver responsibilities must not remove
remote run chat, approvals, Stop all, files, commands, worktrees, previews or build downloads.
Daemon capabilities remain host-owned even when a controller asks to use them.

## Current coupling to remove

The actual receiver already lives in `desktop/src/host/`. It is not compiled into the
Android app. The coupling is the **shared renderer**: `desktop/package.json` packages
the root Expo `dist/` as `resources/web`, so desktop and controllers share routes,
platform branches, navigation and PC-only presenters.

Move these responsibilities into the desktop renderer, then remove their imports from
mobile/web controller entry graphs:

- `src/features/desk/bridge.ts`, the bridge transport in `deskClient.ts`, and the local
  branch in `useDeskLink.ts`: inject local or remote clients at each app boundary.
- `DeskSessionSync.tsx`, currently mounted by `src/app/_layout.tsx`: desktop session-to-host
  handoff belongs to the desktop auth boundary.
- Host pairing issuance, QR display, host rename and revoking phone keys currently reached
  through `useDeskScreen.ts` / `useDeskSettings.ts`: desktop settings own these actions.
  Phone scan/connect/forget remains controller functionality; account sign-in QR is separate.
- Local-host status/settings and the PC-to-phone ADB panel: desktop-only screens. Preserve
  controller settings for selecting a remote host, agent defaults and notification choices.
- Desktop-specific presentations (`DeskWide`, `RunListPane` / `RunRail`, desktop project
  aside, `DesktopSidebar`, `desk/phone`) move to React DOM equivalents. Share their pure
  view models where useful; stop mounting desktop-only devices/tools from controller routes.

Width chooses layout, never privileges. Wide browser can retain a sidebar and spacious
remote chat; it must not claim “this pc” or expose an attached-phone ADB panel because
`useIsDesktop` became true. A narrow desktop window must still be a host. Use explicit app
role plus advertised capabilities; remove misleading PC-only placeholders from controllers.
Do not delete all wide-web layouts simply because they were named “Desktop”.

The browser currently lacks the phone's paired LAN key and uses the account mailbox for
some operations. Keep unsupported live features explicit. Full browser streaming needs a
separate secure HTTPS/origin/pairing transport decision; copying phone HMAC credentials
into browser storage or weakening CORS/mixed-content restrictions is not the rebuild.

## Suggested code boundary

Keep one repository and separate build artifacts. Suggested future layout:

```text
src/                       mobile + controller web routes and views
desktop/src/host/          existing execution and durable state authority
desktop/src/renderer/      new React DOM routes, shell, components and styles
desktop/src/preload.ts     typed desktop-only bridge
packages/desk-contracts/   pure protocol types, validators and compatibility rules
packages/desk-domain/      pure search, projections and view-model helpers
packages/design-tokens/    Ping tokens, fonts and icon assets
```

These packages are a proposed extraction, not existing build commands. Start by sharing
the current pure `src/lib/desk*.ts` modules; extract only when both builds need them.
Shared packages import no React Native, Expo, Electron, Node filesystem, auth client or
provider SDK. Components, navigation, storage and transports stay app-specific. Controller
bundles must not reach desktop host files through a shared barrel export.

Keep one typed host API and one event/receipt model for IPC and remote clients. Validate
IPC senders and request bodies in the host. Do not expose arbitrary shell, filesystem,
provider RPC or raw `ipcRenderer`. Adapt platform differences behind host interfaces for
process trees, filesystem paths, screen capture, ADB discovery, tray and startup behavior.
Keep the currently verified Windows behavior while adding OS adapters separately.

## Preserve the look

Use `canvas/DeskHome.dc.html`, `DeskChat.dc.html`, `DeskProjects.dc.html`, `DeskPhone.dc.html`
and the current accepted desktop screens as references; use Main/NewTask/Run for controllers.
Follow `../.design-language/PING.md` (relative to the repo root), canvas `ds/`,
`screens.md`, `visual-clone.md`, fonts, icons, colors, typography, spacing and radii.
Reuse tokens and domain rules, then reproduce desktop components in DOM/CSS.

Retain Cellar's sidebar, capture bar, project/run grouping, approval dock, folded tool rows,
composer, queue popout and right rail. Match dark/light states, desktop minimum width,
keyboard behavior, scrolling and focus. Mobile islands and keyboard avoidance belong to the
mobile controller. Narrow desktop uses a deliberate desktop layout; copying phone navigation
into its window would repeat the current problem.

Capture matching phone, narrow/wide browser and desktop screenshots before extraction and
after each migrated screen. Compare identical data and loading, empty, waiting, working,
failed, disconnected, saved-history and unknown states. Preserve the accepted artboard files;
record any intended visual change separately instead of silently updating the baseline.

## Migration and builds

1. Inventory routes and platform branches; record screenshots and current signed-request,
   event, approval, queue and restart behavior. Add explicit app-role/capability composition.
2. Create the dedicated Vite renderer in `desktop/`, loading its own local HTML/assets through
   the existing `cellar-desk` origin and preload. Build a minimal authentic Cellar shell, then
   migrate home/chat first. Keep the old packaged renderer available until parity is verified.
3. Port the remaining Cellar screens and desktop settings. Keep login/account isolation and
   current data intact. The desktop renderer remains the sole refresh-token holder, handing
   access sessions to the host. A future headless service needs an explicit auth migration;
   do not add a second refresh-token holder.
4. Change desktop packaging's `extraResources` from `../dist` to the renderer's build output;
   decouple desktop build scripts from `npm --prefix .. run build:web`. Keep main/preload
   bundling separate. Add renderer dev/build/typecheck scripts before documenting them as runnable.
5. Remove migrated receiver imports, PC-only routes and settings branches from controller
   builds. Mobile keeps its Expo native build. Web exports only controller routes. Inspect
   route manifests and bundles, including source maps, for forbidden imports and stale UI.
6. Package Windows with the existing electron-builder/NSIS flow. Upgrade the existing app
   identity/profile in place; preserve pairing keys, host ID, account binding, SQLite files,
   drafts, receipts, event cursors and worktree ownership. Verify without uninstall/reset.

Current commands (before this migration): root `npm run build:web`; `desktop/` `npm run build`
and `npx electron-builder --win --x64`; Android JDK 21 `assembleRelease` plus replacement ADB
install. The desktop currently consumes the web export. Future desktop build must work
without running that export. Pin new renderer dependencies only when implementing it.

## Acceptance and scope

Prove controller artifacts contain no host/runtime code or local IPC capability. Prove the
desktop artifact contains its own renderer and no Expo Router/mobile screen graph. Verify
both apps against the same host contracts: duplicate UUID recovery, ownership, approvals,
queue revisions, interrupt-before-promotion, offline-host pending and restart unknowns.
Repeat W9 process containment checks after extraction. Consult pinned T3 adapter notes in
`t3code-notes.md`; keep Claude fixture-only unless the user changes that instruction.

W10 implements this rebuild before W11 keys search. Move the existing W1–W9 behavior and
presentations, leaving later unwired features as explicit samples/unavailable states.
Keep pure search/domain contracts reusable for W11. Do not add a new transport, change
provider semantics or redesign the accepted UI during the rebuild. Complete independent
builds, migration checks and device verification before starting W11.
