import { FileText, Pencil, SquareTerminal, ChevronRight } from "lucide-react";
import { stepRows } from "@/lib/deskChat";
import type { TurnItem } from "@/lib/deskEvents";

export function ToolGroup({ items }: { items: TurnItem[] }) {
  const rows = stepRows(items.map((item) => item.text));
  return (
    <section className="tools">
      {rows.map((row, index) => {
        const Icon =
          row.kind === "read"
            ? FileText
            : row.kind === "edit"
              ? Pencil
              : SquareTerminal;
        const steps = items.filter((item) => row.steps.includes(item.text));
        return (
          <details className="tool-detail" key={index}>
            <summary>
              <Icon size={15} />
              <span className={row.mono ? "mono" : ""}>{row.label}</span>
              <small className="muted">{steps.at(-1)?.status}</small>
              <ChevronRight size={15} />
            </summary>
            {steps.map((item) => (
              <pre key={item.id}>
                {item.text}
                {item.detail ? `\n${item.detail}` : ""}
                {item.parts?.length ? `\n${item.parts.join("\n")}` : ""}
              </pre>
            ))}
          </details>
        );
      })}
    </section>
  );
}
