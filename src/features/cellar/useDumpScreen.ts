import { useCallback, useMemo, useState } from 'react';

import { useCellar, useCellarWrites, useCurrentShelf } from '@/features/cellar/useCellar';
import { useCellarSettings } from '@/hooks/useCellarSettings';
import { dumpHint, dumpPlaceholder, plan, returnHint, shouldSubmitOnReturn } from '@/lib/dump';
import { countToday } from '@/lib/relTime';
import { plural } from '@/lib/utils';
import { useCellarPrefs } from '@/store/cellarPrefs';
import type { Entry, Kind } from '@/types/cellar';

/**
 * The capture screen. Everything it derives lives here so the route is a
 * composition (PING.md §13).
 *
 * The draft text is the one piece of local state in the app that is *not*
 * persisted: a half-typed thought that survives a cold start is a thought you
 * will find again in a week and no longer recognise. Kind, project and raw mode
 * are sticky; the words are not.
 */
export function useDumpScreen() {
  const { shelves, projects, entries, loading, error, refetch } = useCellar();
  const { shelf } = useCurrentShelf(shelves);
  const { drop } = useCellarWrites();
  const { settings } = useCellarSettings();

  const raw = useCellarPrefs((state) => state.raw);
  const kind = useCellarPrefs((state) => state.draftKind);
  const setKind = useCellarPrefs((state) => state.setDraftKind);
  const lastProjectId = useCellarPrefs((state) => state.lastProjectId);
  const setLastProject = useCellarPrefs((state) => state.setLastProject);

  const [text, setText] = useState('');
  const [justIds, setJustIds] = useState<string[]>([]);

  const shelfProjects = useMemo(
    () => projects.filter((project) => project.shelfId === shelf?.id),
    [projects, shelf?.id],
  );

  // A project chip pointing at another shelf would drop the thought somewhere
  // you are not looking, so switching shelves silently falls back to the inbox.
  const projectId = shelfProjects.some((project) => project.id === lastProjectId) ? lastProjectId : null;
  const projectName = shelfProjects.find((project) => project.id === projectId)?.name ?? null;

  const draft = useMemo(() => ({ text, kind, projectId, raw }), [text, kind, projectId, raw]);
  const dropPlan = useMemo(() => plan(draft, projectName), [draft, projectName]);

  const submit = useCallback(() => {
    if (dropPlan.empty || drop.isPending) return;
    void drop
      .mutateAsync(dropPlan.texts.map((line) => ({ text: line, kind, projectId })))
      .then((made: Entry[]) => {
        setText('');
        // With "remember the last project" off, the chip snaps back to the
        // inbox — otherwise the second thought of the evening silently files
        // itself under whatever the first one was about.
        if (!settings.rememberLast) setLastProject(null);
        setJustIds((previous) => [...made.map((entry) => entry.id), ...previous].slice(0, 3));
      });
  }, [dropPlan, drop, kind, projectId, settings.rememberLast, setLastProject]);

  const onReturn = useCallback(
    (modifiers: { shift: boolean; meta: boolean }) => {
      if (!shouldSubmitOnReturn(raw, modifiers)) return false;
      submit();
      return true;
    },
    [raw, submit],
  );

  // The desktop column beside the field. The last few thoughts in the cellar,
  // whichever project they landed in — the point is that a wide window can show
  // you what you have been catching while you catch the next one, which is the
  // one thing a phone has no room for.
  const recent = useMemo(
    () =>
      entries
        .filter((entry) => !entry.archived)
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 12),
    [entries],
  );

  const justDropped = useMemo(
    () => justIds.map((id) => entries.find((entry) => entry.id === id)).filter((entry): entry is Entry => !!entry),
    [justIds, entries],
  );

  return {
    loading,
    error,
    refetch,
    shelf,
    shelfName: shelf?.name ?? 'cellar',
    /** "4 today · 218 in the cellar". The line beside the heading. */
    todayLine: `${countToday(entries.map((entry) => entry.createdAt))} today · ${plural(entries.length, 'entry', 'entries')} in the cellar`,
    text,
    setText,
    raw,
    placeholder: dumpPlaceholder(raw),
    hint: dumpHint(draft),
    keyHint: returnHint(raw),
    dropLabel: dropPlan.label,
    canDrop: !dropPlan.empty && !drop.isPending,
    submit,
    onReturn,
    kind,
    setKind: (next: Kind) => setKind(next),
    projectId,
    setProject: setLastProject,
    projectOptions: [
      { value: '', label: 'inbox' },
      ...shelfProjects.map((project) => ({ value: project.id, label: project.name })),
    ],
    justDropped,
    recent,
    showCodes: settings.showCodes,
  };
}
