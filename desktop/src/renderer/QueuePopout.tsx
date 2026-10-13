import { useState } from "react";
import type { QueuedMessage } from "@/lib/deskDispatch";

export function QueuePopout({
  items,
  disabled,
  onAction,
}: {
  items: QueuedMessage[];
  disabled: boolean;
  onAction: (
    item: QueuedMessage,
    action: "promote" | "cancel" | "edit",
    text?: string,
  ) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState("");
  if (!items.length) return null;
  return (
    <div className="queue-anchor">
      <button
        className="quiet"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {items.length} queued
      </button>
      {open && (
        <section className="popout queue-popout" aria-label="queued messages">
          <div className="row">
            <h3>queued messages</h3>
            <button aria-label="close queue" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>
          {items.map((item) => (
            <article className="stack queue-item" key={item.id}>
              <p>{item.text}</p>
              <small className="mono muted">
                {item.state} · revision {item.revision}
              </small>
              <div className="row">
                <button
                  disabled={disabled || item.state !== "queued"}
                  onClick={() => onAction(item, "promote")}
                >
                  send now
                </button>
                <button
                  disabled={disabled || item.state !== "queued"}
                  onClick={() => onAction(item, "cancel")}
                >
                  cancel
                </button>
              </div>
              <details>
                <summary>more</summary>
                <p className="mono muted">
                  {item.settings.agent} · {item.settings.mode} ·{" "}
                  {item.settings.model} · {item.settings.effort}
                </p>
                <button
                  disabled={disabled || item.state !== "queued"}
                  onClick={() => {
                    setEditing(item.id);
                    setText(item.text);
                  }}
                >
                  edit
                </button>
              </details>
              {editing === item.id && (
                <>
                  <textarea
                    aria-label="edit queued message"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                  />
                  <button
                    disabled={disabled || !text.trim()}
                    onClick={() =>
                      void onAction(item, "edit", text).then((confirmed) => {
                        if (confirmed) setEditing(null);
                      })
                    }
                  >
                    save queued edit
                  </button>
                </>
              )}
              {item.error && <p role="status">{item.error}</p>}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
