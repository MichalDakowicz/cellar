import { ImagePlus } from "lucide-react";
import { KINDS } from "@/lib/kinds";
import { returnHint } from "@/lib/dump";
import type { Cellar } from "./useCellar";
import { useCapture } from "./useCapture";
import { save } from "./preferences";
import { CaptureField } from "./CaptureField";
import { KindGlyph } from "./KindGlyph";
import { EntryList } from "./EntryList";

export function Capture({
  cellar,
  compact = false,
}: {
  cellar: Cellar;
  compact?: boolean;
}) {
  const capture = useCapture(cellar, compact);
  return (
    <section
      className={compact ? "stack capture-compact" : "page capture-page stack"}
    >
      <div className={compact ? "" : "capture-columns"}>
        <div className="stack">
          {!compact && (
            <header className="row capture-header">
              <h1>dump</h1>
              <small className="muted">
                {capture.today} today · {cellar.entries.length} entries in the
                cellar
              </small>
              <button onClick={() => save("cellar-prefs", "raw", !capture.raw)}>
                {capture.raw ? "switch to one thought" : "switch to a raw dump"}
              </button>
            </header>
          )}
          <CaptureField capture={capture} compact={compact} />
          {!compact && (
            <>
              <div className="row capture-hint">
                <small className="muted">
                  {capture.raw ? "raw dump" : "one thought"}
                </small>
                <small className="muted">{capture.hint}</small>
              </div>
              {!capture.raw && (
                <label className="file-button">
                  <ImagePlus size={18} />
                  picture
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      if (event.target.files?.[0])
                        void capture.attach(event.target.files[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
              )}
              {capture.picture && !capture.raw && (
                <div className="draft-picture">
                  <img src={capture.picture.thumb} alt="draft cover" />
                  <button onClick={capture.clearPicture}>remove picture</button>
                </div>
              )}
              <h2 className="overline">file it · {capture.shelf?.name}</h2>
              <div className="chips">
                <button
                  className={!capture.targets.length ? "selected" : ""}
                  onClick={() => capture.pick("", false)}
                >
                  inbox
                </button>
                {capture.projects.map((project) => (
                  <button
                    className={
                      capture.targets.includes(project.id) ? "selected" : ""
                    }
                    key={project.id}
                    onClick={(event) =>
                      capture.pick(project.id, event.ctrlKey || event.metaKey)
                    }
                  >
                    {project.name}
                  </button>
                ))}
              </div>
              <small className="muted">
                ctrl click to file into more than one project
              </small>
              <h2 className="overline">kind</h2>
              <div className="chips">
                {KINDS.map((row) => (
                  <button
                    className={capture.kind === row.value ? "selected" : ""}
                    aria-pressed={capture.kind === row.value}
                    key={row.value}
                    onClick={() => capture.setKind(row.value)}
                  >
                    <KindGlyph kind={row.value} />
                    {row.label}
                  </button>
                ))}
              </div>
              <button
                className="primary capture-drop"
                disabled={capture.busy || !capture.text.trim()}
                onClick={() => void capture.drop()}
              >
                {capture.dropLabel}
              </button>
            </>
          )}
          <small className="muted">
            {compact
              ? "same keys as the phone: @ files, $ cellar and its commands, / agent skills — file and skill search unavailable yet"
              : returnHint(capture.raw, true)}
          </small>
          {capture.message && <p role="status">{capture.message}</p>}
        </div>
        {!compact && (
          <aside className="stack">
            <h2 className="overline">lately</h2>
            <EntryList entries={capture.recent} variant="hit" />
          </aside>
        )}
      </div>
    </section>
  );
}
