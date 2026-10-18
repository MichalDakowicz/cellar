import { useState } from "react";
import { Bot, Plus } from "lucide-react";
import type { DeskRun } from "@/lib/deskProtocol";
import type { RuntimeRequest } from "@/lib/deskApprovals";
import type { RunFilter } from "@/lib/deskRunList";
import { detailParts, metaParts } from "@/lib/deskView";
import { RouteLink } from './RouteLink';
import { RunChip } from "./RunChip";
import type { Cellar } from "./useCellar";
import { useRunCards } from "./useRunCards";

export function RunList({
  runs,
  cellar,
  selected,
  compact = false,
  approvals,
}: {
  runs: DeskRun[];
  cellar: Cellar;
  selected?: string;
  compact?: boolean;
  approvals?: RuntimeRequest[];
}) {
  const [filter, setFilter] = useState<RunFilter>("all");
  const [query, setQuery] = useState("");
  const cards = useRunCards(runs, cellar, filter, query, approvals);
  const groups = compact
    ? cards.groups.map((row) => ({ title: `$${row.project}`, runs: row.runs }))
    : [
        { title: "waiting on you", runs: cards.sections.waiting },
        { title: "working", runs: cards.sections.running },
        { title: "lately", runs: cards.sections.lately },
      ];
  return (
    <div className={compact ? "run-list-pane" : "stack run-sections"}>
      {compact && (
        <>
          <header className="row">
            <h2>chat</h2>
            <RouteLink
              className="icon"
              aria-label="new task"
              href="/desk/new"
            >
              <Plus size={16} />
            </RouteLink>
          </header>
          <input
            aria-label="search runs"
            className="run-search"
            placeholder="search runs — try $cellar or codex"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="chips">
            {(["all", "waiting", "running"] as const).map((value) => (
              <button
                className={value === filter ? "selected" : ""}
                aria-pressed={value === filter}
                key={value}
                onClick={() => setFilter(value)}
              >
                {value}
                {value === "all" ? "" : ` ${cards.counts[value]}`}
              </button>
            ))}
          </div>
        </>
      )}
      {groups.map(
        (group) =>
          group.runs.length > 0 && (
            <section className="stack" key={group.title}>
              <h2 className="overline">
                {group.title}
                {compact
                  ? ""
                  : ` · ${group.runs.length}${group.runs.some((row) => row.id.startsWith("sample-")) ? " · includes sample" : ""}`}
              </h2>
              {group.runs.map((run) => (
                <RouteLink
                  className={`run-row ${selected === run.id ? "selected" : ""}`}
                  key={run.id}
                  href={`/desk/run/${run.id}`}
                >
                  <div className="run-card-line">
                    {!compact && ["waiting", "running"].includes(run.state) && (
                      <span className="run-agent">
                        <Bot size={20} />
                      </span>
                    )}
                    <div className="stack">
                      {!compact && (
                        <small className="muted">
                          {run.id.startsWith("sample-") ? "sample · " : ""}
                          {run.state === "waiting" ? "approval" : run.project}
                        </small>
                      )}
                      <div className="row">
                        <strong>{run.title}</strong>
                        <RunChip state={run.state} />
                      </div>
                      <small className="muted">
                        {metaParts(run.meta).map((part, index) => (
                          <span
                            key={index}
                            className={`${part.mono ? "mono" : ""} ${part.tone ?? ""}`}
                          >
                            {part.text}
                          </span>
                        ))}
                      </small>
                      {!compact && run.detail && (
                        <p className="muted">
                          {detailParts(run.detail).map((part, index) => (
                            <span
                              className={part.mono ? "mono" : ""}
                              key={index}
                            >
                              {part.text}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  </div>
                </RouteLink>
              ))}
            </section>
          ),
      )}
      {!runs.length && <p className="muted">no runs yet</p>}
    </div>
  );
}
