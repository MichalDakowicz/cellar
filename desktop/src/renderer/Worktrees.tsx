import type { Host } from "./useHost";
import { calls } from "./client";
import { useHostQuery } from "./useHostQuery";
import { WorktreeCard } from "./WorktreeCard";

export function Worktrees({
  host,
  projectId,
}: {
  host: Host;
  projectId: string;
}) {
  const result = useHostQuery(
    host.live && host.can.worktrees,
    calls.worktrees,
    host.key,
  );
  const catalogue = result.data?.find((row) => row.projectId === projectId);
  return (
    <section className="stack">
      <h2 className="overline">worktrees</h2>
      {result.error && <p role="status">{result.error}</p>}
      {!catalogue && (
        <p className="muted">
          {result.loading ? "reading Git…" : "worktrees unavailable"}
        </p>
      )}
      {catalogue?.reason && <p className="muted">{catalogue.reason}</p>}
      {catalogue?.worktrees.map((row) => (
        <WorktreeCard
          key={row.path}
          row={row}
          host={host}
          refresh={result.refresh}
        />
      ))}
    </section>
  );
}
