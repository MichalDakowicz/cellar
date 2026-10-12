import { useState } from "react";
import { picturesOf, PICTURE_LINE } from "@/lib/entryPicture";
import type { Cellar } from "./useCellar";
import {
  fetchPictureData,
  deletePicture,
  setCover,
  addNotePicture,
} from "./data/pictureApi";
import { appendLine } from "./data/cellarApi";
import { preparePicture } from "./pickPicture";

export function PictureGallery({
  cellar,
  entryId,
}: {
  cellar: Cellar;
  entryId: string;
}) {
  const pictures = picturesOf(cellar.pictures, entryId);
  const [viewer, setViewer] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  async function attach(file: File | undefined, note: boolean) {
    if (!file || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const picture = await preparePicture(file);
      if (note) {
        const line = await appendLine(cellar.ownerId, entryId, PICTURE_LINE);
        await addNotePicture(cellar.ownerId, entryId, line.id, picture);
      } else await setCover(cellar.ownerId, entryId, picture);
      await cellar.refresh();
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="stack">
      <h2 className="overline">pictures</h2>
      <div className="gallery-grid">
        {[pictures.cover, ...pictures.byLine.values()]
          .filter((row) => row !== null)
          .map((row) => (
            <div key={row.id} className="stack">
              <button
                className="picture"
                onClick={() => {
                  setViewer(row.thumb);
                  void fetchPictureData(row.id)
                    .then((data) => {
                      if (data) setViewer(data);
                    })
                    .catch((error) => setMessage(String(error)));
                }}
              >
                <img
                  src={row.thumb}
                  alt={row.lineId ? "note picture" : "thought cover"}
                />
              </button>
              <button className="quiet" onClick={() => setRemoving(row.id)}>
                remove picture
              </button>
            </div>
          ))}
      </div>
      <div className="chips">
        <label className="file-button">
          {pictures.cover ? "replace cover" : "add cover"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => {
              void attach(event.target.files?.[0], false);
              event.target.value = "";
            }}
          />
        </label>
        <label className="file-button">
          picture note
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => {
              void attach(event.target.files?.[0], true);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {removing && (
        <div className="card stack">
          <p>Remove this picture from thought? No picture undo.</p>
          <button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void deletePicture(removing)
                .then(() => cellar.refresh())
                .then(() => setRemoving(null))
                .catch((error) => setMessage(String(error)))
                .finally(() => setBusy(false));
            }}
          >
            remove picture
          </button>
          <button onClick={() => setRemoving(null)}>keep picture</button>
        </div>
      )}
      {viewer && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-label="picture viewer"
        >
          <button aria-label="close picture" onClick={() => setViewer(null)}>
            close
          </button>
          <img src={viewer} alt="thought picture" />
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
