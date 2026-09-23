import { useCallback, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { useCellar, useCellarWrites, useCurrentShelf } from '@/features/cellar/useCellar';
import { useCellarSettings } from '@/hooks/useCellarSettings';
import { dumpHint, dumpPlaceholder, plan, returnHint, shouldSubmitOnReturn } from '@/lib/dump';
import { recentEntries } from '@/lib/entryGroups';
import { fanOut, INBOX_TARGET, liveTargets, pickTarget, targetLabel, toggleTarget } from '@/lib/fileTargets';
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

  const raw = useCellarPrefs((state) => state.raw);
  const kind = useCellarPrefs((state) => state.draftKind);
  const setKind = useCellarPrefs((state) => state.setDraftKind);
  const lastProjectIds = useCellarPrefs((state) => state.lastProjectIds);
  const setLastProjects = useCellarPrefs((state) => state.setLastProjects);
  const setShelf = useCellarPrefs((state) => state.setShelf);

  const [text, setText] = useState('');

  const shelfProjects = useMemo(
    () => projects.filter((project) => project.shelfId === shelf?.id),
    [projects, shelf?.id],
  );

  // Cut to this shelf: a chip on another shelf would file the thought somewhere
  // you are not looking (lib/fileTargets).
  const targets = useMemo(
    () => liveTargets(lastProjectIds, shelfProjects.map((project) => project.id)),
    [lastProjectIds, shelfProjects],
  );
  const where = useMemo(
    () => targetLabel(targets.map((id) => shelfProjects.find((project) => project.id === id)?.name ?? '')),
    [targets, shelfProjects],
  );

  const draft = useMemo(() => ({ text, kind, projectId: targets[0] ?? null, raw }), [text, kind, targets, raw]);
  const dropPlan = useMemo(() => plan(draft, where), [draft, where]);

  const submit = useCallback(() => {
    if (dropPlan.empty || drop.isPending) return;
    void drop
      .mutateAsync(fanOut(dropPlan.drops, targets).map((entry) => ({ ...entry, kind })))
      .then(() => {
        setText('');
        // With "remember the last project" off, the chips snap back to the
        // inbox — otherwise the second thought of the evening silently files
        // itself under whatever the first one was about.
        if (!settings.rememberLast) setLastProjects([]);
      });
  }, [dropPlan, drop, kind, targets, settings.rememberLast, setLastProjects]);

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
    /** The chips that read as on. The inbox is on exactly when nothing else is. */
    selectedTargets: targets.length > 0 ? targets : [INBOX_TARGET],
    /** A tap: this one, as it always was. */
    pickProject: (value: string) => setLastProjects(pickTarget(value)),
    /** A hold: this one as well, or not any more. */
    holdProject: (value: string) => setLastProjects(toggleTarget(targets, value)),
    /** Said once more than one is on, so a thought landing twice is never a surprise. */
    targetsHint: targets.length > 1 ? `lands in each of ${targets.length}` : 'hold a project to file it into more than one',
    projectOptions: [
      { value: INBOX_TARGET, label: 'inbox' },
      ...shelfProjects.map((project) => ({ value: project.id, label: project.name })),
    ],
    recent,
    latest,
    showCodes: settings.showCodes,
  };
}
