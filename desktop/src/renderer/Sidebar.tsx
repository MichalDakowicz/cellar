import {
  Archive,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  PenLine,
  Search,
  Settings,
  Smartphone,
  SquareTerminal,
  Eye,
  ChartNoAxesColumn,
} from "lucide-react";
import type { Cellar } from "./useCellar";
import type { Host } from "./useHost";
import { navigate } from "./useRoute";
import { save, saved, useSaved } from "./preferences";

const cellarLinks = [
  ["/", "dump", PenLine],
  ["/projects", "projects", Archive],
  ["/inbox", "inbox", Inbox],
  ["/stats", "stats", ChartNoAxesColumn],
] as const;
const deskLinks = [
  ["/desk", "home", LayoutDashboard],
  ["/desk/chat", "chat", MessageSquare],
  ["/desk/commands", "commands", SquareTerminal],
  ["/desk/previews", "previews", Eye],
  ["/desk/phone", "phone", Smartphone],
] as const;
export function Sidebar({
  path,
  cellar,
  host,
  name,
  avatar,
}: {
  path: string;
  cellar: Cellar;
  host: Host;
  name: string;
  avatar?: string | null;
}) {
  useSaved();
  const shelfId = saved<string | null>("cellar-prefs", "shelfId", null);
  const activeShelfId = shelfId ?? cellar.shelves[0]?.id ?? "";
  return (
    <aside className="sidebar">
      <div className="sidebar-scroll">
        <div className="brand">cellar</div>
        <button
          className="jump"
          aria-label="jump to anything"
          onClick={() => navigate("/search")}
        >
          <Search size={16} />
          <span>jump to anything</span>
          <kbd>ctrl k</kbd>
        </button>
        <label className="shelf-switch">
          <span className="overline">shelf</span>
          <select
            aria-label="switch shelf"
            value={activeShelfId}
            onChange={(event) =>
              save("cellar-prefs", "shelfId", event.target.value || null)
            }
          >
            {cellar.shelves.map((shelf) => (
              <option key={shelf.id} value={shelf.id}>
                {shelf.name}
              </option>
            ))}
          </select>
        </label>
        <div className="side-group">
          <span className="overline">cellar</span>
          {cellarLinks.map(([href, label, Icon]) => (
            <button
              title={label}
              aria-label={label}
              key={href}
              className={`side-link ${path === href ? "active" : ""}`}
              onClick={() => navigate(href)}
            >
              <Icon size={17} />
              <span>{label}</span>
              {href === "/inbox" && (
                <small>
                  {cellar.entries.filter(
                    (row) =>
                      !row.archived &&
                      (row.state === "blocked" || row.projectId === null),
                  ).length || ""}
                </small>
              )}
            </button>
          ))}
        </div>
        <div className="side-group">
          <span className="overline">desk</span>
          {deskLinks.map(([href, label, Icon]) => (
            <button
              aria-label={label}
              title={label}
              key={href}
              className={`side-link ${path === href || (href === "/desk/chat" && path.startsWith("/desk/run/")) ? "active" : ""}`}
              onClick={() => navigate(href)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="side-group">
          <span className="overline">pinned</span>
          {cellar.projects
            .filter(
              (project) => project.pinned && project.shelfId === activeShelfId,
            )
            .map((project) => (
              <button
                className="side-link"
                key={project.id}
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <span className="project-glyph">{project.name[0]}</span>
                {project.name}
              </button>
            ))}
        </div>
      </div>
      <footer>
        <small className="muted">
          {host.live ? `● on ${host.info?.name}` : "○ reconnecting"}
        </small>
        <button
          className="side-link"
          aria-label="account and settings"
          onClick={() => navigate("/settings")}
        >
          <span className="avatar">
            {avatar ? (
              <img src={avatar} alt="" />
            ) : (
              name.slice(0, 2).toUpperCase()
            )}
          </span>
          <span>{name}</span>
          <Settings size={16} />
        </button>
      </footer>
    </aside>
  );
}
