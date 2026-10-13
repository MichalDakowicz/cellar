import { useInboxView } from "./useInboxView";
import { EntryList } from "./EntryList";
import type { Cellar } from "./useCellar";
import { save, saved, useSaved } from "./preferences";
import { useAccountPreferences } from "./accountPreferences";

export function Inbox({ cellar }: { cellar: Cellar }) {
  useSaved();
  const { settings } = useAccountPreferences();
  const sort = saved<"newest" | "oldest" | "kind">(
    "cellar-prefs",
    "inboxSort",
    "newest",
  );
  const { unfiled, ordered, waiting, groups } = useInboxView(
    cellar.entries,
    sort,
    settings.kindOrder,
  );
  return (
    <div className="page stack">
      <h1>inbox</h1>
      <p className="muted">
        {waiting.length} waiting · {unfiled.length} unfiled
      </p>
      {!!waiting.length && (
        <>
          <h2 className="overline">waiting on you</h2>
          <EntryList entries={waiting} variant="inbox" />
        </>
      )}
      <div className="row">
        <h2 className="overline">unfiled · {unfiled.length}</h2>
        <select
          aria-label="inbox sort"
          value={sort}
          onChange={(event) =>
            save("cellar-prefs", "inboxSort", event.target.value)
          }
        >
          <option value="newest">newest first</option>
          <option value="oldest">oldest first</option>
          <option value="kind">grouped by kind</option>
        </select>
      </div>
      {sort === "kind" ? (
        groups.map((group) => (
          <section key={group.kind} className="stack">
            <h2 className="overline">
              {group.kind} · {group.entries.length}
            </h2>
            <EntryList entries={group.entries} variant="inbox" />
          </section>
        ))
      ) : (
        <EntryList entries={ordered} variant="inbox" />
      )}
    </div>
  );
}
