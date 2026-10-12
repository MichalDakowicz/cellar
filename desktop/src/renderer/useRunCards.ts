import { useMemo } from "react";
import { deskRunCard, deskSections } from "@/lib/deskView";
import { projectForPath } from "@/lib/repoLink";
import { SAMPLE_RUNS } from "@/lib/deskSample";
import { runFilterCounts, runGroups, type RunFilter } from "@/lib/deskRunList";
import { pendingApproval } from "@/lib/deskApprovals";
import type { DeskRun } from "@/lib/deskProtocol";
import type { Cellar } from "./useCellar";
import type { RuntimeRequest } from "@/lib/deskApprovals";

export function useRunCards(
  runs: DeskRun[],
  cellar: Cellar,
  filter: RunFilter,
  query: string,
  approvals: RuntimeRequest[] = [],
) {
  return useMemo(() => {
    const cards = runs.map((run) => {
      const sample = SAMPLE_RUNS.find((row) => row.id === run.id);
      if (sample) return sample;
      const project =
        cellar.projects.find((row) => row.id === run.projectId) ??
        projectForPath(run.cwd, cellar.projects);
      const card = deskRunCard(run, project?.name ?? null);
      const request = approvals.find(
        (row) => row.runId === run.id && pendingApproval(row),
      );
      return request ? { ...card, detail: `approval · ${request.what}` } : card;
    });
    return {
      counts: runFilterCounts(cards),
      groups: runGroups(cards, filter, query),
      sections: deskSections(cards),
    };
  }, [runs, cellar.projects, filter, query, approvals]);
}
