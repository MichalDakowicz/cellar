import { useRef, useState } from "react";
import type {
  WorktreeAction,
  WorktreeRequest,
  WorktreeReview,
} from "@/lib/deskWorktrees";
import { readWorktreeReceipt } from "@/lib/deskWorktreeReply";
import type { Host } from "./useHost";
import { calls } from "./client";
import { saveRecord, saved, useSaved } from "./preferences";

export function useWorktreeAction(host: Host, id: string, refresh: () => void) {
  useSaved();
  const key = `${host.key}:${id}`;
  const pending = saved<Record<string, WorktreeRequest>>(
    "cellar-worktree-pending",
    "pending",
    {},
  )[key];
  const [review, setReview] = useState<WorktreeReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const locked = useRef(false);
  const connected = host.live && host.can.worktrees;
  async function inspect(action: WorktreeAction) {
    if (!connected || locked.current || pending) return;
    locked.current = true;
    setBusy(true);
    setMessage(null);
    try {
      setReview(await calls.reviewWorktree(id, action));
    } catch (error) {
      setMessage(String(error));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function submit() {
    const pending = saved<Record<string, WorktreeRequest>>(
      "cellar-worktree-pending",
      "pending",
      {},
    )[key];
    if (locked.current || !connected || (!pending && !review?.allowed)) return;
    const request = pending ?? {
      commandId: crypto.randomUUID(),
      worktreeId: id,
      action: review!.action,
      token: review!.token,
    };
    locked.current = true;
    setBusy(true);
    setReview(null);
    saveRecord("cellar-worktree-pending", "pending", key, request);
    try {
      const receipt = readWorktreeReceipt(
        (pending ? await calls.worktreeReceipt(request.commandId) : null) ??
          (await calls.actWorktree(request)),
        request.commandId,
        request,
      );
      setMessage(
        receipt.result?.message ??
          receipt.error ??
          `PC action ${receipt.state}`,
      );
      if (receipt.state === "confirmed" || receipt.state === "failed") {
        saveRecord("cellar-worktree-pending", "pending", key, null);
        refresh();
      }
    } catch (error) {
      setMessage(
        `${String(error)} · outcome unconfirmed; recover original request`,
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return {
    pending,
    connected,
    review,
    busy,
    message,
    inspect,
    submit,
    close: () => setReview(null),
  };
}
