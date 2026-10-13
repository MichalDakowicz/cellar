# W11 keys-search continuation prompt

Use only after W10's acceptance ledger is closed and TASKS.md marks W10 complete.

```text
Continue Cellar W11 in C:\ping\cellar. Follow CLAUDE.md branch triage and use a
feature branch dedicated to W11. First confirm W10 is verified in TASKS.md and
w10-rebuild.md; if acceptance remains pending, finish W10 before starting keys work.

Read docs/desk/TASKS.md, how-it-works.md, keys.md, screens.md, visual-clone.md,
t3code-notes.md, desktop-rebuild.md, w10-rebuild.md, relevant accepted Keys/Run/
NewTask/desktop artboards and updates, plus desktop/README.md. Protected canvas/spec
files remain byte-for-byte unchanged. Apply TASKS.md's mapping: old W10 keys search
is now W11; old W10–W20 IDs in accepted files/comments map to W11–W21. SSH stays
deferred. Do not start previews/deploy, voice or other later wiring.

Implement keys search in the separate phone/web controllers and React DOM desktop:
@ files from the selected run's owned worktree (changed files first, :42 line refs),
/ skills per installed agent (built-in and the user's own skill folders), and
$ commands from W2. Keep existing $ projects/entries and color-chip behavior.
Use shared pure contracts/search/view models, with platform-specific components.
Preserve accepted suggestion placement, token insertion, keyboard behavior,
selection/focus, responsive layouts, composer and new-task appearance.

Filesystem and agent-skill discovery stay in the Electron/Node host. Validate
owner/project/run/worktree scope and contain path resolution. Native controller
uses the authenticated host API; browser exposes only capabilities supported by
its existing transport. Give browser no local filesystem/process/IPC bridge and
copy no phone credentials into browser storage. Width chooses layout only.
Do not add a new browser transport as part of keys search. Missing/unsupported
sources, disconnected hosts, stale searches and no results must be explicit.

Preserve W1–W10 behavior and identity: one refresh-token owner, existing profile,
host ID/pairing keys, SQLite history/cursors, worktree ownership, drafts, durable
UUID receipts, queue revisions, approvals, interrupt-before-delivery, owned process
containment, offline pending and restart unknowns. Keep Claude fixture-only.
Consult pinned T3 Code and record revision/adaptation decisions if lifecycle,
dispatch or event recovery changes prove necessary.

Add meaningful pure search, host scope/path boundary and stale-result tests. Run
root and desktop tests/lint/types, inspect both build graphs, compare matching
phone/narrow-web/wide-web/desktop states, and verify real @/$/skill behavior with
the paired physical phone and preserved-profile desktop. Build standalone Android
with JDK 21, controller web and independent Windows desktop. Replacement-install
and launch phone; refresh/launch desktop at the existing reachable path documented
in w10-rebuild.md. No uninstall/reset, firewall changes, release or website publish.

Update docs/task status, commit and push after verification. Report exact live
verification boundaries and any platform/transport limitations.
```
