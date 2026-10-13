import { useState } from "react";
import { ENTRY_STATES } from "@/lib/entryState";
import { KINDS } from "@/lib/kinds";
import { IMPORTANCES } from "@/lib/importance";
import { collectLinks } from "@/lib/links";
import type { EntryLine, Kind, Importance } from "@/types/cellar";
import type { Cellar } from "./useCellar";
import { EntryQuestions } from "./EntryQuestions";
import { Markdown } from "./Markdown";
import { navigate } from "./useRoute";
import { save } from "./preferences";
import { useEntryActions } from "./useEntryActions";
import { EntryDocs } from "./EntryDocs";
import { EntryTrail } from "./EntryTrail";
import { PictureGallery } from "./PictureGallery";

export function EntryDetail({ cellar, id }: { cellar: Cellar; id: string }) {
  const entry = cellar.entries.find((row) => row.id === id);
  const action = useEntryActions(cellar, entry);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<EntryLine | null>(null);
  const [removed, setRemoved] = useState<EntryLine[]>([]);
  const [deleting, setDeleting] = useState(false);
  if (!entry)
    return (
      <div className="page empty">
        {cellar.loading ? "reading entry…" : "entry unavailable"}
      </div>
    );
  const project =
    cellar.projects.find((row) => row.id === entry.projectId) ?? null;
  const links = collectLinks([
    entry.text,
    ...entry.lines.map((row) => row.text),
  ]);
  return (
    <div className="page stack">
      <span className="overline">
        {project?.name ?? "inbox"} ·{" "}
        {new Date(entry.createdAt).toLocaleDateString()}
      </span>
      {editing === null ? (
        <>
          <div className="entry-heading" role="heading" aria-level={1}>
            <Markdown value={entry.text} />
          </div>
          <button className="quiet" onClick={() => setEditing(entry.text)}>
            reword
          </button>
        </>
      ) : (
        <>
          <textarea
            aria-label="reword thought"
            value={editing}
            onChange={(event) => setEditing(event.target.value)}
          />
          <div className="chips">
            <button
              disabled={action.busy || !editing.trim()}
              onClick={() =>
                void action.patch({ text: editing.trim() }).then((ok) => {
                  if (ok) setEditing(null);
                })
              }
            >
              save wording
            </button>
            <button onClick={() => setEditing(null)}>cancel</button>
          </div>
        </>
      )}
      <div className="chips">
        {ENTRY_STATES.filter((row) => row.value !== "blocked").map((row) => (
          <button
            disabled={action.busy}
            key={row.value}
            className={entry.state === row.value ? "selected" : ""}
            onClick={() => void action.patch({ state: row.value })}
          >
            {row.label}
          </button>
        ))}
        <button
          disabled={action.busy}
          onClick={() => void action.patch({ archived: !entry.archived })}
        >
          {entry.archived ? "restore" : "archive"}
        </button>
      </div>
      <div className="two-columns">
        <label>
          kind
          <select
            value={entry.kind}
            onChange={(event) =>
              void action.patch({ kind: event.target.value as Kind })
            }
          >
            {KINDS.map((row) => (
              <option key={row.value}>{row.value}</option>
            ))}
          </select>
        </label>
        <label>
          importance
          <select
            value={entry.importance ?? "normal"}
            onChange={(event) =>
              void action.patch({
                importance: event.target.value as Importance,
              })
            }
          >
            {IMPORTANCES.map((row) => (
              <option key={row.value} value={row.value}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        file into
        <select
          aria-label="entry project"
          value={entry.projectId ?? ""}
          onChange={(event) =>
            void action.patch({ projectId: event.target.value || null })
          }
        >
          <option value="">inbox</option>
          {cellar.projects.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      <button
        onClick={() => {
          save("desktop-new-task", "projectId", entry.projectId ?? "");
          save("desktop-new-task", "entryIds", [entry.id]);
          navigate("/desk/new");
        }}
      >
        start on pc
      </button>
      <EntryQuestions entry={entry} refresh={cellar.refresh} />
      {(["user", "agent"] as const).map((source) => (
        <section className="stack" key={source}>
          <h2 className="overline">
            {source === "user"
              ? "your notes"
              : `${entry.agent ?? "agent"} notes`}
          </h2>
          {entry.lines
            .filter((line) => line.source === source)
            .map((line) => (
              <article className="note-row stack" key={line.id}>
                <Markdown value={line.text} />
                <div className="row">
                  <small className="muted">
                    {new Date(line.createdAt).toLocaleString()}
                  </small>
                  {source === "user" && (
                    <button className="quiet" onClick={() => setRemoving(line)}>
                      remove note
                    </button>
                  )}
                </div>
              </article>
            ))}
        </section>
      ))}
      <textarea
        aria-label="append note"
        placeholder="add a line"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <button
        disabled={action.busy || !text.trim()}
        onClick={() =>
          void action.append(text.trim()).then((ok) => {
            if (ok) setText("");
          })
        }
      >
        add note
      </button>
      {removing && (
        <div className="card stack">
          <p>
            Remove this note?{" "}
            {cellar.pictures.some((row) => row.lineId === removing.id)
              ? "Its picture also goes. No picture undo."
              : "Undo available until you leave."}
          </p>
          <Markdown value={removing.text} />
          <div className="chips">
            <button
              disabled={action.busy}
              onClick={() =>
                void action.removeLine(removing.id).then((ok) => {
                  if (ok) {
                    if (
                      !cellar.pictures.some((row) => row.lineId === removing.id)
                    )
                      setRemoved([...removed, removing]);
                    setRemoving(null);
                  }
                })
              }
            >
              remove note
            </button>
            <button onClick={() => setRemoving(null)}>keep note</button>
          </div>
        </div>
      )}
      {!!removed.length && (
        <button
          onClick={() => {
            const last = removed.at(-1)!;
            void action.append(last.text, last.createdAt).then((ok) => {
              if (ok) setRemoved(removed.slice(0, -1));
            });
          }}
        >
          undo removed note
        </button>
      )}
      <PictureGallery cellar={cellar} entryId={entry.id} />
      <EntryDocs
        entry={entry}
        project={project}
        ownerId={cellar.ownerId}
        refresh={cellar.refresh}
      />
      {!!links.length && (
        <section className="stack">
          <h2 className="overline">links in thought</h2>
          {links.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {url}
            </a>
          ))}
        </section>
      )}
      <EntryTrail entry={entry} projects={cellar.projects} />
      <button className="danger quiet" onClick={() => setDeleting(true)}>
        delete thought
      </button>
      {deleting && (
        <div className="card stack">
          <p>Delete thought and everything under it? No undo.</p>
          <button
            className="danger"
            disabled={action.busy}
            onClick={() =>
              void action.remove().then((ok) => {
                if (ok) navigate(project ? `/project/${project.id}` : "/inbox");
              })
            }
          >
            delete permanently
          </button>
          <button onClick={() => setDeleting(false)}>keep thought</button>
        </div>
      )}
      {action.message && <p role="status">{action.message}</p>}
    </div>
  );
}
