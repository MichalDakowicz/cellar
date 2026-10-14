# W15–W18 test ledger

Updated 2026-10-14. Branch: `feat/desk-w15-w18`.

Implementation ready for review; phone testing authorized and performed later on 2026-10-14.
Questions asked only through Cellar. Computer use initialized at the beginning, then used
against the packaged desktop. Evidence: ignored `artifacts/qa/w15-w18/`.

## Available checks

- [x] Root: 102 Jest suites / 917 tests; TypeScript and lint
- [x] Desktop: 96 tests; host/renderer TypeScript, lint and production build
- [x] Windows installer and unpacked application
- [x] Controller export with source maps: 3,971 modules, zero desktop-host imports
- [x] Android release compilation, including local capture module
- [x] Real signed-host Codex checkpoint and usage integration
- [x] Real Claude SDK transcript fork with isolated fixtures, without starting Claude
- [x] Desktop computer use: retained sign-in, actual transcript/settings, small-window usage
  and checkpoint diff/confirmation/cancel
- [x] Browser preview: recipes/rules rendered; sample actions disabled
- [x] Phone release install/launch, shares, usage and controlled debug crash checks
- [ ] Live Claude, named API credentials and real long-context compaction

No MCP contract or database schema change; no migration required. After successful release
installation, controller web deployed to https://cellar-stash.web.app under repository standing
authorization. Native checks below supplement desktop/browser checks.

## W15: checkpoints

- [x] Hidden refs before/after turns; real HEAD/index preserved
- [x] Tracked/untracked diff/restore; ignored files and common secret paths excluded
- [x] Owner/run/path checks, idle/empty queue, other checkout writers, stale review refusal
- [x] Combined file/context restore with recovery snapshot
- [x] Durable receipts, request fingerprints and pending client command IDs
- [x] Duplicate/lost-reply/restart, owner isolation and directory-swap tests
- [x] Desktop/controller list, diff and confirmation UI; retained history labelled clearly
- [x] Phone reviewed rollback: file and remembered marker restored; pending request survives restart
- [x] Final phone receipt-button recovery after reconnect; original pending command cleared
- [x] Live queued message during restore wakes after applied receipt, without manual nudge

Live run `eb4a0875`: answers `W15_ALPHA`, `W15_BETA`, then `W15_ALPHA` after rollback.
Reviewed restore changed `qa-marker.txt` from `file-beta` to `file-alpha`; duplicate request
returned original applied receipt. Real context and two limit windows were reported.
Signed receipt read after replacing/restarting the packaged host still returned applied.
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
- [x] Phone editor agent/mode save; persisted PC configuration verified; original settings restored
- [x] Live after-command job once per normal turn; no extra job for restore maintenance
- [x] Physical phone reviewed instruction write; exact empty blocks verified, originals restored
- [x] Named, bounded Markdown rule previews with source/changes controls on phone and desktop

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
- [x] Android share target registered; cold/warm SEND, edited draft restart, explicit kind/project filing
- [x] Controlled JS/native crash, relaunch, full evidence review, repeat count and glitch filing
- [x] Release native crash creates no debug report; final release restored and launched

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

## Physical-phone results, 2026-10-14

Nothing A059P, Android 16. Installed 1.16.0 over 1.15.0 without clearing data. Final release
installed and launched again after debug testing (PID 21823 at final verification).

- Cold and warm Android SEND delivered text/link drafts. Edited text survived force-stop.
  Found kind/project reset; fixed durable complete drafts and migrated prior text queues.
- Injected one lost response after a synthetic share committed. Restart retained submission
  `00b22931`; confirming original filing left exactly one entry. Submitted words/choices freeze
  until confirmed, and notes use deterministic IDs. Synthetic share `1db894de` also filed
  with explicit glitch kind and Cellar project after full-choice restart verification.
- Phone run `27a02762` answered ALPHA → BETA → ALPHA after reviewed rollback, and
  `phone-marker.txt` returned to `phone-alpha`. Applied receipt `0f6f6abf` survived controller
  restart. The phone timed out while restore completed and kept its original pending command.
  A temporary proxy did not record an injected rollback drop; do not call this proxy fault test
  verified. Actual timeout/pending persistence and host receipt were verified.
- Found restore-boundary queue wakeup gap; final host wakes queued work only after the
  recovery checkpoint and applied receipt are saved. Desktop tests/types/lint/build/package pass.
  Final live wakeup/after-command regression remains pending after UI interruption.
- Real context and 5-hour/weekly values rendered on phone; unavailable provider sessions
  remained explicitly unavailable. No real API credentials or 80% chat created for QA.
- JS fatal captured stack/log/screenshot; identical repeat produced count 2 and survived
  restart. Native `am crash` captured CrashedByAdbException with screenshot. Reviewed reports
  filed as glitches `d70f3a8d` (JS) and `ce1f3f72` (native). Release crash left crash queue empty.
- Recipe glitch agent=codex/mode=ask persisted from phone; original recipe restored afterward.
  Original pairing restored; temporary USB forwards removed. No account switch/sign-out test.

Computer use was stopped with physical Escape during final desktop relaunch. No further app
input was issued. Final desktop package is built but was not relaunched/verified after that
interruption. Remaining checks stay unchecked above. Phone test artifacts are under `phone/`.

## Resumed verification and instruction previews

User reauthorized computer use after explaining Escape came from gaming. Final Windows
package relaunched with original sign-in. Run `c4303f76` queued a marker question during a
live restore; applied receipt returned, queue resumed without a wake message, and answers
were ALPHA → BETA → ALPHA. File returned to phone-alpha. Exactly three successful
normal turns produced three done after-command jobs containing W16_AFTER_OK; restore
produced no extra job. Evidence: `phone/resumed-result.json`.

Phone reopened original run `27a02762` over a temporary USB localhost connection. The
physical “check rollback result” button read original applied receipt `0f6f6abf`, cleared
the durable pending request, and issued no new rollback. LAN remained unavailable on
this PC; automatic cloud address replacement was paused only in the temporary debug
runtime for USB testing. Original pairing and normal runtime restored before final release.

Completed-job notices exposed a missing desktop overlay style. Bounded floating cards now
leave chat in place; packaged desktop shows successful job output and keeps its run list.

User reported the raw instruction diff wall. Phone/desktop rules review now names AGENTS.md
and CLAUDE.md, renders proposed Markdown first in bounded viewers, and offers exact source
and focused changes. Phone toggles verified. Empty managed blocks were explicitly reviewed
and written from phone; both files matched expected content, then original instructions and
recipes were restored. Nonempty scopes/stale writes retain fixture coverage. Evidence:
`phone/rules-result.json`, `rendered-rules-*.png`/XML.

Root 917 tests and desktop 96 tests pass; types/lint/build/package pass. Initial sandboxed
desktop fixture run failed child cleanup; rerun with process access passed all 96. JDK 21
Android release rebuilt, installed and launched (PID 15623 at final verification), with no
own-process ReactNativeJS/AndroidRuntime errors. Temporary pairing backup and USB forwards
removed. No live API keys, account switch/sign-out, live Claude or 80% compact test.

General Markdown/AsciiDoc/document/media previews remain future W21, before SSH W22.
The earlier web deployment remains live. Publishing this rendered-review update was rejected
by automatic approval review because external destination/payload need explicit user approval;
Cellar question `6f586c5f` records that approval request.
