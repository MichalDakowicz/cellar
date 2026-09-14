import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { useCellar, useCellarWrites } from '@/features/cellar/useCellar';
import { splitThread } from '@/lib/agentWork';
import { ENTRY_STATES } from '@/lib/entryState';
import { dropStamp, shortRel } from '@/lib/relTime';
import type { Entry, EntryState, Kind } from '@/types/cellar';

/**
 * One entry, and the four things you can do to it: re-kind it, move its state,
 * grow it, and get it out of the way.
 *
 * Archive is the primary of the three bottom buttons and delete is the small
 * red one on the end, in that order on purpose. Google Keep's failure mode is
 * that clearing a note means destroying it, so you either keep a list you can
 * no longer read or you lose the thought. Here archive is a disclosure toggle
 * and delete is the rare, deliberate act.
 */
export function useEntryScreen(entryId: string | undefined) {
  const router = useRouter();
  const { entries, projects } = useCellar();
  const { update, remove, addLine } = useCellarWrites();
  const [line, setLine] = useState('');

  const entry = entries.find((candidate) => candidate.id === entryId) ?? null;
  const projectName = projects.find((project) => project.id === entry?.projectId)?.name ?? 'inbox';

  const siblings = useMemo(
    () =>
      entry
        ? entries
            .filter((other) => other.projectId === entry.projectId && other.id !== entry.id && !other.archived)
            .slice(0, 4)
        : [],
    [entries, entry],
  );

  const patch = useCallback(
    (next: Parameters<typeof update.mutate>[0]['patch']) => {
      if (entry) update.mutate({ id: entry.id, patch: next });
    },
    [entry, update],
  );

  const appendLine = useCallback(() => {
    const text = line.trim();
    if (!text || !entry) return;
    setLine('');
    addLine.mutate({ entryId: entry.id, text });
  }, [line, entry, addLine]);

  const deleteEntry = useCallback(() => {
    if (!entry) return;
    remove.mutate(entry.id, {
      onSuccess: () => (router.canGoBack() ? router.back() : router.navigate('/')),
    });
  }, [entry, remove, router]);

  // Two readings, never interleaved: what you thought, and what came back
  // against it. One chronological list is the wall of one-liners the `source`
  // column exists to prevent.
  const { yours, agent } = splitThread(
    (entry?.lines ?? []).map((entryLine) => ({ ...entryLine, rel: shortRel(entryLine.createdAt) })),
  );

  return {
    entry,
    projectName,
    stamp: entry ? dropStamp(entry.createdAt) : '',
    thread: yours,
    agentLines: agent,
    /** Named when an agent has it. */
    agentName: entry?.agent ?? null,
    /**
     * The pre-questions-table reading: an entry blocked before questions were
     * rows asked by appending a line and stopping, so its question is the last
     * thing the agent said. Only used when the entry has no question rows at
     * all — otherwise the section below is the whole truth and this would show
     * a report line as if it were being asked.
     */
    legacyQuestion:
      entry?.state === 'blocked' && (entry?.questions.length ?? 0) === 0
        ? (agent[agent.length - 1]?.text ?? null)
        : null,
    line,
    setLine,
    appendLine,
    setKind: (kind: Kind) => patch({ kind }),
    stateOptions: ENTRY_STATES.map((meta) => ({ value: meta.value, label: meta.label })),
    // Moving the state by hand takes the entry back: whatever an agent was
    // doing with it, you have just decided otherwise, and leaving its name on
    // the row would keep claiming it is being worked on.
    setState: (state: EntryState) => patch({ state, agent: null }),
    archived: entry?.archived ?? false,
    archiveLabel: entry?.archived ? 'unarchive' : 'archive',
    toggleArchive: () => patch({ archived: !entry?.archived }),
    moveTo: (projectId: string | null) => patch({ projectId }),
    deleteEntry,
    siblings: siblings as Entry[],
  };
}
