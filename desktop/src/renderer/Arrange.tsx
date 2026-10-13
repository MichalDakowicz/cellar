import { useState } from "react";
import { byPosition, moveIndex, positionWrites } from "@/lib/arrange";
import type { Cellar } from "./useCellar";
import { writePositions } from "./data/arrangeApi";
import { useAccountPreferences } from "./accountPreferences";
import { EntryCard } from "./EntryCard";
import type { Entry, Project, Shelf } from "@/types/cellar";

export function Arrange({
  cellar,
  projectId,
}: {
  cellar: Cellar;
  projectId?: string;
}) {
  const [mode, setMode] = useState("shelves");
  const [shelf, setShelf] = useState(cellar.shelves[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const prefs = useAccountPreferences();
  const rows = byPosition<Entry | Project | Shelf>(
    projectId
      ? cellar.entries.filter((row) => row.projectId === projectId)
      : mode === "shelves"
        ? cellar.shelves
        : cellar.projects.filter((row) => row.shelfId === shelf),
  );
  async function move(index: number, to: number) {
    if (busy) return;
    setBusy(true);
    try {
      await writePositions(
        projectId
          ? "cellar_entries"
          : mode === "shelves"
            ? "cellar_shelves"
            : "cellar_projects",
        positionWrites(
          rows.map((row) => ({ id: row.id, position: row.position ?? 0 })),
          moveIndex(rows, index, to).map((row) => row.id),
        ),
      );
      if (projectId) await prefs.update({ projectSort: "manual" });
      await cellar.refresh();
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page stack">
      <h1>arrange</h1>
      <p className="muted">your order · drag a row or use arrows</p>
      {!projectId && (
        <div className="row">
          <select
            aria-label="arrange scope"
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option>shelves</option>
            <option>projects</option>
          </select>
          {mode === "projects" && (
            <select
              aria-label="arrange shelf"
              value={shelf}
              onChange={(event) => setShelf(event.target.value)}
            >
              {cellar.shelves.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      {rows.map((row, index) => (
        <div
          className="settings-row"
          key={row.id}
          draggable={!busy}
          onDragStart={(event) =>
            event.dataTransfer.setData("text/plain", String(index))
          }
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const from = Number(event.dataTransfer.getData("text/plain"));
            if (Number.isInteger(from)) void move(from, index);
          }}
        >
          {"text" in row ? <EntryCard entry={row} /> : <span>{row.name}</span>}
          <button
            disabled={busy || index === 0}
            aria-label="move up"
            onClick={() => void move(index, index - 1)}
          >
            ↑
          </button>
          <button
            disabled={busy || index === rows.length - 1}
            aria-label="move down"
            onClick={() => void move(index, index + 1)}
          >
            ↓
          </button>
        </div>
      ))}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
