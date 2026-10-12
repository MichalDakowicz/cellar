import type { DeskWorktree } from "@/lib/deskWorktrees";
import type { Host } from "./useHost";
import { useWorktreeAction } from "./useWorktreeAction";

export function WorktreeCard({
  row,
  host,
  refresh,
}: {
  row: DeskWorktree;
  host: Host;
  refresh: () => void;
}) {
  const action = useWorktreeAction(host, row.id ?? "", refresh);
  return (
    <article className="card stack">
      <strong className="mono">{row.branch ?? "detached"}</strong>
      <small className="mono muted">{row.path}</small>
      <small>
        {row.main ? "main checkout" : row.kept ? "kept" : "managed"} ·{" "}
        {row.dirty === null
          ? "state unknown"
          : row.dirty
            ? "local changes"
            : "clean"}
        {row.locked ? " · locked" : ""}
      </small>
      {row.unavailable && <small>{row.unavailable}</small>}
      {row.id && (
        <div className="chips">
          {(["keep", "merge", "remove"] as const).map((kind) => (
            <button
              disabled={!action.connected || action.busy || !!action.pending}
              key={kind}
              onClick={() => void action.inspect(kind)}
            >
              {kind}
            </button>
          ))}
        </div>
      )}
      {action.review && (
        <div className="stack">
          <p>{action.review.summary}</p>
          <p className="muted">{action.review.reason}</p>
          <button
            disabled={!action.review.allowed || action.busy}
            onClick={() => void action.submit()}
          >
            confirm {action.review.action}
          </button>
          <button onClick={action.close}>cancel review</button>
        </div>
      )}
      {action.pending && (
        <button
          disabled={action.busy || !action.connected}
          onClick={() => void action.submit()}
        >
          recover worktree action
        </button>
      )}
      {action.message && <p role="status">{action.message}</p>}
    </article>
  );
}
