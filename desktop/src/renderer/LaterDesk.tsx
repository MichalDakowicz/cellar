import { useState } from "react";
import { SAMPLE_GROUP, SAMPLE_NIGHT, SAMPLE_RACE } from "@/lib/deskSample";
import { groupLine, nightLine, raceRows } from "@/lib/deskLater";
import { saved, useSaved } from "./preferences";
import { RunChip } from "./RunChip";
import { navigate } from "./useRoute";

/** Existing artboard presenters only. These controls never dispatch host operations. */
export function LaterDesk({ page }: { page: "race" | "night" | "group" }) {
  useSaved();
  const sample = saved("cellar-desk-prefs", "sample", false);
  const [agent, setAgent] = useState(SAMPLE_RACE.runs[0].agent);
  return (
    <section className="page stack">
      <header className="row">
        <div>
          <h1>
            {page === "night"
              ? "night shift"
              : page === "group"
                ? "group run"
                : "race"}
          </h1>
          <p className="muted">
            {sample
              ? "sample desk · execution unavailable"
              : "unavailable · turn on sample desk in devices to view presenter"}
          </p>
        </div>
        <button onClick={() => navigate("/desk")}>close</button>
      </header>
      {sample &&
        (page === "race" ? (
          <>
            <h2>{SAMPLE_RACE.title}</h2>
            <div className="chips">
              {SAMPLE_RACE.runs.map((run) => (
                <button
                  key={run.agent}
                  className={agent === run.agent ? "selected" : ""}
                  onClick={() => setAgent(run.agent)}
                >
                  {run.agent}
                </button>
              ))}
            </div>
            <div className="card stack">
              <span className="overline">{agent} · sample preview</span>
              <h3>your cart</h3>
              <p className="muted">cart drawer · responsive phone preview</p>
              <button disabled>checkout</button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>measure</th>
                  {SAMPLE_RACE.runs.map((run) => (
                    <th key={run.agent}>{run.agent}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {raceRows(SAMPLE_RACE.runs).map((row) => (
                  <tr key={row.label}>
                    <th>{row.label}</th>
                    {row.values.map((value, index) => (
                      <td key={index}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="chips">
              <button disabled>follow up both</button>
              <button disabled>keep {agent}’s</button>
            </div>
          </>
        ) : page === "night" ? (
          <>
            <p className="muted">{nightLine(SAMPLE_NIGHT.runs)} · sample</p>
            {SAMPLE_NIGHT.runs.map((run) => (
              <section className="card stack" key={run.id}>
                <div className="row">
                  <h3>{run.title}</h3>
                  <RunChip
                    state={run.state === "passed" ? "done" : run.state}
                  />
                </div>
                <small className="muted">{run.meta}</small>
                <p>{run.summary}</p>
                <div className="chips">
                  <button disabled>toss</button>
                  <button disabled>{run.second}</button>
                  {run.state === "passed" && <button disabled>keep</button>}
                </div>
              </section>
            ))}
            <h2 className="overline">tonight · sample queue</h2>
            {SAMPLE_NIGHT.tonight.map((task) => (
              <div className="row" key={task.title}>
                <span>{task.title}</span>
                <small className="muted">{task.project}</small>
              </div>
            ))}
            <button disabled>add something for tonight</button>
          </>
        ) : (
          <>
            <div className="chips">
              <button disabled>follow up all</button>
              <button disabled>stop all</button>
            </div>
            <p className="card">{SAMPLE_GROUP.prompt}</p>
            <h2 className="overline">
              per project · {groupLine(SAMPLE_GROUP.projects)}
            </h2>
            {SAMPLE_GROUP.projects.map((project) => (
              <section className="card row" key={project.name}>
                <div>
                  <h3>{project.name}</h3>
                  <small className="mono muted">{project.line}</small>
                </div>
                <RunChip state={project.state} />
                <button disabled>
                  {project.state === "waiting" ? "answer" : "open"}
                </button>
              </section>
            ))}
            <h2 className="overline">the same change, side by side</h2>
            <div className="two-columns">
              {SAMPLE_GROUP.projects.slice(0, 2).map((project) => (
                <div className="card stack" key={project.name}>
                  <code>{project.name} · Button</code>
                  <code className="danger">− border-radius: 10px;</code>
                  <code>+ border-radius: var(--radius-control);</code>
                </div>
              ))}
            </div>
            <h2 className="overline">ship · each with its own commands</h2>
            {SAMPLE_GROUP.projects
              .filter((project) => project.ship.length)
              .map((project) => (
                <div className="settings-row" key={project.name}>
                  <span>{project.name}</span>
                  <code>{project.ship.join(" · ")}</code>
                  <small className="muted">{project.shipState}</small>
                </div>
              ))}
            <button disabled>ship what passed</button>
          </>
        ))}
    </section>
  );
}
