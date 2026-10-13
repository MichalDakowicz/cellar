import { useRef, useState } from "react";
import type { Entry } from "@/types/cellar";
import { patchEvents } from "@/lib/entryTrail";
import {
  appendLine,
  deleteEntry,
  deleteLine,
  patchEntry,
  type EntryPatch,
} from "./data/cellarApi";
import { logEvents } from "./data/trailApi";
import type { Cellar } from "./useCellar";

export function useEntryActions(cellar: Cellar, entry: Entry | undefined) {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function perform(work: () => Promise<unknown>) {
    if (locked.current || !entry) return false;
    locked.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await work();
      await cellar.refresh();
      return true;
    } catch (error) {
      setMessage(String(error));
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return {
    busy,
    message,
    perform,
    patch: (patch: EntryPatch) =>
      perform(async () => {
        await patchEntry(entry!.id, patch);
        await logEvents(
          cellar.ownerId,
          entry!.id,
          patchEvents(entry!, patch, { source: "user", agent: null }),
        );
      }),
    append: (text: string, createdAt?: string) =>
      perform(() =>
        appendLine(cellar.ownerId, entry!.id, text, "user", createdAt),
      ),
    removeLine: (id: string) => perform(() => deleteLine(id)),
    remove: () => perform(() => deleteEntry(entry!.id)),
  };
}
