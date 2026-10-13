import { EntryList } from "./EntryList";
import type { ReturnTypeProjectView } from "./projectViewTypes";

export function ProjectEntries({
  view,
  mode,
  selected,
  onSelect,
}: {
  view: ReturnTypeProjectView;
  mode: string;
  selected: string[];
  onSelect: (id: string) => void;
}) {
  if (mode === "kanban")
    return (
      <div className="board">
        {view.columns.map((column) => (
          <section className="stack" key={column.key}>
            <h2 className="overline">
              {column.label} · {column.entries.length}
            </h2>
            <EntryList
              entries={column.entries}
              selected={selected}
              onSelect={onSelect}
            />
          </section>
        ))}
      </div>
    );
  if (mode === "stream")
    return (
      <div className="stack">
        {view.days.map((day) => (
          <section className="stack" key={day.key}>
            <h2 className="overline">{day.key}</h2>
            <EntryList
              entries={day.entries}
              selected={selected}
              onSelect={onSelect}
            />
          </section>
        ))}
      </div>
    );
  return (
    <div className="stack">
      {view.bands.map((band) => (
        <details
          className="entry-band"
          key={band.band}
          open={
            !view.settings.hideSettled ||
            !["done", "dropped", "archived"].includes(band.band)
          }
        >
          <summary className="overline">
            {band.band} · {band.count}
          </summary>
          <div className="stack">
            {band.kinds.map((kind) => (
              <details key={kind.kind} open>
                <summary className="overline">
                  {kind.kind} · {kind.entries.length}
                </summary>
                <EntryList
                  entries={kind.entries}
                  selected={selected}
                  onSelect={onSelect}
                />
              </details>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
