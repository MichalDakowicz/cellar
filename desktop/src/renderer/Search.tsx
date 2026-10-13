import { useState } from "react";
import { searchEntries } from "@/lib/entryGroups";
import type { Cellar } from "./useCellar";
import { EntryList } from "./EntryList";

export function Search({ cellar }: { cellar: Cellar }) {
  const [query, setQuery] = useState("");
  return (
    <div className="page stack">
      <h1>search</h1>
      <input
        autoFocus
        aria-label="search entries"
        placeholder="find a thought"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <EntryList
        entries={query.trim() ? searchEntries(cellar.entries, query) : []}
      />
      <p className="muted">
        Type @, $ or / in a run composer for scoped files, commands and skills.
      </p>
    </div>
  );
}
