import { useRef, useState } from "react";
import {
  approvalMessage,
  type ApprovalAnswer,
  type ApprovalDecision,
  type RuntimeRequest,
} from "@/lib/deskApprovals";
import { calls } from "./client";
import { saved, saveRecord, useSaved } from "./preferences";
import type { Host } from "./useHost";

export function ApprovalDock({
  request,
  host,
}: {
  request: RuntimeRequest;
  host: Host;
}) {
  useSaved();
  const key = `${host.key}:${request.id}`;
  const stored = saved<Record<string, ApprovalAnswer>>(
    "desk-approvals",
    "pending",
    {},
  )[key];
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const locked = useRef(false);
  const unavailable = !host.live || !host.can.approvals;
  async function answer(decision?: ApprovalDecision) {
    if (locked.current || !host.live || !host.can.approvals) return;
    const previous = saved<Record<string, ApprovalAnswer>>(
      "desk-approvals",
      "pending",
      {},
    )[key];
    if (!previous && !decision) return;
    const payload: ApprovalAnswer = previous ?? {
      commandId: crypto.randomUUID(),
      requestId: request.id,
      decision: decision!,
      source: "pc",
    };
    locked.current = true;
    setBusy(true);
    try {
      saveRecord("desk-approvals", "pending", key, payload);
      const receipt =
        (previous ? await calls.approvalReceipt(payload) : null) ??
        (await calls.answerApproval(payload));
      setMessage(receipt.error ?? approvalMessage(receipt.request));
      if (receipt.state === "confirmed" || receipt.state === "failed")
        saveRecord("desk-approvals", "pending", key, null);
    } catch (error) {
      setMessage(`${String(error)} · check original receipt`);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="approval stack" aria-label="runtime approval">
      <div className="row">
        <span className="overline">{request.agent} asks</span>
        <span className="run-chip waiting">waiting</span>
      </div>
      <h3>{request.what}</h3>
      <pre>{request.subject}</pre>
      <p className="muted">{request.effect}</p>
      {message && <p role="status">{message}</p>}
      {stored ? (
        <button disabled={busy || unavailable} onClick={() => void answer()}>
          check decision receipt
        </button>
      ) : (
        <div className="row">
          <button
            disabled={busy || unavailable || request.state !== "pending"}
            onClick={() => void answer("deny")}
          >
            deny
          </button>
          <button
            className="primary"
            disabled={busy || unavailable || request.state !== "pending"}
            onClick={() => void answer("allow")}
          >
            allow once
          </button>
          {request.always && (
            <button className="quiet" onClick={() => setMore(!more)}>
              more options
            </button>
          )}
        </div>
      )}
      {more && request.always && (
        <button
          disabled={
            busy || unavailable || !!stored || request.state !== "pending"
          }
          onClick={() => void answer("always")}
        >
          {request.always}
        </button>
      )}
    </section>
  );
}
