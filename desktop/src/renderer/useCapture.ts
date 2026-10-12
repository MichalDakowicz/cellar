import { useRef, useState } from "react";
import { plan, dumpHint } from "@/lib/dump";
import { countToday } from "@/lib/relTime";
import {
  fanOut,
  liveTargets,
  pickTarget,
  toggleTarget,
  targetLabel,
} from "@/lib/fileTargets";
import { groupsFirst } from "@/lib/groups";
import { recentEntries } from "@/lib/entryGroups";
import type { NewPicture } from "@/lib/entryPicture";
import type { Kind } from "@/types/cellar";
import type { Cellar } from "./useCellar";
import { save, saved, useSaved } from "./preferences";
import { dropEntries } from "./data/cellarApi";
import { useAccountPreferences } from "./accountPreferences";
import { preparePicture } from "./pickPicture";

export function useCapture(cellar: Cellar, compact = false) {
  useSaved();
  const { settings } = useAccountPreferences();
  const draftStore = compact ? "desktop-desk-capture" : "desktop-capture";
  const text = saved<string>(draftStore, "text", "");
  const raw =
    !compact && saved<boolean>("cellar-prefs", "raw", settings.rawDefault);
  const kind = saved<Kind>("cellar-prefs", "draftKind", settings.defaultKind);
  const shelfId = saved<string | null>("cellar-prefs", "shelfId", null);
  const shelf =
    cellar.shelves.find((row) => row.id === shelfId) ?? cellar.shelves[0];
  const projects = groupsFirst(
    cellar.projects.filter((row) => row.shelfId === shelf?.id),
    cellar.groups,
  );
  const targets = compact
    ? []
    : liveTargets(
        saved<string[]>("cellar-prefs", "lastProjectIds", []),
        projects.map((row) => row.id),
      );
  const [picture, setPicture] = useState<NewPicture | null>(null);
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function drop() {
    const planned = plan(
      { text, kind, projectId: targets[0] ?? null, raw },
      null,
    );
    if (locked.current || planned.empty || cellar.loading) return;
    locked.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const batch = fanOut(
        planned.drops.map((row, index) => ({
          ...row,
          kind,
          ...(index === 0 && !raw && picture ? { picture } : {}),
        })),
        targets,
      );
      const result = await dropEntries(cellar.ownerId, batch);
      if (saved(draftStore, "text", "") === text) save(draftStore, "text", "");
      setPicture(null);
      if (!settings.rememberLast) save("cellar-prefs", "lastProjectIds", []);
      setMessage(
        result.pictureFailed
          ? "dropped, but picture did not attach"
          : "dropped",
      );
      await cellar.refresh();
    } catch (error) {
      setMessage(
        `${String(error)} · check recent entries before retrying partial drop`,
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return {
    today: countToday(cellar.entries.map((entry) => entry.createdAt)),
    hint: dumpHint({ text, kind, projectId: targets[0] ?? null, raw }),
    dropLabel: plan(
      { text, kind, projectId: targets[0] ?? null, raw },
      targetLabel(
        projects
          .filter((project) => targets.includes(project.id))
          .map((project) => project.name),
      ),
    ).label,
    text,
    kind,
    raw,
    shelf,
    projects,
    targets,
    picture,
    busy,
    message,
    recent: recentEntries(cellar.entries, 12),
    drop,
    setText: (value: string) => save(draftStore, "text", value),
    pick: (id: string, many: boolean) =>
      save(
        "cellar-prefs",
        "lastProjectIds",
        many ? toggleTarget(targets, id) : pickTarget(id),
      ),
    setKind: (value: Kind) => save("cellar-prefs", "draftKind", value),
    clearPicture: () => setPicture(null),
    attach: async (file: File) => {
      try {
        setPicture(await preparePicture(file));
      } catch (error) {
        setMessage(String(error));
      }
    },
  };
}
