import { Folder } from "lucide-react";
import type { GridCell } from "@/lib/shelfGrid";
import type { Project } from "@/types/cellar";
import type { Cellar } from "./useCellar";
import { ProjectTile } from "./ProjectTile";
import { save, saved } from "./preferences";
import { navigate } from "./useRoute";

export function ProjectGrid({
  cellar,
  cells,
}: {
  cellar: Cellar;
  cells: GridCell<Project>[];
}) {
  function toggle(id: string) {
    const closed = saved<string[]>("cellar-prefs", "closedGroups", []);
    save(
      "cellar-prefs",
      "closedGroups",
      closed.includes(id)
        ? closed.filter((value) => value !== id)
        : [...closed, id],
    );
  }
  return (
    <div className="project-grid">
      {cells.map((cell) => (
        <div key={cell.key} className={cell.folderId ? "group-cell" : ""}>
          {cell.kind === "project" ? (
            <ProjectTile
              project={cell.project}
              entries={cellar.entries}
              crumb={cell.crumb}
            />
          ) : (
            <section className="project-tile stack">
              <button
                className="quiet"
                aria-expanded={cell.open}
                onClick={() => toggle(cell.group.id)}
              >
                <Folder size={24} />
                <h3>{cell.group.name}</h3>
              </button>
              <small className="muted">
                {cell.projects.length} projects ·{" "}
                {cell.open ? "open" : "folded"}
              </small>
              <button
                className="quiet"
                onClick={() => navigate(`/settings/group/${cell.group.id}`)}
              >
                group settings
              </button>
            </section>
          )}
        </div>
      ))}
    </div>
  );
}
