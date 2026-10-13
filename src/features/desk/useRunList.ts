import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';

import { runFilterCounts, runGroups, type RunFilter } from '@/lib/deskRunList';
import { SAMPLE_RAIL } from '@/lib/deskSample';

import { useDeskLink } from './useDeskLink';
import { useDeskRunCards } from './useDeskRunCards';
import { useDeskRuns } from './useDeskRuns';

/**
 * The two sides of the desktop chat (`DeskChat.dc.html`): the run list on the
 * left, grouped by project, and the rail on the right for the open run.
 *
 * The rail's files and checkpoints need the pc to keep a run's events and
 * hidden refs (docs/desk/TASKS.md W6, W14) and the attached phone needs adb
 * (W18), so a real run says so; the sample desk's runs fill them in.
 */
export function useRunList(currentId: string) {
  const router = useRouter();
  const link = useDeskLink();
  const runs = useDeskRuns(link);
  const cards = useDeskRunCards(runs.runs);
  const [filter, setFilter] = useState<RunFilter>('all');
  const [query, setQuery] = useState('');

  const groups = useMemo(() => runGroups(cards, filter, query), [cards, filter, query]);
  const rail = SAMPLE_RAIL[currentId] ?? null;

  return {
    list: {
      groups,
      counts: runFilterCounts(cards),
      filter,
      onFilter: setFilter,
      query,
      onQuery: setQuery,
      currentId,
      onOpen: (id: string) => router.replace(`/desk/run/${id}` as Href),
      onNew: () => router.push('/desk/new' as Href),
    },
    rail: {
      files: rail?.files ?? [],
      checkpoints: rail?.checkpoints ?? 0,
      onPreview: rail?.preview ? () => router.push(`/desk/preview/${rail.preview}` as Href) : null,
      empty: rail ? null : 'its files and checkpoints show here once the pc keeps a run’s events',
    },
  };
}
