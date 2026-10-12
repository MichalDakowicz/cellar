import { useEffect, useState } from "react";
import { entryTrail, type TrailEvent } from "@/lib/entryTrail";
import type { Entry, Project } from "@/types/cellar";
import { fetchEntryEvents } from "./data/trailApi";

export function EntryTrail({
  entry,
  projects,
}: {
  entry: Entry;
  projects: Project[];
}) {
  const [events, setEvents] = useState<TrailEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void fetchEntryEvents(entry.id)
      .then((value) => {
        if (active) {
          setEvents(value);
          setError(null);
        }
      })
      .catch((error) => {
        if (active) setError(String(error));
      });
    return () => {
      active = false;
    };
  }, [entry]);
  return (
    <details>
      <summary>trail</summary>
      <div className="stack trail">
        {entryTrail(entry, events, projects).map((row) => (
          <div className="row" key={row.key}>
            <small className="mono muted">
              {new Date(row.at).toLocaleString()}
            </small>
            <span>
              {row.text} · {row.agent ?? row.source}
            </span>
          </div>
        ))}
        {error && <p role="status">Move history unavailable · {error}</p>}
      </div>
    </details>
  );
}
