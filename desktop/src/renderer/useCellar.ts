import { useCallback, useEffect, useState } from "react";
import type { Entry, Group, Project, Shelf } from "@/types/cellar";
import type { PictureThumb } from "@/lib/entryPicture";
import { fetchEntries, fetchProjects, fetchShelves } from "./data/cellarApi";
import { fetchGroups } from "./data/groupApi";
import { fetchPictureThumbs } from "./data/pictureApi";
import { supabase } from "./auth";

export function useCellar(ownerId: string) {
  const [data, setData] = useState<{
    shelves: Shelf[];
    groups: Group[];
    projects: Project[];
    entries: Entry[];
    pictures: PictureThumb[];
    loading: boolean;
    error: string | null;
  }>({
    shelves: [],
    groups: [],
    projects: [],
    entries: [],
    pictures: [],
    loading: true,
    error: null,
  });
  const refresh = useCallback(async () => {
    try {
      const [shelves, projects, entries, groups, pictures] = await Promise.all([
        fetchShelves(),
        fetchProjects(),
        fetchEntries(),
        fetchGroups(),
        fetchPictureThumbs(),
      ]);
      setData({
        shelves,
        projects,
        entries,
        groups,
        pictures,
        loading: false,
        error: null,
      });
    } catch (error) {
      setData((state) => ({ ...state, loading: false, error: String(error) }));
    }
  }, []);
  useEffect(() => {
    let active = true;
    if (active) void refresh();
    const channel = supabase.channel(`desktop-cellar:${ownerId}`);
    for (const table of [
      "cellar_entries",
      "cellar_projects",
      "cellar_shelves",
      "cellar_groups",
      "cellar_entry_questions",
      "cellar_entry_lines",
      "cellar_entry_docs",
      "cellar_entry_pictures",
    ]) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          if (active) void refresh();
        },
      );
    }
    channel.subscribe();
    const timer = setInterval(() => {
      void refresh();
    }, 30_000);
    return () => {
      active = false;
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [ownerId, refresh]);
  return { ...data, refresh, ownerId };
}
export type Cellar = ReturnType<typeof useCellar>;
