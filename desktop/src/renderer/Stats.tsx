import type { Cellar } from "./useCellar";
import { save } from "./preferences";
import { useStatsView } from "./useStatsView";
import { navigate } from "./useRoute";

export function Stats({ cellar }: { cellar: Cellar }) {
  const view = useStatsView(cellar);
  return (
    <div className="page stack">
      <h1>stats</h1>
      <select
        aria-label="stats shelf"
        value={view.shelf?.id ?? ""}
        onChange={(event) =>
          save("cellar-prefs", "statsShelfId", event.target.value || null)
        }
      >
        <option value="">every shelf</option>
        {cellar.shelves.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
          </option>
        ))}
      </select>
      <div className="stat-grid">
        <section>
          <strong className="stat">{view.total}</strong>
          <p className="muted">thoughts</p>
        </section>
        <section>
          <strong className="stat">{view.open}</strong>
          <p className="muted">still open</p>
        </section>
        <section>
          <strong className="stat">{view.projectCount}</strong>
          <p className="muted">projects</p>
        </section>
      </div>
      <h2 className="overline">state spread</h2>
      <div className="state-spread">
        {view.states.map((row) => (
          <span
            key={row.state}
            style={{ flex: row.count, background: row.color }}
            title={`${row.state} ${row.count}`}
          />
        ))}
      </div>
      <div className="chips">
        {view.states.map((row) => (
          <small key={row.state} style={{ color: row.color }}>
            {row.state} · {row.count}
          </small>
        ))}
      </div>
      <h2 className="overline">what you dump</h2>
      {view.kinds.map((row) => (
        <div className="row stat-row" key={row.kind}>
          <span>{row.kind}</span>
          <meter min={0} max={100} value={row.pct} />
          <span className="mono">{row.count}</span>
        </div>
      ))}
      <h2 className="overline">busiest projects</h2>
      {view.busiest.map((row) => (
        <button
          className="settings-row"
          key={row.id}
          onClick={() => navigate(`/project/${row.id}`)}
        >
          <span>{row.name}</span>
          <small className="muted">
            {row.total} entries · {row.open} open
          </small>
        </button>
      ))}
    </div>
  );
}
