import { AgentAccess } from "./AgentAccess";
import { AccountSettings } from "./AccountSettings";
import { DESK_MODES } from "@/lib/deskTask";
import { EXTRA_KEYS, NIGHT_SHIFT } from "@/lib/deskSettings";
import { SETTINGS_SECTIONS } from "@/lib/settingsSections";
import { navigate } from "./useRoute";
import { Pairing } from "./Pairing";
import type { Host } from "./useHost";
import type { Cellar } from "./useCellar";
import { saved, save, useSaved } from "./preferences";
import { NotificationsSettings } from "./NotificationsSettings";
import { UsageSettings } from "./UsageSettings";
import { RecipeSettings } from "./RecipeSettings";
import { DisplaySettings } from "./DisplaySettings";
import { DumpSettings } from "./DumpSettings";
import { ProjectSettings } from "./ProjectSettings";
import { GroupSettings } from "./GroupSettings";
import { StructureSettings } from "./StructureSettings";
import { AccountDevices } from "./AccountDevices";

export function Settings({
  section,
  host,
  cellar,
  email,
}: {
  section: string;
  host: Host;
  cellar: Cellar;
  email: string;
}) {
  useSaved();
  const sample = saved<boolean>("cellar-desk-prefs", "sample", false);
  const project = section.startsWith("project/")
    ? cellar.projects.find((row) => row.id === section.slice(8))
    : null;
  const group = section.startsWith("group/")
    ? cellar.groups.find((row) => row.id === section.slice(6))
    : null;
  const title =
    project?.name ??
    SETTINGS_SECTIONS.find((row) => row.id === section)?.label ??
    (section || "settings");
  return (
    <div className="settings-layout">
      <nav className="settings-nav stack" aria-label="settings sections">
        <h1>settings</h1>
        {SETTINGS_SECTIONS.map((row) => (
          <button
            key={row.id}
            className={`side-link ${row.id === section ? "active" : ""}`}
            onClick={() => navigate(`/settings/${row.id}`)}
          >
            {row.label}
          </button>
        ))}
      </nav>
      <div className="page settings-page stack">
        <header>
          <h1>{title}</h1>
          <p className="muted">
            {SETTINGS_SECTIONS.find((row) => row.id === section)?.sub}
          </p>
        </header>
        {!section &&
          SETTINGS_SECTIONS.map((row) => (
            <button
              className="settings-row"
              key={row.id}
              onClick={() => navigate(`/settings/${row.id}`)}
            >
              <span>
                {row.label}
                <p className="muted">{row.sub}</p>
              </span>
              <span>›</span>
            </button>
          ))}
        {section === "devices" && (
          <>
            <Pairing />
            <AccountDevices />
            <label className="settings-row">
              show a sample desk
              <input
                type="checkbox"
                checked={sample}
                onChange={(event) =>
                  save("cellar-desk-prefs", "sample", event.target.checked)
                }
              />
            </label>
            <small className="muted">
              sample runs and coming screens, on this device only
            </small>
          </>
        )}
        {section === "agents" && (
          <>
            <h2 className="overline">new task defaults</h2>
            <div className="chips">
              {host.info?.agents
                .filter((agent) => agent.installed)
                .map((agent) => (
                  <button
                    key={agent.id}
                    className={
                      saved("cellar-desk-prefs", "defaultAgent", "claude") ===
                      agent.id
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      save("cellar-desk-prefs", "defaultAgent", agent.id)
                    }
                  >
                    {agent.id}
                  </button>
                ))}
            </div>
            <div className="chips">
              {DESK_MODES.map((mode) => (
                <button
                  key={mode.id}
                  className={
                    saved("cellar-desk-prefs", "defaultMode", "edits") ===
                    mode.id
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    save("cellar-desk-prefs", "defaultMode", mode.id)
                  }
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <small className="muted">
              Provider sign-in stays in its installed CLI. Model switching and
              skill search unavailable yet.
            </small>
            <AgentAccess />
          </>
        )}
        {section === "appearance" && <DisplaySettings />}
        {section === "hosts" && (
          <>
            <section className="card stack">
              <h2>{host.info?.name ?? "this pc"}</h2>
              <p className="muted">
                {host.live ? "local host · synchronized" : "unavailable"}
              </p>
              <button onClick={() => navigate("/settings/devices")}>
                name and pairing
              </button>
            </section>
            <p className="muted">SSH hosts unavailable.</p>
          </>
        )}
        {section === "usage" && <UsageSettings sample={sample} />}
        {section === "recipes" && <RecipeSettings key={host.key} sample={sample} cellar={cellar} />}
        {section === "keys" && (
          <>
            <p className="muted">
              $ commands and Cellar entries work. @ file and / skill search
              unavailable yet.
            </p>
            {EXTRA_KEYS.map((key) => (
              <label className="settings-row" key={key.key}>
                <span className="mono">{key.key}</span>
                <span>{key.name}</span>
                <input type="checkbox" disabled checked={key.on} />
              </label>
            ))}
            <p className="muted">Custom key sources unavailable.</p>
          </>
        )}
        {section === "notifications" && <NotificationsSettings />}
        {section === "night" && (
          <>
            <button onClick={() => navigate('/desk/night')}>open night queue, window and morning digest</button>
            {NIGHT_SHIFT.map((row) => (
              <div className="settings-row" key={row.label}>
                {row.label}
                <span className="muted">
                  {sample ? `${row.value} · sample` : "unavailable"}
                </span>
              </div>
            ))}
          </>
        )}
        {section === "account" && (
          <AccountSettings email={email} cellar={cellar} />
        )}
        {section === "about" && (
          <>
            <h2>cellar</h2>
            <p className="muted">one thought at a time</p>
            <p className="mono">host {host.info?.id ?? "unavailable"}</p>
          </>
        )}
        {section === "dump" && <DumpSettings />}
        {section === "structure" && <StructureSettings cellar={cellar} />}
        {project && (
          <ProjectSettings key={project.id} project={project} cellar={cellar} />
        )}
        {group && (
          <GroupSettings key={group.id} group={group} cellar={cellar} />
        )}
      </div>
    </div>
  );
}
