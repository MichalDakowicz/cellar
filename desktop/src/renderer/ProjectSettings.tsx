import { useState } from "react";
import type { Project } from "@/types/cellar";
import type { Cellar } from "./useCellar";
import {
  renameProject,
  setProjectRepo,
  setProjectPinned,
  moveProject,
  deleteProject,
  setProjectIcon,
} from "./data/structureApi";
import { setProjectGroup } from "./data/groupApi";
import { preparePicture } from "./pickPicture";
import { navigate } from "./useRoute";

export function ProjectSettings({
  project,
  cellar,
}: {
  project: Project;
  cellar: Cellar;
}) {
  const [name, setName] = useState(project.name);
  const [folder, setFolder] = useState(project.repoPath ?? "");
  const [url, setUrl] = useState(project.repoUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  async function write(work: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
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
      <label>
        project name
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        local folder
        <input
          className="mono"
          value={folder}
          onChange={(event) => setFolder(event.target.value)}
        />
      </label>
      <label>
        repository link
        <input value={url} onChange={(event) => setUrl(event.target.value)} />
      </label>
      <button
        disabled={busy || !name.trim()}
        onClick={() =>
          void write(async () => {
            await renameProject(project.id, name.trim());
            await setProjectRepo(project.id, {
              repoPath: folder.trim() || null,
              repoUrl: url.trim() || null,
            });
          })
        }
      >
        save project
      </button>
      <label className="settings-row">
        pinned
        <input
          type="checkbox"
          disabled={busy}
          checked={project.pinned}
          onChange={(event) =>
            void write(() => setProjectPinned(project.id, event.target.checked))
          }
        />
      </label>
      <label>
        shelf
        <select
          value={project.shelfId}
          disabled={busy}
          onChange={(event) =>
            void write(() => moveProject(project.id, event.target.value))
          }
        >
          {cellar.shelves.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      {!project.groupHome && (
        <label>
          group
          <select
            value={project.groupId ?? ""}
            disabled={busy}
            onChange={(event) =>
              void write(() =>
                setProjectGroup(project.id, event.target.value || null),
              )
            }
          >
            <option value="">none</option>
            {cellar.groups
              .filter((row) => row.shelfId === project.shelfId)
              .map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
          </select>
        </label>
      )}
      <label className="file-button">
        project picture
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file)
              void write(async () => {
                const image = await preparePicture(file);
                await setProjectIcon(project.id, image.thumb);
              });
            event.target.value = "";
          }}
        />
      </label>
      {project.icon && (
        <div className="row">
          <img className="project-icon" src={project.icon} alt="project" />
          <button
            disabled={busy}
            onClick={() => void write(() => setProjectIcon(project.id, null))}
          >
            remove picture
          </button>
        </div>
      )}
      <button className="danger" onClick={() => setDeleting(true)}>
        remove project
      </button>
      {deleting && (
        <div className="card stack">
          <p>Remove project? Its thoughts return to inbox.</p>
          <button
            disabled={busy}
            onClick={() =>
              void write(async () => {
                await deleteProject(project.id);
                navigate("/projects");
              })
            }
          >
            remove project
          </button>
          <button onClick={() => setDeleting(false)}>keep project</button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
