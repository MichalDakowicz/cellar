import type { Project } from "@/types/cellar";
import { countLive, tallyKinds } from "@/lib/entryGroups";
import type { Entry } from "@/types/cellar";
import { RouteLink } from './RouteLink';

export function ProjectTile({
  project,
  entries,
  crumb,
}: {
  project: Project;
  entries: Entry[];
  crumb?: string | null;
}) {
  const mine = entries.filter((row) => row.projectId === project.id);
  return (
    <RouteLink
      className="project-tile stack"
      href={`/project/${project.id}`}
    >
      {project.icon ? (
        <img src={project.icon} alt="" />
      ) : (
        <span className="project-glyph">{project.name.slice(0, 2)}</span>
      )}
      <h3>{project.groupHome ? "general" : project.name}</h3>
      {crumb && <small className="muted">{crumb}</small>}
      <strong className="stat">{countLive(mine)}</strong>
      <small className="muted">
        open thoughts{project.pinned ? " · pinned" : ""}
      </small>
      <small className="muted">
        {tallyKinds(
          mine.filter(
            (row) =>
              !row.archived && ["open", "doing", "blocked"].includes(row.state),
          ),
        )
          .filter((row) => row.count > 0)
          .slice(0, 2)
          .map((row) => `${row.count} ${row.kind}`)
          .join(" · ")}
      </small>
    </RouteLink>
  );
}
