import { useMemo, useState } from "react";
import {
  applyFilter,
  groupByDay,
  groupByStateAndKind,
  NO_FILTER,
} from "@/lib/entryGroups";
import { sortForProject } from "@/lib/displayPrefs";
import { shelfSections } from "@/lib/groups";
import { shelfCells } from "@/lib/shelfGrid";
import { kanbanColumns } from "@/lib/kanban";
import type { KanbanAxis } from "@/lib/kanban";
import type { EntryFilter } from "@/lib/entryGroups";
import type { Cellar } from "./useCellar";
import { saved, useSaved } from "./preferences";
import { useAccountPreferences } from "./accountPreferences";

export function useProjectView(cellar: Cellar, id?: string) {
  useSaved();
  const { settings } = useAccountPreferences();
  const [filter, setFilter] = useState<EntryFilter>(NO_FILTER);
  const shelfId = saved<string | null>("cellar-prefs", "shelfId", null);
  const closed = saved<string[]>("cellar-prefs", "closedGroups", []);
  const axis = saved<KanbanAxis>("cellar-prefs", "kanbanAxis", "state");
  return {
    filter,
    setFilter,
    axis,
    ...useMemo(() => {
      const shelf =
        cellar.shelves.find((row) => row.id === shelfId) ??
        cellar.shelves[0] ??
        null;
      const projects = cellar.projects.filter(
        (row) => row.shelfId === shelf?.id,
      );
      const groups = cellar.groups.filter((row) => row.shelfId === shelf?.id);
      const cells = shelfCells(
        shelfSections(projects, groups).map((section) => ({
          ...section,
          open: section.type === "loose" || !closed.includes(section.group.id),
        })),
      );
      const all = cellar.entries.filter((row) => row.projectId === id);
      const entries = sortForProject(
        applyFilter(all, filter),
        settings.projectSort,
      );
      return {
        shelf,
        cells,
        all,
        entries,
        project: cellar.projects.find((row) => row.id === id),
        settings,
        bands: groupByStateAndKind(entries, settings.kindOrder),
        days: groupByDay(entries, settings.projectSort),
        columns: kanbanColumns(entries, axis, settings.kindOrder),
      };
    }, [
      cellar.shelves,
      cellar.groups,
      cellar.projects,
      cellar.entries,
      shelfId,
      closed,
      id,
      filter,
      settings,
      axis,
    ]),
  };
}
