import { useEffect, useMemo, useRef, useState } from "react";
import { pendingApproval } from "@/lib/deskApprovals";
import type { EventSnapshot } from "@/lib/deskEvents";
import { finishedWorktreeRun } from "@/lib/deskWorktrees";
import type { Cellar } from "./useCellar";
import type { Host } from "./useHost";
import { saved } from "./preferences";
import { RunList } from "./RunList";
import { RunChip } from "./RunChip";
import { Transcript } from "./Transcript";
import { Composer } from "./Composer";
import { ApprovalDock } from "./ApprovalDock";
import { useControl } from "./useControl";
import { RunRail } from "./RunRail";
import { EntryQuestions } from "./EntryQuestions";
import { Checkpoints } from './Checkpoints';
import { RunUsage } from './RunUsage';

export function Chat({
  host,
  cellar,
  runId,
}: {
  host: Host;
  cellar: Cellar;
  runId: string | null;
}) {
  const [history, setHistory] = useState(false);
  const [waiting, setWaiting] = useState(0);
  const [newMessages, setNewMessages] = useState(false);
  const follow = useRef(true);
  const scroll = useRef<HTMLDivElement>(null);
  const stored = runId
    ? saved<Record<string, EventSnapshot>>(
        "cellar-desk-history",
        "snapshots",
        {},
      )[`${host.historyKey}:${runId}`]
    : null;
  const snapshot = host.live ? host.state : history ? stored : null;
  const run = snapshot?.runs.find((row) => row.id === runId);
  const asks = host.live
    ? (host.state.approvals?.filter(
        (request) =>
          request.runId === runId &&
          (pendingApproval(request) ||
            !!saved<Record<string, unknown>>("desk-approvals", "pending", {})[
              `${host.key}:${request.id}`
            ]),
      ) ?? [])
    : [];
  const linked =
    host.live && run
      ? cellar.entries.filter(
          (entry) =>
            (run.entryIds ?? (run.entryId ? [run.entryId] : [])).includes(
              entry.id,
            ) && entry.state === "blocked",
        )
      : [];
  const stop = useControl(host, `stop:${runId}`);
  const items = useMemo(
    () => (snapshot?.runId === runId ? snapshot.items : []),
    [snapshot, runId],
  );
  useEffect(() => {
    setHistory(false);
    setWaiting(0);
    follow.current = true;
  }, [runId]);
  useEffect(() => {
    if (follow.current)
      scroll.current?.scrollTo({ top: scroll.current.scrollHeight });
    else setNewMessages(true);
  }, [items]);
  const pending = [
    ...asks.map((request) => ({
      id: request.id,
      node: <ApprovalDock key={request.id} host={host} request={request} />,
    })),
    ...linked.map((entry) => ({
      id: entry.id,
      node: (
        <EntryQuestions key={entry.id} entry={entry} refresh={cellar.refresh} />
      ),
    })),
  ];
  return (
    <div className="chat-layout">
      <RunList
        compact
        runs={host.live ? host.state.runs : []}
        cellar={cellar}
        selected={runId ?? undefined}
      />
      <section className="chat-main">
        <details className="narrow-run-picker">
          <summary>choose a run</summary>
          <RunList
            runs={host.live ? host.state.runs : []}
            cellar={cellar}
            selected={runId ?? undefined}
          />
        </details>
        {runId ? (
          <>
            <header className="chat-header stack">
              <div className="row">
                <h2>{run?.name ?? "run"}</h2>
                <RunChip
                  state={host.live ? (run?.state ?? "unknown") : "unknown"}
                />
                <button
                  className="danger"
                  disabled={
                    !host.live ||
                    !run ||
                    run.origin !== "phone" ||
                    !["running", "waiting"].includes(run.state) ||
                    stop.busy
                  }
                  onClick={() => void stop.submit({ action: "stop", runId })}
                >
                  stop
                </button>
              </div>
              <small className="muted">
                {host.info?.name ?? "this pc"} ·{" "}
                {host.live ? "synchronized" : "disconnected"}
              </small>
              <details>
                <summary>run details</summary>
                <p className="mono muted">
                  {run?.agent} · {run?.branch ?? run?.cwd}
                </p>
                <small className="muted">
                  {run?.worktreeId && finishedWorktreeRun(run.state)
                    ? "Review worktree in project panel."
                    : "Review files and conversation checkpoints in run tools."}
                </small>
              </details>
              {stop.message && <small role="status">{stop.message}</small>}
              {stop.pending && (
                <button
                  disabled={!host.live || stop.busy}
                  onClick={() => void stop.submit()}
                >
                  check stop receipt
                </button>
              )}
            </header>
            {host.live && run && <details className="run-tools"><summary>usage and checkpoints</summary><div className="stack"><RunUsage key={'usage:' + host.key + run.id} runId={run.id} /><Checkpoints key={host.key + run.id} scope={host.key} runId={run.id} /></div></details>}
            <div
              className="transcript stack"
              ref={scroll}
              onScroll={() => {
                const node = scroll.current!;
                follow.current =
                  node.scrollHeight - node.scrollTop - node.clientHeight < 60;
                if (follow.current) setNewMessages(false);
              }}
            >
              {!host.live && (
                <section className="empty stack">
                  <p>{host.error ?? "Reconnect to read live output."}</p>
                  <button onClick={host.reconnect}>reconnect</button>
                  {stored && !history && (
                    <button onClick={() => setHistory(true)}>
                      view history
                    </button>
                  )}
                </section>
              )}
              {history && !host.live && stored && (
                <p className="history-label">
                  saved history · last received{" "}
                  {new Date(stored.at).toLocaleString()} · current state unknown
                </p>
              )}
              {snapshot && <Transcript items={items} />}
              {host.live && !run && (
                <p>Run unavailable. No completed state inferred.</p>
              )}
              {host.live && run && !items.length && (
                <p className="muted">no output yet</p>
              )}
            </div>
            {newMessages && (
              <button
                className="new-messages"
                onClick={() => {
                  follow.current = true;
                  scroll.current?.scrollTo({
                    top: scroll.current.scrollHeight,
                  });
                  setNewMessages(false);
                }}
              >
                new messages ↓
              </button>
            )}
            {pending.length ? (
              <div className="waiting-dock">
                {pending.length > 1 && (
                  <div className="chips">
                    {pending.map((item, index) => (
                      <button key={item.id} onClick={() => setWaiting(index)}>
                        {index + 1}
                      </button>
                    ))}
                  </div>
                )}
                {pending[Math.min(waiting, pending.length - 1)]?.node}
              </div>
            ) : (
              <Composer key={runId} host={host} runId={runId} cellar={cellar} />
            )}
          </>
        ) : (
          <div className="empty">select a run to read its chat</div>
        )}
      </section>
      <RunRail run={run ?? null} cellar={cellar} host={host} />
    </div>
  );
}
