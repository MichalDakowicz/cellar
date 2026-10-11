# How t3code delegates — and what cellar takes from it

## Standing custom-chat reference

User instruction, 2026-10-11: use [T3 Code's repository](https://github.com/pingdotgg/t3code)
as implementation help for Cellar's custom agent chat. Consult its session adapters,
dispatch/queue lifecycle, approvals and event recovery when wiring these flows. Record the
source revision; adapt the behavior to Cellar's existing host protocol and UI.

W9 reference reviewed at `bed923986fbcbe8279f23b9367efde1596bde1f9`:
`apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts` and `CodexAdapterV2.ts`.
Claude sends streamed `SDKUserMessage` records with client UUIDs and binds provider
`user_message_uuid` / `user_message_uuids` echoes to those sends. Both adapters separate
starting a turn from interrupting one. Cellar's accepted Run specification deliberately
uses interrupt-then-continue for **Send now**; ordinary busy Send stays queued. A provider
write alone does not prove delivery, and a successful interruption does not prove the
replacement message ran. Earlier source notes below describe their recorded revision;
the current canvas supersedes their historical dispatch-selector layout.

The reviewed Codex adapter also terminates background terminals separately from
`turn/interrupt`. Installed Codex 0.162.1 lacks that newer API. W9 therefore stops
Cellar's owned private app-server process tree after interruption, then resumes the
same persisted conversation before promotion. Descendant termination is fixture-tested;
the final live phone containment check remains pending in `w9-resume.md`.

Read from t3code's source at commit `784b5625` (github.com/pingdotgg/t3code). Files:
`apps/server/src/provider/codexLaunchArgs.ts`, `CodexAdapterV2.ts`, `ClaudeAdapterV2.ts`,
`Orchestrator.ts`, `EventSink.ts`, `EffectOutbox.ts`, `ProviderSessionManager.ts`,
`packages/contracts/src/orchestrationV2.ts`, `providerPolicy.ts`,
`apps/server/src/vcs/GitVcsDriver.ts`.

No agent ever gets a visible terminal. The server starts each agent cli as a hidden background
process and talks to it over pipes: json-rpc for codex, the claude agent sdk for claude. The
chat you see is not the agent's output — it is the server's own event log, saved in sqlite and
streamed to every client. The phone, the web app and the desktop app are all thin clients of
that log.

## The loop, end to end

```
phone / web / desktop   message.dispatch with its own commandId
        ↓
orchestrator            one command at a time; decides events, no i/o
        ↓
one sqlite write        events + read model + receipt + outbox job
        ↓
effect worker           takes the outbox job, calls adapter.startTurn
        ↓
hidden agent process    codex app-server (stdio) or claude sdk query()
        ↓ provider events → domain events
event ingestor          deltas, tool calls and approvals → turn items
        ↓ live stream
subscribeThread         snapshot → numbered events → synchronized
```

The important split: the orchestrator only decides what happened, and every side effect (start
a turn, interrupt, answer an approval) is a queued outbox job written in the same transaction.
If the server dies between deciding and doing, the job is still there.

## 01 · no terminal, just pipes

- **codex** — spawns `codex app-server` as a child process, stdin/stdout wired into a typed
  json-rpc client; stderr dropped. `shell: false` everywhere except windows. No pty.
- **claude** — `@anthropic-ai/claude-agent-sdk` `query()` in streaming-input mode: prompts are
  pushed into a queue the sdk reads as a live input stream. The sdk starts the claude cli.
- **others** — acp agents, `opencode serve`, `pi --mode rpc`, the cursor sdk. Nine provider
  drivers in total.

## 02 · one adapter shape for every agent

`ProviderAdapterV2.openSession()` returns a runtime with `ensureThread`, `resumeThread`,
`startTurn`, `steerTurn`, `interruptTurn`, `respondToRuntimeRequest`, `rollbackThread`,
`forkThread` and an events stream. Codex shares one process across many threads; claude gets
one session per app thread. The flag `supportsMultipleProviderThreadsPerSession` decides.

## 03 · a message becomes a run

Model: `AppThread → Run` (one user-visible turn) `→` a tree of `ExecutionNode`s, plus
`ProviderThread`, `ProviderTurn`, `TurnItem`, `RuntimeRequest`, `Checkpoint`. Clients only send
commands: `thread.create`, `message.dispatch`, `run.interrupt`, `thread.stop`,
`runtime-request.respond`, `checkpoint.rollback`, `thread.fork`, `provider.switch`.

## 04 · talking to a busy agent

`message.dispatch` carries a `dispatchMode`: `start_immediately`, `queue_after_active`,
`steer_active`, `restart_active`, `defer_start`. On the phone this is the "steer it now / queue
after this turn" pair above the composer.

## 05 · what the chat is made of

Every provider is normalised into one list of turn items: `user_message`, `assistant_message`,
`reasoning`, `command_execution`, `file_change`, `dynamic_tool`, `web_search`, `file_search`,
`todo_list`, `proposed_plan`, `approval_request`, `user_input_request`, `subagent`,
`checkpoint`, `error`, `compaction`, `handoff`.

Assistant text is split into display chunks only at markdown-safe boundaries, and tool updates
are coalesced so only the latest per call is kept — cheap to stream to a phone.

## 06 · approvals

Runtime modes: `approval-required`, `auto-accept-edits`, `auto`, `full-access` (the default).
Codex asks through `item/commandExecution/requestApproval` and friends; claude through the
sdk's `canUseTool` callback. The adapter emits a runtime request and waits. A client answers
with `runtime-request.respond`: `accept`, `acceptForSession`, `acceptAlways`, `decline` or
`cancel`. Pending requests are stored, so they survive a reconnect.

## 07 · surviving flaky networks

Storage is sqlite through `node:sqlite`: an events table with a sequence number, projection
tables, the outbox and command receipts. `subscribeThread{threadId, afterSequence}` sends a
snapshot, then numbered events, then a synchronized marker. A client that drops resumes from
its last sequence. Resending the same `commandId` returns the stored receipt and runs nothing
twice.

## 08 · lifecycle

Sessions open lazily on the first turn and are released after 30 idle minutes — later while
background work is pending, up to a 4-hour cap. A crashed session is deliberately not
restarted: unfinished work is marked finished; the next command opens a fresh session and
resumes the agent's own conversation (`resume` / `thread/resume`).

## 09 · worktrees and checkpoints

Each thread has a branch and a `worktreePath`; a launch picks `root`, `existing_worktree` or a
new `worktree{baseRef}`. Checkpoints are hidden git refs (`refs/t3/orchestration-v2/checkpoints`)
built with a temporary `GIT_INDEX_FILE`, `write-tree` and `commit-tree`. Diffs come from them;
rollback restores the files and asks the provider to roll back its conversation too.

## 10 · reaching it from elsewhere

Pairing links and qr codes (`t3 pair`, `t3 serve --host`), scoped tokens, short-lived websocket
tickets so long-lived tokens stay out of socket urls, and a scope check on every rpc. Transport:
tailscale, ssh tunnels, or a relay with sign-in. Mobile push and live activities go through the
relay. The in-app terminal is a separate node-pty feature, not how agents are run.

## What cellar desk takes from it

| t3code | cellar |
| ------ | ------ |
| server on the pc owns processes, files and sqlite | a small cellar desk daemon (node, tray app) owns the agents, the worktrees and its own event log. The phone is a thin client |
| one websocket rpc + http snapshots | the same, over tailscale. When the pc cannot be reached, the phone drops the task into cellar's supabase as a row and the daemon picks it up — the mcp edge function and per-machine agent tokens already exist |
| thread → run → turn items | a run can start from a cellar entry: the agent claims it, appends lines marked as its own, and asks questions through the same "waiting on you" inbox |
| runtime request → respond | the approval panel pinned above the nav islands, plus a push. Answer on the phone or the pc — the first answer wins, retries are safe because of the commandId |
| runtime modes | three words on the new-task sheet: ask first · edits ok · full access |
| *new* · quick commands | rebuild, deploy and apk are plain jobs, not agent turns. They go through the same outbox and stream back as `command_execution` items, so the phone renders them like any other run |
| *new* · previews | the dev server runs on the pc and is exposed to the phone's webview over the tailnet. Deploy runs `npm run deploy:web` only after you have looked |
| *new* · live screen | a separate video channel (screen out, touch and keys in), opened only when the phone asks and the pc allows it. Kept apart from the event log so a dropped stream never touches a run |
| in-app terminal (node-pty) | left out on purpose. From the toilet or the stove you want results and decisions, not a shell |

**Not confirmed from source:** whether spawns on windows set `windowsHide` (that lives inside
the effect library, not in t3code), and the claude cli's exact stdio settings (inside the agent
sdk). Worth testing on the pc that no console window flashes.
