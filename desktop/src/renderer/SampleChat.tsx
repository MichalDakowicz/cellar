import { useState } from "react";
import { SAMPLE_CHATS, SAMPLE_RUNS } from "@/lib/deskSample";
import { SAMPLE_COMPOSER_QUEUE } from "@/lib/deskCanvas";
import type { QueuedMessage } from "@/lib/deskDispatch";
import type { Host } from "./useHost";
import type { Cellar } from "./useCellar";
import { RunList } from "./RunList";
import { Transcript } from "./Transcript";
import { RunChip } from "./RunChip";
import { Composer } from "./Composer";
import { ApprovalDock } from "./ApprovalDock";
import { RunRail } from "./RunRail";
export function SampleChat({
  host,
  cellar,
  page,
  phase,
  runId = "sample-1",
}: {
  host: Host;
  cellar: Cellar;
  page: string;
  phase: string;
  runId?: string;
}) {
  const [history, setHistory] = useState(false);
  const disconnected = phase === "disconnected";
  const runs = host.state.runs;
  const chat = SAMPLE_CHATS[runId] ?? SAMPLE_CHATS["sample-1"];
  const run = runs.find((row) => row.id === runId) ?? runs[0];
  const card = SAMPLE_RUNS.find((row) => row.id === runId) ?? SAMPLE_RUNS[0];
  const queue: QueuedMessage[] = SAMPLE_COMPOSER_QUEUE.map((row, index) => ({
    id: `00000000-0000-4000-8000-00000000000${index}`,
    runId,
    text: row.text,
    revision: 1,
    createdAt: 0,
    source: "pc",
    state: "queued",
    settings: {
      agent: "codex",
      mode: "edits",
      model: "provider default",
      effort: "provider default",
    },
  }));
  const items = chat.lines.map((line, index) => ({
    id: String(index),
    kind:
      line.who === "you"
        ? ("user_message" as const)
        : line.who === "tool"
          ? ("command_execution" as const)
          : ("assistant_message" as const),
    text: line.text,
    status: "completed" as const,
  }));

  return (
    <div className="chat-layout">
      <RunList compact runs={runs} cellar={cellar} selected={runId} />
      <section className="chat-main">
        <details className="narrow-run-picker">
          <summary>choose a run · sample</summary>
          <RunList runs={runs} cellar={cellar} selected={runId} />
        </details>
        <header className="chat-header stack">
          <div className="row">
            <h2>{card.title}</h2>
            <RunChip
              state={
                phase === "failed"
                  ? "failed"
                  : phase === "unknown" || disconnected || phase === "loading"
                    ? "unknown"
                    : page === "approval"
                      ? "waiting"
                      : runId === "sample-1"
                        ? "running"
                        : card.state
              }
            />
            <button disabled>stop</button>
          </div>
          <small className="muted">michu-pc · sample desk</small>
        </header>
        <div className="transcript stack">
          {disconnected && !history ? (
            <div className="empty">
              Reconnect · saved history available only after explicit View
              history.
              <button onClick={() => setHistory(true)}>view history</button>
            </div>
          ) : (
            <>
              <p className="history-label">
                {history
                  ? "saved sample history · current state unknown"
                  : "sample transcript"}
              </p>
              <Transcript
                items={phase === "empty" || phase === "loading" ? [] : items}
              />
            </>
          )}
        </div>
        {page === "approval" ? (
          <div className="waiting-dock">
            <ApprovalDock
              host={host}
              request={{
                id: "11111111-1111-4111-8111-111111111111",
                runId,
                agent: "codex",
                what: "run a command",
                subject: "npm i expo-av",
                effect: "Sample approval · no command executes",
                always: "allow for this run",
                state: "pending",
                createdAt: 0,
              }}
            />
          </div>
        ) : (
          <Composer
            cellar={cellar}
            host={host}
            runId={runId}
            previewQueue={page === "queue" ? queue : []}
          />
        )}
      </section>
      <RunRail cellar={cellar} host={host} run={run} />
    </div>
  );
}
