import { useState } from "react";
import {
  formatCommandSettings,
  parseCommandSettings,
  type DeskProjectCommands,
} from "@/lib/deskCommands";
import { calls } from "./client";
import { navigate } from "./useRoute";
import { save, saved, useSaved } from "./preferences";

export function Commands({
  projects,
  compact = false,
}: {
  projects: DeskProjectCommands[] | null;
  compact?: boolean;
}) {
  useSaved();
  const selected = saved<string | null>(
    "cellar-desk-prefs",
    "commandsProject",
    null,
  );
  const project = projects?.find((row) => row.id === selected) ?? projects?.[0];
  const [editor, setEditor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function job(command: string) {
    if (!project || busy) return;
    if (project.id.startsWith("sample-")) {
      setMessage(`$${command} is a sample command`);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      navigate(
        `/desk/run/${(await calls.job({ projectId: project.id, command })).id}`,
      );
    } catch (error) {
      setMessage(
        `${String(error)} · outcome unconfirmed; inspect runs before retrying`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function persist() {
    if (!project || editor === null) return;
    setBusy(true);
    try {
      await calls.saveCommands(project.id, parseCommandSettings(editor));
      setMessage("PC saved command settings.");
      setEditor(null);
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={`stack ${compact ? "" : "page"}`}>
      <h2 className={compact ? "overline" : ""}>commands</h2>
      {!projects && (
        <p className="muted">commands unavailable · reconnect to host</p>
      )}
      {projects?.length === 0 && (
        <p className="muted">link a project folder to read its commands</p>
      )}
      <div className="chips">
        {projects?.map((row) => (
          <button
            className={project?.id === row.id ? "selected" : ""}
            key={row.id}
            onClick={() => {
              save("cellar-desk-prefs", "commandsProject", row.id);
              setEditor(null);
            }}
          >
            {row.name}
          </button>
        ))}
      </div>
      {project && (
        <>
          <div className="command-grid">
            {project.commands.map((command) => (
              <button
                disabled={busy}
                className="command mono"
                key={command.id}
                onClick={() => void job(command.id)}
              >
                ${command.label}
              </button>
            ))}
          </div>
          <small className="mono muted">{project.meta}</small>
          {project.error && <p role="status">{project.error}</p>}
          {!compact && (
            <button
              onClick={() =>
                setEditor(formatCommandSettings(project.overrides ?? []))
              }
            >
              edit overrides and chains
            </button>
          )}
          {editor !== null && (
            <>
              <textarea
                aria-label="command settings"
                className="mono"
                value={editor}
                onChange={(event) => setEditor(event.target.value)}
              />
              <small className="muted">name = npm:script + gradle:task</small>
              <button disabled={busy} onClick={() => void persist()}>
                save on PC
              </button>
            </>
          )}
        </>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
