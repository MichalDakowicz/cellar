import { useMemo } from 'react';

import type { EntryListItem } from '@/components/cellar/EntryList';
import { useCellar } from '@/features/cellar/useCellar';
import { useCellarSettings } from '@/hooks/useCellarSettings';
import { waitingOnYou } from '@/lib/agentWork';
import { groupByKind } from '@/lib/entryGroups';
import { INBOX_SORTS, useCellarPrefs, type InboxSort } from '@/store/cellarPrefs';
import type { Entry, Project } from '@/types/cellar';

/**
 * The inbox: everything dumped without picking a project, and anything an agent
 * has stopped on and asked you about.
 *
 * The sort is the left island's action here, and it is three orders rather than
 * a filter because the inbox is a pile you are about to work through — the
 * question is always "which end do I start from", never "show me less of it".
 * A filtered inbox that still says 14 unfiled is a lie about how much is left.
 *
 * The questions ride along at the top rather than getting their own screen for
 * the same reason: this is already the one place you come to clear a queue, and
 * a second queue somewhere else is a queue that goes unread. They are filed
 * under a project, so they are the one thing here that names where it came from.
 */
export function useInboxScreen() {
  const { entries, projects, loading, error, refetch } = useCellar();
  const sort = useCellarPrefs((state) => state.inboxSort);
  const { settings } = useCellarSettings();

  const unfiled = useMemo(
    () => entries.filter((entry) => entry.projectId === null && !entry.archived),
    [entries],
  );

  const waiting = useMemo(() => waitingOnYou(entries), [entries]);

  const items = useMemo(() => buildItems(unfiled, waiting, sort), [unfiled, waiting, sort]);

  const whereFor = useMemo(() => projectNamer(projects), [projects]);

  return {
    loading,
    error,
    refetch,
    sort,
    sortLabel: INBOX_SORTS.find((option) => option.value === sort)?.label ?? 'newest first',
    meta: waiting.length > 0 ? `${waiting.length} waiting · ${unfiled.length} unfiled` : `${unfiled.length} unfiled`,
    items,
    /** Everything on this screen, flat — what a multi-select resolves ids against. */
    onScreen: useMemo(() => [...waiting, ...unfiled], [waiting, unfiled]),
    whereFor,
    showCodes: settings.showCodes,
    isEmpty: unfiled.length === 0 && waiting.length === 0,
  };
}

/** Names the project a row came from. Only the waiting rows have one. */
function projectNamer(projects: Project[]) {
  const byId = new Map(projects.map((project) => [project.id, project.name]));
  return (entry: Entry) => (entry.projectId ? byId.get(entry.projectId) : undefined);
}

function buildItems(unfiled: Entry[], waiting: Entry[], sort: InboxSort): EntryListItem[] {
  const head: EntryListItem[] =
    waiting.length === 0
      ? []
      : [
          { type: 'section', section: { key: 'waiting', label: 'waiting on you', meta: String(waiting.length) } },
          ...waiting.map((entry) => ({ type: 'entry' as const, entry })),
          // Only labelled once there is something above it to be told apart from.
          { type: 'section', section: { key: 'unfiled', label: 'unfiled', meta: String(unfiled.length) } },
        ];

  return [...head, ...sorted(unfiled, sort)];
}

function sorted(entries: Entry[], sort: InboxSort): EntryListItem[] {
  if (sort === 'kind') {
    return groupByKind(entries).flatMap((group) => [
      {
        type: 'section' as const,
        section: { key: group.kind, label: group.kind, meta: String(group.entries.length), kind: group.kind },
      },
      ...group.entries.map((entry) => ({ type: 'entry' as const, entry })),
    ]);
  }

  const ordered = [...entries].sort((a, b) =>
    sort === 'oldest' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt),
  );
  return ordered.map((entry) => ({ type: 'entry' as const, entry }));
}
