import { useRef, useState } from "react";
import { parseDeskStart, type DeskStart } from "@/lib/deskProtocol";
import { settleTaskStart } from "@/lib/deskPending";
import { DeskRefusal } from "@/lib/deskCalls";
import { calls } from "./client";
import { saved, saveRecord, useSaved } from "./preferences";
import type { Host } from "./useHost";

export function useTaskStart(host: Host, onStarted: (runId: string) => void) {
  useSaved();
  const key = host.key;
  const tasks =
    saved<Record<string, DeskStart[]>>("cellar-desk-pending", "tasks", {})[
      key
    ] ?? [];
  const failed =
    saved<Record<string, boolean>>("cellar-desk-pending", "failed", {})[key] ===
    true;
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [untrusted, setUntrusted] = useState<string | null>(null);
  function put(requests: DeskStart[], failed = false) {
    saveRecord("cellar-desk-pending", "tasks", key, requests);
    saveRecord("cellar-desk-pending", "failed", key, failed);
  }
  async function begin(newTasks?: DeskStart[]) {
    if (locked.current || !host.live || host.info?.taskProtocol !== 2) return;
    let requests =
      saved<Record<string, DeskStart[]>>("cellar-desk-pending", "tasks", {})[
        key
      ] ?? [];
    if (!requests.length) {
      if (!newTasks?.length) return;
      for (const request of newTasks) {
        const parsed = parseDeskStart(request);
        if (!parsed.ok) {
          setError(parsed.error);
          return;
        }
      }
      requests = newTasks;
    }
    put(requests);
    locked.current = true;
    setBusy(true);
    setError(null);
    setUntrusted(null);
    let lastRun: string | null = null;
    try {
      while (requests.length) {
        const current = requests[0];
        const receipt = await calls.receipt(current.commandId!);
        if (receipt && receipt.state !== "confirmed")
          throw new DeskRefusal(
            receipt.error ??
              `PC task ${receipt.state}; recover original request.`,
            receipt.untrusted ?? null,
            receipt,
          );
        const run = receipt?.run ?? (await calls.start(current));
        if (!run?.id) throw new Error("PC has not confirmed a run.");
        lastRun = run.id;
        requests = settleTaskStart(requests, "confirmed", crypto.randomUUID);
        put(requests);
      }
      if (lastRun) onStarted(lastRun);
    } catch (error) {
      if (error instanceof DeskRefusal && error.receipt?.state === "failed") {
        requests = settleTaskStart(requests, "failed", crypto.randomUUID);
        put(requests, true);
        setUntrusted(error.untrusted);
      }
      setError(
        `${String(error)} · draft retained; recovery uses saved request`,
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function editFailed() {
    if (locked.current || !failed) return;
    put([]);
    setError(null);
    setUntrusted(null);
  }
  async function trust() {
    if (!untrusted || locked.current) return;
    try {
      await calls.trust(untrusted);
      await begin();
    } catch (error) {
      setError(String(error));
    }
  }
  return {
    pending: tasks.length > 0,
    tasks,
    failed,
    busy,
    error,
    untrusted,
    begin,
    editFailed,
    trust,
  };
}
