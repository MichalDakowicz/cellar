# W15–W18 test ledger

Updated 2026-10-14. Branch: `feat/desk-w15-w18`.

Implementation ready for review; phone acceptance pending by explicit user instruction.
Questions asked only through Cellar. Computer use initialized at the beginning, then used
against the packaged desktop. Evidence: ignored `artifacts/qa/w15-w18/`.

## Available checks

- [x] Root: 99 Jest suites / 909 tests; TypeScript and lint
- [x] Desktop: 96 tests; host/renderer TypeScript, lint and production build
- [x] Windows installer and unpacked application
- [x] Controller export with source maps: 3,971 modules, zero desktop-host imports
- [x] Android release compilation, including local capture module
- [x] Real signed-host Codex checkpoint and usage integration
- [x] Real Claude SDK transcript fork with isolated fixtures, without starting Claude
- [x] Desktop computer use: retained sign-in, actual transcript and settings
- [x] Browser preview: recipes/rules rendered; sample actions disabled
- [ ] Phone install, launch and native acceptance
- [ ] Live Claude, named API credentials and real long-context compaction

No MCP contract or database schema change; no migration required. Website exported
locally, not published. Native behavior is not verified by desktop/browser checks.

## W15: checkpoints

- [x] Hidden refs before/after turns; real HEAD/index preserved
- [x] Tracked/untracked diff/restore; ignored files and common secret paths excluded
- [x] Owner/run/path checks, idle/empty queue, other checkout writers, stale review refusal
- [x] Combined file/context restore with recovery snapshot
- [x] Durable receipts, request fingerprints and pending client command IDs
- [x] Duplicate/lost-reply/restart, owner isolation and directory-swap tests
- [x] Desktop/controller list, diff and confirmation UI; retained history labelled clearly
- [ ] Phone rollback, background/restart and dropped-response acceptance

Live run `eb4a0875`: answers `W15_ALPHA`, `W15_BETA`, then `W15_ALPHA` after rollback.
Reviewed restore changed `qa-marker.txt` from `file-beta` to `file-alpha`; duplicate request
returned original applied receipt. Real context and two limit windows were reported.
A separate direct adapter check independently produced the same marker sequence.

Codex 0.162.1 uses `thread/fork` with saved `lastTurnId` because installed protocol removed
`thread/rollback`. Claude SDK 0.3.296 forks at the saved message UUID, retaining the old
transcript. Restarted sessions explain that provider restore is unavailable. Unknown
receipts/recovery refs remain evidence, never blind replay. Symlinks, submodules and hard
links are refused; diffs above 100 KB cannot be confirmed. Excluded secrets remain untouched.

## W16: recipes and rules

- [x] Owner-scoped per-kind agent/mode/skills/template/after-command recipes
- [x] Explicit choices win; split tasks use each thought's own recipe
- [x] Bounded placeholders, command/skill names and no recursive interpolation
- [x] Existing thoughts scoped everywhere → shelf → project; archived thoughts omitted
- [x] Reviewed AGENTS.md/CLAUDE.md writes; stale tokens and account changes refused
- [x] Unmanaged instructions preserved; malformed blocks/links/redirected paths refused
- [x] Successful-turn host wiring starts existing project command jobs in run checkout
- [ ] Phone editor/save/reconnect and live recipe-after-job acceptance

Cellar question `66ace317`: user chose “your call”. Existing thoughts carry scope, preserving
seven capture kinds. Rules use thought text. Missing command IDs report follow-up failure;
recipes cannot execute arbitrary shell text. Config/sync require direct LAN or desktop IPC;
browser retains mailbox limits. Before attached tasks send, saved recipes must load.

## W17: usage and accounts

- [x] Installed provider schemas/SDK inspected before adapter implementation
- [x] Actual windows/resets, missing values unavailable; Claude context labelled estimated
- [x] Explicit `/compact` at 80%, idle/empty-queue guard and maintenance idle notification
- [x] Owner-scoped named API accounts, per-run config dirs, Electron OS-encrypted secrets
- [x] Phone metadata only; credential entry restricted to local desktop IPC
- [x] Child-env isolation/log redaction; no silent account switching on exhaustion
- [ ] Real named-account use, Windows encryption restart, phone selection and 80% compaction

Named accounts currently support Codex/Claude API keys. Default subscription sign-in remains
provider-owned; named OAuth profiles are not copied/managed. No real API keys entered in QA;
vault tests use fixtures. Claude usage endpoint is experimental; absent limits stay unknown.
“Ask me” means request a choice before using another account, never automatic fallback.

## W18: shares and debug crashes

- [x] Android ACTION_SEND text/link target, cold/warm receiver, clear after capture
- [x] Bounded account-scoped durable drafts; existing kind guess, file and handoff
- [x] JS fatal/native exception handlers gated to Cellar debug builds
- [x] Bounded own-process log/stack, optional screenshot/thumbnail, repeat signatures
- [x] Local queue; full evidence review before cloud filing; later retains local report
- [x] Deterministic glitch/note IDs, redaction, owner guard and lost-response retry tests
- [ ] Real share-sheet entry and debug crash/relaunch/repeat acceptance
- [ ] Verify release build never offers debug capture on device

Cellar question `d518f215` selected Cellar debug builds only. Android text/links supported;
binary attachments and SEND_MULTIPLE are outside this pass. Screenshots are optional when
activity capture fails. Reports stay local until explicitly filed into the Cellar inbox.

## Phone session, when available

1. Install `android/app/build/outputs/apk/release/cellar-v1.16.0.apk` over existing app;
   launch and check process/logcat. Preserve app data and pairing.
2. In a disposable worktree, finish two Codex turns, change a safe text file, review earlier
   checkpoint, confirm and check both file contents and remembered conversation.
3. Drop rollback response; restart controller and recover same command receipt. Verify
   busy/queued/stale/disconnected/unknown outcomes never send a fresh blind rollback.
4. Edit temporary recipe; check defaults, explicit choices and split behavior. Exercise
   harmless after command on successful and failed turns. Restore prior settings.
5. Review scoped rules in disposable checkout; confirm unmanaged instructions survive and
   external file change invalidates review. Check account isolation.
6. Inspect usage/resets/missing limits; compact a long test chat at 80%. Test named API
   account only after user enters key on PC; verify reconnect and no silent switching.
7. Share URL/text from another Android app while Cellar stopped/open/backgrounded/signed out.
   Edit, restart, file and verify no duplicate after retry; check handoff and owner isolation.
8. Use debug build for controlled JS/native fatal errors. Relaunch; review full stack/log/
   screenshot, choose later, then file. Repeat and check count/idempotency.
9. Switch/sign out; other account must not see old drafts/reports. Release build must never
   collect debug reports. Ask remaining questions through Cellar only.
