import { useMemo } from "react";
import { countLive, tallyKinds, tallyStates } from "@/lib/entryGroups";
import { stateMeta } from "@/lib/entryState";
import type { Cellar } from "./useCellar";
import { saved, useSaved } from "./preferences";
import { useAccountPreferences } from "./accountPreferences";

export function useStatsView(cellar: Cellar) {
  useSaved();
  const { settings } = useAccountPreferences();
  const selected = saved<string | null>("cellar-prefs", "statsShelfId", null);
  return useMemo(() => {
    const shelf = cellar.shelves.find((row) => row.id === selected) ?? null;
    const projects = shelf
      ? cellar.projects.filter((row) => row.shelfId === shelf.id)
      : cellar.projects;
    const ids = new Set(projects.map((row) => row.id));
    const entries = shelf
      ? cellar.entries.filter((row) => row.projectId && ids.has(row.projectId))
      : cellar.entries;
    const kinds = tallyKinds(entries, settings.kindOrder);
    const peak = Math.max(1, ...kinds.map((row) => row.count));
    return {
      shelf,
      total: entries.length,
      open: countLive(entries),
      projectCount: projects.length,
      kinds: kinds.map((row) => ({ ...row, pct: (row.count / peak) * 100 })),
      states: tallyStates(entries).map((row) => ({
        ...row,
        color: stateMeta(row.state).color,
      })),
      busiest: projects
        .map((project) => {
          const mine = entries.filter((row) => row.projectId === project.id);
          return { ...project, total: mine.length, open: countLive(mine) };
        })
        .filter((row) => row.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 8),
    };
  }, [
    cellar.shelves,
    cellar.projects,
    cellar.entries,
    selected,
    settings.kindOrder,
  ]);
}
