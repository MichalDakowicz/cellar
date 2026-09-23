import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { useCellar, useCellarWrites } from '@/features/cellar/useCellar';
import { useEntryDocs } from '@/features/cellar/useEntryDocs';
import { useEntryTrail } from '@/features/cellar/useEntryTrail';
import { useCellarSettings } from '@/hooks/useCellarSettings';
import { splitThread } from '@/lib/agentWork';
import { ENTRY_STATES } from '@/lib/entryState';
import { IMPORTANCES } from '@/lib/importance';
import { collectLinks } from '@/lib/links';
import { dropStamp, shortRel } from '@/lib/relTime';
import type { Entry, EntryLine, EntryState, Importance, Kind } from '@/types/cellar';

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
  const { update, remove, addLine, removeLine } = useCellarWrites();
  const { settings } = useCellarSettings();
  const [line, setLine] = useState('');

  // Removing a line is the one destructive thing on this screen that is not
  // the entry itself, so it is armed rather than immediate — and the rows it
  // took come back until you leave. The stack lives in screen state on
  // purpose: undo is for the mistake you just made, not a second bin.
  const [arming, setArming] = useState<EntryLine | null>(null);
  const [removed, setRemoved] = useState<EntryLine[]>([]);

  const entry = entries.find((candidate) => candidate.id === entryId) ?? null;
  const project = projects.find((candidate) => candidate.id === entry?.projectId) ?? null;
  const projectName = project?.name ?? 'inbox';
  const docs = useEntryDocs(entry, project);
  const trail = useEntryTrail(entry, projects);

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

  const confirmRemoveLine = useCallback(() => {
    const target = arming;
    setArming(null);
    if (!target) return;
    setRemoved((stack) => [...stack, target]);
    removeLine.mutate(target.id);
  }, [arming, removeLine]);

  // Puts the last one back where it was — same text, same stamp, so it lands in
  // its old place in the thread rather than at the bottom as a new thought.
  const undoRemove = useCallback(() => {
    const last = removed[removed.length - 1];
    if (!last || !entry) return;
    setRemoved((stack) => stack.slice(0, -1));
    addLine.mutate({ entryId: entry.id, text: last.text, createdAt: last.createdAt });
  }, [removed, entry, addLine]);

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

  // Memoized rather than run per render: it walks the thought and every line
  // under it, and this screen re-renders on every keystroke in the append
  // field.
  const links = useMemo(
    () => collectLinks([entry?.text ?? '', ...(entry?.lines ?? []).map((one) => one.text)]),
    [entry?.text, entry?.lines],
  );

  return {
    entry,
    /**
     * Every link on this thought and under it, deduped and in the order they
     * appear — the cards the entry page grows under the thought. Derived here
     * rather than in the route, because a screen composes (PING.md §13).
     */
    links,
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
    /** Only your own lines are offered — the agent's are its report, not yours to edit. */
    armRemoveLine: (target: EntryLine) => setArming(target),
    cancelRemoveLine: () => setArming(null),
    confirmRemoveLine,
    lineToRemove: arming,
    undoneCount: removed.length,
    undoRemove,
    setKind: (kind: Kind) => patch({ kind }),
    importanceOptions: IMPORTANCES.map((meta) => ({ value: meta.value, label: meta.label })),
    setImportance: (importance: Importance) => patch({ importance }),
    kindOrder: settings.kindOrder,
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
    /** Links and repo paths on the thought, and the field that attaches one. */
    docs,
    /** Every stamp and every logged move, exact to the minute (`lib/entryTrail`). */
    trail,
    siblings: siblings as Entry[],
  };
}
