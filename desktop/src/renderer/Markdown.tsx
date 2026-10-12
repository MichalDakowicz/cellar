import { Fragment, type ReactNode } from "react";
import { parseMarkdown, type Inline } from "@/lib/markdown";
import { splitHex } from "@/lib/hexChips";

function text(value: string): ReactNode {
  return splitHex(value).map((part, index) =>
    part.type === "hex" ? (
      <button
        key={index}
        className="hex"
        style={{ background: part.value, color: part.ink }}
        onClick={() => void navigator.clipboard.writeText(part.value)}
      >
        {part.value}
      </button>
    ) : (
      <Fragment key={index}>{part.value}</Fragment>
    ),
  );
}
function inline(parts: Inline[]) {
  return parts.map((part, index) =>
    part.type === "code" ? (
      <code key={index}>{text(part.text)}</code>
    ) : part.type === "bold" ? (
      <strong key={index}>{text(part.text)}</strong>
    ) : part.type === "italic" ? (
      <em key={index}>{text(part.text)}</em>
    ) : part.type === "link" ? (
      <a key={index} href={part.href} target="_blank" rel="noreferrer">
        {part.text}
      </a>
    ) : (
      <Fragment key={index}>{text(part.text)}</Fragment>
    ),
  );
}
export function Markdown({ value }: { value: string }) {
  return (
    <div className="markdown">
      {parseMarkdown(value).map((block, index) => {
        if (block.type === "code")
          return (
            <pre key={index}>
              <code>{block.text}</code>
            </pre>
          );
        if (block.type === "heading")
          return <h3 key={index}>{inline(block.inline)}</h3>;
        if (block.type === "list")
          return block.ordered ? (
            <ol key={index}>
              {block.items.map((item, i) => (
                <li key={i}>{inline(item)}</li>
              ))}
            </ol>
          ) : (
            <ul key={index}>
              {block.items.map((item, i) => (
                <li key={i}>{inline(item)}</li>
              ))}
            </ul>
          );
        if (block.type === "quote")
          return <blockquote key={index}>{inline(block.inline)}</blockquote>;
        if (block.type === "rule") return <hr key={index} />;
        if (block.type === "table")
          return (
            <div className="table-scroll" key={index}>
              <table>
                <thead>
                  <tr>
                    {block.header.map((cell, i) => (
                      <th key={i}>{inline(cell)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>{inline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        return <p key={index}>{inline(block.inline)}</p>;
      })}
    </div>
  );
}
