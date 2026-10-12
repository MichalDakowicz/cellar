import { useEffect } from "react";
import { DeviceCard } from "./DeviceCard";
import { canStartNewStopAll } from "@/lib/deskControlRecovery";
import { pendingApproval } from "@/lib/deskApprovals";
import { deskCounts, deskCountLine } from "@/lib/deskCounts";
import { deskToday } from "@/lib/deskHome";
import { EntryList } from "./EntryList";
import type { DeskProjectCommands } from "@/lib/deskCommands";
import type { Cellar } from "./useCellar";
import type { Host } from "./useHost";
import { useControl } from "./useControl";
import { RunList } from "./RunList";
import { ApprovalDock } from "./ApprovalDock";
import { Capture } from "./Capture";
import { Commands } from "./Commands";
import { navigate } from "./useRoute";
import { saved, useSaved } from "./preferences";

export function Home({
  host,
  cellar,
  commands,
}: {
  host: Host;
  cellar: Cellar;
  commands: DeskProjectCommands[] | null;
}) {
  useSaved();
  const stop = useControl(host, "stop-all");
  const { stored, busy, submit } = stop;
  useEffect(() => {
    if (!host.live || busy || stored?.receipt?.state !== "pending") return;
    const timer = setTimeout(() => {
      void submit();
    }, 5000);
    return () => clearTimeout(timer);
  }, [
    host.live,
    busy,
    stored?.request.commandId,
    stored?.receipt?.state,
    submit,
  ]);
  const asks = host.live
    ? (host.state.approvals?.filter(
        (row) =>
          pendingApproval(row) ||
          !!saved<Record<string, unknown>>("desk-approvals", "pending", {})[
            `${host.key}:${row.id}`
          ],
      ) ?? [])
    : [];
  const counts = deskCounts({
    via: host.info ? "bridge" : "none",
    entries: cellar.entries,
    entriesState: cellar.error
      ? "failed"
      : cellar.loading
        ? "loading"
        : "ready",
    runs: host.state.runs,
    runsState: host.error ? "failed" : host.live ? "ready" : "loading",
    snapshotAt: null,
  });
  const figures = deskToday(
    cellar.entries.map((entry) => entry.createdAt),
    host.state.runs.filter((run) => !run.id.startsWith("sample-")),
  );
  const recover =
    stop.pending && !canStartNewStopAll(stop.stored?.receipt, host.info?.id);
  return (
    <div className="page stack home-page">
      <header className="row">
        <div>
          <h1>desk</h1>
          <p className="muted">
            {host.info?.name ?? "this pc"} ·{" "}
            {deskCountLine(counts) || "not answering"}
          </p>
        </div>
        <div className="row">
          <button
            className="danger"
            disabled={!host.live || !host.can.dispatch || stop.busy}
            onClick={() =>
              void stop.submit(
                recover
                  ? undefined
                  : { action: "stopAll", runId: null, scope: "account" },
              )
            }
          >
            {recover ? "check stop results" : "stop all agents"}
          </button>
        </div>
      </header>
      {stop.message && (
        <div role="status" className="stack">
          <p className="muted">{stop.message}</p>
          {stop.stored?.receipt?.hosts?.map((row) => (
            <small key={row.id}>
              {row.name} · {row.state}
              {row.error && ` · ${row.error}`}
            </small>
          ))}
        </div>
      )}
      <Capture cellar={cellar} compact />
      <div className="home-columns">
        <div className="stack">
          {asks.map((request) => (
            <ApprovalDock key={request.id} request={request} host={host} />
          ))}
          {!!counts.blockedEntries && (
            <section className="stack">
              <h2 className="overline">questions · waiting on you</h2>
              <EntryList
                entries={cellar.entries.filter(
                  (entry) => entry.state === "blocked" && !entry.archived,
                )}
              />
            </section>
          )}
          {host.live ? (
            <RunList runs={host.state.runs} cellar={cellar} />
          ) : (
            <section className="empty stack">
              <p>{host.error ?? "Synchronizing PC events…"}</p>
              <button onClick={host.reconnect}>reconnect</button>
            </section>
          )}
        </div>
        <div className="stack">
          <DeviceCard host={host} />
          <Commands projects={commands} compact />
          <section className="stack">
            <h2 className="overline">today</h2>
            {counts.working === null ? (
              <p className="muted">unavailable</p>
            ) : (
              <div className="today-figures">
                {figures.map((row) => (
                  <div className="stack" key={row.label}>
                    <strong>{row.value}</strong>
                    <span className="overline">{row.label}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      {saved("cellar-desk-prefs", "sample", false) && (
        <div className="chips">
          {(["race", "night", "group"] as const).map((page) => (
            <button key={page} onClick={() => navigate("/desk/" + page)}>
              {page} · sample
            </button>
          ))}
          <button onClick={() => navigate("/desk/share")}>
            file shared words
          </button>
        </div>
      )}
    </div>
  );
}
