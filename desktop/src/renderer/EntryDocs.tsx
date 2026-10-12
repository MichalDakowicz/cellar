import { useState } from "react";
import {
  docHref,
  docTitle,
  normalizeDocRef,
  isDuplicateDoc,
} from "@/lib/entryDocs";
import type { Entry, Project } from "@/types/cellar";
import { addDoc, removeDoc } from "./data/docsApi";

export function EntryDocs({
  entry,
  project,
  ownerId,
  refresh,
}: {
  entry: Entry;
  project: Project | null;
  ownerId: string;
  refresh: () => Promise<void>;
}) {
  const [ref, setRef] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  async function attach() {
    const next = normalizeDocRef(ref);
    if (!next || busy) return;
    if (isDuplicateDoc(next, entry.docs)) {
      setMessage("already attached");
      return;
    }
    setBusy(true);
    try {
      await addDoc(ownerId, entry.id, next);
      setRef("");
      await refresh();
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="stack">
      <h2 className="overline">docs</h2>
      {entry.docs.map((doc) => {
        const href = docHref(doc.ref, project);
        return (
          <div className="row" key={doc.id}>
            {href ? (
              <a href={href} target="_blank" rel="noreferrer">
                {docTitle(doc)}
              </a>
            ) : (
              <span className="mono">{doc.ref}</span>
            )}
            <button className="quiet" onClick={() => setRemoving(doc.id)}>
              detach
            </button>
          </div>
        );
      })}
      <div className="row">
        <input
          aria-label="attach doc"
          placeholder="link or path in repo"
          value={ref}
          onChange={(event) => setRef(event.target.value)}
        />
        <button disabled={busy || !ref.trim()} onClick={() => void attach()}>
          attach
        </button>
      </div>
      {removing && (
        <div className="card stack">
          <p>Detach reference? Original file stays where it is.</p>
          <button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void removeDoc(removing)
                .then(refresh)
                .then(() => setRemoving(null))
                .catch((error) => setMessage(String(error)))
                .finally(() => setBusy(false));
            }}
          >
            detach
          </button>
          <button onClick={() => setRemoving(null)}>keep reference</button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
