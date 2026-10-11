import { useMemo } from 'react';

import { useCellar } from '@/features/cellar/useCellar';
import { agentLabel, isLiveRun, RUN_STATE_LABEL, type DeskRun } from '@/lib/deskProtocol';
import { SAMPLE_RUNS } from '@/lib/deskSample';
import { runMeta, type DeskRunCard } from '@/lib/deskView';
import { longRel } from '@/lib/relTime';
import { projectForPath, repoPathLabel } from '@/lib/repoLink';
import { useDeskPrefs } from '@/store/deskPrefs';

/**
 * Every run as a card — the pc's, named by the cellar project its folder
 * belongs to, and the sample desk's when it is on. The desk tab sorts them into
 * waiting → running → lately; the desktop chat groups them by project.
 */
export function useDeskRunCards(runs: readonly DeskRun[]): DeskRunCard[] {
  const { projects } = useCellar();
  const sample = useDeskPrefs((state) => state.sample);

  return useMemo(() => {
    const real = runs.map((run) => runCard(run, projects.find((project) => project.id === run.projectId)?.name ?? projectForPath(run.cwd, projects)?.name ?? null));
    return sample ? [...real, ...SAMPLE_RUNS] : real;
  }, [runs, projects, sample]);
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
