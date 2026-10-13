import type { DeskRunState } from "@/lib/deskProtocol";

export function RunChip({ state }: { state: DeskRunState }) {
  return (
    <span className={`run-chip ${state}`}>
      {state === "running"
        ? "working"
        : state === "unknown"
          ? "status unknown"
          : state}
    </span>
  );
}
