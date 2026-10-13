import { useRef, useState } from "react";
import { KINDS } from "@/lib/kinds";
import { guessKind } from "@/lib/deskLater";
import { plan } from "@/lib/dump";
import type { Kind } from "@/types/cellar";
import type { Cellar } from "./useCellar";
import { dropEntries } from "./data/cellarApi";
import { save } from "./preferences";
import { navigate } from "./useRoute";

/** Existing manual filing form. OS share-target integration remains unavailable. */
export function Share({ cellar }: { cellar: Cellar }) {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<Kind | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [handoff, setHandoff] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const lock = useRef(false);
  const kind = picked ?? guessKind(text);
  const planned = plan({ text, kind, projectId, raw: false }, null);
  async function file() {
    if (planned.empty || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await dropEntries(
        cellar.ownerId,
        planned.drops.map((entry) => ({ ...entry, kind, projectId })),
      );
      await cellar.refresh();
      if (handoff) {
        save("desktop-new-task", "text", text.trim());
        save("desktop-new-task", "projectId", projectId);
        navigate("/desk/new");
      } else {
        setText("");
        setPicked(null);
        setMessage("filed");
      }
    } catch (error) {
      setMessage(String(error) + " · check recent entries before retrying");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="page task-page stack">
      <header className="row">
        <h1>file it into cellar</h1>
        <button onClick={() => navigate("/desk")}>cancel</button>
      </header>
      <label>
        in your words
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <h2 className="overline">
        kind{picked === null ? " · guessed from your words" : ""}
      </h2>
      <div className="chips">
        {KINDS.map((row) => (
          <button
            key={row.value}
            className={kind === row.value ? "selected" : ""}
            onClick={() => setPicked(row.value)}
          >
            {row.label}
          </button>
        ))}
      </div>
      <h2 className="overline">project</h2>
      <div className="chips">
        {cellar.projects.map((project) => (
          <button
            key={project.id}
            className={projectId === project.id ? "selected" : ""}
            onClick={() => setProjectId(project.id)}
          >
            {project.name}
          </button>
        ))}
        <button
          className={projectId === null ? "selected" : ""}
          onClick={() => setProjectId(null)}
        >
          inbox · decide later
        </button>
      </div>
      <label className="settings-row">
        <span>
          hand it off now
          <small className="muted"> · files it, then opens a new task</small>
        </span>
        <input
          type="checkbox"
          checked={handoff}
          onChange={(event) => setHandoff(event.target.checked)}
        />
      </label>
      <button
        className="primary"
        disabled={planned.empty || busy}
        onClick={() => void file()}
      >
        {handoff ? "file it and hand it off" : "file it"}
      </button>
      <small className="muted">
        Receiving OS share intents unavailable yet.
      </small>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
