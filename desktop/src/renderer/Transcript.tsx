import type { TurnItem } from "@/lib/deskEvents";
import { Markdown } from "./Markdown";
import { ToolGroup } from "./ToolGroup";

export function Transcript({ items }: { items: TurnItem[] }) {
  const groups: TurnItem[][] = [];
  for (const item of items) {
    const tool = ![
      "user_message",
      "assistant_message",
      "legacy_output",
    ].includes(item.kind);
    const previous = groups.at(-1);
    if (
      tool &&
      previous &&
      !["user_message", "assistant_message", "legacy_output"].includes(
        previous[0].kind,
      )
    )
      previous.push(item);
    else groups.push([item]);
  }
  return (
    <>
      {groups.map((group) => {
        const item = group[0];
        if (item.kind === "user_message")
          return (
            <article className="user-message" key={item.id}>
              <Markdown value={item.text} />
              <small className="muted">you</small>
            </article>
          );
        if (item.kind === "assistant_message" || item.kind === "legacy_output")
          return (
            <article className="agent-message" key={item.id}>
              {item.kind === "legacy_output" && (
                <small className="muted">legacy output · unconfirmed</small>
              )}
              <Markdown value={item.text} />
            </article>
          );
        return <ToolGroup key={item.id} items={group} />;
      })}
    </>
  );
}
