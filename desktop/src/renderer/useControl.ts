import { useCallback, useRef, useState } from "react";
import { controlMessage, type RunControl } from "@/lib/deskDispatch";
import {
  shouldRecoverControl,
  type SavedControl,
} from "@/lib/deskControlRecovery";
import { calls } from "./client";
import { saveRecord, saved, useSaved } from "./preferences";
import type { Host } from "./useHost";

export function useControl(host: Host, slot: string) {
  useSaved();
  const key = `${host.key}:${slot}`;
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stored = saved<Record<string, SavedControl>>(
    "desk-controls-v1",
    "controls",
    {},
  )[key];
  const pending =
    !!stored &&
    (!stored.receipt || ["pending", "unknown"].includes(stored.receipt.state));
  const submit = useCallback(
    async (input?: Omit<RunControl, "commandId" | "source">) => {
      if (locked.current || !host.live || !host.can.dispatch) return null;
      const old = saved<Record<string, SavedControl>>(
        "desk-controls-v1",
        "controls",
        {},
      )[key];
      if (!input && !old) return null;
      const recover = shouldRecoverControl(old, input?.action, host.info?.id);
      const request: RunControl =
        recover || !input
          ? old.request
          : { ...input, commandId: crypto.randomUUID(), source: "pc" };
      locked.current = true;
      setBusy(true);
      setError(null);
      try {
        if (
          old &&
          old.request.commandId !== request.commandId &&
          old.receipt?.state === "pending"
        )
          saveRecord(
            "desk-controls-v1",
            "controls",
            `${key}:${old.request.commandId}`,
            old,
          );
        saveRecord("desk-controls-v1", "controls", key, {
          request,
          ...(recover ? { receipt: old.receipt } : {}),
        });
        const receipt =
          (recover || !input ? await calls.controlReceipt(request) : null) ??
          (await calls.control(request));
        saveRecord("desk-controls-v1", "controls", key, { request, receipt });
        return receipt;
      } catch (error) {
        setError(`${String(error)} · reply missing; check original receipt`);
        return null;
      } finally {
        locked.current = false;
        setBusy(false);
      }
    },
    [host.live, host.can.dispatch, host.info?.id, key],
  );
  return {
    submit,
    busy,
    pending,
    stored,
    message:
      error ??
      (stored?.receipt
        ? controlMessage(stored.receipt)
        : pending
          ? "Reply missing; check original receipt."
          : null),
  };
}
