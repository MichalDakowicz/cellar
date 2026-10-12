import { useState } from "react";
import type { Cellar } from "./useCellar";
import { createShelf, renameShelf, deleteShelf } from "./data/structureApi";
import { createGroup } from "./data/groupApi";
import { navigate } from "./useRoute";

export function StructureSettings({ cellar }: { cellar: Cellar }) {
  const [name, setName] = useState("");
  const [shelf, setShelf] = useState(cellar.shelves[0]?.id ?? "");
  const [editing, setEditing] = useState<string | null>(null);
  const [rename, setRename] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function write(work: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await work();
      await cellar.refresh();
      setName("");
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <h2>shelves and groups</h2>
      {cellar.shelves.map((row) => (
        <div className="settings-row" key={row.id}>
          <strong>{row.name}</strong>
          <div className="chips">
            <button
              onClick={() => {
                setEditing(row.id);
                setRename(row.name);
              }}
            >
              rename
            </button>
            <button onClick={() => setDeleting(row.id)}>remove</button>
          </div>
        </div>
      ))}
      {editing && (
        <div className="row">
          <input
            aria-label="rename shelf"
            value={rename}
            onChange={(event) => setRename(event.target.value)}
          />
          <button
            disabled={busy || !rename.trim()}
            onClick={() =>
              void write(async () => {
                await renameShelf(editing, rename.trim());
                setEditing(null);
              })
            }
          >
            save
          </button>
          <button onClick={() => setEditing(null)}>cancel</button>
        </div>
      )}
      {deleting && (
        <div className="card stack">
          <p>
            Remove shelf and its project containers? Thoughts return to inbox.
          </p>
          <button
            disabled={busy}
            onClick={() =>
              void write(async () => {
                await deleteShelf(deleting);
                setDeleting(null);
              })
            }
          >
            remove shelf
          </button>
          <button onClick={() => setDeleting(null)}>keep shelf</button>
        </div>
      )}
      <h2 className="overline">create</h2>
      <input
        aria-label="new shelf or group"
        placeholder="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <button
        disabled={busy || !name.trim()}
        onClick={() =>
          void write(() =>
            createShelf(cellar.ownerId, name.trim(), cellar.shelves.length),
          )
        }
      >
        add shelf
      </button>
      <label>
        group on shelf
        <select
          value={shelf}
          onChange={(event) => setShelf(event.target.value)}
        >
          {cellar.shelves.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      <button
        disabled={busy || !name.trim() || !shelf}
        onClick={() =>
          void write(() =>
            createGroup(cellar.ownerId, {
              shelfId: shelf,
              name: name.trim(),
              position: cellar.groups.length,
            }),
          )
        }
      >
        add group
      </button>
      <button onClick={() => navigate("/arrange")}>
        arrange shelves and projects
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
