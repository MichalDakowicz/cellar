import { useEffect, useState } from "react";
import { ArrowUp, Mic, Plus } from "lucide-react";
import type { RunQueue, QueuedMessage } from "@/lib/deskDispatch";
import type { SavedControl } from "@/lib/deskControlRecovery";
import { calls } from "./client";
import { saveRecord, saved, useSaved } from "./preferences";
import type { Host } from "./useHost";
import { useControl } from "./useControl";
import { QueuePopout } from "./QueuePopout";
import { SAMPLE_COMPOSER_MODELS } from "@/lib/deskCanvas";

export function Composer({
  host,
  runId,
  previewQueue = [],
}: {
  host: Host;
  runId: string;
  previewQueue?: QueuedMessage[];
}) {
  useSaved();
  const key = `${host.key}:${runId}`;
  const draft =
    saved<Record<string, string>>("desk-approvals", "drafts", {})[key] ?? "";
  const [queue, setQueue] = useState<RunQueue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tray, setTray] = useState<"files" | "models" | null>(null);
  const action = useControl(host, `chat:${runId}`);
  useEffect(() => {
    setQueue(null);
    if (!host.live || !host.can.dispatch) return;
    let active = true;
    const load = () => {
      void calls
        .queue(runId)
        .then((value) => {
          if (active) {
            setQueue(value);
            setError(null);
          }
        })
        .catch((error) => {
          if (active) {
            setQueue(null);
            setError(String(error));
          }
        });
    };
    load();
    const timer = setInterval(load, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [runId, host.live, host.can.dispatch]);
  const disabled = runId.startsWith("sample-")
    ? "Sample chat · message delivery unavailable."
    : !host.live
      ? "Reconnect to read live output and send."
      : !host.can.dispatch
        ? "Update host for chat delivery."
        : action.busy
          ? "PC is confirming your message…"
          : action.pending
            ? "Check original receipt before another message."
            : (error ??
              (!queue
                ? "Reading PC queue…"
                : !queue.available
                  ? (queue.reason ?? "Original provider chat unavailable.")
                  : null));
  async function submit(input?: Parameters<typeof action.submit>[0]) {
    const receipt = await action.submit(input);
    const request = saved<Record<string, SavedControl>>(
      "desk-controls-v1",
      "controls",
      {},
    )[`${host.key}:chat:${runId}`]?.request;
    const currentDraft =
      saved<Record<string, string>>("desk-approvals", "drafts", {})[key] ?? "";
    if (
      receipt?.state === "confirmed" &&
      request?.action === "send" &&
      currentDraft.trim() === request.text?.trim()
    )
      saveRecord("desk-approvals", "drafts", key, null);
    try {
      setQueue(await calls.queue(runId));
    } catch (error) {
      setQueue(null);
      setError(String(error));
    }
    return receipt?.state === "confirmed";
  }
  async function send() {
    if (disabled || !draft.trim()) return;
    await submit({ action: "send", runId, text: draft.trim() });
  }
  async function change(
    item: QueuedMessage,
    kind: "promote" | "cancel" | "edit",
    text?: string,
  ) {
    return submit({
      action: kind,
      runId,
      itemId: item.id,
      revision: item.revision,
      ...(text !== undefined ? { text } : {}),
    });
  }
  return (
    <div className="composer-dock stack">
      <QueuePopout
        items={
          queue?.items.filter((item) =>
            ["queued", "dispatching", "unknown"].includes(item.state),
          ) ?? previewQueue
        }
        disabled={!!disabled}
        onAction={change}
      />
      {action.message && (
        <p className="muted" role="status">
          {action.message}
        </p>
      )}
      {action.pending && (
        <button
          disabled={!host.live || action.busy}
          onClick={() => void submit()}
        >
          check original receipt
        </button>
      )}
      <div className="composer-frame">
        <textarea
          aria-label="message"
          placeholder="send a message…"
          value={draft}
          onChange={(event) =>
            saveRecord("desk-approvals", "drafts", key, event.target.value)
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              void send();
            }
          }}
        />
        <div className="composer-toolbar">
          <button
            className="icon quiet"
            aria-label="add attachment"
            onClick={() => setTray(tray === "files" ? null : "files")}
          >
            <Plus size={19} />
          </button>
          <button
            className="icon quiet"
            disabled
            aria-label="voice unavailable"
          >
            <Mic size={17} />
          </button>
          <button
            className="quiet model"
            onClick={() => setTray(tray === "models" ? null : "models")}
          >
            provider default⌄
          </button>
          <button
            className="send"
            aria-label={queue?.busy ? "queue message" : "continue"}
            disabled={!!disabled || !draft.trim()}
            onClick={() => void send()}
          >
            <ArrowUp size={20} />
          </button>
        </div>
        {tray && (
          <div className="popout">
            <div className="row">
              <h3>
                {tray === "files" ? "attachments" : "model and reasoning"}
              </h3>
              <button onClick={() => setTray(null)}>×</button>
            </div>
            <p className="muted">
              {tray === "files"
                ? "File and image uploads unavailable."
                : "Provider default · host does not advertise model switching yet."}
            </p>
            {tray === "models" && runId.startsWith("sample-") && (
              <>
                <h3>models · sample</h3>
                {SAMPLE_COMPOSER_MODELS.models.map((model) => (
                  <button disabled key={model}>
                    {model}
                  </button>
                ))}
                <h3>reasoning · sample</h3>
                <div className="chips">
                  {SAMPLE_COMPOSER_MODELS.efforts.map((effort) => (
                    <button disabled key={effort}>
                      {effort}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {disabled && <small className="muted">{disabled}</small>}
    </div>
  );
}
