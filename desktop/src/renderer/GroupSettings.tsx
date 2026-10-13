import { useState } from "react";
import type { Group } from "@/types/cellar";
import type { Cellar } from "./useCellar";
import {
  deleteGroup,
  renameGroup,
  setGroupFolder,
  setGroupPinned,
} from "./data/groupApi";
import { navigate } from "./useRoute";

export function GroupSettings({
  group,
  cellar,
}: {
  group: Group;
  cellar: Cellar;
}) {
  const [name, setName] = useState(group.name);
  const [folder, setFolder] = useState(group.repoPath ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  async function write(work: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await work();
      await cellar.refresh();
      setMessage("saved");
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <h2>{group.name}</h2>
      <label>
        group name
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        shared folder
        <input
          className="mono"
          value={folder}
          onChange={(event) => setFolder(event.target.value)}
        />
      </label>
      <button
        disabled={busy || !name.trim()}
        onClick={() =>
          void write(async () => {
            await renameGroup(group.id, name.trim());
            await setGroupFolder(group.id, folder.trim() || null);
          })
        }
      >
        save group
      </button>
      <label className="settings-row">
        pinned
        <input
          type="checkbox"
          checked={group.pinned}
          disabled={busy}
          onChange={(event) =>
            void write(() => setGroupPinned(group.id, event.target.checked))
          }
        />
      </label>
      <p className="muted">general project holds thoughts about whole group</p>
      <button className="danger" onClick={() => setDeleting(true)}>
        remove group
      </button>
      {deleting && (
        <div className="card stack">
          <p>Remove folder? Projects and thoughts stay on shelf.</p>
          <button
            disabled={busy}
            onClick={() =>
              void write(async () => {
                await deleteGroup(group.id);
                navigate("/projects");
              })
            }
          >
            remove group
          </button>
          <button onClick={() => setDeleting(false)}>keep group</button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
