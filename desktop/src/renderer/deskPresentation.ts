import { SAMPLE_RUNS } from "@/lib/deskSample";
import type { DeskRun } from "@/lib/deskProtocol";

/** Samples are presentation data; never subscribe to or dispatch their IDs. */
export function sampleRuns(): DeskRun[] {
  return SAMPLE_RUNS.map((row) => ({
    id: row.id,
    name: row.title,
    state: row.state,
    projectId: `sample-${row.project}`,
    cwd: `~/code/${row.project}`,
    agent: row.meta.includes("codex") ? "codex" : "claude",
    startedAt: Date.now() - 540_000,
    entryId: null,
    origin: "phone",
    branch: row.meta.split(" · ")[2],
  }));
}

export function presentationRuns(real: DeskRun[], samples: boolean): DeskRun[] {
  return samples
    ? [
        ...real,
        ...sampleRuns().filter((row) => !real.some((run) => run.id === row.id)),
      ]
    : real;
}

export function subscribedRun(id: string | null): string | null {
  return id?.startsWith("sample-") ? null : id;
}
