import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { SAMPLE_FIGURES, SAMPLE_PROJECTS } from '@/lib/deskSample';
import { deskSections, hostLine, type DeskRunCard } from '@/lib/deskView';
import { deskCountLine } from '@/lib/deskCounts';
import { useDeskPrefs } from '@/store/deskPrefs';

import { useDeskRunCards } from './useDeskRunCards';
import type { useDeskScreen } from './useDeskScreen';
import { useDeskStatus } from './DeskStatusProvider';
import { useDeskCommands } from './useDeskCommands';
import { readError } from '@/lib/utils';

/**
 * The desk tab's top half — summary, host card, command tiles, and the runs as
 * waiting → running → lately (docs/desk/screens.md, "desk tab").
 *
 * Real where the pc reports it; the sample desk fills the rest only when it is
 * switched on in settings. Commands and the host's figures have no source yet
 * (docs/desk/TASKS.md W2), so without the sample they are simply absent.
 */
export function useDeskHome(screen: ReturnType<typeof useDeskScreen>) {
  const router = useRouter();
  const { link, runs, local } = screen;
  const { counts, retryCounts } = useDeskStatus();
  const sample = useDeskPrefs((state) => state.sample);
  const picked = useDeskPrefs((state) => state.commandsProject);
  const pick = useDeskPrefs((state) => state.setCommandsProject);
  const { say } = useToast();
  const [scope, setScope] = useState<'all' | 'project'>('all');
  const jobs = useDeskCommands();

  const all = useDeskRunCards(runs.runs);
  const cards = useMemo(() => deskSections<DeskRunCard>(
    all.filter((run) => run.id.startsWith('sample-') || counts.working !== null),
  ), [all, counts.working]);

  const host = hostLine(link.via, link.checking);
  const activity = deskCountLine(counts);
  const commands = jobs.projects.length ? jobs.projects : sample ? SAMPLE_PROJECTS : null;
  const current = commands ? (commands.find((project) => project.id === picked) ?? commands[0]) : null;
  const scopedCards = useMemo(() => ({
    waiting: cards.waiting,
    running: cards.running.filter((run) => scope === 'all' || run.project === current?.name),
    lately: cards.lately.filter((run) => scope === 'all' || run.project === current?.name),
  }), [cards, scope, current?.name]);

  return {
    summary: `${link.name} · ${host.line}${activity ? ` · ${activity}` : ''}`,
    counts,
    retryCounts,
    commandsStatus: jobs.start.isPending ? `starting job on ${link.name}…` : jobs.start.error ? readError(jobs.start.error) : jobs.loading ? 'reading project commands…' : jobs.error,
    empty: counts.state === 'disconnected' ? `connect to ${link.name} to read runs`
      : counts.state === 'loading' ? 'reading counts…'
      : counts.state === 'failed' ? 'counts unavailable — retry to read the desk' : 'nothing working',
    host: {
      name: link.name,
      ...host,
      line: counts.snapshotAt ? `${host.line} · snapshot ${counts.snapshotAt}` : host.line,
      figures: sample ? SAMPLE_FIGURES : null,
      onScreen: local.available ? () => router.push('/desk/screen' as Href) : null,
    },
    commands:
      commands && current
        ? {
            projects: commands,
            current,
            onPick: pick,
            onRun: jobs.start.isPending ? null : (projectId: string, command: string) =>
              projectId.startsWith('sample-') ? command === 'preview'
                ? router.push('/desk/preview/sample' as Href)
                : say(`$${command} is a sample command`)
              : jobs.start.mutate({ projectId, command }, { onSuccess: (run) => router.push(`/desk/run/${run.id}` as Href) }),
          }
        : null,
    sections: cards,
    scopedSections: scopedCards,
    scope,
    onScope: setScope,
    activity,
    /** A run opens its own screen — real or sample, the same route. */
    openRun: (id: string) => router.push(`/desk/run/${id}` as Href),
    sample,
    /** File it is real; the rest are drawn on the sample desk until their wiring (V16). */
    later: [
      { title: 'file it into cellar', sub: 'words, kind and project — and hand it off', href: '/desk/share' },
      ...(sample
        ? [
            { title: 'race', sub: 'two runs off one commit, compared', href: '/desk/race' },
            { title: 'night shift', sub: 'what ran while you slept', href: '/desk/night' },
            { title: 'group run', sub: 'one task across a shelf of projects', href: '/desk/group' },
            { title: 'phone over adb', sub: 'mirror, install, logcat', href: '/desk/phone' },
          ]
        : []),
    ].map((link) => ({ title: link.title, sub: link.sub, onPress: () => router.push(link.href as Href) })),
  };
}
