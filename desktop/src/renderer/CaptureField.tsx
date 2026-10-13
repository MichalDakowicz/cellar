import type { KeyboardEvent } from "react";
import { Mic } from "lucide-react";
import { dumpPlaceholder, shouldSubmitOnReturn } from "@/lib/dump";
import { navigate } from "./useRoute";
import { save } from "./preferences";
import type { useCapture } from "./useCapture";

export function CaptureField({
  capture,
  compact,
}: {
  capture: ReturnType<typeof useCapture>;
  compact: boolean;
}) {
  function key(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    if (compact && event.shiftKey) {
      event.preventDefault();
      if (!capture.text.trim()) return;
      save("desktop-new-task", "text", capture.text);
      navigate("/desk/new");
    } else if (
      compact ||
      shouldSubmitOnReturn(capture.raw, {
        shift: event.shiftKey,
        meta: event.ctrlKey || event.metaKey,
      })
    ) {
      event.preventDefault();
      void capture.drop();
    }
  }
  const field = {
    "aria-label": "capture thought",
    value: capture.text,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => capture.setText(event.target.value),
    onKeyDown: key,
  };
  return (
    <div className="capture-bar">
      {compact ? (
        <input
          {...field}
          placeholder="what just hit you? — @ a file, $ cellar or a command, / an agent skill"
        />
      ) : (
        <textarea {...field} placeholder={dumpPlaceholder(capture.raw)} />
      )}
      {compact && (
        <span className="capture-keys mono muted">
          ↵ file it&nbsp;&nbsp; shift ↵ hand it off
        </span>
      )}
      {compact && (
        <button
          className="quiet"
          disabled
          aria-label="capture voice unavailable"
        >
          <Mic size={18} />
        </button>
      )}
    </div>
  );
}
