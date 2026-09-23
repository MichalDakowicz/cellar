import { useCallback, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { useCellar, useCellarWrites, useCurrentShelf } from '@/features/cellar/useCellar';
import { useCellarSettings } from '@/hooks/useCellarSettings';
import { useHaptics } from '@/hooks/useHaptics';
import { dumpHint, dumpPlaceholder, plan, returnHint, shouldSubmitOnReturn } from '@/lib/dump';
import { recentEntries } from '@/lib/entryGroups';
import { cycleShelf, type SwipeDirection } from '@/lib/shelfCycle';
import { countToday } from '@/lib/relTime';
import { plural } from '@/lib/utils';
import { useCellarPrefs } from '@/store/cellarPrefs';
import type { Kind } from '@/types/cellar';

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
  const haptics = useHaptics();

  const raw = useCellarPrefs((state) => state.raw);
  const kind = useCellarPrefs((state) => state.draftKind);
  const setKind = useCellarPrefs((state) => state.setDraftKind);
  const lastProjectId = useCellarPrefs((state) => state.lastProjectId);
  const setLastProject = useCellarPrefs((state) => state.setLastProject);
  const setShelf = useCellarPrefs((state) => state.setShelf);

  const [text, setText] = useState('');

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
      .mutateAsync(dropPlan.drops.map((entry) => ({ ...entry, kind, projectId })))
      .then(() => {
        haptics.drop();
        setText('');
        // With "remember the last project" off, the chip snaps back to the
        // inbox — otherwise the second thought of the evening silently files
        // itself under whatever the first one was about.
        if (!settings.rememberLast) setLastProject(null);
      });
  }, [dropPlan, drop, kind, projectId, settings.rememberLast, setLastProject, haptics]);

  const onReturn = useCallback(
    (modifiers: { shift: boolean; meta: boolean }) => {
      if (!shouldSubmitOnReturn(raw, modifiers)) return false;
      submit();
      return true;
    },
    [raw, submit],
  );

  // What you have been catching, on both shapes of the screen. The desktop
  // column runs down the side of the field and has the room for a dozen; the
  // phone gets a short band under the drop button and room for five.
  //
  // Both read the whole cellar rather than the ids dropped since this screen
  // mounted. The band was a receipt for the current session, so it was empty on
  // every cold start — the one moment you most want to see what is already
  // there, and the moment you are most likely to dump the same thought twice.
  const recent = useMemo(() => recentEntries(entries, 12), [entries]);
  const latest = useMemo(() => recent.slice(0, 5), [recent]);

  // Dragging across the file it block steps along the shelves. Stable, because
  // the responder that calls it is memoised on this identity and one rebuilt
  // mid-gesture drops the gesture (components/cellar/SwipeShelf).
  const swipeShelf = useCallback(
    (direction: SwipeDirection) => {
      const next = cycleShelf(shelves, shelf?.id ?? null, direction);
      if (next) setShelf(next);
    },
    [shelves, shelf?.id, setShelf],
  );

  return {
    loading,
    error,
    refetch,
    shelf,
    shelfName: shelf?.name ?? 'cellar',
    swipeShelf,
    /** One shelf is nowhere to swipe to, so the drag stays the scroll's. */
    canSwipeShelf: shelves.length > 1,
    /** "4 today · 218 in the cellar". The line beside the heading. */
    todayLine: `${countToday(entries.map((entry) => entry.createdAt))} today · ${plural(entries.length, 'entry', 'entries')} in the cellar`,
    text,
    setText,
    raw,
    placeholder: dumpPlaceholder(raw),
    hint: dumpHint(draft),
    // Web is the only build with a shift or a ctrl to press. `lib/dump` stays
    // free of react-native, so the platform is read here and handed over.
    keyHint: returnHint(raw, Platform.OS === 'web'),
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
    recent,
    latest,
    showCodes: settings.showCodes,
    kindOrder: settings.kindOrder,
  };
}
