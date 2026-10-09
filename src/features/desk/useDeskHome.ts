import { useMemo } from 'react';

import { useCellar } from '@/features/cellar/useCellar';
import { agentLabel, isLiveRun, RUN_STATE_LABEL, type DeskRun } from '@/lib/deskProtocol';
import { SAMPLE_FIGURES, SAMPLE_PROJECTS, SAMPLE_RUNS } from '@/lib/deskSample';
import { deskSections, deskSummary, hostLine, runMeta, type DeskRunCard } from '@/lib/deskView';
import { longRel } from '@/lib/relTime';
import { projectForPath, repoPathLabel } from '@/lib/repoLink';
import { useDeskPrefs } from '@/store/deskPrefs';

import type { useDeskScreen } from './useDeskScreen';
import { useDeskWaiting } from './useDeskWaiting';

/**
 * The desk tab's top half — summary, host card, command tiles, and the runs as
 * waiting → running → lately (docs/desk/screens.md, "desk tab").
 *
 * Real where the pc reports it; the sample desk fills the rest only when it is
 * switched on in settings. Commands and the host's figures have no source yet
 * (docs/desk/TASKS.md W2), so without the sample they are simply absent.
 */
export function useDeskHome(screen: ReturnType<typeof useDeskScreen>) {
  const { link, runs, local } = screen;
  const { projects } = useCellar();
  const waitingEntries = useDeskWaiting();
  const sample = useDeskPrefs((state) => state.sample);
  const picked = useDeskPrefs((state) => state.commandsProject);
  const pick = useDeskPrefs((state) => state.setCommandsProject);

  const cards = useMemo(() => {
    const real = runs.runs.map((run) => runCard(run, projectForPath(run.cwd, projects)?.name ?? null));
    return deskSections<DeskRunCard>(sample ? [...real, ...SAMPLE_RUNS] : real);
  }, [runs.runs, projects, sample]);

  const host = hostLine(link.via, link.checking);
  const live = cards.waiting.length + cards.running.length;
  const commands = sample ? SAMPLE_PROJECTS : null;
  const current = commands ? (commands.find((project) => project.id === picked) ?? commands[0]) : null;

  return {
    summary: deskSummary({
      name: link.name,
      online: host.online,
      running: live,
      waiting: waitingEntries + cards.waiting.length,
    }),
    host: {
      name: link.name,
      ...host,
      figures: sample ? SAMPLE_FIGURES : null,
      onScreen: local.available ? () => local.open.mutate({ kind: 'screen' }) : null,
    },
    commands: commands && current ? { projects: commands, current, onPick: pick } : null,
    sections: cards,
    /** Real runs open their log; a sample run has nothing behind it. */
    openRun: (id: string) => {
      const run = runs.runs.find((candidate) => candidate.id === id);
      if (run && screen.openLog) screen.openLog(run);
    },
    stopRun: (id: string) => {
      const run = runs.runs.find((candidate) => candidate.id === id);
      if (run) screen.stop(run);
    },
    sample,
  };
}

function runCard(run: DeskRun, project: string | null): DeskRunCard {
  return {
    id: run.id,
    title: run.name,
    meta: runMeta([
      project ?? repoPathLabel(run.cwd),
      agentLabel(run.agent),
      longRel(new Date(run.startedAt).toISOString()),
      run.origin === 'pc' ? 'opened at the pc' : null,
    ]),
    detail: run.state === 'waiting' ? RUN_STATE_LABEL.waiting : null,
    state: run.state,
    startedAt: run.startedAt,
    stoppable: isLiveRun(run) && run.origin === 'phone',
  };
}
