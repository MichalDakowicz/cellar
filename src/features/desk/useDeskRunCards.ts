import { useMemo } from 'react';

import { useCellar } from '@/features/cellar/useCellar';
import { agentLabel, isLiveRun, RUN_STATE_LABEL, type DeskRun } from '@/lib/deskProtocol';
import { SAMPLE_RUNS } from '@/lib/deskSample';
import { runMeta, type DeskRunCard } from '@/lib/deskView';
import { longRel } from '@/lib/relTime';
import { projectForPath, repoPathLabel } from '@/lib/repoLink';
import { useDeskPrefs } from '@/store/deskPrefs';
import { useDeskStatus } from './DeskStatusProvider';
import { useDeskStream } from './useDeskStream';
import { pendingApproval } from '@/lib/deskApprovals';

/**
 * Every run as a card — the pc's, named by the cellar project its folder
 * belongs to, and the sample desk's when it is on. The desk tab sorts them into
 * waiting → running → lately; the desktop chat groups them by project.
 */
export function useDeskRunCards(runs: readonly DeskRun[]): DeskRunCard[] {
  const { projects } = useCellar();
  const sample = useDeskPrefs((state) => state.sample);
  const { link } = useDeskStatus();
  const stream = useDeskStream(link);
  const approvals = stream.live ? stream.state.approvals : undefined;

  return useMemo(() => {
    const real = runs.map((run) => {
      const card = runCard(run, projects.find((project) => project.id === run.projectId)?.name ?? projectForPath(run.cwd, projects)?.name ?? null);
      const request = approvals?.find((row) => row.runId === run.id && pendingApproval(row));
      return request ? { ...card, detail: `approval · ${request.what}`, waitingLabel: 'needs your approval' } : card;
    });
    return sample ? [...real, ...SAMPLE_RUNS] : real;
  }, [runs, projects, sample, approvals]);
}

function runCard(run: DeskRun, project: string | null): DeskRunCard {
  return {
    id: run.id,
    title: run.name,
    project: project ?? repoPathLabel(run.cwd) ?? 'no folder',
    meta: runMeta([
      project ?? repoPathLabel(run.cwd),
      agentLabel(run.agent),
      run.branch ?? null,
      longRel(new Date(run.startedAt).toISOString()),
      run.origin === 'pc' ? 'opened at the pc' : null,
    ]),
    detail: run.state === 'waiting' ? RUN_STATE_LABEL.waiting : null,
    state: run.state,
    startedAt: run.startedAt,
    stoppable: isLiveRun(run) && run.origin === 'phone',
  };
}
