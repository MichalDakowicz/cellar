import { useMemo } from "react";
import { groupByKind } from "@/lib/entryGroups";
import { waitingOnYou } from "@/lib/agentWork";
import type { Entry, Kind } from "@/types/cellar";

export function useInboxView(
  entries: Entry[],
  sort: "newest" | "oldest" | "kind",
  kindOrder: Kind[] | null,
) {
  return useMemo(() => {
    const unfiled = entries.filter(
      (entry) => entry.projectId === null && !entry.archived,
    );
    const ordered = [...unfiled].sort((a, b) =>
      sort === "oldest"
        ? a.createdAt.localeCompare(b.createdAt)
        : b.createdAt.localeCompare(a.createdAt),
    );
    return {
      unfiled,
      ordered,
      waiting: waitingOnYou(entries),
      groups: groupByKind(unfiled, kindOrder),
    };
  }, [entries, sort, kindOrder]);
}
