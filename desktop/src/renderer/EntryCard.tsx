import type { Entry } from "@/types/cellar";
import { kindMeta } from "@/lib/kinds";
import { navigate } from "./useRoute";
import { Markdown } from "./Markdown";
import { isDimmed, stateMeta } from "@/lib/entryState";
import { shortRel } from "@/lib/relTime";
import { useAccountPreferences } from "./accountPreferences";
import { useCellarPictures } from "./cellarContext";
import { KindGlyph } from "./KindGlyph";

export function EntryCard({
  entry,
  selected,
  onSelect,
  variant = "line",
}: {
  entry: Entry;
  selected?: boolean;
  onSelect?: () => void;
  variant?: "line" | "inbox" | "hit";
}) {
  const { settings } = useAccountPreferences();
  const state = stateMeta(entry.state);
  const cover = useCellarPictures().find(
    (picture) => picture.entryId === entry.id && picture.lineId === null,
  );
  return (
    <article
      className={`entry-row entry-${variant} ${selected ? "selected" : ""} ${isDimmed(entry) ? "settled" : ""} ${settings.rowDensity}`}
      data-text-size={settings.textSize}
    >
      {onSelect && (
        <input
          type="checkbox"
          aria-label={`select ${entry.text}`}
          checked={!!selected}
          onChange={onSelect}
        />
      )}
      {settings.showCodes && (
        <span className="kind-code" aria-label={kindMeta(entry.kind).label}>
          <KindGlyph kind={entry.kind} />
        </span>
      )}
      <div
        className="entry-content quiet"
        role="button"
        tabIndex={0}
        onClick={(event) => {
          if (!(event.target as HTMLElement).closest("a,button"))
            navigate(`/entry/${entry.id}`);
        }}
        onKeyDown={(event) => {
          if (
            event.target === event.currentTarget &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            navigate(`/entry/${entry.id}`);
          }
        }}
      >
        <Markdown value={entry.text} />
        {variant !== "hit" && (
          <small className="muted">
            {shortRel(entry.createdAt)}
            {entry.agent ? ` · ${entry.agent}` : ""}
            {entry.lines.length ? ` · ${entry.lines.length} notes` : ""}
            {entry.docs.length ? ` · ${entry.docs.length} docs` : ""}
          </small>
        )}
      </div>
      {entry.importance && entry.importance !== "normal" && (
        <small className="muted">{entry.importance}</small>
      )}
      {state.badged && (
        <span
          className="run-chip"
          style={{ color: state.color, background: state.tint }}
        >
          {state.label}
        </span>
      )}
      {cover && (
        <button
          className="entry-thumb quiet"
          aria-label="open thought picture"
          onClick={() => navigate(`/entry/${entry.id}`)}
        >
          <img src={cover.thumb} alt="thought cover" />
        </button>
      )}
    </article>
  );
}
