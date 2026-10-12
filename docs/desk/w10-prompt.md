# W10 controller and desktop rebuild prompt

```text
Continue Cellar W10 in C:\ping\cellar. W9 is complete on feat/desk-w9. Follow CLAUDE.md
branch triage and use a feature branch dedicated to W10. Read docs/desk/TASKS.md,
desktop-rebuild.md, w9-resume.md, how-it-works.md, screens.md, keys.md, t3code-notes.md,
visual-clone.md and relevant accepted canvas artboards/updates, plus desktop/README.md.

Implement the controller/desktop rebuild now, before keys search and other later work.
The user chose phone controller + desktop host, Windows first with practical future
macOS/Linux support. Keep mobile in React Native/Expo and web as a controller. Keep the
existing Electron/TypeScript/Node host and build a dedicated React DOM/Vite/CSS desktop
renderer. Follow desktop-rebuild.md's staged migration and acceptance requirements.

Separate build graphs. Remove PC receiver-specific bridge imports, session handoff,
pairing issuance, local-host settings/routes and ADB panels from mobile/web controllers.
Keep controller pairing scan/connect/forget, remote chat/approvals/Stop all, commands,
worktrees, previews/screen viewing, downloads and useful responsive browser layouts.
Use explicit app role and advertised host capabilities; viewport width only picks layout.
Do not grant the browser a local filesystem/process/IPC bridge or copy phone credentials
into browser storage. Preserve its existing transport limitations honestly.

Port all existing Cellar desktop surfaces to the independent DOM renderer: capture,
projects, inbox, stats, Desk home/chat/commands/previews, desktop settings and existing
device presenters. Preserve accepted appearance, typography, tokens, navigation,
approval dock, folded tools, composer/queue popout and desktop rails. Remove mobile
navigation and keyboard-layout artifacts from the PC renderer. Keep unwired later
features explicitly sample/unavailable; do not implement them during the move.

Share pure contracts/domain/view models/design tokens, not platform screen trees.
Keep the existing host API, owner isolation, one-use tickets, event stream and mailbox.
Preserve W1–W9 behavior, drafts, durable UUID receipts, queue revisions, approvals,
interrupt-before-delivery, owned process containment, offline pending and restart unknowns.
Keep one refresh-token owner and existing profile/app identity, host ID, pairing keys,
SQLite history, cursors and worktree ownership. No uninstall/reset or firewall changes.
Keep Claude fixture-only. Consult pinned T3 Code for lifecycle/recovery changes and
record revision/adaptation decisions. Preserve protected canvas/spec files byte-for-byte.

Make desktop packaging consume its own renderer output, without the root Expo web export.
Inspect controller manifests/bundles for local-host imports and the desktop artifact for
Expo Router/mobile screen imports. Add meaningful boundary/migration tests, run root and
desktop tests/lint/types, and compare matching phone/narrow-web/wide-web/desktop states.
Repeat W9 process containment, approval, queue and restart checks after extraction.

Build standalone Android with JDK 21, controller web and independent Windows desktop.
Replacement-install/launch on the physical phone and refresh/launch the desktop at the
existing reachable path/profile documented in w9-resume.md. Verify visual parity and
real behavior on both before marking W10 complete. Update docs/task status, commit and
push. Do not release or publish the website for this task.

Keys search is now W11; former W10–W20 tasks become W11–W21, with SSH still deferred.
Accepted canvas/spec and old source comments retain original IDs; use TASKS.md's mapping.
Do not start W11 until this rebuild is verified. When finished, report verification
boundaries and provide the W11 keys-search prompt.
```
