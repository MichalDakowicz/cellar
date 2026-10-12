import { useState } from "react";
import { KINDS } from "@/lib/kinds";
import { ENTRY_STATES } from "@/lib/entryState";
import { countLive } from "@/lib/entryGroups";
import { toggleSelected } from "@/lib/entrySelection";
import type { EntryState } from "@/types/cellar";
import type { Cellar } from "./useCellar";
import type { Host } from "./useHost";
import { saved, save, useSaved } from "./preferences";
import { navigate } from "./useRoute";
import { Worktrees } from "./Worktrees";
import { createProject } from "./data/structureApi";
import { useProjectView } from "./useProjectView";
import { ProjectGrid } from "./ProjectGrid";
import { ProjectEntries } from "./ProjectEntries";

export function Projects({
  cellar,
  host,
  id,
}: {
  cellar: Cellar;
  host: Host;
  id?: string;
}) {
  useSaved();
  const view = useProjectView(cellar, id);
  const mode = saved<string>("cellar-prefs", "view", view.settings.defaultView);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function create() {
    if (!view.shelf || !name.trim() || busy) return;
    setBusy(true);
    try {
      await createProject(
        cellar.ownerId,
        view.shelf.id,
        name.trim(),
        cellar.projects.length,
      );
      setName("");
      await cellar.refresh();
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page stack">
      <header className="row">
        <div>
          <h1>{view.project?.name ?? view.shelf?.name ?? "projects"}</h1>
          <p className="muted">
            {view.project
              ? `${view.all.filter((row) => !row.archived).length} entries · ${countLive(view.all)} open`
              : "the things you are building"}
          </p>
        </div>
        {view.project ? (
          <div className="chips">
            <button
              onClick={() => navigate(`/settings/project/${view.project!.id}`)}
            >
              project settings
            </button>
            <button
              onClick={() => {
                save("desktop-new-task", "projectId", view.project!.id);
                save("desktop-new-task", "entryIds", selected);
                navigate("/desk/new");
              }}
            >
              start on pc{selected.length ? ` · ${selected.length}` : ""}
            </button>
          </div>
        ) : (
          <button onClick={() => navigate("/settings/structure")}>
            shelves and groups
          </button>
        )}
      </header>
      {!id ? (
        <>
          <ProjectGrid cellar={cellar} cells={view.cells} />
          <div className="row">
            <input
              aria-label="new project name"
              placeholder="new project"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <button
              disabled={busy || !name.trim()}
              onClick={() => void create()}
            >
              add project
            </button>
          </div>
        </>
      ) : !view.project ? (
        <p>project unavailable</p>
      ) : (
        <>
          <div className="row wrap">
            <div className="chips">
              {[
                ["grouped", "by kind"],
                ["stream", "one stream"],
                ["kanban", "board"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={mode === value ? "selected" : ""}
                  onClick={() => save("cellar-prefs", "view", value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <select
              aria-label="entry state filter"
              value={view.filter.state ?? ""}
              onChange={(event) =>
                view.setFilter({
                  ...view.filter,
                  state: (event.target.value || null) as EntryState | null,
                })
              }
            >
              <option value="">all states</option>
              {ENTRY_STATES.map((row) => (
                <option key={row.value} value={row.value}>
                  {row.label}
                </option>
              ))}
            </select>
            {mode === "kanban" && (
              <div className="chips">
                {(["state", "kind"] as const).map((axis) => (
                  <button
                    key={axis}
                    className={view.axis === axis ? "selected" : ""}
                    onClick={() => save("cellar-prefs", "kanbanAxis", axis)}
                  >
                    {axis}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="chips">
            {KINDS.map((kind) => (
              <button
                key={kind.value}
                className={
                  view.filter.kinds.includes(kind.value) ? "selected" : ""
                }
                onClick={() =>
                  view.setFilter({
                    ...view.filter,
                    kinds: view.filter.kinds.includes(kind.value)
                      ? view.filter.kinds.filter(
                          (value) => value !== kind.value,
                        )
                      : [...view.filter.kinds, kind.value],
                  })
                }
              >
                {kind.label}
              </button>
            ))}
          </div>
          <div className="project-columns">
            <ProjectEntries
              view={view}
              mode={mode}
              selected={selected}
              onSelect={(id) => setSelected(toggleSelected(selected, id))}
            />
            <aside className="project-rail stack">
              <Worktrees host={host} projectId={view.project.id} />
              <section className="stack">
                <h2 className="overline">repo</h2>
                <p className="mono muted">
                  {view.project.repoPath ?? "no folder linked"}
                </p>
                {view.project.repoUrl && (
                  <a
                    href={view.project.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    open repo
                  </a>
                )}
                <button
                  onClick={() =>
                    navigate(`/settings/project/${view.project!.id}`)
                  }
                >
                  project settings
                </button>
                <button
                  onClick={() =>
                    navigate(`/arrange/project/${view.project!.id}`)
                  }
                >
                  arrange entries
                </button>
                <button onClick={() => navigate("/desk/previews")}>
                  previews
                </button>
              </section>
            </aside>
          </div>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
