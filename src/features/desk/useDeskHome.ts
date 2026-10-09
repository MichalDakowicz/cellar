import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';

import { useToast } from '@/components/ui/Toast';
import { SAMPLE_FIGURES, SAMPLE_PROJECTS } from '@/lib/deskSample';
import { deskSections, deskSummary, hostLine, type DeskRunCard } from '@/lib/deskView';
import { useDeskPrefs } from '@/store/deskPrefs';

import { useDeskRunCards } from './useDeskRunCards';
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
  const router = useRouter();
  const { link, runs, local } = screen;
  const waitingEntries = useDeskWaiting();
  const sample = useDeskPrefs((state) => state.sample);
  const picked = useDeskPrefs((state) => state.commandsProject);
  const pick = useDeskPrefs((state) => state.setCommandsProject);
  const { say } = useToast();

  const all = useDeskRunCards(runs.runs);
  const cards = useMemo(() => deskSections<DeskRunCard>(all), [all]);

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
      onScreen: local.available ? () => router.push('/desk/screen' as Href) : null,
    },
    commands:
      commands && current
        ? {
            projects: commands,
            current,
            onPick: pick,
            // Only the sample's tiles exist yet; preview opens the sample page,
            // the rest wait for commands to run for real (W2).
            onRun: (_project: string, command: string) =>
              command === 'preview'
                ? router.push('/desk/preview/sample' as Href)
                : say(`$${command} runs once the pc knows a project's commands`),
          }
        : null,
    sections: cards,
    /** A run opens its own screen — real or sample, the same route. */
    openRun: (id: string) => router.push(`/desk/run/${id}` as Href),
    stopRun: (id: string) => {
      const run = runs.runs.find((candidate) => candidate.id === id);
      if (run) screen.stop(run);
    },
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
