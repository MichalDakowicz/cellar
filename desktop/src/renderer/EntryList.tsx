import type { Entry } from "@/types/cellar";
import { EntryCard } from "./EntryCard";

export function EntryList({
  entries,
  selected = [],
  onSelect,
  variant = "line",
}: {
  entries: Entry[];
  selected?: string[];
  onSelect?: (id: string) => void;
  variant?: "line" | "inbox" | "hit";
}) {
  return (
    <div className="entry-list">
      {entries.map((entry) => (
        <EntryCard
          key={entry.id}
          entry={entry}
          variant={variant}
          selected={selected.includes(entry.id)}
          onSelect={onSelect ? () => onSelect(entry.id) : undefined}
        />
      ))}
      {!entries.length && <p className="empty muted">nothing here yet</p>}
    </div>
  );
}
